const sharp = require('sharp');
const fs = require('fs');

async function fixIcon() {
  try {
    const inputPath = 'icons/icon.png';
    const outputPath = 'icons/icon_fixed.png';
    
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    // Create a rounded rectangle SVG mask
    // We assume a ~15-20% border radius works well to hide the white corners
    const rx = Math.round(width * 0.18); 
    const svg = Buffer.from(
      `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="#fff"/></svg>`
    );

    await sharp(inputPath)
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
