const { PermissionFlagsBits, Routes } = require('discord.js');
const { removeBlacklist } = require('../utils/blacklistStorage');

module.exports = {
    name: 'rblacklist',
    description: 'Remove a user from the temporary voice channel blacklist.',
    execute: async (client, message, args) => {
        // 1. Check Permissions
        const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
            (ADMIN_ROLE_ID && message.member.roles.cache.has(ADMIN_ROLE_ID));

        if (!hasPermission) {
            return message.reply({ content: '❌ You do not have permission to use this command!' });
        }

        // 2. Parse Argument
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply({ content: '❌ Usage: `.v rblacklist <User ID or @Mention>`' });
        }

        const arrow = '<a:wisdoarrow:1453486894779338885>';

        // 3. Remove from Database
        const removed = removeBlacklist(targetId);

        if (!removed) {
            return message.reply({ content: `❌ User <@${targetId}> is not in the blacklist.` });
        }

        // 4. Construct V2 Response Payload
        const payload = {
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // CONTAINER
                    accent_color: 0x2ECC71, // Green
                    components: [
                        {
                            type: 10,
                            content: `## ✅ **User Unblacklisted**\n\n${arrow} **Target:** <@${targetId}>\n${arrow} **Action:** Access Restored\n${arrow} **Moderator:** <@${message.author.id}>`
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

        // 5. Try to notify the user via DM
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (targetMember) {
            const { EmbedBuilder } = require('discord.js');
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ **ACCESS RESTORED**')
                .setColor(0x2ECC71)
                .setDescription(`
                    > **Hello <@${targetId}>,**
                    Your restriction from creating temporary voice channels in **${message.guild.name}** has been removed.
                    
                    *You can now create voice rooms again.*
                `)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: 'Wisdom Security System' })
                .setTimestamp();

            await targetMember.send({ embeds: [dmEmbed] }).catch(() => { });
        }

        // 6. Final Reply
        await client.rest.post(Routes.channelMessages(message.channelId), { body: payload });
    }
};
