/**
 * HydroOS Tinkercad Serial Monitor bridge
 *
 * REQUIREMENTS
 *   - Node.js 18 or newer (built-in fetch).
 *   - Google Chrome or Microsoft Edge started with remote debugging enabled.
 *   - Playwright installed locally without changing project manifests:
 *       npm install --no-save playwright
 *
 * WINDOWS / POWERSHELL QUICK START
 *   1. Close Chrome windows, then start a separate debugging browser:
 *        & "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\hydroos-tinkercad"
 *      (For Edge, use the msedge.exe path and the same flags.)
 *   2. In that browser, open Tinkercad, start the circuit simulation, and open
 *      its Serial Monitor. Keep that tab visible/open.
 *   3. From the HydroOS repository root, install Playwright once:
 *        npm install --no-save playwright
 *   4. Point the bridge at your running HydroOS backend (Render URL for deployed
 *      backend, or localhost for local development), then run:
 *        $env:HYDRO_OS_API = "http://localhost:5000/api/water-level"
 *        node scripts/tinkercad-bridge.js
 *
 * ENVIRONMENT
 *   HYDRO_OS_API  POST endpoint. Defaults to
 *                 http://localhost:5000/api/water-level
 *   CHROME_CDP_URL Chrome DevTools endpoint. Defaults to
 *                 http://127.0.0.1:9222
 *
 * The bridge reads the newest matching serial line from a Tinkercad tab and
 * POSTs it once per second. It does not modify the Tinkercad circuit or Chrome.
 */

import { chromium } from 'playwright';

const apiUrl = process.env.HYDRO_OS_API || 'http://localhost:5000/api/water-level';
const cdpUrl = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
const pollIntervalMs = 1000;

const serialPattern = /Distance\s+to\s+Water\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*cm[\s\S]{0,180}?Water\s+Level\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*cm\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\)/gi;

function extractLatestSerialLine(text) {
  let latest = null;
  for (const match of text.matchAll(serialPattern)) {
    latest = {
      serialLine: match[0].replace(/\s+/g, ' ').trim(),
      distanceCm: Number(match[1]),
      waterLevelCm: Number(match[2]),
      waterPercent: Number(match[3]),
    };
  }
  return latest;
}

async function readLatestFromTinkercad(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages())
    .filter((page) => {
      try {
        return new URL(page.url()).hostname.endsWith('tinkercad.com');
      } catch {
        return false;
      }
    });

  for (const page of pages) {
    for (const frame of page.frames()) {
      try {
        const text = await frame.locator('body').innerText({ timeout: 1200 });
        const reading = extractLatestSerialLine(text);
        if (reading) return reading;
      } catch {
        // Ignore detached, cross-origin, or temporarily unavailable frames.
      }
    }
  }
  return null;
}

async function main() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch (error) {
    console.error(`Cannot connect to Chrome at ${cdpUrl}.`);
    console.error('Start Chrome with --remote-debugging-port=9222, then reopen Tinkercad.');
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Connected to Chrome. Posting water-level readings to ${apiUrl}`);
  console.log('Waiting for a Tinkercad Serial Monitor line... Press Ctrl+C to stop.');

  let inFlight = false;
  let lastPostedLine = '';

  const poll = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const reading = await readLatestFromTinkercad(browser);
      if (!reading) {
        return;
      }

      // Keep the endpoint refreshed every second, even when the latest line
      // has not changed, so updatedAt reflects the active serial bridge.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialLine: reading.serialLine,
          source: 'Tinkercad Simulation',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`HydroOS API returned HTTP ${response.status}: ${detail}`);
      }

      if (reading.serialLine !== lastPostedLine) {
        console.log(
          `Posted: Distance ${reading.distanceCm} cm | Water level ${reading.waterLevelCm} cm (${reading.waterPercent}%)`
        );
        lastPostedLine = reading.serialLine;
      }
    } catch (error) {
      console.error(`Bridge error: ${error.message}`);
    } finally {
      inFlight = false;
    }
  };

  await poll();
  const timer = setInterval(poll, pollIntervalMs);

  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log('\nStopping Tinkercad bridge. Chrome remains open.');
    // Exit without closing the user's remotely-debugged Chrome session.
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
