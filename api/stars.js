const fs = require('fs');
const path = require('path');

const STARS_FILE = path.join(__dirname, 'stars-data.json');

// Load stars from file
function loadStars(req, res) {
  try {
    if (fs.existsSync(STARS_FILE)) {
      const data = fs.readFileSync(STARS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({ stars: [] });
    }
  } catch (error) {
    console.error('Error loading stars:', error);
    res.status(500).json({ error: 'Failed to load stars' });
  }
}

// Save star data
function saveStar(req, res) {
  try {
    const { id, x, y, text } = req.body;

    // Load existing stars
    let starsData = { stars: [] };
    if (fs.existsSync(STARS_FILE)) {
      const data = fs.readFileSync(STARS_FILE, 'utf8');
      starsData = JSON.parse(data);
    }

    // Find and update or add star
    const existingIndex = starsData.stars.findIndex(s => s.id === id);
    if (existingIndex >= 0) {
      starsData.stars[existingIndex] = { id, x, y, text };
    } else {
      starsData.stars.push({ id, x, y, text });
    }

    // Save to file
    fs.writeFileSync(STARS_FILE, JSON.stringify(starsData, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving star:', error);
    res.status(500).json({ error: 'Failed to save star' });
  }
}

module.exports = { loadStars, saveStar };
