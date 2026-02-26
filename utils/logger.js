/**
 * Professional Logger Utility
 * Provides timestamped, leveled logging for the bot.
 */

const LEVELS = {
    INFO: { label: 'INFO ', color: '\x1b[36m' }, // Cyan
    SUCCESS: { label: 'OK   ', color: '\x1b[32m' }, // Green
    WARN: { label: 'WARN ', color: '\x1b[33m' }, // Yellow
    ERROR: { label: 'ERROR', color: '\x1b[31m' }, // Red
    DEBUG: { label: 'DEBUG', color: '\x1b[35m' }, // Magenta
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, message, extra) {
    const { label, color } = LEVELS[level];
    const ts = getTimestamp();
    const base = `${color}${BOLD}[${ts}] [${label}]${RESET} ${message}`;
    if (extra instanceof Error) {
        console[level === 'ERROR' ? 'error' : 'log'](base, '\n', extra.stack || extra.message);
    } else if (extra !== undefined) {
        console[level === 'ERROR' ? 'error' : 'log'](base, extra);
    } else {
        console[level === 'ERROR' ? 'error' : 'log'](base);
    }
}

const logger = {
    info: (msg, extra) => log('INFO', msg, extra),
    success: (msg, extra) => log('SUCCESS', msg, extra),
    warn: (msg, extra) => log('WARN', msg, extra),
    error: (msg, extra) => log('ERROR', msg, extra),
    debug: (msg, extra) => log('DEBUG', msg, extra),
};

module.exports = logger;
