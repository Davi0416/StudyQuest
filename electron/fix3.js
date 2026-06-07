const sharp = require('sharp');
const path = require('path');

async function fixIcon() {
  try {
    const inputPath = path.join(__dirname, 'icons', 'icon.png');
    const outputPath = path.join(__dirname, 'icons', 'icon_fixed3.png');
    
    let img = sharp(inputPath);
    let metadata = await img.metadata();
    
    // We use a larger radius (28%) to ensure the white corners are fully cut off,
    // and we do NOT crop the image so nothing gets cut in half.
    const rx = Math.floor(metadata.width * 0.28); 
    const svg = Buffer.from(
      `<svg><rect x="0" y="0" width="${metadata.width}" height="${metadata.height}" rx="${rx}" ry="${rx}" fill="#fff"/></svg>`
    );

    await img
      .composite([{
        input: svg,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);
      
    console.log("Fixed icon 3 created successfully.");
  } catch(err) {
    console.error("Error:", err);
  }
}

fixIcon();
