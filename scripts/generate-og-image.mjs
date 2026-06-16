import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e2d7bb;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#d8cdb3;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c4b89e;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#332c26" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Декоративная рамка -->
  <rect x="30" y="30" width="1140" height="570" rx="16" fill="none" stroke="#332c26" stroke-width="4" stroke-opacity="0.3"/>
  <rect x="44" y="44" width="1112" height="542" rx="12" fill="none" stroke="#ff7920" stroke-width="2" stroke-opacity="0.5"/>

  <!-- Заголовок -->
  <text x="600" y="260" font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#332c26" text-anchor="middle" filter="url(#shadow)">
    Last Hearth
  </text>

  <!-- Подзаголовок -->
  <text x="600" y="360" font-family="Georgia, serif" font-size="46" font-weight="normal" fill="#5c4030" text-anchor="middle">
    Ролевой сервер Vintage Story
  </text>

  <!-- Описание -->
  <text x="600" y="440" font-family="Georgia, serif" font-size="32" font-weight="normal" fill="#5c4030" text-anchor="middle">
    Поселения • Осады • Дипломатия • PvP
  </text>

  <!-- Сайт -->
  <text x="600" y="540" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#ff7920" text-anchor="middle">
    lasthearth.ru
  </text>
</svg>
`;

const outputPath = path.resolve('public/og-image.jpg');

sharp(Buffer.from(svg))
    .jpeg({ quality: 90, progressive: true })
    .toFile(outputPath)
    .then(() => {
        console.log(`OG-изображение создано: ${outputPath}`);
    })
    .catch((error) => {
        console.error('Ошибка генерации OG-изображения:', error);
        process.exit(1);
    });
