import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

export async function connectDatabase(uri) {
    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error', { error: error.message });
    });
    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB connection was not established.');
    logger.info('MongoDB connected', { database: mongoose.connection.name });
}

export async function disconnectDatabase() {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
}
