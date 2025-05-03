import fs from 'fs'

// Create Firefox directory
console.log('Creating Firefox build...')
if (fs.existsSync('dist-firefox')) {
  console.log('Cleaning existing Firefox build directory...')
  fs.rmSync('dist-firefox', { recursive: true, force: true })
}
fs.mkdirSync('dist-firefox', { recursive: true })

// Copy files
console.log('Copying files to Firefox build directory...')
fs.cpSync('dist', 'dist-firefox', { recursive: true })

// Step 3: Create Firefox manifest
const chromeManifest = JSON.parse(
  fs.readFileSync('./dist/manifest.json', 'utf8'),
)
const firefoxManifest = {
  ...chromeManifest,
  background: {
    scripts: ['background/background.js'],
  },
  browser_specific_settings: {
    gecko: {
      id: 'contact@iveplay.io',
    },
  },
}

// Step 4: Save Firefox manifest
fs.writeFileSync(
  './dist-firefox/manifest.json',
  JSON.stringify(firefoxManifest, null, 2),
)

// Step 5: Pack for Firefox
console.log('Firefox build created in dist-firefox')
