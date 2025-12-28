#!/usr/bin/env node

/**
 * Section Reorder Tool
 * Move gallery sections up, down, to top, or to bottom
 *
 * Usage:
 *   node reorder-sections.js
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

// Get current gallery order from config
function getGalleryConfigs() {
  const configPath = path.join(process.cwd(), 'tools/update-galleries.js');
  const content = fs.readFileSync(configPath, 'utf8');

  const configs = [];

  // Extract photography galleries
  const photographyMatch = content.match(/baseDir:\s*'photography'[\s\S]*?galleries:\s*\[([\s\S]*?)\]\s*\}/);
  if (photographyMatch) {
    const galleriesStr = photographyMatch[1];
    const galleries = [];

    // Extract each gallery block
    const galleryBlocks = galleriesStr.split(/\},\s*\{/).map((block, index, arr) => {
      if (index === 0) block = block.replace(/^\s*\{/, '');
      if (index === arr.length - 1) block = block.replace(/\}\s*$/, '');
      return '{' + block + '}';
    });

    galleryBlocks.forEach(block => {
      const folderMatch = block.match(/folder:\s*'([^']+)'/);
      const titleMatch = block.match(/title:\s*'([^']+)'/);
      if (folderMatch && titleMatch) {
        galleries.push({
          folder: folderMatch[1],
          title: titleMatch[1],
          fullBlock: block
        });
      }
    });

    if (galleries.length > 0) {
      configs.push({
        baseDir: 'photography',
        galleries: galleries,
        fullMatch: photographyMatch[0]
      });
    }
  }

  // Extract graphic-design galleries
  const graphicDesignMatch = content.match(/baseDir:\s*'graphic-design'[\s\S]*?galleries:\s*\[([\s\S]*?)\]\s*\}/);
  if (graphicDesignMatch) {
    const galleriesStr = graphicDesignMatch[1];
    const galleries = [];

    // Extract each gallery block
    const galleryBlocks = galleriesStr.split(/\},\s*\{/).map((block, index, arr) => {
      if (index === 0) block = block.replace(/^\s*\{/, '');
      if (index === arr.length - 1) block = block.replace(/\}\s*$/, '');
      return '{' + block + '}';
    });

    galleryBlocks.forEach(block => {
      const folderMatch = block.match(/folder:\s*'([^']+)'/);
      const titleMatch = block.match(/title:\s*'([^']+)'/);
      if (folderMatch && titleMatch) {
        galleries.push({
          folder: folderMatch[1],
          title: titleMatch[1],
          fullBlock: block
        });
      }
    });

    if (galleries.length > 0) {
      configs.push({
        baseDir: 'graphic-design',
        galleries: galleries,
        fullMatch: graphicDesignMatch[0]
      });
    }
  }

  return { configs, content };
}

// Update gallery order in config file
function updateGalleryOrder(baseDir, newOrder, originalContent) {
  const configPath = path.join(process.cwd(), 'tools/update-galleries.js');

  // Find the section to replace
  const sectionRegex = new RegExp(`baseDir:\\s*'${baseDir}'[\\s\\S]*?galleries:\\s*\\[([\\s\\S]*?)\\]\\s*\\}`, 'm');
  const match = originalContent.match(sectionRegex);

  if (!match) {
    console.error(`Could not find section: ${baseDir}`);
    return false;
  }

  // Build new galleries array
  const newGalleriesStr = newOrder.map(g => '      ' + g.fullBlock.trim()).join(',\n      ');

  const newSection = match[0].replace(
    /galleries:\s*\[[^\]]*\]/,
    `galleries: [\n      ${newGalleriesStr}\n    ]`
  );

  const newContent = originalContent.replace(match[0], newSection);

  fs.writeFileSync(configPath, newContent, 'utf8');
  return true;
}

async function main() {
  console.log('\n📑 Gallery Section Reorder Tool\n');

  let { configs, content } = getGalleryConfigs();

  if (configs.length === 0) {
    console.log('No gallery sections found.\n');
    rl.close();
    return;
  }

  console.log('Which page do you want to reorder?\n');
  configs.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.baseDir} (${c.galleries.length} sections)`);
  });

  const pageChoice = await question('\nChoose page (enter number): ');
  const pageIndex = parseInt(pageChoice) - 1;

  if (isNaN(pageIndex) || pageIndex < 0 || pageIndex >= configs.length) {
    console.log('Invalid choice.\n');
    rl.close();
    return;
  }

  let galleries = configs[pageIndex].galleries;
  const baseDir = configs[pageIndex].baseDir;

  while (true) {
    console.log(`\n📂 ${baseDir}\n`);
    console.log('Current section order:');
    galleries.forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.title}`);
    });

    console.log('\nWhat do you want to do?');
    console.log('  [number] - Select a section to move');
    console.log('  s - Save and exit');
    console.log('  q - Cancel (discard changes)');

    const action = await question('\nChoose: ');

    if (action.toLowerCase() === 's') {
      // Save
      if (updateGalleryOrder(baseDir, galleries, content)) {
        console.log('\n✅ Section order saved!');
        console.log('Run "node tools/update-galleries.js" to apply changes.\n');
      } else {
        console.log('\n❌ Failed to save.\n');
      }
      break;
    } else if (action.toLowerCase() === 'q') {
      console.log('\nCancelled.\n');
      break;
    }

    const sectionIndex = parseInt(action) - 1;
    if (isNaN(sectionIndex) || sectionIndex < 0 || sectionIndex >= galleries.length) {
      console.log('\n❌ Invalid section number.');
      continue;
    }

    console.log(`\n📌 Selected: ${galleries[sectionIndex].title}`);
    console.log('\nWhere do you want to move it?');
    console.log('  u - Move UP');
    console.log('  d - Move DOWN');
    console.log('  t - Move to TOP');
    console.log('  b - Move to BOTTOM');
    console.log('  c - Cancel');

    const moveAction = await question('\nChoose: ');

    if (moveAction.toLowerCase() === 'u' && sectionIndex > 0) {
      // Move up
      [galleries[sectionIndex], galleries[sectionIndex - 1]] = [galleries[sectionIndex - 1], galleries[sectionIndex]];
      console.log('✓ Moved up');
    } else if (moveAction.toLowerCase() === 'd' && sectionIndex < galleries.length - 1) {
      // Move down
      [galleries[sectionIndex], galleries[sectionIndex + 1]] = [galleries[sectionIndex + 1], galleries[sectionIndex]];
      console.log('✓ Moved down');
    } else if (moveAction.toLowerCase() === 't') {
      // Move to top
      const item = galleries.splice(sectionIndex, 1)[0];
      galleries.unshift(item);
      console.log('✓ Moved to top');
    } else if (moveAction.toLowerCase() === 'b') {
      // Move to bottom
      const item = galleries.splice(sectionIndex, 1)[0];
      galleries.push(item);
      console.log('✓ Moved to bottom');
    } else if (moveAction.toLowerCase() === 'c') {
      console.log('Cancelled move');
    } else {
      console.log('❌ Invalid action or cannot move in that direction');
    }
  }

  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
