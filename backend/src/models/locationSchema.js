import mongoose from 'mongoose';

export const coordinatesSchema = new mongoose.Schema({
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null }
}, { _id: false });

export const adminLocationSchema = new mongoose.Schema({
    country: { type: String, trim: true, default: '' },
    region: { type: String, trim: true, default: '' },
    zone: { type: String, trim: true, default: '' },
    woreda: { type: String, trim: true, default: '' },
    kebele: { type: String, trim: true, default: '' }
}, { _id: false });

export const locationFields = {
    coordinates: { type: coordinatesSchema, default: () => ({}) },
    adminLocation: { type: adminLocationSchema, default: () => ({}) },
    mapAdded: { type: Boolean, default: false },
    geoLocation: {
        type: { type: String, enum: ['Point'], default: undefined },
        coordinates: { type: [Number], default: undefined }
    }
};

export function normalizeLocationInput(input = {}) {
    const coordinates = input.coordinates || {};
    const latitude = coordinates.latitude ?? input.latitude ?? null;
    const longitude = coordinates.longitude ?? input.longitude ?? null;
    if (latitude !== null && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
        throw Object.assign(new Error('Latitude must be between -90 and 90.'), { statusCode: 400 });
    }
    if (longitude !== null && (!Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
        throw Object.assign(new Error('Longitude must be between -180 and 180.'), { statusCode: 400 });
    }
    const result = {
        coordinates: { latitude: latitude === null ? null : Number(latitude), longitude: longitude === null ? null : Number(longitude) },
        adminLocation: input.adminLocation || {},
        mapAdded: Boolean(input.mapAdded)
    };
    if (latitude !== null && longitude !== null) result.geoLocation = { type: 'Point', coordinates: [Number(longitude), Number(latitude)] };
    return result;
}
