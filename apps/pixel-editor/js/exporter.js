// PNG 만들기·다운로드

import { SIZE } from './pixels.js';

export function renderToCanvas(pixels, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * scale;
  canvas.height = SIZE * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const color = pixels[y * SIZE + x];
      if (color === null) {
        continue;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function makeFileName(scale, date = new Date()) {
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const hms = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `pixel-art-${ymd}-${hms}-${scale}x.png`;
}

export function downloadPng(pixels, scale) {
  return new Promise((resolve, reject) => {
    let canvas;
    try {
      canvas = renderToCanvas(pixels, scale);
    } catch (err) {
      reject(err);
      return;
    }
    const fileName = makeFileName(scale);
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('toBlob returned null'));
          return;
        }
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.hidden = true;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            a.remove();
          }, 1000);
          resolve(fileName);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}
