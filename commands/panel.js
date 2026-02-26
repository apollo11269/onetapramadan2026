const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, Routes } = require('discord.js');

module.exports = {
  name: 'panel',
  description: 'Show the professional channel control panel V2.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;

    // مساعد لإرسال أخطاء أنيقة
    const sendError = async (msg) => {
      const errorPayload = {
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xE74C3C,
          components: [{
            type: 10,
            content: `> <a:warning_animated:1361729714259099809> **${msg}**`
          }]
        }]
      };
      return message.reply({ content: '', ...errorPayload });
    };

    if (!voiceChannel) return sendError('خاصك تكون ف شانيل صوتي باش تستعمل هاد الأمر!');

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return sendError('هادي ماشي شانيل مؤقت!');
    if (channelData.ownerId !== message.author.id) return sendError('غير المالك لي يقدر يستعمل التابلو!');

    const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || message.guild.id;
    const permissions = voiceChannel.permissionOverwrites.cache.get(targetRoleId);

    const isLocked = permissions?.deny?.has(PermissionFlagsBits.Connect) || false;
    const isHidden = permissions?.deny?.has(PermissionFlagsBits.ViewChannel) || false;
    const userLimit = voiceChannel.userLimit || 'بلا حدود';
    const arrow = '<a:wisdoarrow:1453486894779338885>';

    // ── بناء لوحة التحكم المتقدمة V2 ───────────────────────────────────────────
    const payload = {
      flags: 32768, // IS_COMPONENTS_V2
      components: [
        {
          type: 17, // CONTAINER
          accent_color: 2829617, // 0x2B2D31
          components: [
            {
              type: 10, // Header
              content: "## 🎛️ **CHANNEL CONTROL PANEL V2**"
            },
            {
              type: 12, // IMAGE (Banner)
              items: [{ media: { url: "https://i.postimg.cc/gkY14NCL/image.png" } }]
            },
            {
              type: 14 // SEPARATOR
            },
            {
              type: 10, // Info Section
              content: `### 📊 **Channel Statistics**\n${arrow} **Owner:** <@${channelData.ownerId}>\n${arrow} **Name:** \`${voiceChannel.name}\`\n${arrow} **Limit:** \`${userLimit}\`\n${arrow} **Members:** \`${voiceChannel.members.size}\`\n\n### 🛡️ **Status**\n${isLocked ? '<:voice3:1358152470081175622> **Locked**' : '<:voice1:1358152473403195555> **Unlocked**'} | ${isHidden ? '<a:Red_Eye:1450210370487718071> **Hidden**' : '<a:Eyes:1450279319971823789> **Visible**'}`
            },
            {
              type: 14 // SEPARATOR
            },
            // ── الأزرار التفاعلية (قفل / فتح) ────────────────────────
            {
              type: 9, // SECTION
              components: [{ type: 10, content: `**Security Controls**\nManage visibility and access.` }],
              accessory: {
                type: 2,
                style: isLocked ? 3 : 2, // Success green if locked, secondary if not
                label: isLocked ? "Unlock room" : "Lock room",
                custom_id: isLocked ? "panel_unlock" : "panel_lock",
                emoji: { id: isLocked ? "1358152473403195555" : "1358152470081175622" }
              }
            },
            {
              type: 9, // SECTION
              components: [{ type: 10, content: `**Visibility Controls**\nHide or show from others.` }],
              accessory: {
                type: 2,
                style: isHidden ? 3 : 2,
                label: isHidden ? "Unhide room" : "Hide room",
                custom_id: isHidden ? "panel_unhide" : "panel_hide",
                emoji: { id: isHidden ? "1450279319971823789" : "1450210370487718071", animated: true }
              }
            },
            {
              type: 14 // SEPARATOR
            },
            // ── أزرار الإعدادات (اسم / ليميت) ────────────────────────
            {
              type: 9, // SECTION
              components: [{ type: 10, content: `**Room Identity**\nChange name or user limit.` }],
              accessory: {
                type: 2,
                style: 2,
                label: "Rename Channel",
                custom_id: "panel_rename",
                emoji: { id: "1358152460979404992" }
              }
            },
            {
              type: 14 // SEPARATOR
            },
            {
              type: 10, // FOOTER
              content: "Wisdom Premium Panel 📩 | “Excellence is not an act, but a habit.” - APOllO"
            }
          ]
        },
        // لإضافة أزرار إضافية أسفل الكونتينر (مثل الحذف أو النقل)
        {
          type: 1, // Action Row (Classic)
          components: [
            new ButtonBuilder().setCustomId('panel_limit').setLabel('Limit').setEmoji('<:voice4:1358152468273430718>').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('panel_kick_all').setLabel('Kick All').setEmoji('<a:sssss:1450241657261002864>').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('panel_transfer').setLabel('Transfer').setEmoji('<a:12104crownpink:1449139449211387945>').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('panel_delete').setLabel('Delete Room').setEmoji('<:trash:1450280880881930341>').setStyle(ButtonStyle.Danger)
          ]
        }
      ]
    };

    try {
      await message.delete().catch(() => { });
      await client.rest.post(Routes.channelMessages(message.channelId), { body: payload });
    } catch (error) {
      console.error('Error sending V2 Panel:', error);
    }
  }
};
