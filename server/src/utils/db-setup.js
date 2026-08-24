const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const serverDir = path.join(__dirname, '../..');

console.log('[DB-Setup] Initializing database with URL:', process.env.DATABASE_URL);

try {
  console.log('[DB-Setup] 1. Generating Prisma Client...');
  execSync('npx prisma generate', {
    cwd: serverDir,
    env: { ...process.env },
    stdio: 'inherit',
  });

  console.log('[DB-Setup] 2. Pushing database schema...');
  execSync('npx prisma db push --accept-data-loss', {
    cwd: serverDir,
    env: { ...process.env },
    stdio: 'inherit',
  });

  console.log('[DB-Setup] 3. Seeding clinical database records...');
  require('./seed.js');
} catch (err) {
  console.error('[DB-Setup] ❌ Error executing database setup:', err.message);
  process.exit(1);
}
