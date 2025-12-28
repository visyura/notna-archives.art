#!/usr/bin/env node

/**
 * Gallery Reorder Tool
 * Interactively reorder images in a gallery
 *
 * Usage:
 *   node reorder-gallery.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Read update-galleries.js to get all galleries
function getAllGalleries() {
  const configPath = path.join(process.cwd(), 'tools/update-galleries.js');
  const content = fs.readFileSync(configPath, 'utf8');

  const galleries = [];

  // Extract gallery configs
  const photographyMatch = content.match(/baseDir:\s*'photography'[\s\S]*?galleries:\s*\[([\s\S]*?)\]\s*\}/);
  const graphicDesignMatch = content.match(/baseDir:\s*'graphic-design'[\s\S]*?galleries:\s*\[([\s\S]*?)\]\s*\}/);

  if (photographyMatch) {
    const galleriesStr = photographyMatch[1];
    const folderMatches = galleriesStr.matchAll(/folder:\s*'([^']+)'/g);
    for (const match of folderMatches) {
      galleries.push({ folder: match[1], baseDir: 'photography' });
    }
  }

  if (graphicDesignMatch) {
    const galleriesStr = graphicDesignMatch[1];
    const folderMatches = galleriesStr.matchAll(/folder:\s*'([^']+)'/g);
    for (const match of folderMatches) {
      galleries.push({ folder: match[1], baseDir: 'graphic-design' });
    }
  }

  return galleries;
}

// Get images from a folder
function getImages(baseDir, folder) {
  const folderPath = path.join(process.cwd(), baseDir, folder);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP'];

  const files = fs.readdirSync(folderPath);
  return files.filter(file => imageExtensions.includes(path.extname(file))).sort();
}

// Update customOrder in update-galleries.js
function updateGalleryOrder(baseDir, folder, newOrder) {
  const configPath = path.join(process.cwd(), 'tools/update-galleries.js');
  let content = fs.readFileSync(configPath, 'utf8');

  // Find the gallery config
  const galleryRegex = new RegExp(`folder:\\s*'${folder}'[\\s\\S]*?(?=folder:|\\}\\s*\\])`);
  const match = content.match(galleryRegex);

  if (!match) {
    console.error(`Could not find gallery: ${folder}`);
    return false;
  }

  const galleryBlock = match[0];

  // Check if customOrder exists
  const hasCustomOrder = /customOrder:\s*\[/.test(galleryBlock);

  const orderArray = newOrder.map(img => `          '${img}'`).join(',\n');
  const customOrderBlock = `customOrder: [\n${orderArray}\n        ],`;

  let newGalleryBlock;
  if (hasCustomOrder) {
    // Replace existing customOrder
    newGalleryBlock = galleryBlock.replace(
      /customOrder:\s*\[[^\]]*\],?/,
      customOrderBlock
    );
  } else {
    // Add customOrder after aspectRatio
    newGalleryBlock = galleryBlock.replace(
      /(aspectRatio:\s*'[^']+',)/,
      `$1\n        ${customOrderBlock}`
    );
  }

  content = content.replace(galleryBlock, newGalleryBlock);
  fs.writeFileSync(configPath, content, 'utf8');
  return true;
}

async function main() {
  console.log('\n📸 Gallery Reorder Tool\n');

  const galleries = getAllGalleries();

  if (galleries.length === 0) {
    console.log('No galleries found.\n');
    rl.close();
    return;
  }

  console.log('Available galleries:\n');
  galleries.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.baseDir}/${g.folder}`);
  });

  const choice = await question('\nWhich gallery do you want to reorder? (enter number): ');
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= galleries.length) {
    console.log('Invalid choice.\n');
    rl.close();
    return;
  }

  const selected = galleries[index];
  const images = getImages(selected.baseDir, selected.folder);

  console.log(`\n📂 ${selected.baseDir}/${selected.folder} (${images.length} images)\n`);
  console.log('Current order:');
  images.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img}`);
  });

  console.log('\nHow do you want to reorder?');
  console.log('  r - Reverse order');
  console.log('  c - Custom order (enter numbers)');
  console.log('  q - Cancel');

  const action = await question('\nChoose action: ');

  let newOrder;

  if (action.toLowerCase() === 'r') {
    newOrder = [...images].reverse();
  } else if (action.toLowerCase() === 'c') {
    console.log('\nEnter the new order as comma-separated numbers.');
    console.log('Example: 3,1,2,4 (this puts image 3 first, then 1, then 2, then 4)');
    const orderInput = await question('New order: ');

    const indices = orderInput.split(',').map(n => parseInt(n.trim()) - 1);

    if (indices.some(i => isNaN(i) || i < 0 || i >= images.length)) {
      console.log('\n❌ Invalid order.\n');
      rl.close();
      return;
    }

    newOrder = indices.map(i => images[i]);
  } else {
    console.log('\nCancelled.\n');
    rl.close();
    return;
  }

  console.log('\nNew order:');
  newOrder.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img}`);
  });

  const confirm = await question('\nApply this order? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    if (updateGalleryOrder(selected.baseDir, selected.folder, newOrder)) {
      console.log('\n✅ Order updated in configuration!');
      console.log('Run "node tools/update-galleries.js" to regenerate data files.\n');
    } else {
      console.log('\n❌ Failed to update order.\n');
    }
  } else {
    console.log('\nCancelled.\n');
  }

  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
