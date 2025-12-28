#!/usr/bin/env node

/**
 * Interactive Gallery Generator
 * Lets you select which folder to add and where to place it
 *
 * Usage:
 *   node gallery-generator.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP'];

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Function to check if a folder contains images
function hasImages(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    return files.some(file => {
      const ext = path.extname(file);
      return imageExtensions.includes(ext);
    });
  } catch (e) {
    return false;
  }
}

// Function to get all existing gallery IDs from a data file
function getExistingGalleryIds(dataFilePath) {
  try {
    const content = fs.readFileSync(dataFilePath, 'utf8');
    const idMatches = content.match(/id:\s*"([^"]+)"/g);
    if (!idMatches) return [];
    return idMatches.map(match => match.match(/"([^"]+)"/)[1]);
  } catch (e) {
    console.error(`Warning: Could not read ${dataFilePath}: ${e.message}`);
    return [];
  }
}

// Function to get existing gallery titles for display
function getExistingGalleries(dataFilePath) {
  try {
    const content = fs.readFileSync(dataFilePath, 'utf8');
    const galleries = [];

    // Match each gallery block
    const galleryRegex = /{\s*id:\s*"([^"]+)"[^}]*title:\s*"([^"]+)"/g;
    let match;
    while ((match = galleryRegex.exec(content)) !== null) {
      galleries.push({ id: match[1], title: match[2] });
    }

    return galleries;
  } catch (e) {
    return [];
  }
}

// Function to scan for new folders
function findNewFolders(parentDir, dataFile) {
  const parentPath = path.join(process.cwd(), parentDir);
  if (!fs.existsSync(parentPath)) return [];

  const existingIds = getExistingGalleryIds(path.join(process.cwd(), parentDir, dataFile));
  const folders = fs.readdirSync(parentPath, { withFileTypes: true });

  const newFolders = [];
  for (const folder of folders) {
    if (folder.isDirectory()) {
      const folderPath = path.join(parentPath, folder.name);
      const folderId = folder.name.toLowerCase().replace(/\s+/g, '-');

      // Check if folder has images and is not already in the data file
      if (hasImages(folderPath) && !existingIds.includes(folderId)) {
        const files = fs.readdirSync(folderPath);
        const imageCount = files.filter(f => imageExtensions.includes(path.extname(f))).length;

        newFolders.push({
          name: folder.name,
          path: `${parentDir}/${folder.name}`,
          dataFile: `${parentDir}/${dataFile}`,
          imageCount: imageCount
        });
      }
    }
  }

  return newFolders;
}

// Function to get image dimensions (accounting for EXIF orientation)
async function getImageDimensions(imagePath) {
  if (!sharp) {
    return null;
  }

  try {
    const metadata = await sharp(imagePath).metadata();

    // EXIF orientation values 5, 6, 7, 8 mean the image is rotated 90 or 270 degrees
    // So width and height are swapped from what the file actually contains
    const isRotated = metadata.orientation >= 5 && metadata.orientation <= 8;

    return {
      width: isRotated ? metadata.height : metadata.width,
      height: isRotated ? metadata.width : metadata.height,
      exifOrientation: metadata.orientation || 1
    };
  } catch (e) {
    console.error(`Error reading ${imagePath}: ${e.message}`);
    return null;
  }
}

// Function to rotate image physically
async function rotateImage(imagePath, degrees) {
  if (!sharp) {
    return false;
  }

  try {
    // Use withMetadata() to preserve quality, but rotate() will auto-orient first
    // Then apply additional rotation
    await sharp(imagePath)
      .rotate(degrees) // This auto-applies EXIF orientation first, then rotates
      .withMetadata({ orientation: 1 }) // Reset EXIF orientation to normal after rotation
      .toFile(imagePath + '.tmp');

    // Replace original with rotated version
    fs.unlinkSync(imagePath);
    fs.renameSync(imagePath + '.tmp', imagePath);
    return true;
  } catch (e) {
    console.error(`Error rotating ${imagePath}: ${e.message}`);
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(imagePath + '.tmp')) {
        fs.unlinkSync(imagePath + '.tmp');
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    return false;
  }
}

// Function to auto-rotate images in a folder to match majority orientation
async function autoRotateImages(folderPath) {
  if (!sharp) {
    console.log('⚠️  Sharp library not installed. Skipping auto-rotation.');
    console.log('   To enable auto-rotation, run: npm install sharp\n');
    return;
  }

  const fullPath = path.join(process.cwd(), folderPath);
  const files = fs.readdirSync(fullPath);
  const imageFiles = files.filter(file => imageExtensions.includes(path.extname(file)));

  if (imageFiles.length === 0) return;

  console.log('🔄 Analyzing image orientations...');

  // Get dimensions for all images
  const imageData = [];
  for (const file of imageFiles) {
    const imagePath = path.join(fullPath, file);
    const dims = await getImageDimensions(imagePath);
    if (dims) {
      imageData.push({
        path: imagePath,
        file: file,
        width: dims.width,
        height: dims.height,
        isPortrait: dims.height > dims.width,
        isLandscape: dims.width > dims.height,
        isSquare: dims.width === dims.height
      });
    }
  }

  if (imageData.length === 0) {
    console.log('⚠️  Could not analyze any images.\n');
    return;
  }

  // Count orientations (excluding squares)
  const nonSquareImages = imageData.filter(img => !img.isSquare);
  const portraitCount = nonSquareImages.filter(img => img.isPortrait).length;
  const landscapeCount = nonSquareImages.filter(img => img.isLandscape).length;

  if (nonSquareImages.length === 0) {
    console.log('✓ All images are square. No rotation needed.\n');
    return;
  }

  const majorityIsPortrait = portraitCount > landscapeCount;
  const majorityOrientation = majorityIsPortrait ? 'portrait' : 'landscape';
  const minorityImages = majorityIsPortrait
    ? imageData.filter(img => img.isLandscape)
    : imageData.filter(img => img.isPortrait);

  console.log(`   Portrait: ${portraitCount}, Landscape: ${landscapeCount}`);
  console.log(`   Majority: ${majorityOrientation.toUpperCase()}`);

  if (minorityImages.length === 0) {
    console.log('✓ All images already match majority orientation.\n');
    return;
  }

  console.log(`\n🔄 Rotating ${minorityImages.length} image(s) to match majority...\n`);

  let successCount = 0;
  for (const img of minorityImages) {
    // Rotate 90 degrees clockwise if majority is portrait, counter-clockwise if landscape
    const degrees = majorityIsPortrait ? 90 : -90;
    console.log(`   Rotating: ${img.file}`);
    const success = await rotateImage(img.path, degrees);
    if (success) {
      successCount++;
    }
  }

  console.log(`\n✅ Rotated ${successCount} of ${minorityImages.length} images.\n`);
}

// Function to generate gallery object for a folder
function generateGalleryObject(folderPath) {
  const fullPath = path.join(process.cwd(), folderPath);
  const folderName = path.basename(folderPath);

  // Get image files
  const files = fs.readdirSync(fullPath);
  const imageFiles = files
    .filter(file => imageExtensions.includes(path.extname(file)))
    .sort();

  if (imageFiles.length === 0) return null;

  // Generate data
  const galleryId = folderName.toLowerCase().replace(/\s+/g, '-');
  const galleryTitle = folderName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const images = imageFiles.map(file => `${folderName}/${file}`);
  const notes = imageFiles.map(file => {
    const nameWithoutExt = path.basename(file, path.extname(file));
    return nameWithoutExt.replace(/[-_]/g, ' ');
  });

  return {
    id: galleryId,
    title: galleryTitle,
    description: "",
    aspectRatio: "auto",
    images: images,
    notes: notes,
    imageCount: imageFiles.length
  };
}

// Function to add gallery to data file at specific position
function addGalleryToDataFile(dataFilePath, galleryObj, position) {
  try {
    const content = fs.readFileSync(dataFilePath, 'utf8');

    // Find the array opening bracket
    const arrayMatch = content.match(/const\s+\w+\s*=\s*\[/);
    if (!arrayMatch) {
      console.error(`Error: Could not find array in ${dataFilePath}`);
      return false;
    }

    let insertPosition;

    if (position === 0) {
      // Insert at the beginning (right after opening bracket)
      insertPosition = arrayMatch.index + arrayMatch[0].length;
    } else {
      // Find the Nth gallery closing brace
      const galleryRegex = /{\s*id:/g;
      let count = 0;
      let match;
      let lastEnd = arrayMatch.index + arrayMatch[0].length;

      while ((match = galleryRegex.exec(content)) !== null) {
        count++;
        if (count === position) {
          // Find the end of this gallery object
          let braceCount = 0;
          let pos = match.index;
          while (pos < content.length) {
            if (content[pos] === '{') braceCount++;
            if (content[pos] === '}') {
              braceCount--;
              if (braceCount === 0) {
                // Skip past the comma if there is one
                pos++;
                while (pos < content.length && /[\s,]/.test(content[pos])) {
                  pos++;
                }
                insertPosition = pos;
                break;
              }
            }
            pos++;
          }
          break;
        }
      }

      // If position is beyond existing galleries, insert at the end
      if (!insertPosition) {
        const closingBracket = content.lastIndexOf(']');
        insertPosition = closingBracket;
      }
    }

    // Format the gallery object as a string
    const galleryCode = `
  {
    id: "${galleryObj.id}",
    title: "${galleryObj.title}",
    description: "${galleryObj.description}",
    aspectRatio: "${galleryObj.aspectRatio}",
    images: [
${galleryObj.images.map(img => `      "${img}",`).join('\n')}
    ],
    notes: [
${galleryObj.notes.map(note => `      "${note}",`).join('\n')}
    ]
  },`;

    // Insert the gallery code
    const newContent = content.slice(0, insertPosition) + galleryCode + content.slice(insertPosition);

    // Write back to file
    fs.writeFileSync(dataFilePath, newContent, 'utf8');
    return true;
  } catch (e) {
    console.error(`Error adding gallery to ${dataFilePath}: ${e.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('\n🔍 Scanning for new galleries...\n');

  const photographyFolders = findNewFolders('photography', 'galleries-data.js');
  const graphicDesignFolders = findNewFolders('graphic-design', 'galleries-data.js');

  const allNewFolders = [...photographyFolders, ...graphicDesignFolders];

  if (allNewFolders.length === 0) {
    console.log('✅ No new galleries found. All folders are already in galleries-data.js files.\n');
    rl.close();
    return;
  }

  console.log(`📁 Found ${allNewFolders.length} new folder(s) with images:\n`);

  allNewFolders.forEach((folder, index) => {
    console.log(`  ${index + 1}. ${folder.name} (${folder.imageCount} images)`);
  });

  console.log('');
  const folderChoice = await question('Which folder do you want to add? (enter number or "q" to quit): ');

  if (folderChoice.toLowerCase() === 'q') {
    console.log('Cancelled.\n');
    rl.close();
    return;
  }

  const folderIndex = parseInt(folderChoice) - 1;
  if (isNaN(folderIndex) || folderIndex < 0 || folderIndex >= allNewFolders.length) {
    console.log('Invalid choice.\n');
    rl.close();
    return;
  }

  const selectedFolder = allNewFolders[folderIndex];
  console.log(`\n✓ Selected: ${selectedFolder.name}\n`);

  // Auto-rotate images to match majority orientation
  await autoRotateImages(selectedFolder.path);

  // Show existing galleries in the target file
  const existingGalleries = getExistingGalleries(selectedFolder.dataFile);
  console.log('Current galleries (in order):');
  existingGalleries.forEach((gallery, index) => {
    console.log(`  ${index + 1}. ${gallery.title}`);
  });

  console.log('\nWhere do you want to add it?');
  console.log(`  0. At the TOP (newest first)`);
  for (let i = 0; i < existingGalleries.length; i++) {
    console.log(`  ${i + 1}. After "${existingGalleries[i].title}"`);
  }

  const posChoice = await question('\nEnter position (0 for top): ');
  const position = parseInt(posChoice);

  if (isNaN(position) || position < 0 || position > existingGalleries.length) {
    console.log('Invalid position.\n');
    rl.close();
    return;
  }

  console.log('\n⚙️  Generating gallery...');
  const galleryObj = generateGalleryObject(selectedFolder.path);

  if (!galleryObj) {
    console.log('❌ Failed to generate gallery object.\n');
    rl.close();
    return;
  }

  console.log(`⚙️  Adding "${galleryObj.title}" to ${selectedFolder.dataFile}...`);
  const success = addGalleryToDataFile(selectedFolder.dataFile, galleryObj, position);

  if (success) {
    console.log(`✅ Successfully added!\n`);
    console.log('🌐 Refresh your browser to see the new gallery!\n');
  } else {
    console.log(`❌ Failed to add gallery.\n`);
  }

  rl.close();
}

main();
