import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { registerLegacyRoutes } from './legacy/legacyRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { organizationRoutes } from './routes/organizationRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { tankRoutes } from './routes/tankRoutes.js';
import { deviceRoutes } from './routes/deviceRoutes.js';
import { monitoringRoutes } from './routes/monitoringRoutes.js';
import { alertRoutes } from './routes/alertRoutes.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { exportRoutes } from './routes/exportRoutes.js';
import { serviceRoutes } from './routes/serviceRoutes.js';
import { waterLevelRoutes } from './routes/waterLevelRoutes.js';
import { waterQualityRoutes } from './routes/waterQualityRoutes.js';
import { fieldAssessmentRoutes } from './routes/fieldAssessmentRoutes.js';
import { sourceRoutes } from './routes/sourceRoutes.js';

const currentFile = fileURLToPath(import.meta.url);
const srcDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(srcDirectory, '../..');

export function createApp(io) {
    const app = express();
    app.set('io', io);
    app.set('trust proxy', 1);
    // Standalone Tinkercad bridge endpoint: public wildcard CORS, isolated from authenticated API CORS.
    app.use('/api/water-level', waterLevelRoutes);
    app.use('/api/v1/water-level', waterLevelRoutes);
    const corsOptions = {
        origin(origin, callback) {
            if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('CORS origin is not allowed.'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        optionsSuccessStatus: 204
    };
    app.use(cors(corsOptions));
    app.options(/.*/, cors(corsOptions));
    app.use(cookieParser());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    app.get('/health', (req, res) => {
        res.json({ success: true, service: 'hydroos-api', status: 'ok' });
    });

    const apiV1 = express.Router();
    apiV1.get('/health', (req, res) => res.json({ success: true, version: 'v1', status: 'ok' }));
    apiV1.use('/auth', authRoutes);
    apiV1.use('/organizations', organizationRoutes);
    apiV1.use('/users', userRoutes);
    apiV1.use('/dashboard', dashboardRoutes);
    apiV1.use('/tanks', tankRoutes);
    apiV1.use('/devices', deviceRoutes);
    apiV1.use('/monitoring', monitoringRoutes);
    apiV1.use('/alerts', alertRoutes);
    apiV1.use('/notifications', notificationRoutes);
    apiV1.use('/exports', exportRoutes);
    apiV1.use('/services', serviceRoutes);
    apiV1.use('/water-quality', waterQualityRoutes);
    apiV1.use('/field-assessments', fieldAssessmentRoutes);
    apiV1.use('/sources', sourceRoutes);
    app.use('/api/v1', apiV1);

    // Backward-compatible aliases for clients using the unversioned API paths.
    app.use('/api/tanks', tankRoutes);
    app.use('/api/sources', sourceRoutes);
    app.use('/api/water-quality', waterQualityRoutes);
    app.use('/api/field-assessments', fieldAssessmentRoutes);

    registerLegacyRoutes(app, io, projectRoot);

    app.use(express.static(path.join(projectRoot, 'public')));
    app.use('/images', express.static(path.join(projectRoot, 'images')));
    app.get('/', (req, res) => res.redirect('/login.html'));
    app.get('/:page', (req, res, next) => {
        const pageName = req.params.page.endsWith('.html') ? req.params.page : `${req.params.page}.html`;
        const htmlDirectory = path.join(projectRoot, 'public', 'HTML');
        const filePath = path.join(htmlDirectory, pageName);
        if (path.dirname(filePath) !== htmlDirectory) {
            return next();
        }
        res.sendFile(filePath, (error) => {
            if (error) next();
        });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);
    logger.info('Express application configured');
    return app;
}
