/**
 * Shared Helper Utilities
 * Centralises repeated logic used across index.js and commands.
 */

const { EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────
// 1. Cooldown Manager
// ─────────────────────────────────────────────
const cooldownMap = new Map();

// Clean up stale cooldown entries every 5 minutes
setInterval(() => cooldownMap.clear(), 5 * 60 * 1000);

/**
 * Check if a user is on cooldown for a specific command.
 * @param {string} userId
 * @param {string} commandName
 * @param {number} seconds  - cooldown duration in seconds
 * @returns {{ onCooldown: boolean, remaining: string }}
 */
function checkCooldown(userId, commandName, seconds = 3) {
    const key = `${userId}:${commandName}`;
    const lastUsed = cooldownMap.get(key);
    const now = Date.now();

    if (lastUsed && now - lastUsed < seconds * 1000) {
        const remaining = ((seconds * 1000 - (now - lastUsed)) / 1000).toFixed(1);
        return { onCooldown: true, remaining };
    }

    cooldownMap.set(key, now);
    return { onCooldown: false, remaining: '0' };
}

// ─────────────────────────────────────────────
// 2. Ownership Checker for Button Interactions
// ─────────────────────────────────────────────
/**
 * Validates that the interaction user is the owner of their current temp channel.
 * Replies with an ephemeral error automatically if validation fails.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Map} tempChannels
 * @returns {Promise<{ voiceChannel, channelData } | null>}
 */
async function checkOwnership(interaction, tempChannels) {
    const voiceChannel = interaction.member?.voice?.channel;

    if (!voiceChannel) {
        await interaction.reply({
            content: '> <a:warning_animated:1361729714259099809> **You must be in a voice channel!**',
            ephemeral: true,
        }).catch(() => { });
        return null;
    }

    const channelData = tempChannels.get(voiceChannel.id);

    if (!channelData) {
        await interaction.reply({
            content: '> <a:warning_animated:1361729714259099809> **This is not a temporary channel!**',
            ephemeral: true,
        }).catch(() => { });
        return null;
    }

    if (channelData.ownerId !== interaction.user.id) {
        await interaction.reply({
            content: '> <a:warning_animated:1361729714259099809> **You are not the owner of this channel!**',
            ephemeral: true,
        }).catch(() => { });
        return null;
    }

    return { voiceChannel, channelData };
}

// ─────────────────────────────────────────────
// 3. Voice Channel Status Setter
// ─────────────────────────────────────────────
/**
 * Sets the voice channel status via the Discord REST API.
 * Silently ignores errors (non-critical feature).
 *
 * @param {string} channelId
 * @param {string} token  - Bot token
 * @param {string} status - Status text
 */
async function setVoiceStatus(channelId, token, status) {
    try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}/voice-status`, {
            method: 'PUT',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
    } catch (_) {
        // Non-critical – silently ignore
    }
}

// ─────────────────────────────────────────────
// 4. Standard Error Embed Builder
// ─────────────────────────────────────────────
/**
 * Creates a standard error embed.
 * @param {string} description
 * @param {import('discord.js').Client} client
 * @returns {EmbedBuilder}
 */
function errorEmbed(description, client) {
    return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`> <a:warning_animated:1361729714259099809> **${description}**`)
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client?.user?.displayAvatarURL() });
}

/**
 * Safely reply to a message, catching ChannelNotCached or other common Discord errors.
 * @param {import('discord.js').Message | import('discord.js').Interaction} target 
 * @param {object} options 
 */
async function safeReply(target, options) {
    try {
        if (target.replied || target.deferred) {
            return await target.editReply(options);
        }
        return await target.reply(options);
    } catch (error) {
        if (error.code === 'ChannelNotCached' || error.message.includes('not cached')) {
            console.warn(`[SafeReply] Channel not cached for message/interaction ${target.id}`);
            return null;
        }
        console.error('[SafeReply] Unexpected error:', error);
    }
}

module.exports = { checkCooldown, checkOwnership, setVoiceStatus, errorEmbed, safeReply };
