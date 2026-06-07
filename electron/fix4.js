const Jimp = require('jimp');
const path = require('path');

async function fixIcon() {
  try {
    const inputPath = path.join(__dirname, 'icons', 'icon.png'); // original
    const outputPath = path.join(__dirname, 'icons', 'icon_fixed4.png');
    
    const image = await Jimp.read(inputPath);
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    
    // We will do a BFS flood fill from the edges to make white/near-white transparent.
    // This removes the white background/border but leaves the white inside the sword untouched.
    const visited = new Uint8Array(w * h);
    const stack = [];
    
    // Add all edge pixels to the stack
    for(let x=0; x<w; x++) { stack.push([x, 0]); stack.push([x, h-1]); }
    for(let y=0; y<h; y++) { stack.push([0, y]); stack.push([w-1, y]); }
    
    function isWhite(color) {
      const r = (color >> 24) & 255;
      const g = (color >> 16) & 255;
      const b = (color >> 8) & 255;
      // High threshold to only catch the white background/border
      return r > 240 && g > 240 && b > 240;
    }
    
    while(stack.length > 0) {
      const [x, y] = stack.pop();
      if(x < 0 || x >= w || y < 0 || y >= h) continue;
      
      const idx = y * w + x;
      if(visited[idx]) continue;
      visited[idx] = 1;
      
      const color = image.getPixelColor(x, y);
      if(isWhite(color)) {
        // Make it transparent
        image.setPixelColor(0x00000000, x, y);
        // Add neighbors
        stack.push([x+1, y]);
        stack.push([x-1, y]);
        stack.push([x, y+1]);
        stack.push([x, y-1]);
      }
    }
    
    await image.writeAsync(outputPath);
    console.log("Flood fill transparent background applied successfully.");
  } catch(err) {
    console.error(err);
  }
}
fixIcon();
