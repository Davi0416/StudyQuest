const sharp = require('sharp');
const path = require('path');

async function fixIcon() {
  try {
    const inputPath = path.join(__dirname, 'icons', 'icon.png');
    const outputPath = path.join(__dirname, 'icons', 'icon_fixed2.png');
    
    let img = sharp(inputPath);
    let metadata = await img.metadata();
    
    const cropSize = Math.floor(metadata.width * 0.8);
    const offset = Math.floor(metadata.width * 0.1);
    
    let cropped = img.extract({ left: offset, top: offset, width: cropSize, height: cropSize });
    
    const rx = Math.floor(cropSize * 0.15); 
    const svg = Buffer.from(
      `<svg><rect x="0" y="0" width="${cropSize}" height="${cropSize}" rx="${rx}" ry="${rx}" fill="#fff"/></svg>`
    );

    await cropped
      .composite([{
        input: svg,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);
      
    console.log("Fixed icon created successfully.");
  } catch(err) {
    console.error("Error:", err);
  }
}

fixIcon();
