#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'

/**
 * Determine Chrome path based on platform
 */
function getChromePath() {
  switch (process.platform) {
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    default:
      return 'google-chrome'
  }
}

// Get the extension path - using the dist folder where vite builds to
const extensionPath = path.resolve(process.cwd(), 'dist')
const tempProfilePath = path.join(os.tmpdir(), `IVE-ChromeProfile`)

// Ensure the extension exists
if (!fs.existsSync(extensionPath)) {
  console.error(`❌ Extension not found at: ${extensionPath}`)
  console.error('   Please build the extension first with "npm run build"')
  process.exit(1)
}

// Create empty temp profile directory
if (!fs.existsSync(tempProfilePath)) {
  fs.mkdirSync(tempProfilePath, { recursive: true })
}

// Launch Chrome with the extension
const chromePath = getChromePath()
const chromeFlags = [
  `--load-extension=${extensionPath}`,
  `--user-data-dir=${tempProfilePath}`,
  '--no-first-run',
  '--no-default-browser-check',
]

// Handle Windows platform specially (needs shell)
const chromeProcess = spawn(
  process.platform === 'win32' ? `"${chromePath}"` : chromePath,
  chromeFlags,
  {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
)

chromeProcess.on('error', (err) => {
  console.error(`❌ Failed to start Chrome: ${err.message}`)
  process.exit(1)
})

console.log(`✅ Chrome launched with extension loaded!`)
