#!/usr/bin/env node

/**
 * Gallery Auto-Update Script
 * Scans all gallery folders and regenerates galleries-data.js files
 *
 * Usage:
 *   node update-galleries.js
 */

const fs = require('fs');
const path = require('path');

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP'];

// Configuration: Define which folders contain galleries
const galleryConfigs = [
  {
    baseDir: 'photography',
    dataFile: 'photography/galleries-data.js',
    variableName: 'photographyGalleries',
    // Define gallery metadata - only folder name, title, description needed
    galleries: [
      { folder: 'winter-cloak', title: 'winter cloak under the sun', description: "we ain't got snow, but we got glitters" },
      { folder: 'test-session', title: 'test session', description: "just there but it's fun" }
    ]
  },
  {
    baseDir: 'graphic-design',
    dataFile: 'graphic-design/galleries-data.js',
    variableName: 'graphicDesignGalleries',
    galleries: [
      {
        folder: 'covers',
        title: 'Music Artworks',
        description: 'Covers of various tracks',
        customOrder: [
          'Visyura - Desolate (cover).png',
          'Visyura - Anima Sola (cover).png',
          'Visyura - EXPIATE (cover).png',
          'Popbot, Juha, Visyura, jhl, Fehu., glyphli, Exorbiter, (un)familiar, lukasipo) - Rope (cover).png',
          'Visyura - INNER FIELDS(cover).png',
          'Visyura - AIMLESS (cover).png',
          'Visyura - DISSOLVE (cover).png',
          'Visyura - FRAGMENTS (cover).png',
          'Visyura - ALLUVIUM (cover).png',
          'Visyura - A Spurious Porspering (Concept).png'
        ],
        customNotes: [
          'Album cover for Desolate',
          'Album cover for Anima Sola',
          'Album cover for EXPIATE',
          'Compilation album cover featuring multiple artists',
          'Album cover for INNER FIELDS',
          'Album cover for AIMLESS',
          'Album cover for DISSOLVE',
          'Album cover for FRAGMENTS',
          'Album cover for ALLUVIUM',
          'Concept art for A Spurious Porspering'
        ]
      },
      {
        folder: 'svp-urgent',
        title: 'SVP URGENT',
        description: 'A weekly series with friends where each created visual art based on the same word',
        customOrder: [
          'vsy_svp6_bang.png',
          'vsy_svp4_contain.png',
          'vsy_svp3_bow.png',
          'vsy_svp1_absorb.png'
        ],
        customNotes: [
          'SVP #6 - Bang',
          'SVP #4 - Contain',
          'SVP #3 - Bow',
          'SVP #1 - Absorb'
        ]
      },
      {
        folder: 'metal-birds',
        title: 'Metal Birds',
        description: 'Metalheart inspired thingy i made for postcard christmas gifts on a whim',
        customOrder: [
          'metal birds 2b.png',
          'metal birds 10.png',
          'metal birds 11.png',
          'metal birds 12.png',
          'metal birds 13.png',
          'metal birds 14.png',
          'metal birds 15.png',
          'metal birds 16.png',
          'metal birds 17.png',
          'metal birds 18.png'
        ],
        customNotes: [
          'Metal Birds 2b',
          'Metal Birds 10',
          'Metal Birds 11',
          'Metal Birds 12',
          'Metal Birds 13',
          'Metal Birds 14',
          'Metal Birds 15',
          'Metal Birds 16',
          'Metal Birds 17',
          'Metal Birds 18'
        ]
      }
    ]
  }
];

// Function to check if a path is a directory
function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (e) {
    return false;
  }
}

// Function to get all image files in a folder
function getImageFiles(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    return files
      .filter(file => imageExtensions.includes(path.extname(file)))
      .sort();
  } catch (e) {
    console.error(`Error reading folder ${folderPath}: ${e.message}`);
    return [];
  }
}

// Function to generate image notes from filenames
function generateNotes(imageFiles) {
  return imageFiles.map(file => {
    const nameWithoutExt = path.basename(file, path.extname(file));
    return nameWithoutExt.replace(/[-_]/g, ' ');
  });
}

// Function to update a galleries-data.js file
function updateGalleriesDataFile(config) {
  console.log(`\n📂 Processing ${config.baseDir}/`);

  const galleriesData = [];

  for (const gallery of config.galleries) {
    const folderPath = path.join(process.cwd(), config.baseDir, gallery.folder);

    if (!isDirectory(folderPath)) {
      console.log(`   ⚠️  Skipping ${gallery.folder} - folder not found`);
      continue;
    }

    const imageFiles = getImageFiles(folderPath);

    if (imageFiles.length === 0) {
      console.log(`   ⚠️  Skipping ${gallery.folder} - no images found`);
      continue;
    }

    // Use custom image order if provided, otherwise use alphabetical
    let orderedImages;
    if (gallery.customOrder) {
      // Map custom order to full paths
      orderedImages = gallery.customOrder.map(file => `${gallery.folder}/${file}`);
    } else {
      orderedImages = imageFiles.map(file => `${gallery.folder}/${file}`);
    }

    // Use custom notes if provided, otherwise generate from filenames
    const notes = gallery.customNotes || generateNotes(imageFiles);

    galleriesData.push({
      id: gallery.folder.toLowerCase().replace(/\s+/g, '-'),
      title: gallery.title,
      description: gallery.description,
      images: orderedImages,
      notes: notes,
      imageCount: imageFiles.length
    });

    console.log(`   ✓ ${gallery.title}: ${imageFiles.length} images`);
  }

  // Generate the JavaScript file content
  const fileContent = `// ${config.baseDir.charAt(0).toUpperCase() + config.baseDir.slice(1)} Galleries Data
// This file is auto-generated by update-galleries.js
// To update: add/remove images from gallery folders, then run: node update-galleries.js

const ${config.variableName} = [
${galleriesData.map(gallery => `  {
    id: "${gallery.id}",
    title: "${gallery.title}",
    description: "${gallery.description}",
    images: [
${gallery.images.map(img => `      "${img}",`).join('\n')}
    ],
    notes: [
${gallery.notes.map(note => `      "${note}",`).join('\n')}
    ]
  }`).join(',\n')}
];
`;

  // Write to file
  const outputPath = path.join(process.cwd(), config.dataFile);
  fs.writeFileSync(outputPath, fileContent, 'utf8');

  console.log(`   ✅ Updated ${config.dataFile}`);
}

// Main execution
console.log('\n🔄 Auto-updating gallery data files...');

for (const config of galleryConfigs) {
  updateGalleriesDataFile(config);
}

console.log('\n✨ Done! All gallery data files updated.');
console.log('🌐 Refresh your browser to see the changes.\n');
