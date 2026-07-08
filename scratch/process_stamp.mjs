import { Jimp } from 'jimp';
import fs from 'fs';

async function processImage(inputPath, thresholdCheck) {
  const image = await Jimp.read(inputPath);
  
  image.scan((x, y, idx) => {
    const r = image.bitmap.data[idx + 0];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    
    if (thresholdCheck(r, g, b)) {
      image.bitmap.data[idx + 3] = 0; // Transparent
    }
  });

  const buffer = await image.getBuffer('image/png');
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function run() {
  console.log('Processing Digital_Stamp_WaveSeed.png...');
  const stampBase64 = await processImage(
    'C:\\WaveSeed Logos and Brand\\Digital_Stamp_WaveSeed.png',
    // Make white/light-grey background transparent
    (r, g, b) => (r > 200 && g > 200 && b > 200) || (r + g + b > 600)
  );

  // Read current assets.js
  let assetsContent = fs.readFileSync('c:\\verifyws\\src\\templates\\assets.js', 'utf8');
  
  // Remove existing STAMP_BASE64 if any, and append new one
  assetsContent = assetsContent.replace(/export const STAMP_BASE64 = [\s\S]*?;/g, '');
  assetsContent += `\nexport const STAMP_BASE64 = ${JSON.stringify(stampBase64)};\n`;

  fs.writeFileSync('c:\\verifyws\\src\\templates\\assets.js', assetsContent);
  console.log('Successfully added transparent stamp asset to src/templates/assets.js');
}

run().catch(console.error);
