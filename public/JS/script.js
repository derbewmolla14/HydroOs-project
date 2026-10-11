// 🌐 API URL (ለሎካል እና ለ Render production የሚቀያየርበት)
const API_URL = window.HYDROOS_API_URL || (window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:3000"
    : window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://smart-water-monitor-7kui.onrender.com");

// 1. የ Socket.io አጀማመር
const socket = io(API_URL, {
    transports: ['websocket', 'polling']
});

socket.on("connect", () => {
    console.log("ከሰርቨር ጋር ተገናኝቷል! (Connected to Server):", socket.id);
});

// 2. ግሎባል ተለዋዋጮች ለክፍያ ሞዳል (Payment Modal)
let activePaymentKey = '';
let activeServiceName = '';

// የክፍያ ሞዳል መክፈቻ
window.openPaymentModal = function(serviceName, key) {
    activeServiceName = serviceName;
    activePaymentKey = key;
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'flex';
    //  window.location.href = "groundwatermonitur.html";
};

// የክፍያ ሞዳል መዝጊያ
window.closePaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'none';
    //  window.location.href = "about-app.html";
};

// የጥንታዊ ቁልፍ ጥሪ (Legacy support)
window.requestPayment = function(serviceName, key) {
    window.openPaymentModal(serviceName, key);
};

// 📸 ደረሰኝ ጫንና ጥያቄውን ወደ ሰርቨር (MongoDB & Cloudinary) በ HTTP POST ላክ
window.submitReceipt = function() {
    const fileInput = document.getElementById('receiptFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("⚠️ እባክዎ መጀመሪያ የክፍያ ደረሰኝ ፎቶ (Screenshot) ይምረጡ!");
        return;
    }

    const formData = new FormData();
    formData.append('receipt', fileInput.files[0]);
    formData.append('username', localStorage.getItem("userName") || "Molla Derbew");
    formData.append('email', localStorage.getItem("userEmail") || "user@hydroos.com");
    formData.append('serviceName', activeServiceName);

    fetch(`${API_URL}/submit-payment`, {
        method: 'POST',
        body: formData,
        credentials: 'include' // 🍪 Session Cookie እንዲይዝ
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("✅ የክፍያ ደረሰኝዎ እና ጥያቄዎ ወደ አድሚን በအောင်မြင်ት ተልኳል!");
            
            // በ LocalStorage ላይ Pending ብሎ መመዝገብ
            localStorage.setItem(`pay_status_${activePaymentKey}`, "pending");
            updateServiceCardState(activePaymentKey, "pending");
            
            closePaymentModal();
        } else {
            alert("❌ ስህተት ተፈጥሯል: " + (data.message || "እንደገና ይሞክሩ"));
        }
    })
    .catch(err => {
        console.error("Upload error:", err);
        alert("❌ የሰርቨር ግንኙነት ስህተት አጋጥሟል!");
    });
};

// 🟢 አድሚኑ ክፍያውን ሲያጸድቅ (Approve) ከሰርቨር የሚመጣ መረጃ
socket.on('paymentApproved', (data) => {
    console.log("Payment approved event received:", data);
    
    // የትኛው ሰርቪስ እንደጸደቀ በ key (ለምሳሌ 'ground') ወይም በ serviceName መለየት
    const key = data.key || (data.serviceName && data.serviceName.toLowerCase().includes('ground') ? 'ground' : '');
    
    if (key) {
        localStorage.setItem(`pay_status_${key}`, "approved");
        updateServiceCardState(key, "approved");
        alert("🎉 እንኳን ደስ አለዎት! የ " + (data.serviceName || "Groundwater Monitor") + " ክፍያዎ በአድሚን ጸድቋል። አሁን አገልግሎቱን መጠቀም ይችላሉ።");
    } else {
        // ማንኛውም ሌላ ከሆነ ለ groundwater በነባሪነት እንጠቀመው
        localStorage.setItem("pay_status_ground", "approved");
        updateServiceCardState("ground", "approved");
        alert("🎉 እንኳን ደስ አለዎት! የክፍያ ጥያቄዎ በአድሚን ጸድቋል።");
    }
    paymentApprovedSound.play();
});

// 🔴 አድሚኑ ክፍያውን ውድቅ ሲያደርግ (Reject) ከሰርቨር የሚመጣ መረጃ
socket.on('paymentRejected', (data) => {
    console.log("Payment rejected event received:", data);
    const eventUserId = data.userId ? String(data.userId) : "";
    const currentUserId = localStorage.getItem("userId") || "";
    const eventEmail = (data.email || "").toLowerCase();
    const currentEmail = (localStorage.getItem("userEmail") || "").toLowerCase();
    if (eventUserId && (!currentUserId || eventUserId !== String(currentUserId))) return;
    if (!eventUserId && eventEmail && currentEmail && eventEmail !== currentEmail) return;
    paymentRejectedSound.play();
    const key = data.key || (data.serviceName && data.serviceName.toLowerCase().includes('ground') ? 'ground' : '');
    
    if (key) {
        resetPaymentState(key);
        updateServiceCardState(key, "rejected");
        alert("⚠️ ማሳሰቢያ፦ የክፍያ ጥያቄዎ ውድቅ ተደርጓል!\nምክንያት፦ " + (data.reason || "ልዩ ሁኔታ"));
    } else {
        resetPaymentState("ground");
        updateServiceCardState("ground", "rejected");
        alert("⚠️ ማሳሰቢያ፦ የክፍያ ጥያቄዎ ውድቅ ተደርጓል!");
    }
});

function resetPaymentState(key) {
    localStorage.removeItem(`pay_status_${key}`);
    const fileInput = document.getElementById('receiptFile');
    if (fileInput) fileInput.value = '';
    activePaymentKey = '';
    activeServiceName = '';
    closePaymentModal();
}

socket.on('userDeleted', (data) => {
    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId || String(data.userId) !== String(currentUserId)) return;

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedUserName");
    alert("Your account has been deleted by the administrator");
    window.location.replace("login.html");
});

// 5. የካርዶቹን ሁኔታ (Open / Closed / Pay / Pending) ማስተካከያ ፋንክሽን
function updateServiceCardState(key, status) {
    const payBtn = document.getElementById(`pay-btn-${key}`);
    const openBtn = document.getElementById(`access-btn-${key}`);
    const closedBadge = document.getElementById(`closed-btn-${key}`);
    const openBadge = document.getElementById(`open-btn-${key}`);
    const setDisplay = (element, value) => {
        if (element) element.style.setProperty('display', value, 'important');
    };

    if (status === "approved") {
        setDisplay(payBtn, 'none');
        setDisplay(openBtn, 'block');
        setDisplay(closedBadge, 'none');
        setDisplay(openBadge, 'inline-block');
    } else if (status === "pending") {
        setDisplay(payBtn, 'none');
        setDisplay(openBtn, 'none');
        setDisplay(openBadge, 'none');
        if (closedBadge) {
            setDisplay(closedBadge, 'inline-block');
            closedBadge.textContent = "PENDING ⏳";
            closedBadge.style.background = "#fff3cd";
            closedBadge.style.color = "#856404";
        }
    } else {
        setDisplay(payBtn, 'block');
        setDisplay(openBtn, 'none');
        setDisplay(openBadge, 'none');
        if (closedBadge) {
            setDisplay(closedBadge, 'inline-block');
            closedBadge.textContent = "CLOSED 🔒";
            closedBadge.style.background = "#ffe2e2";
            closedBadge.style.color = "#dc3545";
        }
    }
}

// 6. የከርሰ ምድር ውሃ (Groundwater) Real-time Depth ማሳያ
socket.on('groundwaterUpdate', (data) => {
    const depthValElement = document.getElementById('groundwater-depth-val');
    if (depthValElement && data.depth) {
        depthValElement.innerText = data.depth + " m";
    }
});

// 7. ሞጁል መክፈቻ ፋንክሽን
window.openModule = function(moduleName) {
    if (moduleName === 'groundwater') {
        window.location.href = "groundwater.html";
    }
    else if (moduleName === 'Irrigation') {
        window.location.href = "irrigation.html";
    }
    else if (moduleName === 'waterquality') {
        window.location.href = "smart-water-quality.html";
    }
    else if (moduleName === 'tanklevel') {
        window.location.href = "tank-amount-monitor.html";
    }
    else {
        alert(`Opening ${moduleName.toUpperCase()} monitoring panel...`);
    }
};

// 8. ገጹ ሲከፈት የክፍያ ሁኔታን እና Login ማረጋገጥ
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html')) {
        if (localStorage.getItem("isLoggedIn") !== "true" && localStorage.getItem("userLoggedIn") !== "true") {
            window.location.href = "login.html";
        }
    }

    // የ groundwater ክፍያ ሁኔታን ከ LocalStorage መፈተሽ
    const groundwaterStatus = localStorage.getItem("pay_status_ground");
    if (groundwaterStatus) {
        updateServiceCardState("ground", groundwaterStatus);
    } else {
        updateServiceCardState("ground", "rejected");
    }
});