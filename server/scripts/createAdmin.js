const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

function promptText(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let muted = false;
    const origWrite = rl._writeToOutput.bind(rl);
    rl._writeToOutput = function (stringToWrite) {
      if (muted) {
        return;
      }
      origWrite(stringToWrite);
    };

    process.stdout.write(prompt);
    muted = true;

    rl.question('', (password) => {
      muted = false;
      rl.close();
      process.stdout.write('\n');
      resolve(password.trim());
    });
  });
}

async function main() {
  console.log('--- PALLUVO Administrator Provisioning ---');

  let email = process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL;
  let name = process.env.ADMIN_NAME || process.env.INITIAL_ADMIN_NAME;
  let password = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;

  // Read email or name from CLI args if provided (argv[2] = email, argv[3] = name)
  if (process.argv[2] && process.argv[2].includes('@')) {
    email = process.argv[2];
  }

  if (process.argv[3] && !password) {
    name = process.argv[3];
  }

  // If email is not set, prompt interactively
  if (!email) {
    email = await promptText('Enter Administrator Email: ');
  }

  if (!email || !email.includes('@')) {
    console.error('Error: A valid administrator email address is required.');
    process.exit(1);
  }

  // If password is not set via environment variable, prompt securely without echoing
  if (!password) {
    password = await promptPassword('Enter Administrator Password (min 8 chars): ');
    if (password.length >= 8) {
      const confirmPassword = await promptPassword('Confirm Administrator Password: ');
      if (password !== confirmPassword) {
        console.error('Error: Passwords do not match.');
        process.exit(1);
      }
    }
  }

  if (!password || password.length < 8) {
    console.error('Error: Administrator password must be at least 8 characters long.');
    process.exit(1);
  }

  if (!name) {
    name = 'PALLUVO Administrator';
  }

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = bcrypt.hashSync(password, 12);

  try {
    const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      db.prepare('UPDATE users SET role = ?, password_hash = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('admin', passwordHash, name, existing.id);
      console.log(`✅ User "${cleanEmail}" upgraded to Administrator successfully.`);
    } else {
      db.prepare(`
        INSERT INTO users (name, email, password_hash, phone, role)
        VALUES (?, ?, ?, ?, 'admin')
      `).run(name, cleanEmail, passwordHash, null);
      console.log(`✅ Administrator account "${cleanEmail}" created successfully.`);
    }
  } catch (err) {
    console.error('Failed to provision administrator:', err.message);
    process.exit(1);
  }
}

main();
