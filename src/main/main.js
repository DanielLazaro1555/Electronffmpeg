const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs"); // Para verificar si el archivo ya existe

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.resolve("public", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Analizar la URL
ipcMain.on("analizar-url", (event, { url }) => {
  console.log(`Analizando la URL: ${url}`);

  analyzeURL(url, (fileType, resolution, format, codec, fps, bitrate) => {
    if (fileType) {
      event.reply("url-analizada", {
        fileType,
        resolution,
        format,
        codec,
        fps,
        bitrate,
      });
    } else {
      event.reply("url-analizada", {
        fileType: "Desconocido",
        resolution: "",
        format: "",
        codec: "",
        fps: "",
        bitrate: "",
      });
    }
  });
});

// Función para analizar la URL para obtener el tipo de archivo, resolución, códec, FPS y tasa de bits
function analyzeURL(url, callback) {
  const command = `ffmpeg -i "${url}" 2>&1`; // Usar FFmpeg para obtener la información

  exec(command, (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`Error al analizar la URL: ${error || stderr}`);
      callback(null, null, null, null, null, null); // No se pudo analizar la URL
      return;
    }

    let fileType = null;
    let resolution = null;
    let format = null;
    let codec = null;
    let fps = null;
    let bitrate = null;

    if (stdout.includes("Video:")) {
      fileType = "Video";
      resolution = getResolution(stdout);
      codec = getCodec(stdout);
      fps = getFPS(stdout);
      bitrate = getBitrate(stdout);
      format = "MP4";
    } else if (stdout.includes("Audio:")) {
      fileType = "Audio";
      codec = getCodec(stdout);
      format = "MP3";
    }

    callback(fileType, resolution, format, codec, fps, bitrate);
  });
}

// Extraer la resolución del video desde la salida de FFmpeg
function getResolution(stdout) {
  const regex = /(\d{3,4})x(\d{3,4})/;
  const match = regex.exec(stdout);
  if (match) {
    return `${match[1]}x${match[2]}`; // Devuelve '1280x720'
  }
  return null;
}

// Extraer el códec del video o audio
function getCodec(stdout) {
  const videoRegex = /Video: (\w+)/;
  const audioRegex = /Audio: (\w+)/;
  const videoMatch = videoRegex.exec(stdout);
  const audioMatch = audioRegex.exec(stdout);

  if (videoMatch) {
    return videoMatch[1]; // Devuelve el códec de video (por ejemplo, 'h264')
  } else if (audioMatch) {
    return audioMatch[1]; // Devuelve el códec de audio (por ejemplo, 'aac')
  }
  return null;
}

// Extraer los FPS del video
function getFPS(stdout) {
  const regex = /(\d+)\s*fps/;
  const match = regex.exec(stdout);
  if (match) {
    return match[1];
  }
  return null;
}

// Extraer la tasa de bits
function getBitrate(stdout) {
  const regex = /bitrate: (\d+)\s*kb\/s/;
  const match = regex.exec(stdout);
  if (match) {
    return match[1];
  }
  return null;
}

// Función para generar un nombre único para el archivo
function generateUniqueFileName(basePath) {
  let filePath = basePath;
  let counter = 1;

  // Si el archivo ya existe, agrega un número al final
  while (fs.existsSync(filePath)) {
    const extname = path.extname(basePath);
    const basename = path.basename(basePath, extname);
    filePath = path.join(
      path.dirname(basePath),
      `${basename}${counter}${extname}`
    );
    counter++;
  }

  return filePath;
}

// Descargar el video usando FFmpeg
ipcMain.on("descargar-video", async (event, { url, fileName }) => {
  console.log(`Iniciando la descarga de: ${fileName} desde ${url}`);

  // Mostrar el cuadro de diálogo para seleccionar la ubicación del archivo
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Guardar video",
    defaultPath: path.join(__dirname, `${fileName}.mp4`),
    filters: [{ name: "Archivos de video", extensions: ["mp4"] }],
  });

  if (!result.canceled) {
    const outputPath = result.filePath;

    // Crear el comando FFmpeg para descargar y convertir el video
    const command = `ffmpeg -i "${url}" -c:v libx264 -c:a aac -strict experimental -threads 0 "${outputPath}"`;

    console.log("Comando FFmpeg:", command); // Depuración del comando

    // Ejecutar FFmpeg
    const ffmpegProcess = exec(command);

    // Enviar el estado de "Archivo descargando..."
    event.reply("progreso-descarga", "Archivo descargando...");

    // Capturar y procesar los datos de FFmpeg
    ffmpegProcess.stdout.on("data", (data) => {
      console.log("FFmpeg stdout:", data);

      // Enviar el progreso al frontend
      const progress = extractProgress(data);
      event.reply("progreso-descarga", progress);

      // Extraer metadata en tiempo real
      extractMetadata(
        data,
        (fileType, resolution, format, codec, fps, bitrate) => {
          event.reply("progreso-descarga", {
            fileType,
            resolution,
            format,
            codec,
            fps,
            bitrate,
          });
        }
      );
    });

    ffmpegProcess.stderr.on("data", (data) => {
      console.error("FFmpeg stderr:", data);
      event.reply("progreso-descarga", `Error: ${data}`);
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Descarga completada correctamente.");
        event.reply("progreso-descarga", "100"); // Finalizar progreso
      } else {
        console.error(`FFmpeg terminó con código de salida: ${code}`);
        event.reply(
          "progreso-descarga",
          `Hubo un problema al descargar el video. Código de salida: ${code}`
        );
      }
    });
  } else {
    event.reply("progreso-descarga", "Descarga cancelada por el usuario.");
  }
});

// Función para extraer el progreso de la salida de FFmpeg
function extractProgress(data) {
  const regex = /time=(\d{2}:\d{2}:\d{2}.\d{2})/;
  const match = regex.exec(data);
  if (match) {
    const time = match[1]; // Ejemplo: "00:01:02.50"
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const totalDuration = 100; // Duración total de la descarga (puedes calcularla de otra forma si es necesario)
    const progress = (totalSeconds / totalDuration) * 100;
    return Math.min(100, progress); // Evitar que el progreso supere el 100%
  }
  return 0; // Si no se puede extraer el progreso
}

// Función para extraer los metadatos durante la descarga
function extractMetadata(data, callback) {
  const regexFileType = /(Video|Audio)/;
  const regexResolution = /(\d{3,4})x(\d{3,4})/;
  const regexCodec = /(?:Video:|Audio:)\s(\w+)/;
  const regexFPS = /(\d+)\s*fps/;
  const regexBitrate = /bitrate: (\d+)\s*kb\/s/;

  let fileType = null;
  let resolution = null;
  let codec = null;
  let fps = null;
  let bitrate = null;

  // Detectar tipo de archivo (video/audio)
  if (regexFileType.test(data)) {
    fileType = data.match(regexFileType)[0];
  }

  // Extraer resolución
  if (regexResolution.test(data)) {
    resolution = data.match(regexResolution).slice(1).join("x");
  }

  // Extraer codec
  if (regexCodec.test(data)) {
    codec = data.match(regexCodec)[1];
  }

  // Extraer FPS
  if (regexFPS.test(data)) {
    fps = data.match(regexFPS)[1];
  }

  // Extraer bitrate
  if (regexBitrate.test(data)) {
    bitrate = data.match(regexBitrate)[1];
  }

  callback(fileType, resolution, "MP4", codec, fps, bitrate);
}
