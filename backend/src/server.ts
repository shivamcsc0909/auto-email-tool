import { createApp } from './app.js';
import { env, validateAndLogConfiguration } from './config/env.js';
import { seedAdminIfNoneExists } from './modules/auth/authService.js';
import { seedTemplatesIfNoneExist } from './modules/templates/templatesService.js';
import { seedDemoSendersIfNoneExist } from './modules/senders/sendersService.js';
import { initializeQueue } from './modules/queue/queueService.js';

// Validate configuration on boot
validateAndLogConfiguration();

const app = createApp();

// Seed initial admin user, default outreach templates, and demo senders if empty
seedAdminIfNoneExists().catch(err => {
  console.warn('Failed to seed default admin:', err);
});
seedTemplatesIfNoneExist().catch(err => {
  console.warn('Failed to seed templates:', err);
});
seedDemoSendersIfNoneExist().catch(err => {
  console.warn('Failed to seed demo senders:', err);
});
initializeQueue().catch(err => {
  console.warn('Failed to initialize queue:', err);
});

app.listen(env.PORT, () => {
  console.log(`
  🚀 RankRiseUSA Outreach Automation Platform API
  ================================================
  Server running at:   http://localhost:${env.PORT}
  Environment:         ${env.NODE_ENV}
  Email Send Mode:     ${env.EMAIL_SEND_MODE}
  Client Web App URL:  ${env.APP_URL}
  ================================================
  `);
});
