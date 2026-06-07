const sharp = require('sharp');
const path = require('path');

async function padIcon() {
  const input = path.join(__dirname, 'icons', 'icon_fixed4.png');
  const output = path.join(__dirname, 'icons', 'icon_padded2.png');
  
  try {
    // Add only 40px of padding instead of 200px.
    // This is just enough (about 4%) to prevent the title bar from cutting the edges,
    // but without making the icon look tiny in the taskbar.
    await sharp(input)
      .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
          top: 40,
          bottom: 40,
          left: 40,
          right: 40,
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
