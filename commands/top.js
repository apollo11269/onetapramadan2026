const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'top',
  description: 'Move the channel to the top of the category list.',
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
    
    await voiceChannel.setPosition(0);
    
    const successEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('⬆️ تم نقل القناة للأعلى')
      .setDescription('تم نقل القناة الصوتية إلى أعلى قائمة الفئة بنجاح!')
      .addFields(
        { name: '🎤 القناة', value: voiceChannel.name, inline: true },
        { name: '👤 بواسطة', value: `<@${message.author.id}>`, inline: true },
        { name: '📍 الموقع الجديد', value: 'أعلى القائمة', inline: true }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.reply({ embeds: [successEmbed] });
  }
};
