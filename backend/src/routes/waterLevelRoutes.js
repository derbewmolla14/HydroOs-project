import express from 'express';

const router = express.Router();

const fallbackReading = () => ({
    distanceCm: 113.1,
    waterLevelCm: 6.9,
    waterPercent: 6,
    source: 'Tinkercad Simulation',
    updatedAt: new Date().toISOString()
});

let latestReading = fallbackReading();

router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

router.use(express.json({ limit: '16kb' }));

function parseSerialLine(serialLine) {
    const match = String(serialLine).match(
        /Distance\s+to\s+Water\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*cm[\s\S]*?Water\s+Level\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*cm\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\)/i
    );
    if (!match) return null;
    return {
        distanceCm: Number(match[1]),
        waterLevelCm: Number(match[2]),
        waterPercent: Number(match[3])
    };
}

router.get('/', (req, res) => {
    res.json(latestReading);
});

router.post('/', (req, res) => {
    const body = req.body || {};
    const values = typeof body.serialLine === 'string'
        ? parseSerialLine(body.serialLine)
        : {
            distanceCm: body.distanceCm,
            waterLevelCm: body.waterLevelCm,
            waterPercent: body.waterPercent
        };

    if (!values) {
        return res.status(400).json({
            ok: false,
            message: 'serialLine format is invalid. Expected Distance to Water and Water Level values.'
        });
    }

    const { distanceCm, waterLevelCm, waterPercent } = values;
    if (![distanceCm, waterLevelCm, waterPercent].every(Number.isFinite)
        || distanceCm < 0 || waterLevelCm < 0 || waterPercent < 0 || waterPercent > 100) {
        return res.status(400).json({
            ok: false,
            message: 'distanceCm and waterLevelCm must be non-negative numbers; waterPercent must be between 0 and 100.'
        });
    }

    latestReading = {
        distanceCm,
        waterLevelCm,
        waterPercent,
        source: typeof body.source === 'string' && body.source.trim()
            ? body.source.trim().slice(0, 80)
            : 'Tinkercad Simulation',
        updatedAt: new Date().toISOString()
    };

    return res.status(200).json({ ok: true, reading: latestReading });
});

export { router as waterLevelRoutes };
