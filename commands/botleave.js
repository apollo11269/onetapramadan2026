const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'botleave',
  description: 'Make the bot leave a voice channel. Admins may provide a channel ID as argument.',
  execute: async (client, message, args, tempChannels) => {
    // Check if user has administrator permissions
    if (!message.member.permissions.has('Administrator')) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🚫 غير مسموح')
        .setDescription('هذا الأمر متاح فقط للأدمن!')
        .addFields(
          { name: '🔐 الصلاحيات المطلوبة', value: 'Administrator', inline: false },
          { name: '💡 معلومة', value: 'فقط الأدمن يمكنهم جعل البوت يغادر القنوات الصوتية', inline: false }
        )
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [noPermEmbed] });
    }

    // support optional channel-id argument
    let voiceChannel;
    if (args[0]) {
      const id = args[0].replace(/[<@#>]/g, '');
      voiceChannel = message.guild.channels.cache.get(id) || await message.guild.channels.fetch(id).catch(() => null);
      if (!voiceChannel || voiceChannel.type !== 2 /*GuildVoice*/) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setDescription('> <a:warning_animated:1361729714259099809> **Channel not found or not a voice channel!**')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
        return message.reply({ embeds: [errorEmbed] });
      }
    } else {
      voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setDescription('> <a:warning_animated:1361729714259099809> **You must be in a voice channel to use this command!**')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });
        return message.reply({ embeds: [errorEmbed] });
      }
    }

    // Check if this is the Create Room channel - bot should not leave it
    const createRoomId = process.env.CREATE_ROOM_ID;
    if (voiceChannel.id === createRoomId || voiceChannel.name.includes('Create Room') || voiceChannel.name.includes('➕│Create Room')) {

      const createRoomEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🚫 غير مسموح')
        .setDescription('لا يمكن جعل البوت يغادر قناة Create Room!')
        .addFields(
          { name: '🏠 قناة Create Room', value: 'البوت يجب أن يبقى في هذه القناة دائماً', inline: false },
          { name: '💡 معلومة', value: 'هذا الأمر يعمل فقط في القنوات المؤقتة', inline: false }
        )
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [createRoomEmbed] });
    }

    const channelData = tempChannels.get(voiceChannel.id);

    // Check if bot is connected to this channel
    if (!channelData || !channelData.voiceConnection) {
      const notConnectedEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('⚠️ البوت غير متصل')
        .setDescription('البوت ليس متصلاً بهذه القناة الصوتية!')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '💡 نصيحة', value: 'البوت سينضم تلقائياً عند إنشاء قناة جديدة', inline: false }
        )
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [notConnectedEmbed] });
    }

    try {
      // Disconnect the bot from voice channel
      channelData.voiceConnection.destroy();

      // Update channel data to remove voice connection
      if (channelData.ownerId) {
        // For temporary channels, keep owner data
        tempChannels.set(voiceChannel.id, {
          ownerId: channelData.ownerId
        });
      } else {
        // For regular channels, remove the entry completely
        tempChannels.delete(voiceChannel.id);
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🔇 البوت غادر القناة')
        .setDescription('تم قطع اتصال البوت من القناة الصوتية بنجاح!')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '👤 طلب من', value: `<@${message.author.id}>`, inline: true },
          { name: '⚡ الحالة', value: 'غير متصل', inline: true },
          { name: '💡 ملاحظة', value: 'يمكنك استخدام `.v bot-join` لجعل البوت ينضم مرة أخرى', inline: false }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error disconnecting bot from voice channel:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ خطأ في قطع الاتصال')
        .setDescription('حدث خطأ أثناء محاولة قطع اتصال البوت من القناة!')
        .addFields(
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '💡 نصيحة', value: 'حاول مرة أخرى أو اتصل بالمطور', inline: false }
        )
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [errorEmbed] });
    }
  }
};
