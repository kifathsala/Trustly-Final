import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// 1. Standard Brand SVG (for any purpose & apple-touch-icon)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="#09090b"/>
  <path d="M256 64 L416 128 V272 C416 368 256 448 256 448 C256 448 96 368 96 272 V128 Z" fill="url(#shieldGrad)" stroke="url(#bgGrad)" stroke-width="18"/>
  <path d="M256 340 C256 340 176 280 176 220 C176 185 204 168 232 184 C248 193 256 208 256 208 C256 208 264 193 280 184 C308 168 336 185 336 220 C336 280 256 340 256 340 Z" fill="url(#bgGrad)"/>
</svg>`;

// 2. Maskable SVG with 15% safe-zone padding and full-bleed dark background
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="shieldGradM" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
  </defs>
  <!-- Full-bleed background for maskable circle/squircle crops -->
  <rect width="512" height="512" fill="#09090b"/>
  <!-- Scaled and centered icon (within 75% safe area) -->
  <g transform="translate(64, 64) scale(0.75)">
    <path d="M256 64 L416 128 V272 C416 368 256 448 256 448 C256 448 96 368 96 272 V128 Z" fill="url(#shieldGradM)" stroke="url(#bgGradM)" stroke-width="20"/>
    <path d="M256 340 C256 340 176 280 176 220 C176 185 204 168 232 184 C248 193 256 208 256 208 C256 208 264 193 280 184 C308 168 336 185 336 220 C336 280 256 340 256 340 Z" fill="url(#bgGradM)"/>
  </g>
</svg>`;

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 2. 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 3. 512x512 maskable (with safe zone)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  // 4. 180x180 Apple Touch Icon (PNG)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. 64x64 Favicon PNG
  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created favicon.png');

  // 6. Keep favicon.svg updated
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg);
  console.log('✓ Updated favicon.svg');
}

generate().catch(console.error);
