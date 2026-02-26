const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'reject',
  description: 'Block a specific user from joining your temp channel.',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    // ── FIX #1: resolve targetId first ───────────────────────────────────
    const mentionUser = message.mentions.users.first();
    let targetId = mentionUser?.id ?? (args[0] ? args[0].replace(/[^0-9]/g, '') : null);
    if (!targetId) return message.reply({ embeds: [err('يرجى منشن المستخدم أو توفير ID صحيح!')] });

    // ── FIX #2: check voiceChannel BEFORE using it (was crashing before) ─
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [err('You must be in a voice channel!')] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [err('This is not a temporary channel!')] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [err('You are not the owner of this channel!')] });

    // ── FIX #3: prevent rejecting yourself ───────────────────────────────
    if (targetId === message.author.id) return message.reply({ embeds: [err('You cannot reject yourself!')] });

    // ── FIX #4: prevent rejecting bots ───────────────────────────────────
    const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) return message.reply({ embeds: [err('لم يتم العثور على هذا المستخدم في السيرفر!')] });
    if (targetMember.user.bot) return message.reply({ embeds: [err('You cannot reject a bot!')] });

    // Target must be in the same voice channel
    if (targetMember.voice.channelId !== voiceChannel.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('❌ خطأ')
            .setDescription('لا يمكنك حظر هذا الشخص لأنه ليس موجوداً في قناتك الصوتية حالياً!')
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    if (!channelData.rejectedUsers) channelData.rejectedUsers = [];
    if (!channelData.allowedUsers) channelData.allowedUsers = [];

    if (channelData.rejectedUsers.includes(targetId)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ تحذير')
            .setDescription('المستخدم محظور بالفعل ولن يُسمح له بالانضمام لهذه الروم.')
            .addFields(
              { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
              { name: '🎤 القناة', value: voiceChannel.name, inline: true }
            )
            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    channelData.rejectedUsers.push(targetId);
    channelData.allowedUsers = channelData.allowedUsers.filter(id => id !== targetId);

    await voiceChannel.permissionOverwrites.edit(targetId, { Connect: false });

    const toxicChannelId = process.env.TOXIC;
    const toxicChannel = toxicChannelId ? client.channels.cache.get(toxicChannelId) : null;
    if (toxicChannel) await targetMember.voice.setChannel(toxicChannel).catch(() => { });

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('🚫 تم الحظر والنقل')
          .setDescription(`تم حظر **${targetMember.user.username}** من الانضمام لهذه الروم نهائيًا${toxicChannel ? ' وتم نقله إلى قناة Toxic' : ''}.`)
          .addFields(
            { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
            { name: '🎤 القناة', value: voiceChannel.name, inline: true },
            { name: '⚡ الحالة', value: 'محظور نهائيًا', inline: true }
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
      ]
    });
  }
};
