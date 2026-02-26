const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'activityon',
  description: 'Enable activities like Watch Together.',
  execute: async (client, message) => {
    const voiceChannel = message.member.voice.channel;
    
    if (!voiceChannel) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **You must be in a voice channel to use this command!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }
    
    if (process.env.TEMP_ROOM_ROLE_ID) {
      const tempRole = message.guild.roles.cache.get(process.env.TEMP_ROOM_ROLE_ID);
      if (tempRole) {
        await voiceChannel.permissionOverwrites.edit(process.env.TEMP_ROOM_ROLE_ID, {
          UseEmbeddedActivities: true
        });
      }
    }
    
    const successEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('🎮 تم تفعيل الأنشطة')
      .setDescription('تم تفعيل الأنشطة مثل Watch Together بنجاح في القناة الصوتية!')
      .addFields(
        { name: '🎤 القناة', value: voiceChannel.name, inline: true },
        { name: '⚡ الحالة', value: 'مفعل', inline: true },
        { name: '👤 بواسطة', value: `<@${message.author.id}>`, inline: true },
        { name: '🎯 الأنشطة المتاحة', value: 'Watch Together, Games, وأكثر!', inline: false }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.reply({ embeds: [successEmbed] });
  }
};
