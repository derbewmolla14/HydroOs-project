document.addEventListener("DOMContentLoaded", function () {
    // 1. Check user login status
    checkAuthentication();

    // 2. Render Profile Avatar & Name using CSS classes (No Vibration)
    renderUserProfile();

    // 3. Initialize dark mode without flickering
    initDarkMode();
});

/**
 * Check Authentication status
 */
function checkAuthentication() {
    const isLoggedIn = localStorage.getItem("userLoggedIn");
    if (!isLoggedIn || isLoggedIn !== "true") {
        window.location.href = "login.html";
    }
}

/**
 * Render Profile: Uses CSS Classes instead of inline display toggles to stop vibration
 */
function renderUserProfile() {
    const userEmail = localStorage.getItem("userEmail") || "user@hydroos.com";
    const fullName = localStorage.getItem("userName") || getFullNameFromEmail(userEmail);
    const savedAvatar = localStorage.getItem("userAvatar");

    const nameDisplay = document.getElementById("userNameDisplay");
    const avatarImg = document.getElementById("userAvatarImg");
    const avatarInitials = document.getElementById("userAvatarInitials");
    const wrapper = document.querySelector(".profile-avatar-wrapper");

    // Display Name
    if (nameDisplay) {
        nameDisplay.textContent = `Welcome, ${fullName}`;
    }

    // Handle Profile Photo vs Initials via CSS Classes (Stops vibration completely)
    if (savedAvatar) {
        avatarImg.src = savedAvatar;
        if (wrapper) {
            wrapper.classList.add("has-image");
            wrapper.classList.remove("has-initials");
        }
    } else {
        const initials = getInitials(fullName);
        avatarInitials.textContent = initials;
        if (wrapper) {
            wrapper.classList.add("has-initials");
            wrapper.classList.remove("has-image");
        }
    }
}

/**
 * Extract Initials from Full Name
 */
function getInitials(name) {
    if (!name) return "US";
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return nameParts[0].slice(0, 2).toUpperCase();
}

/**
 * Fallback to generate name from email
 */
function getFullNameFromEmail(email) {
    const username = email.split("@")[0];
    const parts = username.split(/[\._]/);
    if (parts.length >= 2) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + 
               parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    return username.charAt(0).toUpperCase() + username.slice(1);
}

/**
 * Trigger file upload when user clicks on Avatar
 */
function triggerProfileUpload() {
    document.getElementById("profileImageInput").click();
}

/**
 * Handle new photo upload and save to localStorage
 */
function updateProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const imageDataUrl = e.target.result;
            localStorage.setItem("userAvatar", imageDataUrl);
            renderUserProfile();
        };

        reader.readAsDataURL(file);
    }
}

/**
 * Logout User
 */
function logout() {
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
}

/**
 * Dark mode toggle logic
 */
function initDarkMode() {
    const darkModeBtn = document.getElementById("dark-mode-toggle");
    const modeIcon = document.getElementById("mode-icon");
    const isDark = localStorage.getItem("darkMode") === "true";

    if (isDark) {
        document.body.classList.add("dark-mode");
        if (modeIcon) modeIcon.textContent = "☀️";
    }

    if (darkModeBtn) {
        darkModeBtn.addEventListener("click", function () {
            document.body.classList.toggle("dark-mode");
            const darkModeActive = document.body.classList.contains("dark-mode");
            localStorage.setItem("darkMode", darkModeActive);
            if (modeIcon) {
                modeIcon.textContent = darkModeActive ? "☀️" : "🌙";
            }
        });
    }
}