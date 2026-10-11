document.addEventListener("DOMContentLoaded", function () {
    // Initialize groundwater data simulation & live tracking
    initGroundwaterSensors();
});

function initGroundwaterSensors() {
    updateSensorMetrics();

    // Periodically update sensor data every 4 seconds to mimic live IoT feed
    setInterval(updateSensorMetrics, 4000);
}

function updateSensorMetrics() {
    // Generate realistic fluctuating groundwater data
    const randomDepth = (17.5 + Math.random() * 1.5).toFixed(2);
    const randomPressure = (105 + Math.random() * 5).toFixed(1);
    const randomPumpRate = (12.4 + Math.random() * 2).toFixed(1);

    document.getElementById("waterDepth").textContent = `${randomDepth} m`;
    document.getElementById("aquiferPressure").textContent = `${randomPressure} kPa`;
    document.getElementById("pumpRate").textContent = `${randomPumpRate} L/s`;

    appendLog(`[Telemetry] Depth: ${randomDepth}m | Pressure: ${randomPressure}kPa`);
}

function triggerManualSync() {
    appendLog("[Action] Manual IoT sync triggered successfully.");
    alert("Groundwater sensor node synced with MongoDB database.");
}

function togglePumpSimulation() {
    appendLog("[Command] Toggled pump motor status.");
    alert("Pump motor command sent to ESP32 hardware unit.");
}

function appendLog(message) {
    const logBox = document.getElementById("telemetryLog");
    if (!logBox) return;

    const timeString = new Date().toLocaleTimeString();
    const p = document.createElement("p");
    p.textContent = `[${timeString}] ${message}`;
    logBox.appendChild(p);

    // Keep scroll at bottom
    logBox.scrollTop = logBox.scrollHeight;
}