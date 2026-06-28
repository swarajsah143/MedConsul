import app from './app';
import { config } from './config';
import { prisma } from './config/database';
import { redis } from './config/redis';

async function bootstrap() {
  let dbConnected = false;
  let redisConnected = false;

  // ─── Try PostgreSQL ───────────────────────────────────────
  try {
    await prisma.$connect();
    dbConnected = true;
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (error: any) {
    console.warn('⚠️  PostgreSQL unavailable — running without database.');
    console.warn(`   Reason: ${error.message || error}`);
    console.warn('   The API will return errors for DB-dependent routes.');
    console.warn('   Frontend mock fallbacks will handle the UI.\n');
  }

  // ─── Try Redis ────────────────────────────────────────────
  try {
    await redis.connect();
    redisConnected = true;
  } catch (error: any) {
    console.warn('⚠️  Redis unavailable — OTP/session features disabled.');
    console.warn(`   Reason: ${error.message || error}\n`);
  }

  // ─── Start HTTP server regardless ─────────────────────────
  const server = app.listen(config.port, () => {
    const dbStatus = dbConnected ? '✅ Connected' : '⚠️  Offline';
    const redisStatus = redisConnected ? '✅ Connected' : '⚠️  Offline';
    console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║      🏥  MedCounsel AI Server                ║
║                                              ║
║      Environment: ${config.nodeEnv.padEnd(25)}║
║      Port:        ${String(config.port).padEnd(25)}║
║      API:         http://localhost:${String(config.port).padEnd(14)}║
║      PostgreSQL:  ${dbStatus.padEnd(25)}║
║      Redis:       ${redisStatus.padEnd(25)}║
║                                              ║
╚══════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        if (dbConnected) await prisma.$disconnect();
        if (redisConnected) await redis.disconnect();
        console.log('✅ Connections closed. Goodbye!');
        process.exit(0);
      });
    });
  });
}

bootstrap();
