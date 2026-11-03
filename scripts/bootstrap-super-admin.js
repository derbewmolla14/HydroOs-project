import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env', quiet: true });

const email = (process.env.SUPER_ADMIN_EMAIL || 'derbewmolla14@gmail.com').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
    throw new Error('Set SUPER_ADMIN_INITIAL_PASSWORD (or ADMIN_PASSWORD for local compatibility) to a password of at least 8 characters. It is never written to source code.');
}

const [{ User }, { env }, { hashPassword }] = await Promise.all([
    import('../backend/src/models/User.js'),
    import('../backend/src/config/env.js'),
    import('../backend/src/services/authService.js')
]);
await mongoose.connect(env.mongodbUri);
const passwordHash = await hashPassword(password);
const user = await User.findOneAndUpdate(
    { email },
    { $set: { email, passwordHash, firstname: 'System', lastname: 'Owner', role: 'SUPER_ADMIN', organizationId: null, status: 'active' }, $unset: { password: 1, refreshTokenHash: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
);
console.log(`Super Admin is ready for ${user.email}. The password was stored only as a bcrypt hash.`);
await mongoose.disconnect();
