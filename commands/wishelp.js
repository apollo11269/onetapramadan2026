const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'wishelp',
  description: 'Show help information in the voice channel.',
  execute: async (client, message) => {
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

    // Create a beautiful help embed with all commands
    const helpEmbed = new EmbedBuilder()
      .setTitle('🎮 أوامر القناة الصوتية | WISDOM TEMP')
      .setColor(0x3498db)
      .setDescription(`
        ## 🌟 **مرحباً بك في نظام القنوات الصوتية المؤقتة**
    
        ### 🛠️ **الأوامر الأساسية**
        • \`.v vcinfo\` - <:voice2:1358152471687467228> عرض معلومات حول قناتك الصوتية
        • \`.v help\` - ❓ عرض جميع الأوامر المتاحة
        • \`.v claim\` - <a:12104crownpink:1449139449211387945> المطالبة بملكية القناة إذا غادر المالك الأصلي
        • \`.v owner\` - 👤 عرض المالك الحالي للقناة
    
        ### <:voice3:1358152470081175622> **إدارة القناة**
        • \`.v lock\` - <:voice3:1358152470081175622> قفل قناتك (اختصار: \`.v l\`)
        • \`.v unlock\` - <:voice1:1358152473403195555> فتح قناتك (اختصار: \`.v ul\`)
        • \`.v hide\` - <a:Red_Eye:1450210370487718071>‍🗨️ إخفاء قناتك عن الجميع
        • \`.v unhide\` - <a:Red_Eye:1450210370487718071> جعل قناتك مرئية مرة أخرى
        • \`.v limit <number>\` - 👥 تعيين حد المستخدمين لقناتك
        • \`.v name <new-name>\` - <:voice6:1358152460979404992> تغيير اسم قناتك
        • \`.v status <description>\` - 📝 تعيين حالة/وصف لقناتك
        • \`.v top\` - ⬆️ نقل قناتك إلى أعلى الفئة
    
        ### 👥 **إدارة المستخدمين**
        • \`.v invite @user\` - ✉️ دعوة مستخدم إلى قناتك
        • \`.v permit @user\` - ✅ السماح لمستخدم معين بالانضمام
        • \`.v reject @user\` - ❌ منع مستخدم معين من الانضمام
        • \`.v permit-role @role\` - 🏷️ السماح لرتبة معينة بالانضمام
        • \`.v reject-role @role\` - 🚫 منع رتبة معينة من الانضمام
        • \`.v transfer @user\` - <a:12104crownpink:1449139449211387945> نقل الملكية إلى مستخدم آخر
        • \`.v wl\` - 📋 عرض القائمة البيضاء
        • \`.v bl\` - 📋 عرض القائمة السوداء
    
        ### 🎛️ **ميزات القناة**
        • \`.v cam-on\` - 📹 تمكين الكاميرا والبث
        • \`.v activity-off\` - 🎮 تعطيل الأنشطة في قناتك
        • \`.v panel\` - 🎛️ عرض لوحة التحكم مع معلومات القناة
        • \`.v save\` - 💾 حفظ إعدادات قناتك
    
        ### ⚠️ **ملاحظات مهمة**
        • سيتم حذف غرفتك تلقائيًا عندما تكون فارغة
        • استخدم \`.v man-help\` للحصول على قائمة كاملة بجميع الأوامر
        • اتبع قواعد المجتمع في قناة القواعد
        • استمتع بوقتك! 🎉
      `)
      .setImage('https://i.ibb.co/mk6Tj1r/autovc.gif')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // Find or create the TEMP-HELP channel
    let textChannel = message.guild.channels.cache.find(
      channel => channel.name === 'TEMP-HELP' &&
      channel.type === ChannelType.GuildText && 
      channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)
    );

    if (!textChannel) {
      try {
        textChannel = await message.guild.channels.create({
          name: 'TEMP-HELP',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: message.author.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
          ],
        });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('❌ فشل الإنشاء')
          .setDescription('تعذر إنشاء قناة TEMP-HELP.')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }
    }

    // Send the help message to the TEMP-HELP channel
    message.channel.send({ embeds: [helpEmbed] });
  }
}
