const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const blacklistFilePath = path.join(dataDir, 'blacklist.json');

if (!fs.existsSync(blacklistFilePath)) {
    fs.writeFileSync(blacklistFilePath, JSON.stringify({}), 'utf8');
}

function loadBlacklist() {
    try {
        const data = fs.readFileSync(blacklistFilePath, 'utf8');
        const parsed = JSON.parse(data);
        // Clean up expired ones
        const now = Date.now();
        let changed = false;
        for (const userId in parsed) {
            if (parsed[userId].expiresAt && parsed[userId].expiresAt < now) {
                delete parsed[userId];
                changed = true;
            }
        }
        if (changed) saveBlacklist(parsed);
        return parsed;
    } catch (error) {
        console.error('Error loading blacklist data:', error);
        return {};
    }
}

function saveBlacklist(blacklist) {
    try {
        fs.writeFileSync(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving blacklist data:', error);
    }
}

function isBlacklisted(userId) {
    const blacklist = loadBlacklist();
    if (blacklist[userId]) {
        const entry = blacklist[userId];
        if (!entry.expiresAt || entry.expiresAt > Date.now()) {
            return entry;
        } else {
            // Already expired (the loadBlacklist cleanup should handle this too)
            return null;
        }
    }
    return null;
}

function addBlacklist(userId, moderatorId, expiresAt, reason) {
    const blacklist = loadBlacklist();
    blacklist[userId] = {
        moderatorId,
        expiresAt, // can be null for permanent
        reason,
        timestamp: Date.now()
    };
    saveBlacklist(blacklist);
}

function removeBlacklist(userId) {
    const blacklist = loadBlacklist();
    if (blacklist[userId]) {
        delete blacklist[userId];
        saveBlacklist(blacklist);
        return true;
    }
    return false;
}

module.exports = { loadBlacklist, saveBlacklist, isBlacklisted, addBlacklist, removeBlacklist };
