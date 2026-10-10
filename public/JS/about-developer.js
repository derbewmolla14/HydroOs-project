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
        const translations = {
            am: {
                title: "ስለ አልሚው (Developer)",
                name: "ሞላ ደርበው (Molla Derbew)",
                desc: "እኔ ሞላ ደርበው እባላለሁ። በወሎ ዩኒቨርሲቲ (Kombolcha Institute of Technology) የ3ኛ ዓመት የሶፍትዌር ኢንጂነሪንግ እና የውሃ ምህንድስና ተማሪ ነኝ። ይህ ጥምር እውቀት በሃገራችን ያለውን የውሃ አያያዝ ሥርዓት ለማዘመን ትልቅ አቅም ሰጥቶኛል።",
                vTitle: "ራዕይና ዓላማ",
                goal: "ዋናው ዓላማዬ የኢንጂነሪንግ እውቀትን ከሶፍትዌር ልማት ጋር በማጣመር (Smart Engineering) ማህበረሰባዊ ችግሮችን መፍታት ነው። ይህ ፕሮጀክት የውሃ ብክነትን ለመቀነስ የተፈጠረ ነው።",
                sTitle: "የቴክኖሎጂ ክህሎቶች",
                socTitle: "ማህበራዊ ተሳትፎ",
                social: "\"Molla Ethio Tech\" የተባለ የዩቲዩብ ቻናል እና የቴሌግራም ማህበረሰብ በመምራት የቴክኖሎጂ እውቀት በማካፈል ላይ እገኛለሁ።",
                // ... ሌሎቹ እንደነበሩ ሆነው
                vLabel: "ራዕይ (Vision)",
                vQuote: "\"ቴክኖሎጂን በመጠቀም የውሃ ሀብታችንን በብልህነት ማስተዳደር!\"",
                back: "ወደ ዳሽቦርድ ተመለስ"
            },
            en: {
                title: "About the Developer",
                name: "Molla Derbew",
                desc: "I am Molla Derbew, a 3rd-year Software Engineering and Water Resources Engineering student at Wollo University (KIOT). This dual knowledge empowers me to modernize water management systems in our country.",
                vTitle: "Vision and Purpose",
                goal: "My main goal is to solve societal problems by combining engineering knowledge with software development (Smart Engineering). This project is designed to reduce water wastage.",
                sTitle: "Technical Skills",
                socTitle: "Social Engagement",
                social: "I lead the \"Molla Ethio Tech\" YouTube channel and Telegram community, sharing technology knowledge with many students.",
                vLabel: "Vision",
                vQuote: "\"Smart water resource management through technology!\"",
                back: "Back to Dashboard"
            }
        };

        function changeLang(lang) {
            document.getElementById('dev-title').innerText = translations[lang].title;
            document.getElementById('dev-name').innerText = translations[lang].name;
            document.getElementById('dev-desc').innerText = translations[lang].desc;
            document.getElementById('vision-title').innerText = translations[lang].vTitle;
            document.getElementById('dev-goal').innerText = translations[lang].goal;
            document.getElementById('skills-title').innerText = translations[lang].sTitle;
            document.getElementById('social-title').innerText = translations[lang].socTitle;
            document.getElementById('dev-social').innerText = translations[lang].social;
            // ... የቀድሞዎቹ ኮዶች እንዳሉ ሆነው እነዚህን ጨምር፡
            document.getElementById('vision-label').innerText = translations[lang].vLabel;
            document.getElementById('vision-quote').innerText = translations[lang].vQuote;
            document.getElementById('back-btn').innerText = translations[lang].back;
        }
   