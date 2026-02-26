const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'unreject',
  description: 'Remove a user from the rejected list and allow joining.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('❌ خطأ').setDescription('يجب أن تكون في قناة صوتية لاستخدام هذا الأمر!').setTimestamp()] });
    }
    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **This is not a temporary channel!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }
    if (channelData.ownerId !== message.author.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription('> <a:warning_animated:1361729714259099809> **You are not the owner of this channel!**')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [errorEmbed] });
    }
    let targetId = null;
    const mention = message.mentions.users.first();
    if (mention) {
      targetId = mention.id;
    } else if (args[0]) {
      targetId = args[0].replace(/[^0-9]/g, '');
    }
    if (!targetId) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('❌ خطأ').setDescription('يرجى منشن المستخدم أو توفير ID صحيح!').setTimestamp()] });
    }
    if (!Array.isArray(channelData.rejectedUsers) || !channelData.rejectedUsers.includes(targetId)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('⚠️ تحذير').setDescription('المستخدم غير موجود ضمن قائمة المحظورين لهذه القناة.').setTimestamp()] });
    }
    channelData.rejectedUsers = channelData.rejectedUsers.filter(id => id !== targetId);
    try {
      await voiceChannel.permissionOverwrites.edit(targetId, { Connect: true });
    } catch {}
    const member = message.guild.members.cache.get(targetId);
    const username = member?.user?.username || targetId;
    const successEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('✅ تم إلغاء الحظر')
      .setDescription(`تم إلغاء حظر المستخدم **${username}** ويمكنه الانضمام مجددًا.`)
      .addFields(
        { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
        { name: '🎤 القناة', value: voiceChannel.name, inline: true }
      )
      .setTimestamp();
    message.reply({ embeds: [successEmbed] });
  }
};
