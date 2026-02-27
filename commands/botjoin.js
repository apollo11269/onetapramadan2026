const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

module.exports = {
  name: 'botjoin',
  description: 'Make the bot join a voice channel. Admins may provide a channel ID as argument.',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    if (!message.member.permissions.has('Administrator')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🚫 غير مسموح')
            .setDescription('هذا الأمر متاح فقط للأدمن!')
            .addFields({ name: '🔐 الصلاحيات المطلوبة', value: 'Administrator', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // allow specifying a channel ID as first arg (admin only, does not require being in it)
    let voiceChannel;
    if (args[0]) {
      const id = args[0].replace(/[<@#>]/g, '');
      voiceChannel = message.guild.channels.cache.get(id) || await message.guild.channels.fetch(id).catch(() => null);
      if (!voiceChannel || voiceChannel.type !== 2 /*GuildVoice*/) {
        return message.reply({ embeds: [err('Channel not found or is not a voice channel!')] });
      }
    } else {
      voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply({ embeds: [err('You must be in a voice channel or provide a channel ID!')] });
    }

    const createRoomId = process.env.CREATE_ROOM_ID;
    if (voiceChannel.id === createRoomId || voiceChannel.name.includes('Create Room') || voiceChannel.name.includes('➕')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🚫 غير مسموح')
            .setDescription('البوت موجود بالفعل في قناة Create Room!')
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    const channelData = tempChannels.get(voiceChannel.id);

    if (channelData?.voiceConnection) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ البوت متصل بالفعل')
            .setDescription('البوت متصل بالفعل بهذه القناة الصوتية!')
            .addFields({ name: '💡 نصيحة', value: 'استخدم `.v bot-leave` لجعل البوت يغادر', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`Bot joined: ${voiceChannel.name}`);
      });
      connection.on('error', (err) => {
        console.error('Voice connection error (botjoin):', err);
      });

      // ── FIX: preserve ALL existing channelData fields ─────────────────
      if (channelData) {
        tempChannels.set(voiceChannel.id, { ...channelData, voiceConnection: connection });
      } else {
        tempChannels.set(voiceChannel.id, { voiceConnection: connection });
      }
      // ──────────────────────────────────────────────────────────────────

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🎤 البوت انضم للقناة')
            .setDescription('تم اتصال البوت بالقناة الصوتية بنجاح!')
            .addFields(
              { name: '🎤 القناة', value: voiceChannel.name, inline: true },
              { name: '👤 طلب من', value: `<@${message.author.id}>`, inline: true },
              { name: '💡 ملاحظة', value: 'استخدم `.v bot-leave` لجعل البوت يغادر', inline: false }
            )
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });

    } catch (error) {
      message.reply({ embeds: [err('حدث خطأ أثناء محاولة اتصال البوت بالقناة!')] });
    }
  }
};
