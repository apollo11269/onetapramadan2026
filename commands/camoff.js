const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'camoff',
  description: 'Disable camera and streaming.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **You must be in a voice channel to use this command!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }

    const channelData = tempChannels.get(voiceChannel.id);

    if (!channelData) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **This is not a temporary channel!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }

    // Check if the user is the owner of the channel
    if (channelData.ownerId !== message.author.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **You are not the owner of this channel!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }

    if (process.env.TEMP_ROOM_ROLE_ID) {
      const tempRole = message.guild.roles.cache.get(process.env.TEMP_ROOM_ROLE_ID);
      if (tempRole) {
        await voiceChannel.permissionOverwrites.edit(process.env.TEMP_ROOM_ROLE_ID, {
          Stream: false
        });
      }
    }

    const successEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('📹 تم إيقاف الكاميرا والبث')
      .setDescription('تم إيقاف الكاميرا والبث المباشر في القناة بنجاح!')
      .addFields(
        { name: '🎤 القناة', value: voiceChannel.name, inline: true },
        { name: '👤 بواسطة', value: `<@${message.author.id}>`, inline: true },
        { name: '📺 الحالة', value: 'معطل', inline: true },
        { name: '🚫 الميزات المعطلة', value: '• الكاميرا 📹\n• البث المباشر 📡', inline: false }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [successEmbed] });
  }
};
