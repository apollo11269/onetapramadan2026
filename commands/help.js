const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show help information in the current channel.',
  execute: async (client, message) => {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('❌ خطأ')
        .setDescription('يجب أن تكون في قناة صوتية لاستخدام هذا الأمر!')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const helpEmbed = new EmbedBuilder()
      .setTitle('🎉 **WISDOM HELP CENTER**')
      .setColor(0x2B2D31)
      .setAuthor({
        name: 'Wisdom TEMP System',
        iconURL: client.user.displayAvatarURL()
      })
      .setDescription(`
        > **<a:boost:1449497847094444083> Your Personal Voice Control Center**
        
        *Command Prefix:* \`.v\`
      `)
      .addFields(
        {
          name: '<:voice3:1358152470081175622> **Room Control**',
          value: `> \`lock\` • \`unlock\` • \`hide\` • \`unhide\`
> \`limit <n>\` • \`name <text>\` • \`top\``,
          inline: false
        },
        {
          name: '<a:org:1449141144268308595> **User Manager**',
          value: `> \`invite @user\` • \`permit @user\`
> \`reject @user\` • \`kick @user\`
> \`transfer @user\` • \`claim\``,
          inline: true
        },
        {
          name: '<:voice2:1358152471687467228> **Utilities**',
          value: `> \`panel\` • \`vcinfo\` • \`save\`
> \`mute/unmute\` • \`cam-on/off\``,
          inline: true
        }
      )
      .setImage('https://i.ibb.co/mk6Tj1r/autovc.gif')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_info') // Reusing an existing ID or a simple one that triggers panel
          .setLabel('Vc INFOS ')
          .setEmoji('<a:info:1454901148547940442>')
          .setStyle(ButtonStyle.Secondary)
      );

    // Send the embed
    message.channel.send({ embeds: [helpEmbed], components: [row] });
  }
};
