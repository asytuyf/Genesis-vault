// Builds the home-screen and install icons from the site favicon.
//
// Run with: node scripts/gen-app-icons.cjs
//
// iOS ignores the web manifest when you add a site to the home screen: it wants
// a real PNG apple-touch-icon, and it paints transparency black. So the wings
// are flattened onto the site's own background colour and written as PNG.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE = path.join(__dirname, "..", "src", "app", "icon.png");
const APP_DIR = path.join(__dirname, "..", "src", "app");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const BACKGROUND = { r: 13, g: 13, b: 13, alpha: 1 }; // #0d0d0d, the site ground

/**
 * @param {number} size    finished square size in pixels
 * @param {number} inset   share of the square left empty around the artwork
 * @param {string} outPath where to write it
 */
async function render(size, inset, outPath) {
  const box = Math.round(size * (1 - inset * 2));
  const art = await sharp(SOURCE)
    .trim({ threshold: 10 })
    .resize(box, box, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(outPath);

  const { width, height } = await sharp(outPath).metadata();
  console.log(`${path.relative(process.cwd(), outPath)}  ${width}x${height}`);
}

(async () => {
  if (!fs.existsSync(SOURCE)) throw new Error(`Missing source icon: ${SOURCE}`);

  // iPhone and iPad home screen.
  await render(180, 0.12, path.join(APP_DIR, "apple-icon.png"));
  // Android and desktop install.
  await render(192, 0.12, path.join(PUBLIC_DIR, "icon-192.png"));
  await render(512, 0.12, path.join(PUBLIC_DIR, "icon-512.png"));
  // Maskable: Android crops to a circle, so the artwork sits well inside.
  await render(512, 0.2, path.join(PUBLIC_DIR, "icon-maskable-512.png"));
})();
