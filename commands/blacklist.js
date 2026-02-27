const { PermissionFlagsBits, EmbedBuilder, Routes } = require('discord.js');
const { addBlacklist } = require('../utils/blacklistStorage');

module.exports = {
    name: 'blacklist',
    description: 'Blacklist a user from creating temporary voice channels.',
    execute: async (client, message, args) => {
        // 1. Check Permissions
        const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
            (ADMIN_ROLE_ID && message.member.roles.cache.has(ADMIN_ROLE_ID));

        if (!hasPermission) {
            return message.reply({ content: '❌ You do not have permission to use this command!' });
        }

        // 2. Parse Arguments: .v blacklist @user <time> reason
        const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
        if (!targetUser) {
            return message.reply({ content: '❌ Usage: `.v blacklist @user <time> <reason>`' });
        }

        const timeArg = args[1];
        if (!timeArg) {
            return message.reply({ content: '❌ Please specify a duration (e.g., 1h, 1d, perm).' });
        }

        const reason = args.slice(2).join(' ');
        if (!reason) {
            return message.reply({ content: '❌ You must provide a reason for the blacklist!' });
        }

        let durationMs = null;
        let expiresAt = null;
        let displayTime = 'Permanent';

        if (timeArg.toLowerCase() !== 'perm') {
            const timeMatch = timeArg.match(/^(\d+)([smhd])$/);
            if (!timeMatch) {
                return message.reply({ content: '❌ Invalid time format! Use `1m`, `1h`, `1d`, or `perm`.' });
            }

            const amount = parseInt(timeMatch[1]);
            const unit = timeMatch[2];

            const unitMap = {
                's': 1000,
                'm': 1000 * 60,
                'h': 1000 * 60 * 60,
                'd': 1000 * 60 * 60 * 24
            };

            durationMs = amount * unitMap[unit];
            expiresAt = Date.now() + durationMs;
            displayTime = timeArg;
        }

        const arrow = '<a:wisdoarrow:1453486894779338885>';

        // 3. Add to Database
        addBlacklist(targetUser.id, message.author.id, expiresAt, reason);

        // If the user is currently in the Create Room channel, kick them out immediately
        try {
            const createRoomId = process.env.CREATE_ROOM_ID;
            const currChan = targetUser.voice.channel;
            if (currChan && (currChan.id === createRoomId || currChan.name.includes('Create Room') || currChan.name.startsWith('➕') || currChan.name.toLowerCase().includes('create'))) {
                await targetUser.voice.disconnect().catch(() => {});
            }
        } catch (e) {
            console.warn('Failed to disconnect blacklisted user from Create Room', e);
        }

        // 4. Construct V2 Response Payload
        const payload = {
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // CONTAINER
                    accent_color: 0xE74C3C, // Red
                    components: [
                        {
                            type: 10,
                            content: `## 🚫 **User Blacklisted**\n\n${arrow} **Target:** <@${targetUser.id}>\n${arrow} **Duration:** \`${displayTime}\`\n${arrow} **Reason:** \`${reason}\`\n${arrow} **Moderator:** <@${message.author.id}>`
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        {
                            type: 10,
                            content: "Wisdom TMPV Rules 📩 | “Respect is earned by giving it.” ❤ - APOllO"
                        }
                    ]
                }
            ]
        };

        // 5. Send DM to User
        const dmEmbed = new EmbedBuilder()
            .setTitle('🚫 **YOU HAVE BEEN BLACKLISTED**')
            .setColor(0xE74C3C)
            .setDescription(`
                > **Hello <@${targetUser.id}>,**
                You have been restricted from creating temporary voice channels in **${message.guild.name}**.
                
                **Details:**
                ${arrow} **Duration:** \`${displayTime}\`
                ${arrow} **Reason:** \`${reason}\`
                ${arrow} **Moderator:** <@${message.author.id}>
                
                *If you believe this is a mistake, please contact staff.*
            `)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'Wisdom Security System' })
            .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`Could not send DM to ${targetUser.user.tag}`);
        });

        // 6. Send Log to Channel
        const logChannelId = process.env.LOG_BLACKLIST_ID;
        if (logChannelId) {
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                await client.rest.post(Routes.channelMessages(logChannelId), { body: payload }).catch(console.error);
            }
        }

        // 7. Final Reply
        await client.rest.post(Routes.channelMessages(message.channelId), { body: payload });
    }
};
