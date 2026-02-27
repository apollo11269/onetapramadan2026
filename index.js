console.log('--- BOT STARTING ---');
require('dotenv').config();

// --- startup encryption backend check (no manual loading) ---
let detectedBackend = null;
try {
  require.resolve('sodium-native');
  detectedBackend = 'sodium-native';
} catch { }
if (!detectedBackend) {
  try {
    require.resolve('libsodium-wrappers');
    detectedBackend = 'libsodium-wrappers';
  } catch { }
}
if (detectedBackend) {
  console.log(`[Init] encryption backend detected: ${detectedBackend}`);
} else {
  console.error('[Init][FATAL] No sodium-compatible encryption backend installed. Voice will not work!');
}

const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, EmbedBuilder, Routes } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

// ── Utilities ──────────────────────────────────────────────────────────────
const logger = require('./utils/logger');
const { checkCooldown, checkOwnership, setVoiceStatus, safeReply } = require('./utils/helpers');
const { isBlacklisted } = require('./utils/blacklistStorage');
// ───────────────────────────────────────────────────────────────────────────

// Load admin role ID from .env
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

// Load commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
const commands = new Map();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.set(command.name, command);
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Store temporary channels with more detailed information
// Import the JSON storage utilities
const { loadChannels, saveChannels, mapToObject, objectToMap } = require('./utils/jsonStorage');

// Load channels from JSON file
let tempChannelsObj = loadChannels();
let tempChannels = objectToMap(tempChannelsObj);

// Track processed interactions to prevent duplicates
const processedInteractions = new Set();

const emptySince = new Map();

// Track pending channel deletions so Cancel can actually stop them
const pendingDeletes = new Map();


// global unhandled error handlers (in case they're not already registered)
process.on('unhandledRejection', (err) => logger.error('UnhandledRejection', err));
process.on('uncaughtException', (err) => logger.error('UncaughtException', err));

// Clean up old interaction IDs every 10 minutes to prevent memory leaks
setInterval(() => {
  processedInteractions.clear();
  logger.debug('Cleared processed interactions cache');
}, 10 * 60 * 1000);

// Save channels periodically (every 5 minutes)
setInterval(() => {
  tempChannelsObj = mapToObject(tempChannels);
  saveChannels(tempChannelsObj);
  logger.info('Channels data saved to JSON file');
}, 5 * 60 * 1000);

// ── Channel Cleanup Loop (every 30s, cache-first, no force-fetch) ──────────
setInterval(async () => {
  if (!client.isReady()) return;

  try {
    for (const [channelId] of tempChannels) {
      // Use cache first – only fetch from API if not cached
      let channel = client.channels.cache.get(channelId);
      if (!channel) {
        channel = await client.channels.fetch(channelId).catch(() => null);
      }

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        tempChannels.delete(channelId);
        emptySince.delete(channelId);
        continue;
      }

      const membersCount = channel.members?.size ?? 0;

      if (membersCount === 0) {
        const t = emptySince.get(channelId) || Date.now();
        if (Date.now() - t >= 30000) { // 30-second grace period
          await channel.delete().catch(() => { });
          tempChannels.delete(channelId);
          emptySince.delete(channelId);
          logger.info(`Auto-deleted empty temp channel: ${channelId}`);
        } else {
          emptySince.set(channelId, t);
        }
      } else {
        emptySince.delete(channelId);
      }
    }
  } catch (e) {
    logger.error('Error in cleanup loop', e);
  }
}, 30000);
// ───────────────────────────────────────────────────────────────────────────

// Save channels on process exit
process.on('SIGINT', () => {
  tempChannelsObj = mapToObject(tempChannels);
  saveChannels(tempChannelsObj);
  console.log('Channels data saved to JSON file before exit');
  process.exit();
});

const commandPrefix = '.v';

// Store the bot's voice connection to Create Room
// track create-room voice connections per guild to avoid races
const createRoomConnections = new Map();

// Function to count total users in temporary channels (excluding bots)
function getTotalUsersInTempChannels(guild) {
  let totalUsers = 0;

  tempChannels.forEach((channelData, channelId) => {
    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.type === ChannelType.GuildVoice) {
      // Count only real users, not bots
      const realUsers = channel.members.filter(member => !member.user.bot);
      totalUsers += realUsers.size;
    }
  });

  return totalUsers;
}

// ── Connect bot to Create Room (with retry limit) ──────────────────────────────
const MAX_RECONNECT_RETRIES = 5;

async function connectToCreateRoom(guild, retryCount = 0) {
  if (retryCount >= MAX_RECONNECT_RETRIES) {
    logger.warn(`Max reconnect retries (${MAX_RECONNECT_RETRIES}) reached for guild: ${guild.name}. Stopping.`);
    return;
  }

  try {
    const createRoomId = process.env.CREATE_ROOM_ID;
    const createRoomChannel = guild.channels.cache.find(
      ch => (ch.id === createRoomId || ch.name.includes('Create Room') || ch.name.startsWith('➕') || ch.name.toLowerCase().includes('create'))
        && ch.type === ChannelType.GuildVoice
    );

    if (!createRoomChannel) {
      logger.warn(`Create Room channel not found in guild: ${guild.name}`);
      return;
    }

    // if we already have a connection for this guild that's still active, skip
    const existing = createRoomConnections.get(guild.id);
    if (existing) {
      const state = existing.state;
      if (state !== VoiceConnectionStatus.Destroyed && state !== VoiceConnectionStatus.Disconnected) {
        logger.debug(`Existing create-room connection active for ${guild.name}, skipping new one.`);
        return;
      }
      // previous connection is no longer usable, clean up
      try { existing.destroy(); } catch (_) { }
      createRoomConnections.delete(guild.id);
    }

    const connection = joinVoiceChannel({
      channelId: createRoomChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true,
    });
    // store for the guild
    createRoomConnections.set(guild.id, connection);

    connection.on(VoiceConnectionStatus.Ready, () => {
      logger.success(`Connected to Create Room: "${createRoomChannel.name}" in ${guild.name}`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      logger.warn(`Disconnected from Create Room in ${guild.name}. Retry ${retryCount + 1}/${MAX_RECONNECT_RETRIES}...`);
      // remove from map before retrying
      createRoomConnections.delete(guild.id);
      setTimeout(() => connectToCreateRoom(guild, retryCount + 1), 5000);
    });

    connection.on('error', (err) => {
      logger.error('Voice connection error (createRoom)', err);
    });

  } catch (error) {
    logger.error('Error connecting to Create Room', error);
  }
}
// ───────────────────────────────────────────────────────────────────────────



// Update the command aliases system
const commandAliases = {};

// Add all commands with dynamic prefix
commandFiles.forEach(file => {
  const command = require(`./commands/${file}`);
  const commandName = command.name;
  if (commandName !== 'wissetup' && commandName !== 'help') {
    commandAliases[`${commandPrefix} ${commandName}`] = commandName;
  }
});

// Add specific aliases
commandAliases['l'] = 'lock';
commandAliases['ul'] = 'unlock';
commandAliases['cl'] = 'claim';
commandAliases['o'] = 'owner';
commandAliases['vc'] = 'vcinfo';
commandAliases['sb'] = 'sb-on';
commandAliases['sbof'] = 'sb-off';
commandAliases['st'] = 'status';
commandAliases['tr'] = 'transfer';
commandAliases['p'] = 'permit-role';
commandAliases['r'] = 'reject-role';
commandAliases['s'] = 'save';
commandAliases['m'] = 'mute'
commandAliases['u'] = 'unmute'
commandAliases['onst'] = 'cam-on'
commandAliases['offst'] = 'cam-off'
commandAliases['n'] = 'name'
commandAliases['ur'] = 'unreject'
commandAliases['k'] = 'kick'

// Add more specific aliases as needed

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if message starts with commandPrefix
  if (!message.content.startsWith(commandPrefix)) return;

  const args = message.content.slice(commandPrefix.length).trim().split(/ +/);
  const commandInput = args.shift().toLowerCase();

  // Check if it's an alias and convert to full command name
  const commandName = commandAliases[commandInput] || commandInput;

  if (!commands.has(commandName)) return; // unknown command - silently ignore

  // ── Smart Cooldown check ──────────────────────────────────────────────────
  const commandCooldowns = {
    'name': 300,   // 5 minutes (Discord limit)
    'limit': 60,   // 1 minute
    'lock': 10,
    'unlock': 10,
    'hide': 10,
    'unhide': 10,
    'bot-join': 5,
    'bot-leave': 5
  };

  const cooldownTime = commandCooldowns[commandName] || 3;
  const { onCooldown, remaining } = checkCooldown(message.author.id, commandName, cooldownTime);

  if (onCooldown) {
    return safeReply(message, {
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setDescription(`> ⏳ **Please wait \`${remaining}s\` before using \`.v ${commandName}\` again.**`)
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
      ]
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const command = commands.get(commandName);
  try {
    logger.info(`[CMD] ${message.author.tag} → ${commandName}`);

    // List of commands that don't need voice channel verification
    const setupCommands = ['wissetup', 'help'];

    // List of commands that don't need owner verification
    const nonOwnerCommands = ['claim', 'owner', 'vcinfo'];

    // List of commands that require admin role
    const adminCommands = ['permit-role', 'reject-role', 'vcinfo', 'save', 'sb-off', 'sb-on', 'top'];

    // Check if command requires admin role
    if (adminCommands.includes(commandName)) {
      // Check if user has the admin role
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const embed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('🚫 غير مسموح')
          .setDescription('هذا الأمر خاص بـ Wisdom Boosters 🚀')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO' })
          .setTimestamp();
        return safeReply(message, { embeds: [embed] });
      }
    }

    if (!setupCommands.includes(commandName)) {
      // Check if user is in a voice channel for regular commands only
      if (!message.member.voice.channel) {
        const embed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('❌ خطأ')
          .setDescription('يجب أن تكون في قناة صوتية لاستخدام هذا الأمر!')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO' })
          .setTimestamp();
        return safeReply(message, { embeds: [embed] });
      }

      const voiceChannel = message.member.voice.channel;
      const channelData = tempChannels.get(voiceChannel.id);

      if (!channelData) {
        const embed = new EmbedBuilder()
          .setColor('#FFA726')
          .setTitle('⚠️ تحذير')
          .setDescription('هذه ليست قناة مؤقتة!')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO' })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      // Check if the user is the owner of the channel (except for nonOwnerCommands)
      if (!nonOwnerCommands.includes(commandName) && channelData.ownerId !== message.author.id) {
        const embed = new EmbedBuilder()
          .setColor('#E74C3C')
          .setTitle('🚫 غير مسموح')
          .setDescription('أنت لست مالك هذه القناة!')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO' })
          .setTimestamp();
        return safeReply(message, { embeds: [embed] });
      }
    }

    await command.execute(client, message, args, tempChannels);
  } catch (error) {
    logger.error(`Command error [${commandName}]`, error);
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('❌ Error')
          .setDescription('An error occurred while executing the command.')
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
      ]
    }).catch(() => { });
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  // Check if the user joined a temporary voice channel
  if (newState.channel && tempChannels.has(newState.channel.id)) {
    try {
      const channelData = tempChannels.get(newState.channel.id);
      if (channelData && Array.isArray(channelData.rejectedUsers) && channelData.rejectedUsers.includes(newState.member.id)) {
        await newState.channel.permissionOverwrites.edit(newState.member.id, { Connect: false });
        const toxicChannelId = process.env.TOXIC;
        if (toxicChannelId) {
          const toxicChannel = newState.guild.channels.cache.get(toxicChannelId);
          if (toxicChannel && newState.member?.voice?.channel) {
            try { await newState.member.voice.setChannel(toxicChannel); } catch { }
          }
        }
        return;
      }
      // Get current temp room role permissions to apply to the user
      // Skip if user is owner or invited/allowed
      const isOwner = channelData.ownerId === newState.member.id;
      const isAllowed = channelData.allowedUsers && channelData.allowedUsers.includes(newState.member.id);

      if (process.env.TEMP_ROOM_ROLE_ID && !isOwner && !isAllowed) {
        const tempRole = newState.guild.roles.cache.get(process.env.TEMP_ROOM_ROLE_ID);
        if (tempRole) {
          // Get the current role permissions from the channel
          const rolePermissions = newState.channel.permissionOverwrites.cache.get(process.env.TEMP_ROOM_ROLE_ID);

          if (rolePermissions) {
            // Apply the same permissions to the individual user
            const userPermissions = {};

            // Copy allow permissions
            if (rolePermissions.allow) {
              rolePermissions.allow.toArray().forEach(permission => {
                userPermissions[permission] = true;
              });
            }

            // Copy deny permissions
            if (rolePermissions.deny) {
              rolePermissions.deny.toArray().forEach(permission => {
                userPermissions[permission] = false;
              });
            }

            // Apply permissions to the user
            await newState.channel.permissionOverwrites.edit(newState.member.id, userPermissions);
            logger.info(`Applied permissions to ${newState.member.user.displayName} in ${newState.channel.name}`);
          }
        }
      }

      // ── Notify ONLY the channel owner in TEMP-HELP (not every member who joins) ──
      const isChannelOwner = channelData.ownerId === newState.member.id;
      if (isChannelOwner) {
        // Clear leave timestamp if owner returns
        delete channelData.ownerLeftAt;

        const tempHelpChannel = newState.guild.channels.cache.find(
          ch => ch.name === 'TEMP-HELP' && ch.type === ChannelType.GuildText
        );
        if (tempHelpChannel) {
          const msg = await tempHelpChannel.send({
            content: `<@${newState.member.id}> Your temp channel is ready! Use \`.v help\` or \`.v panel\` to manage it.`
          }).catch(() => null);
          // Auto-delete after 2 minutes to keep the channel clean
          if (msg) setTimeout(() => msg.delete().catch(() => { }), 2 * 60 * 1000);
        }
      }
      // ─────────────────────────────────────────────────────────────────────────────

    } catch (error) {
      logger.error('voiceStateUpdate (join) error', error);
    }
  }

  // Check if the user left a temporary voice channel (actual leave or move away)
  if (
    oldState.channel &&
    tempChannels.has(oldState.channel.id) &&
    oldState.channelId !== newState.channelId // ensure not a state change within the same channel
  ) {
    try {
      const channelData = tempChannels.get(oldState.channel.id);
      if (channelData) {
        if (oldState.member.id === channelData.ownerId) {
          // Track when the owner left
          channelData.ownerLeftAt = Date.now();
          logger.info(`Owner ${oldState.member.user.displayName} left their channel ${oldState.channel.name}. Claim timer started.`);
        } else {
          // ── FIX: Don't remove permissions if user is in allowedUsers (Persistent Invite) ──
          const isAllowed = channelData.allowedUsers && channelData.allowedUsers.includes(oldState.member.id);
          if (!isAllowed) {
            const userPermissionOverwrite = oldState.channel.permissionOverwrites.cache.get(oldState.member.id);
            if (userPermissionOverwrite) {
              await userPermissionOverwrite.delete();
              logger.info(`Removed permissions for ${oldState.member.user.displayName} who left ${oldState.channel.name}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up permissions on leave', error);
    }
  }

  // Check if the user joined the "➕│Create Room" channel (by ID or hardcoded name)
  const createRoomId = process.env.CREATE_ROOM_ID;
  if (newState.channel && (newState.channel.id === createRoomId || newState.channel.name === '➕│Create Room')) {
    // ── Check Global Blacklist ──
    const blacklistEntry = isBlacklisted(newState.member.id);
    if (blacklistEntry) {
      try {
        await newState.disconnect().catch(() => { });
        const dmEmbed = new EmbedBuilder()
          .setTitle('🚫 **Access Denied**')
          .setColor(0xE74C3C)
          .setDescription(`> **Hello <@${newState.member.id}>,**\nYou are blacklisted from creating temporary voice channels.\n\n**Reason:** \`${blacklistEntry.reason}\`\n**Expires:** \`${blacklistEntry.expiresAt ? new Date(blacklistEntry.expiresAt).toLocaleString() : 'Permanent'}\``)
          .setFooter({ text: 'Wisdom Security System' });

        await newState.member.send({ embeds: [dmEmbed] }).catch(() => { });
      } catch (e) { }
      return;
    }
    try {
      // Create permission overwrites array
      const permissionOverwrites = [
        {
          id: newState.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: newState.member.id,
          allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel],
        }
      ];

      // Add temp room role permissions if the role exists
      if (process.env.TEMP_ROOM_ROLE_ID) {
        const tempRole = newState.guild.roles.cache.get(process.env.TEMP_ROOM_ROLE_ID);
        if (tempRole) {
          permissionOverwrites.push({
            id: process.env.TEMP_ROOM_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.UseVAD,
              PermissionFlagsBits.Stream
            ],
          });
        }
      }

      // Create a new temporary voice channel for the user
      const tempChannel = await newState.guild.channels.create({
        name: `🎧｜${newState.member.user.displayName}'s Vc`,
        type: ChannelType.GuildVoice,
        parent: newState.channel.parent,
        permissionOverwrites: permissionOverwrites
      });

      // Move the user to the new temporary channel
      await newState.setChannel(tempChannel);

      // Store the temporary channel information
      tempChannels.set(tempChannel.id, {
        ownerId: newState.member.id,
        settings: {
          status: '**.v help/panel**  <a:FZ_red_cross:1360451122807963770>'
        }
      });

      // Set default status for the new temporary channel
      try {
        const defaultStatus = '**.v help/panel**  <a:FZ_red_cross:1360451122807963770>';
        const response = await fetch(`https://discord.com/api/v10/channels/${tempChannel.id}/voice-status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${client.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: defaultStatus
          })
        });

        if (response.ok) {
          console.log(`✅ Default status set for new temp channel: ${tempChannel.name}`);
        } else {
          console.error('Failed to set default status:', response.status);
        }
      } catch (error) {
        console.error('Error setting default status:', error);
      }

      // ── Premium Welcome Message (Layout Components V2) ─────────────────────────
      const arrow = '<a:wisdoarrow:1453486894779338885>';
      const welcomePayload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // CONTAINER
            accent_color: 2829617, // 0x2B2D31
            components: [
              {
                type: 10, // Header
                content: "## 🎉 **Welcome to Your Temporary Voice Channel!**"
              },
              {
                type: 12, // IMAGE (GIF)
                items: [{ media: { url: "https://i.postimg.cc/gkY14NCL/image.png" } }]
              },
              {
                type: 14 // SEPARATOR
              },
              {
                type: 10, // Content Description
                content: `### 👋 **Hello <@${newState.member.id}>!**\nYour private voice channel has been successfully created. You have full control using the commands below or the panel button.\n\n**<a:notif:1447321335117123610> Quick Commands:**\n${arrow} **Lock:** \`.v lock\`\n${arrow} **Unlock:** \`.v unlock\`\n${arrow} **Rename:** \`.v name <text>\`\n${arrow} **Limit:** \`.v limit <num>\`\n${arrow} **Hide:** \`.v hide\``
              },
              {
                type: 14 // SEPARATOR
              },
              {
                type: 9, // SECTION with Accessory Button
                components: [{ type: 10, content: "✦ ・ Use the full control panel for more options." }],
                accessory: {
                  type: 2,
                  style: 2, // Secondary (Gray)
                  label: "Control Panel",
                  custom_id: "open_panel",
                  emoji: { name: "🎛️" }
                }
              },
              {
                type: 14 // SEPARATOR
              },
              {
                type: 10, // FOOTER
                content: "Wisdom TMPV Rules 📩 | “Respect is earned by giving it.” ❤ - APOllO"
              }
            ]
          }
        ]
      };

      // Send the advanced V2 layout message
      try {
        await client.rest.post(Routes.channelMessages(tempChannel.id), { body: welcomePayload });
      } catch (welcomeErr) {
        console.error('Error sending V2 welcome message:', welcomeErr);
        // Fallback to standard embed if V2 fails
        await tempChannel.send({
          content: `Welcome <@${newState.member.id}>! Your channel is ready. Use \`.v help\` for commands.`
        });
      }

    } catch (error) {
      console.error('Error creating temporary channel:', error);
    }
  }


}); // End of voiceStateUpdate event handler

// Handle button interactions and select menus
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  // Add error handling wrapper
  try {
    // Check if interaction is already replied to or deferred
    if (interaction.replied || interaction.deferred) return;

    // Check if this interaction has already been processed
    if (processedInteractions.has(interaction.id)) return;
    processedInteractions.add(interaction.id);

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

    // ── Smart Cooldown for Buttons ───────────────────────────────────────────
    if (interaction.isButton() && (interaction.customId.startsWith('panel_') || interaction.customId.startsWith('channel_'))) {
      const actionMap = {
        'rename': 300,
        'limit': 60,
        'lock': 10,
        'unlock': 10,
        'hide': 10,
        'unhide': 10
      };

      const action = interaction.customId.split('_')[1]; // e.g., 'lock' from 'panel_lock'
      const cooldownTime = actionMap[action] || 3;
      const { onCooldown, remaining } = checkCooldown(interaction.user.id, interaction.customId, cooldownTime);

      if (onCooldown) {
        return interaction.reply({
          content: `> ⏳ **Please wait \`${remaining}s\` before using this action again.**`,
          ephemeral: true
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (interaction.customId === 'open_panel') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '> <a:warning_animated:1361729714259099809> **You must be in a voice channel!**',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);

      if (!channelData) {
        return interaction.reply({
          content: '> <a:warning_animated:1361729714259099809> **This is not a temporary channel!**',
          ephemeral: true
        });
      }

      // Check owner
      if (channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '> <a:warning_animated:1361729714259099809> **You are not the owner of this channel!**',
          ephemeral: true
        });
      }

      const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
      const permissions = voiceChannel.permissionOverwrites.cache.get(targetRoleId);
      const isLocked = permissions?.deny?.has(PermissionFlagsBits.Connect) || false;
      const isHidden = permissions?.deny?.has(PermissionFlagsBits.ViewChannel) || false;
      const memberCount = voiceChannel.members.size;
      const userLimit = voiceChannel.userLimit || 'Unlimited';

      const controlPanelEmbed = new EmbedBuilder()
        .setTitle('🎛️ **CONTROL PANEL**')
        .setDescription(`
          > **<a:boost:1449497847094444083> Channel Information:**
          
          <a:org:1449141144268308595> **Owner:** <@${channelData.ownerId}>
          <:voice6:1358152460979404992> **Name:** \`${voiceChannel.name}\`
          <:voice4:1358152468273430718> **Limit:** \`${userLimit}\`
          <:voice2:1358152471687467228> **Members:** \`${memberCount}\`
          
          > **<a:notif:1447321335117123610> Status:**
          ${isLocked ? '<:voice3:1358152470081175622> **Locked**' : '<:voice1:1358152473403195555> **Unlocked**'} | ${isHidden ? '<a:Red_Eye:1450210370487718071> **Hidden**' : '<a:Eyes:1450279319971823789> **Visible**'}
        `)
        .setColor(0x2B2D31)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('panel_lock').setLabel('LOCK').setEmoji('<:voice3:1358152470081175622>').setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('panel_unlock').setLabel('UNLOCK').setEmoji('<:voice1:1358152473403195555>').setStyle(!isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('panel_rename').setLabel('RENAME').setEmoji('<:voice6:1358152460979404992>').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('panel_limit').setLabel('LIMIT').setEmoji('<:voice4:1358152468273430718>').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('panel_hide').setLabel('HIDE').setEmoji('<a:Red_Eye:1450210370487718071>').setStyle(isHidden ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

      const row2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('panel_unhide').setLabel('UNHIDE').setEmoji('<a:Eyes:1450279319971823789>').setStyle(!isHidden ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('panel_kick_all').setLabel('KICK ALL').setEmoji('<a:sssss:1450241657261002864>').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('panel_transfer').setLabel('TRANSFER').setEmoji('<a:12104crownpink:1449139449211387945>').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('panel_info').setLabel('INFO').setEmoji('<:voice2:1358152471687467228>').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('panel_delete').setLabel('DELETE').setEmoji('<:trash:1450280880881930341>').setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({
        embeds: [controlPanelEmbed],
        components: [row1, row2],
        ephemeral: true
      });
    }

    if (interaction.customId === 'translate_darija') {
      const darijaEmbed = new EmbedBuilder()
        .setTitle('🎉 **مرحباً بك في قناتك الصوتية الخاصة!**')
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'Wisdom TEMP System',
          iconURL: client.user.displayAvatarURL()
        })
        .setDescription(`
          > **<a:boost:1449497847094444083> أهلاً بك <@${interaction.user.id}>!**
          
          تم إنشاء قناتك بنجاح. عندك التحكم الكامل فيها باستخدام الأزرار ولا الأوامر.

          **<a:notif:1447321335117123610> أوامر سريعة:**

          > **<:voice3:1358152470081175622> قفل:** \`.v lock\`
          > **<:voice1:1358152473403195555> فتح:** \`.v unlock\`
          > **<:voice6:1358152460979404992> سمية:** \`.v name <text>\`
          > **<:voice4:1358152468273430718> ليميت:** \`.v limit <number>\`
          > **<a:Red_Eye:1450210370487718071> تخبية:** \`.v hide\`
          
          *استخدم \`.v help\` للمزيد من المعلومات.*
        `)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const backRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('translate_english')
            .setLabel('Back to English')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🇺🇸'),
          new ButtonBuilder()
            .setCustomId('translate_amazigh')
            .setLabel('Translate to Amazigh')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:tamazight:1328392111963504771>')
        );

      await interaction.update({
        embeds: [darijaEmbed],
        components: [backRow]
      });
    }

    if (interaction.customId === 'translate_amazigh') {
      const amazighEmbed = new EmbedBuilder()
        .setTitle('🎉 **ⴰⵙⵓⴷⵓ ⵖⵔ ⵓⵙⴰⵔⴰⴳ ⵏ ⵜⵎⵙⵉⵡⵍⵜ!**')
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'Wisdom TEMP System',
          iconURL: client.user.displayAvatarURL()
        })
        .setDescription(`
          > **<a:boost:1449497847094444083> ⴰⵣⵓⵍ <@${interaction.user.id}>!**
          
          ⵉⵜⵜⵓⵙⴽⴰⵔ ⵓⵙⴰⵔⴰⴳ ⵏⵏⴽ ⵙ ⵜⵎⴰⵎⵜ. ⵜⵣⵎⵔⴷ ⴰⴷ ⵜⵙⵏⵓⴱⴳⴷ ⴰⵙⴰⵔⴰⴳ ⵏⵏⴽ.

          **<a:notif:1447321335117123610> ⵜⵉⵏⵏⴰ ⵏ ⵓⵙⴽⵔ ⵜⵉⵎⵣⵡⵓⵔⴰ:**

          > **<:voice3:1358152470081175622> ⵔⴳⵍ:** \`.v lock\`
          > **<:voice1:1358152473403195555> ⵍⴷⵉ:** \`.v unlock\`
          > **<:voice6:1358152460979404992> ⵉⵙⵎ:** \`.v name <text>\`
          > **<:voice4:1358152468273430718> ⵓⵟⵟⵓⵏ:** \`.v limit <number>\`
          > **<a:Red_Eye:1450210370487718071> ⵙⵏⵜⵍ:** \`.v hide\`
          
          *ⵙⵎⵔⵙ \`.v help\` ⵃⵎⴰ ⴰⴷ ⵜⵙⴽⵏⴷ ⴰⴽⴽ ⵜⵉⵏⵏⴰ.*
        `)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const backRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('translate_english')
            .setLabel('Back to English')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🇺🇸'),
          new ButtonBuilder()
            .setCustomId('translate_darija')
            .setLabel('Translate to Darija')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🇲🇦')
        );

      await interaction.update({
        embeds: [amazighEmbed],
        components: [backRow]
      });
    }

    if (interaction.customId === 'translate_english') {
      const englishEmbed = new EmbedBuilder()
        .setTitle('🎉 **Welcome to Your Temporary Voice Channel!**')
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'Wisdom TEMP System',
          iconURL: client.user.displayAvatarURL()
        })
        .setDescription(`
          > **<a:boost:1449497847094444083> Hello <@${interaction.user.id}>!**
          
          Your private voice channel has been successfully created.
          You have full control over this channel using the commands below or the buttons.

          **<a:notif:1447321335117123610> Quick Commands:**

          > **<:voice3:1358152470081175622> Lock:** \`.v lock\`
          > **<:voice1:1358152473403195555> Unlock:** \`.v unlock\`
          > **<:voice6:1358152460979404992> Rename:** \`.v name <text>\`
          > **<:voice4:1358152468273430718> Limit:** \`.v limit <number>\`
          > **<a:Red_Eye:1450210370487718071> Hide:** \`.v hide\`
          
          *Use \`.v help\` or click the buttons below for more controls.*
        `)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const translationRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('translate_darija')
            .setLabel('Translate to Darija')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🇲🇦'),
          new ButtonBuilder()
            .setCustomId('translate_amazigh')
            .setLabel('Translate to Amazigh')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:tamazight:1328392111963504771>')
        );

      await interaction.update({
        embeds: [englishEmbed],
        components: [translationRow]
      });
    }

    // Handle channel control buttons
    if (interaction.customId === 'channel_lock') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ يجب أن تكون في قناة صوتية لاستخدام هذا الزر!',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ يمكن فقط لمالك القناة استخدام هذا الزر!',
          ephemeral: true
        });
      }

      try {
        if (process.env.TEMP_ROOM_ROLE_ID) {
          await voiceChannel.permissionOverwrites.edit(process.env.TEMP_ROOM_ROLE_ID, {
            Connect: false
          });

          await interaction.reply({
            content: '> 🔒 **Channel Locked!**',
            ephemeral: true
          });

          // Set voice channel status
          try {
            await fetch(`https://discord.com/api/v10/channels/${voiceChannel.id}/voice-status`, {
              method: 'PUT',
              headers: { 'Authorization': `Bot ${client.token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: '<:lock:1452014333965111398>  ** Room Masdoda**' })
            });
          } catch (e) { }
        } else {
          await interaction.reply({
            content: '> ⚠️ **Temp Room Role ID is not configured!**',
            ephemeral: true
          });
        }
      } catch (error) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء قفل القناة!',
          ephemeral: true
        });
      }
    }

    if (interaction.customId === 'channel_unlock') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ يجب أن تكون في قناة صوتية لاستخدام هذا الزر!',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ يمكن فقط لمالك القناة استخدام هذا الزر!',
          ephemeral: true
        });
      }

      try {
        if (process.env.TEMP_ROOM_ROLE_ID) {
          await voiceChannel.permissionOverwrites.edit(process.env.TEMP_ROOM_ROLE_ID, {
            Connect: true
          });

          await interaction.reply({
            content: '> 🔓 **Channel Unlocked!**',
            ephemeral: true
          });

          // Restore default voice channel status
          try {
            await fetch(`https://discord.com/api/v10/channels/${voiceChannel.id}/voice-status`, {
              method: 'PUT',
              headers: { 'Authorization': `Bot ${client.token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: '**.v help/panel**  <a:FZ_red_cross:1360451122807963770>' })
            });
          } catch (e) { }
        } else {
          await interaction.reply({
            content: '> ⚠️ **Temp Room Role ID is not configured!**',
            ephemeral: true
          });
        }
      } catch (error) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء إلغاء قفل القناة!',
          ephemeral: true
        });
      }
    }

    if (interaction.customId === 'channel_rename') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ يجب أن تكون في قناة صوتية لاستخدام هذا الزر!',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ يمكن فقط لمالك القناة استخدام هذا الزر!',
          ephemeral: true
        });
      }

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

      const modal = new ModalBuilder()
        .setCustomId('rename_modal')
        .setTitle('تغيير اسم القناة');

      const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('الاسم الجديد للقناة')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setPlaceholder('أدخل الاسم الجديد...')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'channel_hide') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ يجب أن تكون في قناة صوتية لاستخدام هذا الزر!',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ يمكن فقط لمالك القناة استخدام هذا الزر!',
          ephemeral: true
        });
      }

      try {
        if (process.env.TEMP_ROOM_ROLE_ID) {
          await voiceChannel.permissionOverwrites.edit(process.env.TEMP_ROOM_ROLE_ID, {
            ViewChannel: false
          });
          await interaction.reply({
            content: '> 👁️ **Channel Hidden from Temp Role!**',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '> ⚠️ **Temp Room Role ID is not configured!**',
            ephemeral: true
          });
        }
      } catch (error) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء إخفاء القناة!',
          ephemeral: true
        });
      }
    }

    // Handle panel control buttons
    if (interaction.customId === 'panel_lock') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      try {
        const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
        await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.Connect]: false });

        await setVoiceStatus(voiceChannel.id, client.token, '<:lock:1452014333965111398>  ** Room Masdoda**');

        await interaction.reply({ content: '> 🔒 **Channel Locked!**', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء قفل القناة!', ephemeral: true });
      }
    }

    if (interaction.customId === 'panel_unlock') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      try {
        const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
        await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.Connect]: true });

        await setVoiceStatus(voiceChannel.id, client.token, '**.v help/panel**  <a:FZ_red_cross:1360451122807963770>');

        await interaction.reply({ content: '> 🔓 **Channel Unlocked!**', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء فتح القناة!', ephemeral: true });
      }
    }

    if (interaction.customId === 'panel_rename') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder().setCustomId('panel_rename_modal').setTitle('تغيير اسم القناة');
      const nameInput = new TextInputBuilder()
        .setCustomId('panel_new_name')
        .setLabel('الاسم الجديد للقناة')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(90) // Enforce Safe Limit
        .setPlaceholder('أدخل الاسم الجديد...')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'panel_limit') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder().setCustomId('panel_limit_modal').setTitle('تحديد عدد الأعضاء');
      const limitInput = new TextInputBuilder()
        .setCustomId('panel_user_limit')
        .setLabel('الحد الأقصى للأعضاء (0-99)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('0 = غير محدود')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'panel_hide') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      try {
        const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
        await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.ViewChannel]: false });
        await interaction.reply({ content: '> 👁️ **Channel Hidden!**', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء إخفاء القناة!', ephemeral: true });
      }
    }

    if (interaction.customId === 'panel_unhide') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      try {
        const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
        await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.ViewChannel]: true });
        await interaction.reply({ content: '> 👀 **Channel Visible!**', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء إظهار القناة!', ephemeral: true });
      }
    }

    if (interaction.customId === 'panel_kick_all') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      await interaction.deferReply({ ephemeral: true });

      try {
        const members = voiceChannel.members.filter(member => member.id !== interaction.user.id && !member.user.bot);
        let count = 0;
        for (const member of members.values()) {
          try {
            await member.voice.disconnect();
            count++;
          } catch (e) { }
        }
        await interaction.editReply({ content: `👢 تم طرد ${count} عضو بنجاح!` });
      } catch (error) {
        await interaction.editReply({ content: '❌ حدث خطأ أثناء طرد الأعضاء!' });
      }
    }

    if (interaction.customId === 'panel_transfer') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      const members = voiceChannel.members.filter(m => m.id !== interaction.user.id && !m.user.bot);
      if (members.size === 0) return interaction.reply({ content: '❌ لا يوجد أعضاء آخرين لنقل الملكية إليهم!', ephemeral: true });

      const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('panel_transfer_select')
        .setPlaceholder('اختر العضو الجديد...')
        .addOptions(members.map(m => ({ label: m.displayName, value: m.id, emoji: '👑' })));

      await interaction.reply({ content: '👑 اختر العضو الجديد:', components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
    }

    if (interaction.customId === 'panel_info') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel, channelData } = result;

      const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
      const perms = voiceChannel.permissionOverwrites.cache.get(targetRoleId);
      const infoEmbed = new EmbedBuilder()
        .setDescription(`
          <:voice6:1358152460979404992> **Name:** \`${voiceChannel.name}\`
          <a:org:1449141144268308595> **Owner:** <@${channelData.ownerId}>
          <:voice2:1358152471687467228> **Members:** \`${voiceChannel.members.size}\`
          <:voice4:1358152468273430718> **Limit:** \`${voiceChannel.userLimit || 'Unlimited'}\`
          <:voice3:1358152470081175622> **Status:** ${perms?.deny?.has(PermissionFlagsBits.Connect) ? 'Locked' : 'Unlocked'}
          <a:loading:1450241657261002864> **Created:** <t:${Math.floor((channelData.createdAt || Date.now()) / 1000)}:R>
        `)
        .setColor(0x2B2D31)
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

      await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    }

    if (interaction.customId === 'panel_delete') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;

      const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('panel_delete_confirm').setLabel('نعم، احذف القناة').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
        new ButtonBuilder().setCustomId('panel_delete_cancel').setLabel('إلغاء').setStyle(ButtonStyle.Secondary).setEmoji('❌')
      );

      await interaction.reply({ content: '⚠️ **تحذير!** هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه!', components: [row], ephemeral: true });
    }

    // Handle transfer select menu
    if (interaction.customId === 'panel_transfer_select') {
      await interaction.deferReply({ ephemeral: true });

      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return interaction.editReply({ content: '❌ يجب أن تكون في القناة لنقل الملكية!' });
      const { voiceChannel, channelData } = result;

      const newOwnerId = interaction.values[0];
      const newOwner = await interaction.guild.members.fetch(newOwnerId).catch(() => null);

      if (!newOwner) return interaction.editReply({ content: '❌ تعذر العثور على العضو المختار!' });

      try {
        // Revoke old owner perms
        await voiceChannel.permissionOverwrites.edit(interaction.user.id, { ManageChannels: false, PrioritySpeaker: false }).catch(() => { });

        // Grant new owner perms
        await voiceChannel.permissionOverwrites.edit(newOwnerId, {
          ManageChannels: true,
          Connect: true,
          ViewChannel: true,
          Speak: true,
          Stream: true
        });

        channelData.ownerId = newOwnerId;
        tempChannels.set(voiceChannel.id, channelData);

        await interaction.editReply({ content: `👑 تم نقل ملكية القناة بنجاح إلى ${newOwner.displayName}!` });
      } catch (error) {
        await interaction.editReply({ content: '❌ حدث خطأ أثناء نقل الملكية!' });
      }
    }

    // Handle delete confirmation
    if (interaction.customId === 'panel_delete_confirm') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({ content: '❌ يجب أن تكون في قناة صوتية!', ephemeral: true });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ يمكن فقط لمالك القناة حذف القناة!', ephemeral: true });
      }

      // Cancel any existing pending delete for this channel first
      if (pendingDeletes.has(voiceChannel.id)) {
        clearTimeout(pendingDeletes.get(voiceChannel.id));
      }

      const timeoutId = setTimeout(async () => {
        pendingDeletes.delete(voiceChannel.id);
        tempChannels.delete(voiceChannel.id);
        await voiceChannel.delete().catch(() => { });
        logger.info(`Channel deleted by owner: ${voiceChannel.id}`);
      }, 5000);

      pendingDeletes.set(voiceChannel.id, timeoutId);

      await interaction.reply({
        content: '🗑️ سيتم حذف القناة خلال **5 ثوانٍ**... اضغط إلغاء لوقف الحذف.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'panel_delete_cancel') {
      const voiceChannel = interaction.member.voice.channel;
      if (voiceChannel && pendingDeletes.has(voiceChannel.id)) {
        clearTimeout(pendingDeletes.get(voiceChannel.id));
        pendingDeletes.delete(voiceChannel.id);
        await interaction.reply({ content: '✅ تم إلغاء عملية حذف القناة بنجاح.', ephemeral: true });
      } else {
        await interaction.reply({ content: '✅ لا توجد عملية حذف معلقة.', ephemeral: true });
      }
    }


    // --- Ask 2 Join Handlers ---
    if (interaction.customId === 'ask_2_join') {
      const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || interaction.guild.id;
      const lockedChannels = [];

      for (const [id, data] of tempChannels) {
        const chan = interaction.guild.channels.cache.get(id);
        if (chan && chan.type === ChannelType.GuildVoice) {
          const perms = chan.permissionOverwrites.cache.get(targetRoleId);
          const isLocked = perms?.deny?.has(PermissionFlagsBits.Connect) || false;
          if (isLocked) {
            lockedChannels.push({
              label: chan.name.substring(0, 100),
              value: id,
              description: `Request entry to ${chan.name}`
            });
          }
        }
      }

      if (lockedChannels.length === 0) {
        return interaction.reply({ content: '❌ No locked rooms found at the moment.', ephemeral: true });
      }

      const { StringSelectMenuBuilder } = require('discord.js');
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ask_select')
        .setPlaceholder('Select a locked room...')
        .addOptions(lockedChannels.slice(0, 25));

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.reply({ content: '🚪 Choose the room you want to join:', components: [row], ephemeral: true });
    }

    if (interaction.customId === 'ask_select') {
      const channelId = interaction.values[0];
      const targetChannel = interaction.guild.channels.cache.get(channelId);
      const channelData = tempChannels.get(channelId);

      if (!targetChannel || !channelData) {
        return interaction.reply({ content: '❌ This channel no longer exists.', ephemeral: true });
      }

      await interaction.reply({ content: `⌛ Request sent to <@${channelData.ownerId}>. Please wait...`, ephemeral: true });

      const knockEmbed = new EmbedBuilder()
        .setTitle('🔔 **KNOCK KNOCK!**')
        .setDescription(`> <@${interaction.user.id}> requests permission to join your room.`)
        .setColor(0xFFA500)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Accept or Reject using the buttons below.' });

      // Store Interaction Channel ID in CustomID to notify requester later
      const knockRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`knock_acc_${interaction.user.id}_${interaction.channel.id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`knock_rej_${interaction.user.id}_${interaction.channel.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger).setEmoji('❌')
      );

      await targetChannel.send({ content: `<@${channelData.ownerId}>`, embeds: [knockEmbed], components: [knockRow] });
    }

    if (interaction.customId.startsWith('knock_acc_')) {
      const [, , requesterId, notifyChannelId] = interaction.customId.split('_');
      const voiceChannel = interaction.member.voice.channel;
      const channelData = tempChannels.get(voiceChannel?.id);

      if (!voiceChannel || !channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ يمكن فقط لمالك القناة قبول الطلبات!', ephemeral: true });
      }

      await voiceChannel.permissionOverwrites.edit(requesterId, {
        Connect: true,
        Speak: true,
        UseVAD: true,
        ViewChannel: true,
        SendMessages: true
      });

      await interaction.update({ content: `✅ <@${requesterId}> has been allowed !`, embeds: [], components: [] });

      // Notify requester in the original interaction channel
      const notifyChan = interaction.guild.channels.cache.get(notifyChannelId);
      if (notifyChan) {
        const notifyEmbed = new EmbedBuilder().setColor(0x00FF00).setDescription(`✅ **Accepted!** You can now join <#${voiceChannel.id}>.`);
        const notifyMsg = await notifyChan.send({ content: `<@${requesterId}>`, embeds: [notifyEmbed] });
        setTimeout(() => notifyMsg.delete().catch(() => { }), 3 * 60 * 1000);
      }
    }

    if (interaction.customId.startsWith('knock_rej_')) {
      const [, , requesterId, notifyChannelId] = interaction.customId.split('_');
      const voiceChannel = interaction.member.voice.channel;
      const channelData = tempChannels.get(voiceChannel?.id);

      if (!voiceChannel || !channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ يمكن فقط لمالك القناة رفض الطلبات!', ephemeral: true });
      }

      await interaction.update({ content: `❌ Request from <@${requesterId}> was rejected.`, embeds: [], components: [] });

      const notifyChan = interaction.guild.channels.cache.get(notifyChannelId);
      if (notifyChan) {
        const notifyEmbed = new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ **Rejected!** Your request to join the room was denied.`);
        const notifyMsg = await notifyChan.send({ content: `<@${requesterId}>`, embeds: [notifyEmbed] });
        setTimeout(() => notifyMsg.delete().catch(() => { }), 3 * 60 * 1000);
      }
    }
    // ----------------------------

  } catch (error) {
    console.error('❌ Discord Client Error:', error);

    // Try to respond to the interaction if it hasn't been responded to yet
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('❌ Failed to send error response:', replyError);
    }
  }
});

// Handle modal submissions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  // Add error handling wrapper
  try {
    // Check if interaction is already replied to or deferred
    if (interaction.replied || interaction.deferred) return;

    // Check if this interaction has already been processed
    if (processedInteractions.has(interaction.id)) return;
    processedInteractions.add(interaction.id);

    if (interaction.customId === 'rename_modal') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ يجب أن تكون في قناة صوتية!',
          ephemeral: true
        });
      }

      const channelData = tempChannels.get(voiceChannel.id);
      if (!channelData || channelData.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ يمكن فقط لمالك القناة تغيير الاسم!',
          ephemeral: true
        });
      }

      const newName = interaction.fields.getTextInputValue('new_name');

      try {
        await voiceChannel.setName(newName);
        await interaction.reply({
          content: `✏️ تم تغيير اسم القناة إلى: **${newName}**`,
          ephemeral: true
        });
      } catch (error) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء تغيير اسم القناة!',
          ephemeral: true
        });
      }
    }

    // Handle panel rename modal
    if (interaction.customId === 'panel_rename_modal') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      const newName = interaction.fields.getTextInputValue('panel_new_name');
      try {
        await voiceChannel.setName(`🔊｜${newName}`);
        await interaction.reply({ content: `✏️ تم تغيير اسم القناة بنجاح إلى: **${newName}**`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء تغيير اسم القناة! قد يكون هناك ضغط (Rate Limit).', ephemeral: true });
      }
    }

    // Handle panel limit modal
    if (interaction.customId === 'panel_limit_modal') {
      const result = await checkOwnership(interaction, tempChannels);
      if (!result) return;
      const { voiceChannel } = result;

      const limitInput = interaction.fields.getTextInputValue('panel_user_limit');
      const userLimit = parseInt(limitInput);

      if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
        return interaction.reply({ content: '❌ يجب أن يكون الرقم بين 0 و 99!', ephemeral: true });
      }

      try {
        await voiceChannel.setUserLimit(userLimit);
        await interaction.reply({ content: `🔢 تم تحديد عدد الأعضاء بنجاح إلى: **${userLimit === 0 ? 'غير محدود' : userLimit}**`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء تحديد عدد الأعضاء!', ephemeral: true });
      }
    }

  } catch (error) {
    console.error('❌ Modal Submission Error:', error);

    // Try to respond to the interaction if it hasn't been responded to yet
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('❌ Failed to send error response:', replyError);
    }
  }
});

// ── Client error events ───────────────────────────────────────────────────
client.on('error', (error) => logger.error('Discord Client Error', error));
client.on('warn', (warning) => logger.warn(`Discord Warning: ${warning}`));
// ─────────────────────────────────────────────────────────────────────────

// ── Ready handler (invoked after successful login) ──────────────────────────
async function handleClientReady() {
  logger.success(`Logged in as ${client.user.tag}`);
  logger.info(`Connected to ${client.guilds.cache.size} guild(s)`);
  logger.info(`Serving ${client.users.cache.size} cached user(s)`);

  client.user.setPresence({
    activities: [{ name: 'Voice Channels | .v help', type: 3 }],
    status: 'online',
  });

  // Connect to Create Room in every guild
  for (const guild of client.guilds.cache.values()) {
    await connectToCreateRoom(guild).catch(e => logger.error('connectToCreateRoom failed', e));
  }
}
// ─────────────────────────────────────────────────────────────────────────

// ── Role update: sync permissions to members in temp channels ─────────────
client.on('roleUpdate', async (oldRole, newRole) => {
  if (newRole.id !== process.env.TEMP_ROOM_ROLE_ID) return;
  logger.info(`Temp room role updated: ${newRole.name} — syncing member permissions...`);

  for (const [channelId, channelData] of tempChannels) {
    try {
      const channel = newRole.guild.channels.cache.get(channelId);
      if (!channel) continue;

      const rolePermissions = channel.permissionOverwrites.cache.get(process.env.TEMP_ROOM_ROLE_ID);
      if (!rolePermissions || channel.members.size === 0) continue;

      for (const [memberId, member] of channel.members) {
        if (memberId === channelData.ownerId) continue;
        const userPermissions = {};
        rolePermissions.allow?.toArray().forEach(p => { userPermissions[p] = true; });
        rolePermissions.deny?.toArray().forEach(p => { userPermissions[p] = false; });
        await channel.permissionOverwrites.edit(memberId, userPermissions);
        logger.info(`Updated permissions for ${member.user.displayName} in ${channel.name}`);
      }
    } catch (error) {
      logger.error(`Error updating permissions for channel ${channelId}`, error);
    }
  }
  logger.success('Finished syncing member permissions after role update.');
});
// ─────────────────────────────────────────────────────────────────────────

// ── Graceful shutdown ─────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.warn(`Received ${signal} — saving data and shutting down...`);
  tempChannelsObj = mapToObject(tempChannels);
  saveChannels(tempChannelsObj);
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Single registration for unhandled errors (no duplicates)
process.on('unhandledRejection', (err) => logger.error('UnhandledRejection', err));
process.on('uncaughtException', (err) => logger.error('UncaughtException', err));
// ─────────────────────────────────────────────────────────────────────────

// ── Bot login with auto-retry ─────────────────────────────────────────────
async function initSodium() {
  // Try to load sodium-native first, fallback to libsodium-wrappers (WASM)
  try {
    const sodiumNative = require('sodium-native');
    logger.info('sodium-native loaded successfully');
    return 'sodium-native';
  } catch (e) {
    logger.debug('sodium-native not available, trying libsodium-wrappers');
  }

  try {
    const libsodium = require('libsodium-wrappers');
    if (libsodium && libsodium.ready) await libsodium.ready;
    logger.info('libsodium-wrappers initialized successfully');
    return 'libsodium-wrappers';
  } catch (e) {
    logger.error('No sodium backend could be initialized', e);
    return null;
  }
}

async function startBot() {
  logger.info('Starting WISDOM TEMP Bot...');
  const backend = await initSodium();
  if (!backend) {
    logger.warn('No encryption backend available. Voice may not work correctly.');
  } else {
    logger.info(`Using encryption backend: ${backend}`);
  }

  try {
    await client.login(process.env.DISCORD_TOKEN);
    // After login completes, run ready handler
    await handleClientReady();
  } catch (error) {
    logger.error('Failed to login. Retrying in 5 seconds...', error);
    setTimeout(startBot, 5000);
  }
}

startBot();
