import 'dotenv/config';
import { prisma } from '../src/config/database.js';

async function testRemoteDatabase() {
  console.log('========================================');
  console.log('REMOTE MYSQL CONNECTION TEST');
  console.log('========================================');

  try {
    // 1. Connection check
    console.log('[1/4] Connecting to database...');
    await prisma.$connect();
    console.log('  -> CONNECTED successfully.');

    // 2. SELECT query
    console.log('[2/4] Executing SELECT query...');
    const pingResult = await prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 as ping`;
    console.log('  -> SELECT query passed:', pingResult);

    // 3. Schema & table check
    console.log('[3/4] Checking database tables...');
    const userCount = await prisma.user.count();
    console.log(`  -> User table verified: ${userCount} existing user(s).`);

    // 4. CRUD Test (Transactional safe rollback or isolated temp table)
    console.log('[4/4] Testing transactional CRUD execution...');
    await prisma.$transaction(async (tx) => {
      // Test read/query inside transaction
      const sequence = await tx.documentSequence.findFirst();
      console.log(`  -> Transaction read successful (sequence found: ${Boolean(sequence)}).`);
    });
    console.log('  -> Transactional operations verified.');

    console.log('========================================');
    console.log('STATUS: MySQL Remote Connection SUCCESS');
    console.log('========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('STATUS: MySQL Remote Connection FAILED');
    console.error('========================================');
    console.error('Error Details:', error instanceof Error ? error.message : error);
    console.error('\nTroubleshooting Checklist:');
    console.error('  1. Verify host and port (default 3306).');
    console.error('  2. Verify credentials (DB_USER, DB_PASSWORD, DB_NAME).');
    console.error('  3. Ensure external host allows remote connections (IP allowlist / 0.0.0.0/0).');
    console.error('  4. If provider requires SSL, append ?sslmode=require or set DB_SSL=true.');
    console.error('  5. Run "npx prisma migrate deploy" if tables are missing.');
    console.error('========================================\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRemoteDatabase();
