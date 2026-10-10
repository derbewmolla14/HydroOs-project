// 1. የትርጉም ዳታ
const translations = {
    am: {
        home: "ዋና ገጽ",
        about: "ስለ HydroOS",
        cawst: "CAWST",
        welcome: "እንኳን ወደ HydroOS በሰላም መጡ",
        description: "HydroOS በውሃ ምህንድስና እና በሶፍትዌር ቴክኖሎጂ መካከል ያለውን ልዩነት ለመሙላት የተነደፈ አዲስ የውሃ ቁጥጥር መድረክ ነው።",
        feature1: "የእውነተኛ ጊዜ የውሃ ጥራት ቁጥጥር",
        feature2: "የአውቶማቲክ ማስጠንቀቂያ ስርዓቶች",
        feature3: "ደህንነቱ የተጠበቀ የክፍያ ክትትል",
        feature4: "ዘመናዊ የሀብት ዳሽቦርድ",
        quote: "«በዘመናዊ ዲጂታል መፍትሄዎች አማካኝነት ቀጣይነት ያለው የወደፊት ህይወትን መገንባት።»",
        loginTitle: "ግባ",
        forgot: "የይለፍ ቃል ረስተዋል?",
        loginBtn: "ግባ",
        noAccount: "አካውንት የለዎትም?",
        register: "ይመዝገቡ",
        admin: "አድሚን"
    },
    en: {
        home: "Home",
        about: "About",
        cawst: "CAWST",
        welcome: "Welcome to HydroOS",
        description: "is an innovative Smart Water Monitoring platform designed to bridge the gap between Water Engineering and Software Technology.",
        feature1: "Real-time Water Quality Monitoring",
        feature2: "Automated Alert Systems",
        feature3: "Secure Payment Tracking",
        feature4: "Smart Resource Dashboard",
        quote: "'Engineering a sustainable future through smart digital solutions.'",
        loginTitle: "Login",
        forgot: "Forgot Password?",
        loginBtn: "Login",
        noAccount: "No account?",
        register: "Register",
        admin: "Admin"
    }
};

// 2. ቋንቋ መቀያየሪያ
function changeLanguage(lang) {
    localStorage.setItem('selectedLang', lang);
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    const btnAm = document.getElementById('btn-am');
    const btnEn = document.getElementById('btn-en');
    if(btnAm && btnEn) {
        btnAm.classList.toggle('active', lang === 'am');
        btnEn.classList.toggle('active', lang === 'en');
    }
}

// 3. Dark Mode እና Form Color Logic (የተዋሃደ)
function toggleDarkMode() {
    const body = document.body;
    const modeIcon = document.getElementById('mode-icon');
    const loginForm = document.querySelector('.form');
    
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    
    // ምርጫን ሴቭ ማድረግ
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // አይኮን መቀየር
    if (modeIcon) modeIcon.textContent = isDark ? '☀️' : '🌙';
    
    // ፎርሙን ነጭ የማድረግ ትዕዛዝ (Permition)
    if (loginForm) {
        if (isDark) {
            loginForm.style.backgroundColor = "#ffffff";
            loginForm.style.color = "#000000";
        } else {
            loginForm.style.backgroundColor = ""; 
            loginForm.style.color = "";
        }
    }
}
function toggleServices() {
    const overlay = document.getElementById('servicesOverlay');
    const menuIcon = document.querySelector('.menu-icon-container');

    // ቼክ የምናደርገው 'block' መሆኑን ሳይሆን 'none' አለመሆኑን ነው
    if (overlay.style.display === "block") {
        overlay.style.display = "none";
        document.body.style.overflow = "auto";
        if (menuIcon) menuIcon.classList.remove("change");
    } else {
        overlay.style.display = "block";
        document.body.style.overflow = "hidden";
        if (menuIcon) menuIcon.classList.add("change");
    }
}

// 4. Auto Swipper Logic
const titles = [
    { am: "እንኳን ወደ HydroOS መጡ", en: "Welcome to HydroOS" },
    { am: "ንጹህ ውሃ ለሁሉም!", en: "Clean Water for All!" },
    { am: "ብልጥ የውሃ ቁጥጥር", en: "Smart Water Monitoring" },
    { am: "Smart Tank & Irrigation", en: "Smart Tank & Irrigation" }
];
let currentIndex = 0;

function startAutoSwipper() {
    const swipperEl = document.getElementById('auto-swipper');
    setInterval(() => {
        const currentLang = localStorage.getItem('selectedLang') || 'en';
        currentIndex = (currentIndex + 1) % titles.length;
        if (swipperEl) {
            swipperEl.textContent = titles[currentIndex][currentLang];
            document.title = titles[currentIndex][currentLang];
        }
    }, 3000);
}

// 5. Initialization (ገጹ ሲከፈት)
document.addEventListener('DOMContentLoaded', () => {
    // ቋንቋ
    const savedLang = localStorage.getItem('selectedLang') || 'en';
    changeLanguage(savedLang);

    // Dark Mode አጀማመር
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const modeIcon = document.getElementById('mode-icon');
        if (modeIcon) modeIcon.textContent = '☀️';
        
        // ፎርሙን ነጭ ማድረግ
        const loginForm = document.querySelector('.form');
        if (loginForm) {
            loginForm.style.backgroundColor = "#ffffff";
            loginForm.style.color = "#000000";
        }
    }

    // Event Listener ለ Dark Mode በተን
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (darkModeBtn) {
        darkModeBtn.onclick = toggleDarkMode;
    }

    startAutoSwipper();
});

// Modal መቆጣጠሪያዎች
function showCawstInfo() { document.getElementById('cawstModal').style.display = 'block'; }
function closeCawstInfo() { document.getElementById('cawstModal').style.display = 'none'; }

window.onclick = function(event) {
    const modal = document.getElementById('cawstModal');
    if (event.target == modal) modal.style.display = "none";
};

function goToAdmin() { window.location.href = "admin.html"; }