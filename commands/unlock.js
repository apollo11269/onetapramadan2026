const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setVoiceStatus, errorEmbed } = require('../utils/helpers');

module.exports = {
  name: 'unlock',
  description: 'Unlock the voice channel.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [errorEmbed('This is not a temporary channel!', client)] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || message.guild.id;

    try {
      // 1. Reset role permissions
      await voiceChannel.permissionOverwrites.edit(targetRoleId, {
        [PermissionFlagsBits.Connect]: true,
        [PermissionFlagsBits.Speak]: true,
        [PermissionFlagsBits.ViewChannel]: true
      });

      // 2. Sync members in channel (excluding rejected users)
      const membersInChannel = voiceChannel.members;
      for (const [memberId, member] of membersInChannel) {
        if (memberId === channelData.ownerId) continue;
        if (channelData.rejectedUsers?.includes(memberId)) continue;

        await voiceChannel.permissionOverwrites.edit(memberId, {
          [PermissionFlagsBits.Connect]: true,
          [PermissionFlagsBits.Speak]: true,
          [PermissionFlagsBits.ViewChannel]: true
        }).catch(() => { });
      }

      // 3. Update voice status helper
      await setVoiceStatus(voiceChannel.id, client.token, '**.v help/panel**  <a:FZ_red_cross:1360451122807963770>');

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`<:voice1:1358152473403195555> **CHANNEL UNLOCKED**`)
        .setDescription(`> <a:notif:1447321335117123610> **Channel is now open for everyone.**`)
        .addFields(
          { name: `<:voice2:1358152471687467228> Channel`, value: `${voiceChannel.name}`, inline: true },
          { name: `<a:org:1449141144268308595> Owner`, value: `<@${message.author.id}>`, inline: true }
        )
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      message.reply({ embeds: [errorEmbed('Failed to unlock the channel.', client)] });
    }
  }
};