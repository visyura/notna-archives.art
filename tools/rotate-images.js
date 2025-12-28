#!/usr/bin/env node

/**
 * Standalone Image Rotation Tool
 * Rotates images in a folder to match desired orientation
 *
 * Usage:
 *   node rotate-images.js <folder-path> [horizontal|vertical]
 *   Example: node rotate-images.js photography/winter-cloak horizontal
 *   If orientation not specified, will detect majority and ask for confirmation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP'];

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('\n❌ Sharp library not installed.');
  console.error('   Install it with: npm install sharp\n');
  process.exit(1);
}

// Function to get image dimensions (accounting for EXIF orientation)
async function getImageDimensions(imagePath) {
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

// Main function
async function rotateImages(folderPath) {
  const fullPath = path.join(process.cwd(), folderPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Folder not found: ${folderPath}\n`);
    process.exit(1);
  }

  const files = fs.readdirSync(fullPath);
  const imageFiles = files.filter(file => imageExtensions.includes(path.extname(file)));

  if (imageFiles.length === 0) {
    console.log(`\n⚠️  No images found in ${folderPath}\n`);
    process.exit(0);
  }

  console.log(`\n🔍 Found ${imageFiles.length} images in ${folderPath}`);
  console.log('🔄 Analyzing image orientations...\n');

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
    process.exit(1);
  }

  // Count orientations (excluding squares)
  const nonSquareImages = imageData.filter(img => !img.isSquare);
  const portraitCount = nonSquareImages.filter(img => img.isPortrait).length;
  const landscapeCount = nonSquareImages.filter(img => img.isLandscape).length;

  if (nonSquareImages.length === 0) {
    console.log('✓ All images are square. No rotation needed.\n');
    process.exit(0);
  }

  console.log(`   Portrait: ${portraitCount}, Landscape: ${landscapeCount}`);

  // Check for command line orientation argument
  const orientationArg = process.argv[3];
  let targetOrientation;

  if (orientationArg === 'horizontal' || orientationArg === 'landscape') {
    targetOrientation = 'landscape';
  } else if (orientationArg === 'vertical' || orientationArg === 'portrait') {
    targetOrientation = 'portrait';
  } else {
    // Ask user to choose
    console.log('\nWhich orientation do you want for all images?');
    const choice = await question('Enter "h" for HORIZONTAL or "v" for VERTICAL: ');

    if (choice.toLowerCase() === 'h' || choice.toLowerCase() === 'horizontal') {
      targetOrientation = 'landscape';
    } else if (choice.toLowerCase() === 'v' || choice.toLowerCase() === 'vertical') {
      targetOrientation = 'portrait';
    } else {
      console.log('\n❌ Invalid choice. Cancelled.\n');
      rl.close();
      process.exit(1);
    }
  }

  const imagesToRotate = targetOrientation === 'portrait'
    ? imageData.filter(img => img.isLandscape)
    : imageData.filter(img => img.isPortrait);

  if (imagesToRotate.length === 0) {
    console.log(`\n✓ All images are already ${targetOrientation.toUpperCase()}.\n`);
    rl.close();
    process.exit(0);
  }

  console.log(`\n🔄 Rotating ${imagesToRotate.length} image(s) to ${targetOrientation.toUpperCase()}...\n`);

  let successCount = 0;
  for (const img of imagesToRotate) {
    // Rotate 90 degrees clockwise if target is portrait, counter-clockwise if landscape
    const degrees = targetOrientation === 'portrait' ? 90 : -90;
    console.log(`   Rotating: ${img.file}`);
    const success = await rotateImage(img.path, degrees);
    if (success) {
      successCount++;
    }
  }

  console.log(`\n✅ Rotated ${successCount} of ${imagesToRotate.length} images.`);
  console.log('🌐 Refresh your browser to see the updated images!\n');
  rl.close();
}

// Check for command line argument
const folderArg = process.argv[2];

if (!folderArg) {
  console.log('\n📸 Image Rotation Tool\n');
  console.log('Usage:');
  console.log('  node rotate-images.js <folder-path>\n');
  console.log('Examples:');
  console.log('  node rotate-images.js photography/winter-cloak');
  console.log('  node rotate-images.js graphic-design/my-project\n');
  process.exit(1);
}

rotateImages(folderArg);
