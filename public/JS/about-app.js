// ==========================================
// 1. Socket.io አጀማመር
// ==========================================
const socket = io();

// ==========================================
// 2. የ UI ማስተካከያ ፋንክሽኖች (Core Logic)
// ==========================================

// ይህ ፋንክሽን ማንኛውንም አገልግሎት ክፍት ወይም ዝግ ለማድረግ ያገለግላል
function setServiceStatus(key, isApproved) {
    const payBtn = document.getElementById(`pay-btn-${key}`);
    const closedBtn = document.getElementById(`closed-btn-${key}`);
    const openBtn = document.getElementById(`open-btn-${key}`);

    if (isApproved) {
        // ክፍት ሲሆን
        if (payBtn) payBtn.style.setProperty('display', 'none', 'important');
        if (closedBtn) closedBtn.style.setProperty('display', 'none', 'important');
        if (openBtn) openBtn.style.setProperty('display', 'block', 'important');
        localStorage.setItem(`pay_status_${key}`, 'approved');
    } else {
        // ዝግ ሲሆን (ውድቅ ሲደረግ)
        if (payBtn) payBtn.style.setProperty('display', 'block', 'important');
        if (closedBtn) closedBtn.style.setProperty('display', 'block', 'important');
        if (openBtn) openBtn.style.setProperty('display', 'none', 'important');
        localStorage.removeItem(`pay_status_${key}`);
    }
}

// ገጹ ሲከፈት ሁሉንም በተኖች የሚያስተካክል
function refreshAllUI() {
    const services = ['tanker', 'quality', 'soil', 'ground'];
    services.forEach(key => {
        const isApproved = localStorage.getItem(`pay_status_${key}`) === 'approved';
        setServiceStatus(key, isApproved);
    });
}

// ==========================================
// 3. Socket.io መልዕክት መቀበያ (Real-time)
// ==========================================

// ✅ ክፍያ ሲጸድቅ
socket.on('paymentApproved', (data) => {
    const service = (data.serviceName || "").toLowerCase();
    let key = "";
    if (service.includes('tank')) key = "tanker";
    else if (service.includes('quality')) key = "quality";
    else if (service.includes('soil')) key = "soil";
    else if (service.includes('ground')) key = "ground";

    if (key) {
        setServiceStatus(key, true);
        alert(`✅ ደስ የሚል ዜና! የ ${data.serviceName} አገልግሎት ክፍት ሆኖልዎታል።`);
    }
});

// ❌ ክፍያ ውድቅ ሲደረግ
socket.on('paymentRejected', (data) => {
    const service = (data.serviceName || "").toLowerCase();
    let key = "";
    if (service.includes('tank')) key = "tanker";
    else if (service.includes('quality')) key = "quality";
    else if (service.includes('soil')) key = "soil";
    else if (service.includes('ground')) key = "ground";

    if (key) {
        // ወዲያውኑ UI-ውን ወደ ቀድሞው ይመልሳል
        setServiceStatus(key, false);
        alert(`⚠️ ማሳሰቢያ፦ የ ${data.serviceName} ክፍያዎ ውድቅ ተደርጓል። \nምክንያት፦ ${data.reason}`);
    }
});

// ==========================================
// 4. ክፍያ የመላክ ስራ (Upload)
// ==========================================
async function uploadReceipt(event) {
    if (event) event.preventDefault();

    const fileInput = document.getElementById('receiptInput');
    const serviceName = document.getElementById('selectedService').value;
    const username = localStorage.getItem('userEmail') || "Guest User";

    if (!fileInput.files[0]) {
        alert("እባክዎ መጀመሪያ የደረሰኝ ፎቶ ይምረጡ!");
        return;
    }

    const formData = new FormData();
    formData.append('receipt', fileInput.files[0]);
    formData.append('serviceName', serviceName);
    formData.append('username', username);

    try {
        const response = await fetch('/submit-payment', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            alert("ደረሰኙ በትክክል ተልኳል። አድሚኑ እስኪያጸድቅ ይጠብቁ።");
            document.getElementById("paymentModal").style.display = "none";
        }
    } catch (err) { alert("መላክ አልተቻለም!"); }
}

// ==========================================
// 5. ገጹ ሲከፈት የሚሰሩ ስራዎች
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // ቋንቋውን አድስ
    const savedLang = localStorage.getItem('selectedLang') || 'am';
    if (typeof changeLang === "function") changeLang(savedLang);
    
    // በተኖቹን አድስ
    refreshAllUI();
});

// ለሞዳል መክፈቻ
function openPaymentModal(serviceName) {
    document.getElementById('selectedService').value = serviceName;
    document.getElementById("paymentModal").style.display = "block";
}
function closeModal() {
    document.getElementById("paymentModal").style.display = "none";
}