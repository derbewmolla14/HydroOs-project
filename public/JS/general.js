// ==========================================
// 1. Configuration & Socket Setup
// ==========================================
const API_URL = window.HYDROOS_API_URL || (window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:3000"
    : window.location.hostname === "localhost"
        ? "http://localhost:3000"
    : "https://smart-water-monitor-7kui.onrender.com");
const socket = typeof io === "function" ? io(API_URL) : null;
let otpCode = 0; 
let facebookOTP = 0;
let currentUser = null;

if (socket) {
    socket.on("userDeleted", (data) => {
        const currentUserId = localStorage.getItem("userId");
        if (!currentUserId || String(data.userId) !== String(currentUserId)) return;

        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userId");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("loggedUserName");
        alert("Your account has been deleted by the administrator");
        window.location.replace("login.html");
    });
}

// ```javascript
// ==========================================
// 2. Page Protection and Navigation
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    setSessionLoading(true);
    const currentPage = window.location.pathname;

    const loginPage = "login.html";
    const dashboardPage = "about-app.html";

    const isLoginPage = currentPage.endsWith("/login.html");
    const isRegisterPage = currentPage.endsWith("/register.html");

    const privatePages = [
        "about-app.html",
        "index.html",
        "soil-moisture.html",
        "water-quality.html",
        "ground-water-level.html",
        "about-developer.html",
        "tank-amount-monitor.html"
    ];

    const isPrivatePage = privatePages.some(page =>
        currentPage.endsWith("/" + page)
    );

    const sessionResult = await getCurrentSession();
    const isLoggedIn = sessionResult.status === "authenticated";

    if (isLoginPage || isRegisterPage) {
        if (isLoggedIn) {
            window.location.replace(dashboardPage);
        }
        if (sessionResult.status === "error") {
            showSessionError(sessionResult.error);
        }
        setSessionLoading(false);
        return;
    }

    // Not logged in: protect dashboard and private pages
    if (isPrivatePage && sessionResult.status === "unauthenticated") {
        window.location.replace(loginPage);
        return;
    }
    if (isPrivatePage && sessionResult.status === "error") {
        showSessionError(sessionResult.error);
    }
    setSessionLoading(false);
});

async function getCurrentSession() {
    try {
        const response = await fetch(`${API_URL}/api/session`, {
            credentials: "include"
        });
        if (response.status === 401) {
            localStorage.removeItem("isLoggedIn");
            return { status: "unauthenticated" };
        }
        if (!response.ok) {
            return { status: "error", error: `Session check failed (${response.status}).` };
        }
        const data = await response.json().catch(() => ({}));
        currentUser = data.user;
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userId", data.user._id || data.user.id || "");
        localStorage.setItem("userEmail", data.user.email || "");
        localStorage.setItem("loggedUserName", data.user.firstname || "");
        return { status: "authenticated", user: data.user };
    } catch (error) {
        console.error("Session check failed:", error);
        return {
            status: "error",
            error: "The backend is unreachable. Check that the server is running."
        };
    }
}

function setSessionLoading(isLoading) {
    const loginButton = document.getElementById("loginBtn");
    if (loginButton) {
        loginButton.disabled = isLoading;
        loginButton.setAttribute("aria-busy", String(isLoading));

        let loadingMessage = document.getElementById("session-loading");
        if (isLoading && !loadingMessage) {
            loadingMessage = document.createElement("p");
            loadingMessage.id = "session-loading";
            loadingMessage.textContent = "Checking session...";
            loadingMessage.setAttribute("role", "status");
            loadingMessage.style.cssText = "text-align:center;margin:12px 0;";
            loginButton.parentElement.prepend(loadingMessage);
        } else if (!isLoading && loadingMessage) {
            loadingMessage.remove();
        }
    }
}

function showSessionError(message) {
    const error = document.createElement("p");
    error.textContent = message;
    error.setAttribute("role", "alert");
    error.style.cssText = "color:#b00020;text-align:center;margin:12px 0;";
    const form = document.querySelector(".form");
    if (form) form.prepend(error);
}
// ```
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
            credentials: "include",
            body: JSON.stringify(userData)
        });
        
        const data = await response.json().catch(() => ({}));
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

// ```javascript
async function login() {
    const emailElement = document.getElementById("loginEmail");
    const passwordElement = document.getElementById("loginPassword");

    if (!emailElement || !passwordElement) {
        console.error("Login input IDs do not match the HTML.");
        alert("Login form error. Please check login.html.");
        return;
    }

    const email = emailElement.value.trim().toLowerCase();
    const password = passwordElement.value;

    if (!email || !password) {
        alert("እባክዎ ኢሜይል እና ፓስወርድ ያስገቡ!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
            alert(data.message || "የገቡት መረጃ ስህተት ነው!");
            return;
        }

        // Save the login state
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userId", data.user._id || data.user.id || "");
        localStorage.setItem("userEmail", data.user.email || email);
        localStorage.setItem(
            "loggedUserName",
            data.user.firstname || ""
        );

        // Verify that the state was saved
        if (localStorage.getItem("isLoggedIn") !== "true") {
            alert("Login state could not be saved in this browser.");
            return;
        }

        alert("እንኳን ደህና መጡ " +
            (data.user.firstname || "User") + "!");

        window.location.replace("maindashbourd.html");

    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed. Check that the backend is running and accessible.");
    }
}
// ```

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
    fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include"
    }).finally(() => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userId");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("loggedUserName");
        window.location.replace("login.html");
    });
}