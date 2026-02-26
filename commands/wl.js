const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'wl',
  description: 'Show the whitelist.',
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

    if (!channelData || !channelData.allowedUsers || channelData.allowedUsers.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📋 القائمة البيضاء')
        .setDescription('لا يوجد مستخدمون في القائمة البيضاء حالياً')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '<:voice2:1358152471687467228> العدد', value: '0', inline: true }
        )
        .setThumbnail('https://i.ibb.co/Qp1SXBz/wisdom-logo.png')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    const whitelist = channelData.allowedUsers.map(id => `<@${id}>`).join('\n');
    
    const whitelistEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('✅ القائمة البيضاء')
      .setDescription('المستخدمون المسموح لهم بالدخول:')
      .addFields(
        { name: '👥 المستخدمون المسموحون', value: whitelist, inline: false },
        { name: '🎤 القناة', value: voiceChannel.name, inline: true },
        { name: '<:voice2:1358152471687467228> العدد', value: channelData.allowedUsers.length.toString(), inline: true }
      )
      .setThumbnail('https://i.ibb.co/Qp1SXBz/wisdom-logo.png')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [whitelistEmbed] });
  }
};
