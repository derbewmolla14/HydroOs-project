require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const XLSX = require('xlsx');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = express();
const server = http.createServer(app);
const localOrigins = ['http://127.0.0.1:5507', 'http://localhost:5507'];
const productionOrigin = 'https://smart-water-monitor-7kui.onrender.com';

// ===============================
// 1. SOCKET.IO CONFIGURATION
// ===============================
const io = new Server(server, {
    cors: {
        origin: [...localOrigins, productionOrigin],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"]
});

io.on("connection", (socket) => {
    console.log("🔌 User Connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ User Disconnected:", socket.id);
    });
});

// ===============================
// 2. CLOUDINARY CONFIGURATION
// ===============================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});




const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    password: { type: String, required: true },
    isBlocked: { type: Boolean, default: false } // 👈 ይህንን ማካተት
}, { strict: false });
const User = mongoose.model('User', userSchema);

// 1. ሁሉንም ተጠቃሚዎች ከአድሚን ፓነል ለማንበብ (Get All Users)
app.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // የይለፍ ቃል ሳያሳይ
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. ተጠቃሚን ሙሉ በሙሉ ከሰርቨር ለመሰረዝ (Remove User)
app.delete('/admin/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await AuthSession.deleteMany({ userId: user._id });
        io.emit('userDeleted', { userId: user._id.toString() });
        res.json({ success: true, message: "User removed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. ተጠቃሚን ማገድ ወይም ማልቀቅ (Block / Unblock User)
app.patch('/admin/users/:id/block', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.isBlocked = !user.isBlocked; // የነበረበትን ሁኔታ መቀልበስ (True ከሆነ False፣ False ከሆነ True)
        await user.save();
        
        res.json({ 
            success: true, 
            isBlocked: user.isBlocked, 
            message: user.isBlocked ? "User blocked successfully!" : "User unblocked successfully!" 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});




// ለቼክ (Logging)
console.log("☁️ Cloudinary Loaded:", process.env.CLOUDINARY_CLOUD_NAME || "Not Set");

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hydroos-reciepts',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage });

// ===============================
// 3. MIDDLEWARE
// ===============================
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || localOrigins.includes(origin) || origin === productionOrigin) {
            return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1); // Render Fix

// ===============================
// 4. DATABASE CONNECTION
// ===============================
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://molladerbew95:1998Molla%24@cluster0.ise4cwm.mongodb.net/HydroOS';

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- MODELS ---
const Receipt = mongoose.model('Receipt', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    url: String,
    username: String,
    email: String,
    serviceName: String,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now }
}));

const AuthSession = mongoose.model('AuthSession', new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
}));

const SESSION_COOKIE = 'hydroos_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashSessionToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getSessionToken(req) {
    const cookies = (req.headers.cookie || '').split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
    return sessionCookie ? decodeURIComponent(sessionCookie.trim().slice(SESSION_COOKIE.length + 1)) : null;
}

function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production';
    const attributes = [
        `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        'Max-Age=' + Math.floor(SESSION_DURATION_MS / 1000),
        'Path=/',
        'HttpOnly',
        'SameSite=Lax'
    ];
    if (secure) attributes.push('Secure');
    res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearSessionCookie(res) {
    res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
    );
}

async function requireAuth(req, res, next) {
    try {
        const token = getSessionToken(req);
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const session = await AuthSession.findOne({
            tokenHash: hashSessionToken(token),
            expiresAt: { $gt: new Date() }
        }).populate('userId', '-password');

        if (!session || !session.userId || session.userId.isBlocked) {
            if (session && session.userId && session.userId.isBlocked) {
                await AuthSession.deleteOne({ _id: session._id });
            }
            clearSessionCookie(res);
            return res.status(401).json({ success: false, message: 'Account is not available' });
        }

        req.user = session.userId;
        next();
    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json({ success: false, message: 'Unable to validate session' });
    }
}

// ===============================
// 5. AUTH ROUTES
// ===============================
app.post('/api/register', async (req, res) => {
    try {
        const userData = { ...req.body };
        userData.password = await bcrypt.hash(userData.password, 12);
        const newUser = new User(userData);
        await newUser.save();
        res.json({ success: true, message: "Registered!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        const passwordMatches = user
            ? user.password.startsWith('$2')
                ? await bcrypt.compare(password, user.password)
                : password === user.password
            : false;
        if (user && passwordMatches) {
            if (!user.password.startsWith('$2')) {
                user.password = await bcrypt.hash(password, 12);
                await user.save();
            }
            const token = crypto.randomBytes(32).toString('hex');
            await AuthSession.create({
                tokenHash: hashSessionToken(token),
                userId: user._id,
                expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
            });

            setSessionCookie(res, token);
            res.json({ success: true, user: user.toObject({ transform: (_, value) => {
                delete value.password;
                return value;
            }}) });
        } else {
            res.status(401).json({ success: false, message: "Invalid login!" });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/session', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

app.post('/api/logout', async (req, res) => {
    const token = getSessionToken(req);
    if (token) {
        await AuthSession.deleteOne({ tokenHash: hashSessionToken(token) });
    }
    clearSessionCookie(res);
    res.json({ success: true });
});

app.post('/api/reset-password', async (req, res) => {
    const { email, phone, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const user = await User.findOneAndUpdate({ email, phone }, { password: hashedPassword });
        if (user) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ===============================
// 6. PAYMENT ROUTES
// ===============================
app.post('/submit-payment', requireAuth, upload.single('receipt'), async (req, res) => {
    console.log("📥 Submit payment route hit successfully!"); // 👈 ይህንን ጨምር
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image!" });
        }
        const { serviceName } = req.body;
        const newReceipt = new Receipt({
            userId: req.user._id,
            url: req.file.path,
            username: req.user.username,
            email: req.user.email,
            serviceName,
            status: 'pending'
        });
        await newReceipt.save();
        console.log("✅ Receipt saved:", req.user.email);
        res.json({
            success: true,
            message: "Uploaded!",
            url: req.file.path
        });
    } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===============================
// 7. ADMIN ROUTES
// ===============================
app.post('/admin/login', (req, res) => {
    if (req.body.password === "molla1998") {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post('/admin/approve-payment', async (req, res) => {
    const { id } = req.body;
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "A valid receipt id is required" });
    }
    try {
        const receipt = await Receipt.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { status: 'approved' },
            { new: true }
        );
        if (!receipt) {
            return res.status(404).json({ success: false, message: "Pending receipt not found" });
        }

        io.emit('paymentApproved', {
            key: receipt.serviceName.toLowerCase().includes('ground') ? 'ground' : undefined,
            userId: receipt.userId ? receipt.userId.toString() : undefined,
            username: receipt.username,
            email: receipt.email,
            serviceName: receipt.serviceName
        });
        res.json({ success: true, receipt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/admin/reject-payment', async (req, res) => {
    try {
        const { id, reason } = req.body;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "A valid receipt id is required" });
        }
        const receipt = await Receipt.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { status: 'rejected' },
            { new: true }
        );
        if (!receipt) {
            return res.status(404).json({ success: false, message: "Receipt not found" });
        }

        io.emit('paymentRejected', {
            key: receipt.serviceName.toLowerCase().includes('ground') ? 'ground' : undefined,
            userId: receipt.userId ? receipt.userId.toString() : undefined,
            serviceName: receipt.serviceName,
            username: receipt.username,
            email: receipt.email,
            reason
        });
        res.json({ success: true, receipt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/admin/receipts', async (req, res) => {
    const status = req.query.status || 'pending';
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status) && status !== 'all') {
        return res.status(400).json({ success: false, message: "Invalid receipt status" });
    }

    const query = status === 'all' ? {} : { status };
    const receipts = await Receipt.find(query).sort({ timestamp: -1 });
    res.json(receipts);
});

app.get('/admin/download-users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        const worksheet = XLSX.utils.json_to_sheet(users);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
        const filePath = path.join(__dirname, 'users.xlsx');
        XLSX.writeFile(workbook, filePath);
        res.download(filePath, () => fs.unlinkSync(filePath));
    } catch {
        res.status(500).send("Error");
    }
});

// ===============================
// 8. ROUTING & STATIC PAGES
// ===============================
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/:page', (req, res) => {
    const pageName = req.params.page.endsWith('.html') ? req.params.page : `${req.params.page}.html`;
    const filePath = path.join(__dirname, 'public', 'HTML', pageName);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("Not found");
    }
});

// ===============================
// 9. START SERVER
// ===============================
const PORT = Number(process.env.PORT || 3000);
const FALLBACK_PORT = process.env.FALLBACK_PORT
    ? Number(process.env.FALLBACK_PORT)
    : null;

function startServer(port, allowFallback = true) {
    const handleServerError = (error) => {
        if (error.code !== 'EADDRINUSE') {
            console.error(`❌ Unable to start HydroOS on port ${port}:`, error.message);
            process.exitCode = 1;
            return;
        }

        console.warn(`⚠️ Port ${port} is already in use.`);

        if (allowFallback && FALLBACK_PORT && FALLBACK_PORT !== port) {
            console.warn(`↪️ Retrying HydroOS on fallback port ${FALLBACK_PORT}...`);
            startServer(FALLBACK_PORT, false);
            return;
        }

        console.warn(
            `Stop the process using port ${port}, then restart the backend. ` +
            `PowerShell: Get-NetTCPConnection -LocalPort ${port} | ` +
            `ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
        );
        process.exitCode = 1;
    };

    server.once('error', handleServerError);
    server.listen(port, () => {
        console.log(`🚀 HydroOS Server running on port ${port}`);
    });
}

startServer(PORT);