const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'save',
  description: 'Save the current channel settings to the database.',
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
    
    try {
      // Assuming you have a MongoDB model named TempChannel
      const TempChannel = require('../models/TempChannel');
      await TempChannel.findOneAndUpdate(
        { channelId: voiceChannel.id },
        { $set: channelData },
        { upsert: true }
      );

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('💾 تم حفظ الإعدادات')
        .setDescription('تم حفظ إعدادات القناة الحالية في قاعدة البيانات بنجاح!')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '<a:12104crownpink:1449139449211387945> المالك', value: `<@${message.author.id}>`, inline: true },
          { name: '🆔 معرف القناة', value: voiceChannel.id, inline: true },
          { name: '<:voice2:1358152471687467228> البيانات المحفوظة', value: `• معرف المالك: ${channelData.ownerId}\n• المستخدمون المسموح لهم: ${channelData.allowedUsers ? channelData.allowedUsers.length : 0}\n• حد المستخدمين: ${voiceChannel.userLimit || 'غير محدود'}`, inline: false },
          { name: '⏰ وقت الحفظ', value: new Date().toLocaleString('ar-EG'), inline: false }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ خطأ في الحفظ')
        .setDescription('حدث خطأ أثناء حفظ إعدادات القناة!')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '⚠️ نوع الخطأ', value: 'خطأ في قاعدة البيانات', inline: true },
          { name: '💡 الحل المقترح', value: 'حاول مرة أخرى أو اتصل بالدعم الفني', inline: false }
        )
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.reply({ embeds: [errorEmbed] });
    }
  }
};
