#!/usr/bin/env node

/**
 * Add Gallery - Combined Script
 * Runs gallery-generator.js followed by update-galleries.js
 * Usage: node add-gallery.js
 */

const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('🎨 Starting gallery addition process...\n');

    // Step 1: Run gallery-generator.js
    console.log('📂 Step 1: Running gallery generator...');
    await runCommand('node', ['tools/gallery-generator.js']);

    console.log('\n✅ Gallery generator completed!\n');

    // Step 2: Run update-galleries.js
    console.log('🔄 Step 2: Updating all galleries...');
    await runCommand('node', ['tools/update-galleries.js']);

    console.log('\n🎉 All done! Your new gallery has been added and all data files are updated.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
