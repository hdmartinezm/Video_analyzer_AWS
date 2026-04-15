const { execFile } = require('child_process');
const { createReadStream, writeFileSync } = require('fs');
const { unlink } = require('fs/promises');
const os = require('os');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME;
const COOKIES_KEY = 'config/yt-cookies.txt';
const COOKIES_PATH = path.join(os.tmpdir(), 'yt-cookies.txt');

// Descarga el archivo de cookies desde S3 si existe
const fetchCookies = async () => {
  try {
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: COOKIES_KEY }));
    const chunks = [];
    for await (const chunk of Body) chunks.push(chunk);
    writeFileSync(COOKIES_PATH, Buffer.concat(chunks));
    console.log('[yt-dlp] Cookies cargadas desde S3');
    return true;
  } catch {
    return false;
  }
};

const downloadYoutubeVideo = async (videoUrl) => {
  const hasCookies = await fetchCookies();

  const COMMON_FLAGS = [
    '--no-playlist',
    '--js-runtimes', 'node',
    ...(hasCookies ? ['--cookies', COOKIES_PATH] : []),
  ];

  // Obtener el título del video
  const title = await new Promise((resolve) => {
    execFile('yt-dlp', [...COMMON_FLAGS, '--get-title', videoUrl], (err, stdout) => {
      resolve(err ? 'video' : stdout.trim());
    });
  });

  const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
  const fileName = `${safeTitle}-${Date.now()}.mp4`;
  const tmpPath = path.join(os.tmpdir(), fileName);

  // Descargar a archivo temporal (necesario para MP4 válido)
  await new Promise((resolve, reject) => {
    execFile('yt-dlp', [
      ...COMMON_FLAGS,
      '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', tmpPath,
      videoUrl
    ], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[yt-dlp error]', stderr);
        reject(new Error(`yt-dlp falló: ${stderr}`));
      } else {
        console.log(`[yt-dlp] Descargado en: ${tmpPath}`);
        resolve();
      }
    });
  });

  // Crear stream desde el archivo temporal y limpiarlo al terminar
  const videoStream = createReadStream(tmpPath);
  videoStream.on('close', () => {
    unlink(tmpPath).catch(() => {});
  });

  return { videoStream, fileName, contentType: 'video/mp4' };
};

module.exports = { downloadYoutubeVideo };
