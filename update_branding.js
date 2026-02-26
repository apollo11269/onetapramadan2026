const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

const newFooterCode = `.setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })`;

// Regex to capture existing setFooter calls. 
// It usually looks like .setFooter({ text: '...' }) or .setFooter({ text: '...', iconURL: ... })
const footerRegex = /\.setFooter\s*\(\s*{[^}]*text:[^}]*}\s*\)/g;
// Regex for colors to standardize to a dark theme or keep functional colors?
// User said "Start by creating index.css" (web app context), but this is a bot.
// "Make all embeds and messages elegant". Dark theme 0x2B2D31 is good.
// I will replace specific hex colors with 0x2B2D31 EXCEPT for Red/Green/Orange which signify status? 
// Actually, user wants "advanced", maybe I should leave status colors alone but change the Neutral ones.
// Let's stick to Footer first as it's the specific text request.

let updatedCount = 0;

files.forEach(file => {
    const filePath = path.join(commandsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if client is available in execute parameters, if not verify usage
    // Most start with: execute: async (client, message

    // Replace Footer
    if (footerRegex.test(content)) {
        let newContent = content.replace(footerRegex, newFooterCode);

        // Also simple string replacement if regex missed due to formatting
        // newContent = newContent.replace(/' WisdomVc - © V6..1 \| by APOllO ❤'/g, "'TMPv - Ramadan Version 🌛 By APOllO'");

        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated footer in ${file}`);
            updatedCount++;
        }
    }
});

console.log(`Total files updated: ${updatedCount}`);
