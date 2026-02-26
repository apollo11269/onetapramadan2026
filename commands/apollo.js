const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'apollo',
  execute(client, message, args) {
    const embed = new EmbedBuilder()
      .setTitle('Hak azzin aliases dyal important commands')
      .setDescription(`Here are the aliases for important commands. If you want to see everything, use \`.v help\` or \`.v man-help\`:

      :lock: \`l\` = lock
      :unlock: \`ul\` = unlock
      😎 \`cl\` = claim
      :crown: \`o\` = owner
      :information_source: \`vc\` = vcinfo
      :loud_sound: \`sb\` = sb-on
      :mute: \`sbof\` = sb-off
      :chart_with_upwards_trend: \`st\` = status
      :arrows_clockwise: \`tr\` = transfer
      :white_check_mark: \`p\` = permit-role
      :x: \`r\` = reject-role
      :floppy_disk: \`s\` = save
      :mute: \`m\` = mute
      :speaker: \`u\` = unmute
      :video_camera: \`onst\` = cam-on (For cam and streaming)
      :no_entry_sign: \`offst\` = cam-off (For cam and streaming)`)
      .setImage('https://cdn.discordapp.com/attachments/1374084057784123562/1380964108274499714/Dark_Purple_Modern_Animated_Podcast_Youtube_Channel_Intro_Video.gif?ex=6845ca8c&is=6844790c&hm=21ac5b2c3e830b1b35ca4b407c656ce39aa682aecf344dd4626a2c05ec0410de&')
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    message.channel.send({ embeds: [embed] });
  }
};
