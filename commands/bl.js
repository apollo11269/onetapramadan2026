const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bl',
  description: 'Show the blacklist.',
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

    if (!channelData || !channelData.rejectedUsers || channelData.rejectedUsers.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📋 القائمة السوداء')
        .setDescription('لا يوجد مستخدمون في القائمة السوداء حالياً')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '<:voice2:1358152471687467228> العدد', value: '0', inline: true }
        )
        .setThumbnail('https://i.ibb.co/Qp1SXBz/wisdom-logo.png')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    const blacklist = channelData.rejectedUsers.map(id => `<@${id}>`).join('\n');
    
    const blacklistEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('🚫 القائمة السوداء')
      .setDescription('المستخدمون المحظورون من الدخول:')
      .addFields(
        { name: '👥 المستخدمون المحظورون', value: blacklist, inline: false },
        { name: '🎤 القناة', value: voiceChannel.name, inline: true },
        { name: '<:voice2:1358152471687467228> العدد', value: channelData.rejectedUsers.length.toString(), inline: true }
      )
      .setThumbnail('https://i.ibb.co/Qp1SXBz/wisdom-logo.png')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [blacklistEmbed] });
  }
};
