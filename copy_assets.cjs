const fs = require('fs');
const path = require('path');

const srcHero = 'C:\\Users\\FTT\\.gemini\\antigravity-ide\\brain\\67aa2e64-8b6a-484c-aaf8-94f1067751c4\\store_hero_bg_1790401733239.jpg';
const srcLogo = 'C:\\Users\\FTT\\.gemini\\antigravity-ide\\brain\\67aa2e64-8b6a-484c-aaf8-94f1067751c4\\store_logo_badge_1790401769913.jpg';

const destDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

try {
  fs.copyFileSync(srcHero, path.join(destDir, 'store_hero_bg.jpg'));
  fs.copyFileSync(srcLogo, path.join(destDir, 'store_logo_badge.jpg'));
  console.log('Copied assets successfully');
} catch (err) {
  console.error('Copy failed:', err);
}
