import { createServer } from './server.js';
import { runMigrations } from './db/migrator.js';
import { config } from './config/env.js';

async function start() {
  try {
    console.log('------------------------------------------------------------');
    console.log('Starting FLOPSHOW Backend Services...');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Database: ${config.databasePath}`);
    console.log('------------------------------------------------------------');

    // Run schema migrations automatically on startup
    const migrationResult = runMigrations();
    console.log(`Migrations check: ${migrationResult.applied.length} applied (${migrationResult.total} total)`);

    const app = createServer();

    const server = app.listen(config.port, () => {
      console.log(`✓ FLOPSHOW API Server running at http://localhost:${config.port}`);
      console.log(`  Health check: http://localhost:${config.port}/api/health`);
      console.log(`  Content catalog: http://localhost:${config.port}/api/content`);
      console.log('------------------------------------------------------------');
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
