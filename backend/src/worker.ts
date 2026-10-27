import { prisma } from './prisma.js';
import { env } from './config/env.js';
import { initializeQueue, getQueueHealth } from './modules/queue/queueService.js';

async function startWorker() {
  console.log(`
  ================================================
  ⚙️  RankRiseUSA Background Queue Worker Process
  ================================================
  Environment:     ${env.NODE_ENV}
  Redis URL:       ${env.REDIS_URL}
  Email Send Mode: ${env.EMAIL_SEND_MODE}
  ================================================
  `);

  try {
    // 1. Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL database connected successfully');

    // 2. Initialize queue engine
    await initializeQueue();
    const health = getQueueHealth();
    console.log(`✅ Queue worker started [Engine: ${health.engine}, Status: ${health.status}]`);
    console.log('👀 Listening for email dispatch jobs...\n');
  } catch (err: any) {
    console.error('❌ Failed to start worker process:', err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down worker gracefully...`);
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startWorker();
