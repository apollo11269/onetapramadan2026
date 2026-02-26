module.exports = {
  name: 'vping',
  description: 'Ping command',
  execute: async (client, message) => {
    const { EmbedBuilder } = require('discord.js');
    const loading = new EmbedBuilder()
      .setColor('#2F3136')
      .setTitle('⏱️ جاري القياس...')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const sent = await message.channel.send({ embeds: [loading] });
    const ping = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    const result = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📡 معلومات الاتصال')
      .addFields(
        { name: 'Message Ping', value: `${ping}ms`, inline: true },
        { name: 'API Ping', value: `${apiPing}ms`, inline: true },
        { name: 'Bot Username', value: client.user.tag, inline: true },
        { name: 'Bot ID', value: client.user.id, inline: true },
        { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.users.cache.size}`, inline: true }
      )
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    return sent.edit({ embeds: [result] });
  }
};
