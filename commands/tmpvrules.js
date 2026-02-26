const { PermissionFlagsBits, Routes } = require('discord.js');

module.exports = {
    name: 'tmpvrules',
    description: 'Send the official temporary voice channel rules using advanced Layout Components V2.',
    execute: async (client, message) => {
        // التحقق من صلاحيات الإدارة
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ content: '❌ You do not have permission to use this command!', ephemeral: true });
        }

        const channelId = message.channelId;
        const arrow = '<a:wisdoarrow:1453486894779338885>';

        // ── بناء هيكل الرسالة باستخدام نظام Layout Components المتقدم ────────────────
        const payload = {
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // CONTAINER
                    accent_color: 2829617, // 0x2B2D31
                    components: [
                        {
                            type: 10, // Header
                            content: "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ 📜 **ONE TAP RULES**"
                        },
                        {
                            type: 12, // MEDIA_GALLERY (GIF)
                            items: [
                                {
                                    media: {
                                        url: "https://i.postimg.cc/BnJmCkH0/download-(9).gif"
                                    }
                                }
                            ]
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        {
                            type: 10, // GENERAL GUIDELINES
                            content: `<a:boost:1449497847094444083> **GENERAL GUIDELINES**\n\n${arrow} **Ownership:** Your One Tap = Your Rules. You have full control.\n${arrow} **Privacy:** Use \`.v lock\` to keep your conversations private.\n${arrow} **Toxicity:** No toxicity allowed unless the room is locked and clearly labeled.`
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        {
                            type: 10, // STRICT PROHIBITIONS
                            content: `<a:FZ_red_cross:1360451122807963770> **STRICT PROHIBITIONS**\n\n${arrow} **NSFW Content:** Streaming NSFW is strictly prohibited = **Permanent Ban**.\n${arrow} **Advertising:** Promoting other servers/links = **Permanent Ban**.\n${arrow} **Staff Impersonation:** Do not name rooms after staff for provocation.`
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        {
                            type: 10, // ADDITIONAL NOTES
                            content: `<a:notif:1447321335117123610> **ADDITIONAL NOTES**\n\n${arrow} Limit to **one** music bot per voice channel.\n${arrow} Do not abuse permissions. Report issues in ⁠⛔│NEED HELP.\n\n🎉 **HAVE FUN & ENJOY THE WISDOM EXPERIENCE!**`
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        // ── أزرار الروابط المحدثة بجمالية أكثر ────────────────────────
                        {
                            type: 9, // SECTION
                            components: [
                                {
                                    type: 10,
                                    content: "✦ ・ Review all server guidelines here."
                                }
                            ],
                            accessory: {
                                type: 2,
                                style: 5,
                                label: "Server Rules",
                                url: "https://discord.com/channels/1201626435958354021/1201647312842277046",
                                emoji: { name: "📜" }
                            }
                        },
                        {
                            type: 9, // SECTION
                            components: [
                                {
                                    type: 10,
                                    content: "✦ ・ Need help with TMPv commands?"
                                }
                            ],
                            accessory: {
                                type: 2,
                                style: 5,
                                label: "Tmpv Help",
                                url: "https://discord.com/channels/1201626435958354021/1374226261622259844",
                                emoji: { name: "🎙️" }
                            }
                        },
                        {
                            type: 9, // SECTION
                            components: [
                                {
                                    type: 10,
                                    content: "✦ ・ Contact support for any assistance."
                                }
                            ],
                            accessory: {
                                type: 2,
                                style: 5,
                                label: "Need Help",
                                url: "https://discord.com/channels/1201626435958354021/1352049837742231573",
                                emoji: { name: "🆘" }
                            }
                        },
                        {
                            type: 14 // SEPARATOR
                        },
                        {
                            type: 10, // FOOTER
                            content: "Wisdom TMPV Rules 📩 | “Respect is earned by giving it.” ❤ - APOllO"
                        }
                    ]
                }
            ]
        };

        try {
            await message.delete().catch(() => { });
            await client.rest.post(Routes.channelMessages(channelId), { body: payload });
        } catch (error) {
            console.error('Error sending V2 rules:', error);
        }
    }
};