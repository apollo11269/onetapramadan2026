const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Bot is ready. Searching for emojis...');
    try {
        for (const [id, guild] of client.guilds.cache) {
            console.log(`Checking guild: ${guild.name} (${id})`);
            const emojis = await guild.emojis.fetch();
            emojis.forEach(e => {
                console.log(`FOUND: ${e.name} -> <${e.animated ? 'a' : ''}:${e.name}:${e.id}>`);
            });
        }
    } catch (err) {
        console.error('Error fetching emojis:', err);
    } finally {
        client.destroy();
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Login failed:', err);
    process.exit(1);
});
