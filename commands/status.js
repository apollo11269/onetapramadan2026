const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'status',
  description: 'Change the status/description of your voice channel',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    
    if (!voiceChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ خطأ')
        .setDescription('يجب أن تكون في قناة صوتية لاستخدام هذا الأمر!')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
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
    
    // Get the new status from arguments
    const newStatus = args.join(' ');
    
    if (!newStatus) {
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📝 حالة مطلوبة')
        .setDescription('يرجى إدخال حالة للقناة. مثال: `.v status حالتي هنا`')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
    
    if (newStatus.length > 100) {
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('⚠️ الحالة طويلة')
        .setDescription('يجب أن تكون الحالة 100 حرفًا أو أقل.')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
    
    try {
      // Store the status in the channel data
      if (!channelData.settings) {
        channelData.settings = {};
      }
      channelData.settings.status = newStatus;
      
      // Use Discord API directly to set voice channel status
      const response = await fetch(`https://discord.com/api/v10/channels/${voiceChannel.id}/voice-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${client.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (response.ok) {
        {
          const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('✅ تم التحديث')
            .setDescription(`تم تحديث حالة القناة بنجاح.\n📝 **${newStatus}**`)
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
          message.reply({ embeds: [embed] });
        }
      } else {
        const errorData = await response.text();
        console.error('Discord API Error:', response.status, errorData);
        
        // Fallback: still store the status in memory
        {
          const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ تم الحفظ فقط')
            .setDescription(`تم حفظ الحالة داخليًا لكن تعذر تحديث حالة ديسكورد: ${response.status}.\n📝 **${newStatus}**`)
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
          message.reply({ embeds: [embed] });
        }
      }
      
    } catch (error) {
      console.error('Error updating channel status:', error);
      
      // If updating the status fails, still store the status in memory
      if (!channelData.settings) {
        channelData.settings = {};
      }
      channelData.settings.status = newStatus;
      
      {
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('⚠️ تم الحفظ مع خطأ')
          .setDescription(`تم حفظ الحالة لكن تعذر تحديثها: ${error.message}.\n📝 **${newStatus}**`)
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        message.reply({ embeds: [embed] });
      }
    }
  }
};
