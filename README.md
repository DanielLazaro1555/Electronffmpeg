# Descargador de Videos M3U8 con Electron y FFmpeg

## Descripción

Este proyecto es una aplicación de escritorio creada con **Electron** y **FFmpeg** que permite descargar videos desde una URL M3U8. Utiliza FFmpeg para analizar la URL del video, obtener metadatos como resolución, códec, FPS y bitrate, y luego descargar el video en formato MP4.

## Características

- Análisis de metadatos (resolución, códec, FPS, bitrate)
- Descarga de videos en formato MP4
- Interfaz gráfica con barra de progreso
- Procesamiento multihilo

## Requisitos

- Node.js
- FFmpeg

## Instalación

1. Clonar el repositorio:

```bash
gh repo clone DanielLazaro1555/Flutterffmpeg
```

2. Instalar dependencias:

```bash
npm install
```

## Uso

1. Iniciar la aplicación:

```bash
npm start
```

2. Analizar video:

- Ingresar URL M3U8
- Hacer clic en "Analizar URL"
- Ver metadatos

3. Descargar video:

- Ingresar nombre del archivo
- Hacer clic en "Descargar"
- Esperar que complete la barra de progreso

## Comandos FFmpeg

Analizar metadatos:

```bash
ffmpeg -i "URL_M3U8"
```

Descargar y convertir:

```bash
ffmpeg -i "URL_M3U8" -c:v libx264 -c:a aac -strict experimental -threads 0 output.mp4
```

## Estructura

```
Flutterffmpeg/
├── node_modules/
├── public/
│   └── index.html
├── src/
│   ├── main/
│   │   └── main.js
│   ├── assets/
│   │   └── main.js
│   └── renderer/
│       ├── renderer.js
│       └── styles.css
├── package.json
├── package-lock.json
└── README.md
```
