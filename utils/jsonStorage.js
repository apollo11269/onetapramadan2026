const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Path to the channels data file
const channelsFilePath = path.join(dataDir, 'channels.json');

// Initialize the channels file if it doesn't exist
if (!fs.existsSync(channelsFilePath)) {
  fs.writeFileSync(channelsFilePath, JSON.stringify({}), 'utf8');
}

// Load channels data from file
function loadChannels() {
  try {
    const data = fs.readFileSync(channelsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading channels data:', error);
    return {};
  }
}

// Save channels data to file
function saveChannels(channels) {
  try {
    fs.writeFileSync(channelsFilePath, JSON.stringify(channels, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving channels data:', error);
  }
}

// Convert Map to object for storage
function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value;
  }
  return obj;
}

// Convert object to Map for usage
function objectToMap(obj) {
  const map = new Map();
  for (const key in obj) {
    map.set(key, obj[key]);
  }
  return map;
}

module.exports = {
  loadChannels,
  saveChannels,
  mapToObject,
  objectToMap
};