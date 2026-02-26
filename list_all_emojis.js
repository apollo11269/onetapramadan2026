const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Bot is ready. Listing all emojis in all guilds...');
    try {
        let count = 0;
        for (const [guildId, guild] of client.guilds.cache) {
            console.log(`Checking guild: ${guild.name} (${guildId})`);
            const emojis = await guild.emojis.fetch();
            console.log(`Number of emojis in ${guild.name}: ${emojis.size}`);
            emojis.forEach(e => {
                count++;
                console.log(`${count}. ${e.name} -> <${e.animated ? 'a' : ''}:${e.name}:${e.id}>`);
            });
        }
    } catch (err) {
        console.error('Error fetching emojis:', err);
    } finally {
        client.destroy();
    }
});

client.login(process.env.DISCORD_TOKEN);
