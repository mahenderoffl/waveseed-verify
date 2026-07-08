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
  console.log('Processing logo-black.png...');
  const logoBase64 = await processImage(
    'C:\\WaveSeed Logos and Brand\\logo-black.png',
    (r, g, b) => (r > 200 && g > 200 && b > 200)
  );

  console.log('Processing Mahender Sign.jpg...');
  const sigBase64 = await processImage(
    'C:\\Users\\user\\Downloads\\Mahender Sign.jpg',
    (r, g, b) => (r > 175 && g > 190 && b > 198) || (r + g + b > 550)
  );

  const content = `// Generated transparent assets with embedded Base64 data URLs
export const LOGO_BASE64 = ${JSON.stringify(logoBase64)};
export const SIG_BASE64 = ${JSON.stringify(sigBase64)};
`;

  fs.writeFileSync('c:\\verifyws\\src\\templates\\assets.js', content);
  console.log('Successfully wrote transparent assets to src/templates/assets.js');
}

run().catch(console.error);
