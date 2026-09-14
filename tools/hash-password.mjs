#!/usr/bin/env node
/**
 * Generates RECON login credentials for the environment variables.
 *
 *   node tools/hash-password.mjs <username>
 *
 * Asks for the password (hidden, twice) and prints:
 *   - a MINERVA_USERS entry  (username:scrypt.<salt>.<hash>)
 *   - a fresh AUTH_SECRET    (only needed once per deployment)
 *
 * Several users go in one variable, comma-separated. The password itself is
 * never stored anywhere.
 */
import { randomBytes, scrypt } from 'node:crypto';
import readline from 'node:readline';

const username = process.argv[2];
if (!username || !/^[A-Za-z0-9_.-]{1,64}$/.test(username)) {
  console.error('Usage: node tools/hash-password.mjs <username>   (letters, digits, _ . - only)');
  process.exit(1);
}

function askHidden(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(prompt)) rl.output.write(prompt); };
    rl.question(prompt, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const password = await askHidden('Password: ');
if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
if ((await askHidden('Repeat password: ')) !== password) {
  console.error('Passwords do not match.');
  process.exit(1);
}

const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(password.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, k) => (err ? reject(err) : resolve(k))),
);

console.log('\nMINERVA_USERS entry:');
console.log(`${username}:scrypt.${salt.toString('base64url')}.${key.toString('base64url')}`);
console.log('\nAUTH_SECRET (generate once, keep it private):');
console.log(randomBytes(32).toString('base64url'));
