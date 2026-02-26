const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bot',
  execute(client, message, args) {
    const embed = new EmbedBuilder()
      .setTitle('Project Information')
      .setDescription(`Created by Apollo Belvedere, owner of Wisdom Circle Community.\n\nThis bot is designed to manage temporary voice channels and enhance user comfort.\n\nIf you want to purchase this bot, contact Apollo Belvedere here: <@1329180315314556951>`)
      .setColor('#7289DA')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: 'Features', value: '🎙️ Manage Temp Voice Channels' },
        { name: 'Contact', value: '📧 Reach out to Apollo Belvedere' }
      );

    message.author.send({ embeds: [embed] }).catch(error => {
      console.error('Could not send DM to user:', error);
      const errEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ تعذّر إرسال رسالة خاصة')
        .setDescription('تعذر إرسال رسالة خاصة. يرجى التحقق من إعدادات الخصوصية لديك.')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      message.reply({ embeds: [errEmbed] });
    });
  }
};
