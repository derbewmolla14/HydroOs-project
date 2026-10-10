// Login በተኑ ሲነካ የሚሰራ ፋንክሽን
function loginUser() {
    // እዚህ ጋር የፓስወርድ ቼክ ማድረግ ትችላለህ
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === "admin" && password === "1234") { // ለምሳሌ
        // በኮምፒውተሩ ላይ መግባቱን መመዝገብ
        localStorage.setItem("isLoggedIn", "true");
        // ወደ ቀጣዩ ገጽ መላክ
        window.location.href = "about-app.html";
    } else {
        alert("ስህተት! እባክዎ ትክክለኛ መረጃ ያስገቡ።");
    }
}

const content = {
    am: {
        title: "የቪዲዮ ስልጠናዎች",
        plant1: "ዘመናዊ መስኖ",
        plant2: "የተክሎች እድገት",
        v1: "የሲስተም አገጣጠም መመሪያ"
    },
    en: {
        title: "Video Training Courses",
        plant1: "Smart Irrigation",
        plant2: "Plant Growth",
        v1: "System Setup Guide"
    }
};

function toggleLang(lang) {
    document.getElementById('page-title').innerText = content[lang].title;
    document.getElementById('plant-text-1').innerText = content[lang].plant1;
    document.getElementById('plant-text-2').innerText = content[lang].plant2;
    document.querySelector('.v-title').innerText = content[lang].v1;
}

// በራሱ የሚሰራ የፑምፕ መቆጣጠሪያ (Automation Logic)
function simulateSmartIrrigation() {
    // 1. ሴንሰሩ የአፈር እርጥበትን ይለካል (ከ 0 እስከ 100)
    let soilMoisture = Math.floor(Math.random() * 100); 
    let pumpStatus = document.getElementById("pump-status");

    console.log("የአሁኑ እርጥበት: " + soilMoisture + "%");

    // 2. ያለሰው ቁጥጥር የሚወሰን ውሳኔ (Logic)
    if (soilMoisture < 30) {
        // እርጥበት ከ 30 በታች ከሆነ ፑምፑ ይከፈታል
        pumpStatus.innerText = "ሁኔታ: ፑምፑ እየጠጣ ነው... (ON)";
        pumpStatus.style.color = "#2ecc71";
    } else if (soilMoisture > 70) {
        // እርጥበት ከ 70 በላይ ከሆነ ፑምፑ ይቆማል
        pumpStatus.innerText = "ሁኔታ: በቂ እርጥበት አለ (OFF)";
        pumpStatus.style.color = "#e74c3c";
    }
}

// በየ 5 ሰከንዱ ሲስተሙ ራሱን ቼክ ያደርጋል
setInterval(simulateSmartIrrigation, 5000);