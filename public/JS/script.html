// 1. የ Socket.io አጀማመር (Render URL-ህን በመጠቀም)
const socket = io("https://smart-water-monitor-7kui.onrender.com", {
    transports: ['websocket', 'polling']
});

socket.on("connect", () => {
    console.log("ከሰርቨር ጋር ተገናኝቷል! (Connected to Server)");
});

// 2. Login በተኑ ሲነካ የሚሰራ ፋንክሽን
function loginUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === "admin" && password === "1234") { 
        localStorage.setItem("isLoggedIn", "true");
        window.location.href = "about-app.html";
    } else {
        alert("ስህተት! እባክዎ ትክክለኛ መረጃ ያስገቡ።");
    }
}

// 3. ሰዓት እና ቀን አድስ
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', year: 'numeric', month: 'long', 
        day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    };
    const dtElement = document.getElementById('date-time');
    if (dtElement) {
        dtElement.innerText = now.toLocaleDateString('en-US', options);
    }
}
setInterval(updateDateTime, 1000);

// 4. የውሃ መጠን ግራፊክስ መቀየሪያ
function updateWaterLevel(percent) {
    percent = Math.max(0, Math.min(100, percent));

    const waterElement = document.getElementById('water-level');
    const percentText = document.getElementById('percent-val');
    const volumeText = document.getElementById('volume-val');

    if (waterElement) waterElement.style.height = percent + "%";
    if (percentText) percentText.innerText = percent;
    if (volumeText) volumeText.innerText = (percent / 100) * 1000; // 1000L tank
}

// 5. Socket.io መረጃ ሲመጣ (Real-time update)
socket.on('levelUpdate', (newLevel) => {
    console.log("አዲስ የውሃ መጠን ደርሷል፦", newLevel);
    updateWaterLevel(newLevel);
});

// 6. ገጹ ሲከፈት የሚሰሩ ስራዎች (Login Check እና ጅማሮ)
document.addEventListener("DOMContentLoaded", () => {
    // Login ካላደረገ ወደ login.html መልሰው (ከ about-app.html ገጽ ላይ ከሆንክ)
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html')) {
        if (localStorage.getItem("isLoggedIn") !== "true") {
            window.location.href = "login.html";
        }
    }

    // የመጀመሪያ ስራዎች
    updateDateTime();
    
    // updateUI ፋንክሽን ካለህ እዚህ ጋር ጥራው
    if (typeof updateUI === "function") {
        updateUI();
    }
});
socket.on('paymentRejected', (data) => {
    // 1. የትኛው አገልግሎት እንደሆነ ለይተን እንወቅ (ለምሳሌ tanker, quality ወዘተ)
    const service = data.serviceName.toLowerCase();
    let key = "";

    if (service.includes('tank')) key = "tanker";
    else if (service.includes('quality')) key = "quality";
    else if (service.includes('soil')) key = "soil";
    else if (service.includes('ground')) key = "ground";

    if (key) {
        // 2. የተቀመጠውን የክፍያ ሁኔታ (Status) ከ LocalStorage እናጥፋው
        localStorage.removeItem(`pay_status_${key}`);

        // 3. በተኖቹን እናስተካክል
        const payBtn = document.getElementById(`pay-btn-${key}`);
        const openBtn = document.getElementById(`open-btn-${key}`);
        const closedBtn = document.getElementById(`closed-btn-${key}`);

        if (payBtn) payBtn.style.display = 'block';     // 'Pay' እንዲመጣ
        if (closedBtn) closedBtn.style.display = 'block'; // 'Closed' ምስሉ እንዲመጣ
        if (openBtn) openBtn.style.display = 'none';      // 'Open' እንዲጠፋ

        // 4. ለተጠቃሚው መልዕክት እናሳይ
        alert("⚠️ ማሳሰቢያ፦ የ " + data.serviceName + " ክፍያዎ ውድቅ ተደርጓል!\nምክንያት፦ " + data.reason);
    }
});