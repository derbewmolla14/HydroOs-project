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

const app = express();
const server = http.createServer(app);

// ===============================
// 1. SOCKET.IO CONFIGURATION
// ===============================
const io = new Server(server, {
    cors: {
        origin: "*",
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
app.use(cors());
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
    url: String,
    username: String,
    email: String,
    serviceName: String,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now }
}));

const User = mongoose.model('User', new mongoose.Schema({
    firstname: String,
    lastname: String,
    username: String,
    email: { type: String, required: true, unique: true },
    phone: String,
    password: { type: String, required: true }
}, { strict: false }));

// ===============================
// 5. AUTH ROUTES
// ===============================
app.post('/api/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "Registered!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: "Invalid login!" });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, phone, newPassword } = req.body;
    try {
        const user = await User.findOneAndUpdate({ email, phone }, { password: newPassword });
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
app.post('/submit-payment', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image!" });
        }
        const { username, email, serviceName } = req.body;
        const newReceipt = new Receipt({
            url: req.file.path,
            username,
            email,
            serviceName,
            status: 'pending'
        });
        await newReceipt.save();
        console.log("✅ Receipt saved:", username);
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
    const { id, username, email, serviceName } = req.body;
    try {
        await Receipt.findByIdAndUpdate(id, { status: 'approved' });
        io.emit('paymentApproved', { username, email, serviceName });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/admin/reject-payment', async (req, res) => {
    try {
        const { serviceName, username, email, reason } = req.body;
        await Receipt.findOneAndDelete({ username, serviceName });
        io.emit('paymentRejected', { serviceName, username, email, reason });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/admin/receipts', async (req, res) => {
    const receipts = await Receipt.find().sort({ timestamp: -1 });
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 HydroOS Server running on port ${PORT}`);
});