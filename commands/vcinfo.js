const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'vcinfo',
  description: 'Show info about the current voice channel.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **You must be in a voice channel to use this command!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }

    const membersList = voiceChannel.members.map(member => `<@${member.id}>`).join('\n') || 'لا يوجد أعضاء';
    const memberCount = voiceChannel.members.size;
    const userLimit = voiceChannel.userLimit || 'غير محدود';
    const bitrate = voiceChannel.bitrate / 1000; // Convert to kbps
    const region = voiceChannel.rtcRegion || 'تلقائي';
    
    // Get channel status if it's a temporary channel
    const channelData = tempChannels ? tempChannels.get(voiceChannel.id) : null;
    const channelStatus = channelData?.settings?.status || 'لا يوجد حالة';

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('<:voice2:1358152471687467228> معلومات القناة الصوتية')
      .setDescription('إليك معلومات مفصلة عن القناة الصوتية الحالية')
      .addFields(
        { name: '🎤 اسم القناة', value: voiceChannel.name, inline: true },
        { name: '🆔 معرف القناة', value: voiceChannel.id, inline: true },
        { name: '👥 عدد الأعضاء', value: `${memberCount}`, inline: true },
        { name: '<:voice4:1358152468273430718> الحد الأقصى', value: `${userLimit}`, inline: true },
        { name: '🎵 جودة الصوت', value: `${bitrate} kbps`, inline: true },
        { name: '🌍 المنطقة', value: region, inline: true },
        { name: '📝 حالة القناة', value: channelStatus, inline: false },
        { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(voiceChannel.createdTimestamp / 1000)}:F>`, inline: false },
        { name: '👤 الأعضاء الحاليون', value: memberCount > 0 ? membersList : 'لا يوجد أعضاء', inline: false }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};
