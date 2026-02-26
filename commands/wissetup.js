const { PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
module.exports = {
  name: 'wissetup',
  description: 'Setup command for voice channels',
  execute: async (client, message) => {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('🚫 غير مسموح')
          .setDescription('تحتاج صلاحية "Manage Channels" لاستخدام هذا الأمر.')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const category = await message.guild.channels.create({
        name: 'ONE TAP AREA',
        type: ChannelType.GuildCategory
      });

      const createRoom = await message.guild.channels.create({
        name: '➕│Create Room',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.Connect],
          }
        ]
      });

      const helpChannel = await message.guild.channels.create({
        name: 'TEMP-HELP',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
          }
        ]
      });

      const rulesChannel = await message.guild.channels.create({
        name: '📖╿Rules temp',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages]
          }
        ]
      });

      const alcatrazChannel = await message.guild.channels.create({
        name: '🔏│Alcatraz',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            deny: [PermissionFlagsBits.Connect],
          }
        ]
      });

      await helpChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 WISD-TEMP Voice Channel System')
            .setColor(0x3498db)
            .setDescription(`
              ### 👋 **Welcome to the Voice Channel System!**
              
              #### 🔊 **How to Create Your Own Voice Channel**
              1. Join the **➕│Create Room** voice channel
              2. A new voice channel will be automatically created for you
              3. You'll be moved to your new channel automatically
              4. You'll receive a DM with available commands
              
              #### ⚙️ **Managing Your Channel**
            `)
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });

      await helpChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 WISD-TEMP Voice Channel Commands')
            .setColor(0x3498db)
            .setDescription(`
                    ### **Available Commands**

                    • \`.v lock\` - Lock your channel
                    • \`.v unlock\` - Unlock your channel
                    • \`.v name <new-name>\` - Change your channel name
                    • \`.v limit <number>\` - Set user limit for your channel
                    • \`.v invite @user\` - Invite a user to your channel
                    • \`.v reject @user\` - Reject a user from your channel
                    • \`.v permit-role @role\` - Allow a role to join
                    • \`.v reject-role @role\` - Reject a role from joining
                    • \`.v save\` - Save your channel settings
                    • \`.v status <description>\` - Set a status/description for your channel
                    • \`.v sb-off\` - Disable soundboard
                    • \`.v sb-on\` - Enable soundboard
                `)
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });

      // --- New Ask 2 Join Panel ---
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const askEmbed = new EmbedBuilder()
        .setTitle('<:voice2:1358152471687467228> **REQUEST ACCESS SYSTEM**')
        .setDescription(`
        > **<a:notif:1447321335117123610> Is the room you want to join locked?**
        Don't worry! You can now send a formal request to the owner.
        
        <a:org:1449141144268308595> **Process Details:**
        <:voice6:1358152460979404992> Click the button below to start.
        <:voice4:1358152468273430718> Select your desired locked room.
        <a:loading:1450241657261002864> The owner will be notified instantly.
        
        *Please await the owner's decision patiently.*
      `)
        .setColor(0x2B2D31)
        .setImage('https://i.postimg.cc/FzS0jDMg/download-(3).jpg') // Placeholder for a professional divider if needed
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

      const askRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ask_2_join')
          .setLabel('ASK 2 JOIN')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1448480591124369657') // <a:sad_op:1448480591124369657>
      );

      await helpChannel.send({
        embeds: [askEmbed],
        components: [askRow]
      });
      // ---------------------------

      const rulesEmbed = new EmbedBuilder()
        .setTitle('⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ 📜 ONE TAP RULES')
        .setColor(0x2B2D31)
        .setDescription(`
<a:boost:1449497847094444083> **GENERAL GUIDELINES**

<:voice6:1358152460979404992> **Ownership:** Your One Tap = Your Rules. You have full control.
<a:Red_Eye:1450210370487718071> **Privacy:** Use \`.v lock\` to keep your conversations private.
<a:notif:1447321335117123610> **Toxicity:** No toxicity allowed unless the room is locked and clearly labeled.

<a:FZ_red_cross:1360451122807963770> **STRICT PROHIBITIONS**

<a:warning_animated:1361729714259099809> **NSFW Content:** Streaming NSFW is strictly prohibited = **Permanent Ban**.
<a:warning_animated:1361729714259099809> **Advertising:** Promoting other servers/links = **Permanent Ban**.
<a:org:1449141144268308595> **Staff Impersonation:** Do not name rooms after staff for provocation.

<a:loading:1450241657261002864> **ADDITIONAL NOTES**
🎵 Limit to **one** music bot per voice channel.
👮 Do not abuse permissions. Report issues in ⁠⛔│NEED HELP.

🎉 **HAVE FUN & ENJOY THE WISDOM EXPERIENCE!**`)
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

      await rulesChannel.send({ embeds: [rulesEmbed] });

      {
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('✅ تم الإعداد')
          .setDescription(`التهيئة اكتملت بنجاح.
انضم إلى ${createRoom} لإنشاء روم مؤقت.
🆔 **Create Room ID:** \`${createRoom.id}\` (Copy this to CREATE_ROOM_ID in .env)
اطّلع على ${helpChannel} للمعلومات و${rulesChannel} للقوانين.
تم إنشاء قناة Alcatraz.`)
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error setting up channels:', error);
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('❌ فشل الإعداد')
        .setDescription('وقع خطأ أثناء إعداد القنوات. تحقق من صلاحيات البوت وحاول مجددًا.')
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      message.reply({ embeds: [embed] });
    }
  }
};
