const { ipcRenderer } = require("electron");

// Event listener para el botón de analizar URL
document.getElementById("analizar-btn").addEventListener("click", () => {
  const url = document.getElementById("url-video").value;

  if (url === "") {
    alert("Por favor ingresa una URL de video");
    return;
  }

  ipcRenderer.send("analizar-url", { url });
});

// Event listener para el botón de descargar
document.getElementById("descargar-btn").addEventListener("click", () => {
  const url = document.getElementById("url-video").value;
  const fileName = document.getElementById("file-name").value;

  if (fileName === "") {
    alert("Por favor ingresa un nombre de archivo");
    return;
  }

  ipcRenderer.send("descargar-video", { url, fileName });
});

// Recibir los datos de análisis de la URL
ipcRenderer.on("url-analizada", (event, { fileType, resolution, format, codec, fps, bitrate }) => {
  document.getElementById("file-info").style.display = "block";  // Mostrar la información

  document.getElementById("file-type").innerText = `Tipo de archivo: ${fileType}`;
  document.getElementById("file-resolution").innerText = resolution ? `Resolución: ${resolution}` : "Resolución: No disponible";
  document.getElementById("file-format").innerText = `Formato: ${format}`;
  document.getElementById("file-codec").innerText = `Códec: ${codec}`;
  document.getElementById("file-fps").innerText = `FPS: ${fps || "No disponible"}`;
  document.getElementById("file-bitrate").innerText = `Tasa de bits: ${bitrate || "No disponible"} kb/s`;
});

// Recibir el progreso de la descarga
ipcRenderer.on("progreso-descarga", (event, data) => {
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  if (typeof data === 'string' && data.startsWith("Archivo descargando")) {
    progressText.innerText = data;  // Mostrar el estado de la descarga
  } else if (typeof data === 'object') {
    // Actualizar los metadatos si están disponibles
    document.getElementById("file-type").innerText = `Tipo de archivo: ${data.fileType || "Desconocido"}`;
    document.getElementById("file-resolution").innerText = `Resolución: ${data.resolution || "No disponible"}`;
    document.getElementById("file-format").innerText = `Formato: ${data.format || "No disponible"}`;
    document.getElementById("file-codec").innerText = `Códec: ${data.codec || "No disponible"}`;
    document.getElementById("file-fps").innerText = `FPS: ${data.fps || "No disponible"}`;
    document.getElementById("file-bitrate").innerText = `Tasa de bits: ${data.bitrate || "No disponible"}`;
  } else {
    // Actualizar la barra de progreso
    progressBar.value = data;
    progressText.innerText = `Progreso: ${data}%`;

    if (data >= 100) {
      progressText.innerText = "Descarga completada";
    }
  }
});
