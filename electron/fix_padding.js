const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function padIcon() {
  const input = path.join(__dirname, 'icons', 'icon.png');
  const output = path.join(__dirname, 'icons', 'icon_padded.png');
  
  try {
    // Add 15% transparent padding around the image by extending its canvas
    // then resizing it back to 1024x1024. This shrinks the actual icon content 
    // to give it a "safe zone" so the OS doesn't cut the edges in the title bar.
    await sharp(input)
      .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
          top: 200,
          bottom: 200,
          left: 200,
          right: 200,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(1024, 1024)
      .toFile(output);
      
      console.log("Padded successfully!");
  } catch (err) {
      console.error("Error:", err);
  }
}

padIcon();
