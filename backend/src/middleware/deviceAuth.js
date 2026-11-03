import { authenticateDeviceCredentials } from '../services/deviceService.js';

export async function authenticateDevice(req, res, next) {
    try {
        const device = await authenticateDeviceCredentials(req.get('x-device-id'), req.get('x-device-secret'));
        if (!device) return res.status(401).json({ success: false, message: 'Invalid or inactive device credentials.' });
        req.device = device;
        next();
    } catch (error) {
        next(error);
    }
}
