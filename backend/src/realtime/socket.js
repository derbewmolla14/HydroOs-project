import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { authenticateDeviceCredentials } from '../services/deviceService.js';
import { Device } from '../models/Device.js';
import { persistTelemetry } from '../services/telemetryService.js';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/authService.js';
import { evaluateHeartbeat } from '../services/alertService.js';

function cookieValue(cookieHeader, name) {
    return cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function createSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.clientOrigin,
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', async (socket) => {
        logger.info('Socket client connected', { socketId: socket.id });
        const { deviceId, secret } = socket.handshake.auth || {};
        const accessToken = cookieValue(socket.handshake.headers.cookie, 'hydroos_access');
        if (accessToken && !deviceId && !secret) {
            try {
                const claims = verifyAccessToken(accessToken);
                const user = await User.findById(claims.sub).select('organizationId role status').lean();
                if (user?.status === 'active') {
                    socket.data.userId = user._id.toString();
                    socket.data.organizationId = user.organizationId?.toString();
                    if (user.role === 'SUPER_ADMIN') socket.join('organization:platform');
                    else if (socket.data.organizationId) socket.join(`organization:${socket.data.organizationId}`);
                }
            } catch (error) {
                logger.warn('Dashboard socket authentication failed', { socketId: socket.id, error: error.message });
            }
        }
        if (deviceId || secret) {
            authenticateDeviceCredentials(deviceId, secret).then(async (device) => {
                if (!device) return socket.disconnect(true);
                socket.data.deviceId = device.id;
                socket.join(`organization:${device.organizationId}`);
                const now = new Date();
                await Device.findByIdAndUpdate(device.id, { $set: { lastSeenAt: now, lastHeartbeatAt: now } });
                await evaluateHeartbeat({ device: await Device.findById(device.id).lean(), io });
                socket.on('device:heartbeat', async (payload = {}) => {
                    const updated = await Device.findByIdAndUpdate(device.id, { $set: { lastSeenAt: new Date(), lastHeartbeatAt: new Date(), firmwareVersion: payload.firmwareVersion || device.firmwareVersion } }, { new: true }).lean();
                    await evaluateHeartbeat({ device: updated, io });
                });
                socket.on('device:reading', async (payload = {}) => {
                    try {
                        await persistTelemetry({ device, payload, io });
                    } catch (error) {
                        socket.emit('telemetry:error', { message: error.message });
                        logger.warn('Device telemetry rejected', { socketId: socket.id, error: error.message });
                    }
                });
            }).catch((error) => {
                logger.warn('Device socket authentication failed', { socketId: socket.id, error: error.message });
                socket.disconnect(true);
            });
        }
        socket.on('disconnect', (reason) => {
            logger.info('Socket client disconnected', { socketId: socket.id, reason });
        });
    });

    return io;
}
