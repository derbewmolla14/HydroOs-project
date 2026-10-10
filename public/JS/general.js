// ==========================================
// 1. Configuration & Socket Setup
// ==========================================
const API_URL = "https://smart-water-monitor-7kui.onrender.com";
const socket = typeof io !== 'undefined' ? io(API_URL) : null;

let otpCode = 0; 
let facebookOTP = 0;

// ==========================================
// 2. Security Check (Page Protection)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname;
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    // ተጠቃሚው ገብቶ ከሆነ ወደ Login/Register ገጾች እንዳይመለስ
    if ((currentPage.includes("login.html") || currentPage === "/") && isLoggedIn === "true") {
        window.location.href = "about-app.html";
        return;
    }

    // ተጠቃሚው ካልገባ ወደ ዋና ዋና ገጾች እንዳይገባ መከልከል
    const privatePages = ["about-app.html", "index.html", "soil-moisture.html", "water-quality.html", "ground-water-level.html"];
    if (privatePages.some(page => currentPage.includes(page)) && isLoggedIn !== "true") {
        window.location.href = "login.html";
    }
});

// ==========================================
// 3. Registration (ምዝገባ)
// ==========================================
function sendCode() {
    // 4 ዲጂት የዘፈቀደ ቁጥር
    otpCode = Math.floor(1000 + Math.random() * 9000);
    alert("የ HydroOS ምዝገባ ማረጋገጫ ኮድ (OTP): " + otpCode);
}

async function register() {
    const otp = document.getElementById("otp").value;
    
    // የባዶ ቦታ ስህተቶችን ለመከላከል trim() መጠቀም
    if (!otp || otp != otpCode) {
        return alert("እባክዎ ትክክለኛውን የ OTP ኮድ ያስገቡ!");
    }

    const userData = {
        firstname: document.getElementById("firstname").value.trim(),
        lastname: document.getElementById("lastname").value.trim(),
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(), // ሁልጊዜ በትንሽ ፊደል
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value
    };

    // ሁሉም መረጃ መሞላቱን ማረጋገጥ
    if (!userData.email || !userData.password || !userData.firstname) {
        return alert("እባክዎ ሁሉንም አስፈላጊ መረጃዎች ይሙሉ!");
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        if (data.success) {
            alert("በተሳካ ሁኔታ ተመዝግበዋል! አሁን መግባት ይችላሉ።");
            window.location.href = "login.html";
        } else {
            alert("ምዝገባው አልተሳካም፦ " + data.message);
        }
    } catch (err) {
        console.error("Registration Error:", err);
        alert("ከሰርቨር ጋር መገናኘት አልተቻለም! እባክዎ ኢንተርኔትዎን ይፈትሹ።");
    }
}

// ==========================================
// 4. Login (መግቢያ)
// ==========================================
async function login() {
    const emailInput = document.getElementById("loginEmail").value.trim().toLowerCase();
    const passwordInput = document.getElementById("loginPassword").value;

    if(!emailInput || !passwordInput) {
        return alert("እባክዎ ኢሜይል እና ፓስወርድ ያስገቡ!");
    }

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // መረጃዎችን በብሮውዘሩ ላይ ሴቭ ማድረግ
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userEmail", data.user.email);
            localStorage.setItem("loggedUserName", data.user.firstname);
            
            alert("እንኳን ደህና መጡ " + data.user.firstname + "!");
            window.location.href = "about-app.html";
        } else {
            alert(data.message || "የገቡት መረጃ ስህተት ነው!");
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("የመግቢያ ስህተት! ሰርቨሩ መብራቱን ወይም ኢንተርኔትዎን ያረጋግጡ።");
    }
}

// ==========================================
// 5. Forget Password (የይለፍ ቃል መለወጫ)
// ==========================================
function sendFacebookStyleCode() {
    const email = document.getElementById("email2").value.trim();
    if(!email) return alert("እባክዎ መጀመሪያ ኢሜይልዎን ያስገቡ!");
    
    facebookOTP = Math.floor(1000 + Math.random() * 9000);
    alert("የፓስወርድ መቀየሪያ ኮድ: " + facebookOTP);
    
    // ኮድ መቆጣጠሪያውን ክፍል ማሳየት
    const otpSection = document.getElementById("otp-section");
    if(otpSection) otpSection.style.display = "block";
}

function verifyOTP() {
    const inputOTP = document.getElementById("otp2").value;
    if (inputOTP == facebookOTP) {
        document.getElementById("otp-section").style.display = "none";
        document.getElementById("password-section").style.display = "block";
    } else {
        alert("ያስገቡት ኮድ ስህተት ነው!");
    }
}

async function finishReset() {
    const resetData = {
        email: document.getElementById("email2").value.trim().toLowerCase(),
        phone: document.getElementById("phone").value.trim(), 
        newPassword: document.getElementById("newPassword").value
    };

    if(!resetData.newPassword || resetData.newPassword.length < 6) {
        return alert("አዲሱ ፓስወርድ ቢያንስ 6 ፊደላት መሆን አለበት!");
    }

    try {
        const response = await fetch(`${API_URL}/api/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resetData)
        });
        
        const data = await response.json();
        if (data.success) {
            alert("ፓስወርድዎ በተሳካ ሁኔታ ተቀይሯል! አሁን በአዲሱ ፓስወርድ ይግቡ።");
            window.location.href = "login.html";
        } else {
            alert("መረጃው አልተገኘም፦ " + data.message);
        }
    } catch (err) {
        console.error("Reset Error:", err);
        alert("ስህተት ተፈጥሯል! እባክዎ ትንሽ ቆይተው ይሞክሩ።");
    }
}

// ==========================================
// 6. Logout (መውጫ)
// ==========================================
function logout() {
    localStorage.clear(); // ሁሉንም ዳታ ማጽዳት
    window.location.href = "login.html";
}