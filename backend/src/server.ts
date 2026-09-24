import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { runRenewalReminders } from './modules/billing/renewal-reminders.js';

const server = app.listen(env.API_PORT, () => {
  console.log(`CareerHub API listening on :${env.API_PORT}`);
  void runRenewalReminders();
  setInterval(() => void runRenewalReminders(), 60 * 60 * 1000);
});
async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

