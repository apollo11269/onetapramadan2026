const { EmbedBuilder } = require('discord.js');
module.exports = {
  name: 'manhelp',
  description: 'Show help and instructions.',
  execute: async (client, message) => {
    const embed = new EmbedBuilder()
      .setTitle('**Temporary Channel Commands**')
      .setColor(0x3498db)
      .setDescription(
        '**Available Commands:**\n\n' +
        '- `.v permit @user`: Allow a specific user to join your temporary channel.\n' +
        '- `.v reject @user`: Prevent a specific user from joining.\n' +
        '- `.v permit-role @role`: Allow a specific role to join.\n' +
        '- `.v reject-role @role`: Prevent a specific role from joining.\n' +
        '- `.v lock`: Lock the voice channel, preventing others from joining.\n' +
        '- `.v unlock`: Unlock the voice channel, allowing users to join.\n' +
        '- `.v name <new-name>`: Change the name of the temporary voice channel.\n' +
        '- `.v limit <number>`: Set the user limit for the channel.\n' +
        '- `.v claim`: Claim ownership if the current owner leaves.\n' +
        '- `.v transfer @user`: Transfer channel ownership to another user.\n' +
        '- `.v invite @user`: Invite a user (add them to the allowed users).\n' +
        '- `.v owner`: Show the current owner of the temporary channel.\n' +
        '- `.v hide`: Hide the channel from temp room role.\n' +
        '- `.v unhide`: Make the channel visible to temp room role.\n' +
        '- `.v save`: Save the current channel settings to the database.\n' +
        '- `.v top`: Move the channel to the top of the category list.\n' +
        '- `.v cam-on`: Enable camera and streaming.\n' +
        '- `.v cam-off`: Disable camera and streaming.\n' +
        '- `.v sb-on`: Enable soundboard.\n' +
        '- `.v sb-off`: Disable soundboard.\n' +
        '- `.v activity-on`: Enable activities like watch together.\n' +
        '- `.v activity-off`: Disable activities.\n' +
        '- `.v sendchat`: Toggle chat permissions for temp room role.\n' +
        '- `.v panel`: Display a control panel with current temporary channel information.\n' +
        '- `.v vcinfo`: Display information about the current voice channel.\n' +
        '- `.v bl`: Display the blacklist.\n' +
        '- `.v wl`: Display the whitelist.\n\n' +
        '**Admin Only Commands:**\n' +
        '- `.v bot-join [channelId]`: Make the bot join a voice channel (admins only; you can specify an ID).\n' +
        '- `.v bot-leave [channelId]`: Make the bot leave a voice channel (admins only; you can specify an ID).'
      )
      .setImage('https://i.ibb.co/mk6Tj1r/autovc.gif')
      .setThumbnail('https://i.ibb.co/Qp1SXBz/wisdom-logo.png')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    message.reply({ embeds: [embed] });
  }
};
