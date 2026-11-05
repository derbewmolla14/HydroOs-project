import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';
import { createTankHistoryDocument, createTankHistoryWorkbook } from '../../backend/src/services/exportService.js';

const report = {
    tank: { name: 'North Tank', code: 'NT-01', tankType: 'ground', capacity: 10000 },
    filters: { start: new Date('2026-11-01T00:00:00.000Z'), end: new Date('2026-11-04T23:59:59.999Z') },
    generatedAt: new Date('2026-11-04T12:00:00.000Z'),
    rows: [{ date: new Date('2026-11-02T10:00:00.000Z'), waterLevel: 4200, waterVolume: 4200, waterPercentage: 42, waterQuality: { ph: 7.1 }, deviceStatus: 'active', readingStatus: 'normal' }]
};

test('protects tank history exports from unauthenticated access', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/exports/tank-history?tankId=507f1f77bcf86cd799439011`);
    assert.equal(response.status, 401);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('creates readable XLSX and DOCX tank history reports', async () => {
    const workbook = createTankHistoryWorkbook(report);
    const document = await createTankHistoryDocument(report);
    assert.equal(workbook.subarray(0, 2).toString(), 'PK');
    assert.equal(document.subarray(0, 2).toString(), 'PK');
    assert.ok(workbook.length > 1000);
    assert.ok(document.length > 1000);
});
