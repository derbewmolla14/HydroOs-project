import http from 'node:http';
import { createApp } from './app.js';
import { assertRuntimeConfig, env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './db/mongoose.js';
import { createSocketServer } from './realtime/socket.js';
import { evaluateOfflineDevices } from './services/alertService.js';

async function start() {
    assertRuntimeConfig();
    await connectDatabase(env.mongodbUri);

    const httpServer = http.createServer();
    const io = createSocketServer(httpServer);
    const app = createApp(io);
    httpServer.on('request', app);

    httpServer.listen(env.port, () => {
        logger.info('HydroOS server started', { port: env.port, environment: env.nodeEnv });
    });
    const alertTimer = setInterval(() => evaluateOfflineDevices(io).catch((error) => logger.error('Alert evaluation failed', { error: error.message })), 60000);
    alertTimer.unref();
}

start().catch((error) => {
    logger.error('HydroOS server failed to start', { error: error.message, stack: error.stack });
    process.exitCode = 1;
});
