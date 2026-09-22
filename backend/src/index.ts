import { createServer } from './server.js';
import { runMigrationsAsync } from './db/migrator.js';
import { seedDatabase } from './db/seed.js';
import { config } from './config/env.js';
import { telegramService } from './services/telegramService.js';

async function start() {
  try {
    console.log('------------------------------------------------------------');
    console.log('Starting FLOPSHOW Backend Services...');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Database Mode: ${config.databaseType.toUpperCase()}${config.isPostgres ? ' (PostgreSQL via DATABASE_URL)' : ' (Local SQLite active)'}`);
    if (!config.isPostgres) console.log(`SQLite Path: ${config.databasePath}`);
    console.log('------------------------------------------------------------');

    // Run schema migrations automatically on startup (async for both SQLite and PostgreSQL)
    const migrationResult = await runMigrationsAsync();
    console.log(`Migrations check: ${migrationResult.applied.length} applied (${migrationResult.total} total)`);

    // Seed system accounts (admin + demo) — idempotent, safe to run on every startup
    await seedDatabase();
    console.log('✓ System accounts verified (admin + demo)');

    const app = createServer();

    const host = config.host || '0.0.0.0';
    const server = app.listen(config.port, host, () => {
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      console.log(`✓ FLOPSHOW API Server running at http://${displayHost}:${config.port} (bound to ${host}:${config.port})`);
      console.log(`  Health check: http://${displayHost}:${config.port}/api/health`);
      console.log(`  Content catalog: http://${displayHost}:${config.port}/api/content`);
      console.log('------------------------------------------------------------');

      // Auto-register Telegram Instant Payment Alert Webhook (1-Click Bot)
      telegramService.autoRegisterWebhook().catch(tgErr => {
        console.warn('[Telegram Bot] Auto webhook registration warning:', tgErr?.message || tgErr);
      });
    });

    // Graceful shutdown
    const handleShutdown = () => {
      console.log('Shutting down FLOPSHOW Backend...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (err) {
    console.error('Fatal error starting FLOPSHOW backend:', err);
    process.exit(1);
  }
}

start();
