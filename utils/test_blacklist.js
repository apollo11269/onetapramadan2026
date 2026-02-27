// Simple script to exercise blacklistStorage utilities
const { addBlacklist, removeBlacklist, isBlacklisted, loadBlacklist } = require('./blacklistStorage');

async function run() {
  const testId = '123456789012345678';
  console.log('Initial load:', loadBlacklist());

  console.log('\nAdding temporary entry (5 seconds)');
  addBlacklist(testId, 'moderator', Date.now() + 5000, 'unit test');
  console.log('After add:', loadBlacklist());

  console.log('Is blacklisted?', isBlacklisted(testId));

  console.log('\nWaiting 6 seconds for expiry...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('After expiry load:', loadBlacklist());
  console.log('Is blacklisted now?', isBlacklisted(testId));

  console.log('\nAdding permanent entry');
  addBlacklist(testId, 'mod2', null, 'perm test');
  console.log('Is blacklisted?', isBlacklisted(testId));

  console.log('Removing entry');
  removeBlacklist(testId);
  console.log('Final load:', loadBlacklist());
}

run().catch(console.error);
