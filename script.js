// script.js - Core utilities, authentication, and UI logic for StudyBuddy
import { localDb } from './localDb.js';

// --- Notification System ---
export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.warn('Notification area not found.');
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);

    // Trigger reflow to enable CSS transition
    void notification.offsetWidth;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        }, { once: true });
    }, duration);
}

// --- Authentication Service ---
export const AuthService = {
    currentUser: null,

    async init() {
        await localDb.open();
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            // Fetch full user data from DB to ensure it's up-to-date
            const dbUser = await localDb.getUser(this.currentUser.id);
            if (dbUser) {
                this.currentUser = dbUser;
                localStorage.setItem('currentUser', JSON.stringify(dbUser));
            } else {
                // If user not found in DB, clear local storage
                this.logout();
            }
        }
        this.updateUIForAuth();
    },

    getCurrentUser() {
        return this.currentUser;
    },

    updateCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.updateUIForAuth();
    },

    async login(email, password) {
        // Placeholder for actual login logic
        console.log('AuthService: Attempting login for', email);
        const users = await localDb.getAll('users');
        const user = users.find(u => u.email === email && u.password === password); // In a real app, hash passwords!

        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showNotification('Login successful!', 'success');
            this.updateUIForAuth();
            return true;
        } else {
            showNotification('Invalid email or password.', 'error');
            return false;
        }
    },

    async signup(name, email, password, role = 'student', username) {
        // Placeholder for actual signup logic
        console.log('AuthService: Attempting signup for', email);
        const users = await localDb.getAll('users');
        if (users.some(u => u.email === email)) {
            showNotification('Email already registered.', 'error');
            return false;
        }
        if (users.some(u => u.username === username)) {
            showNotification('Username already taken.', 'error');
            return false;
        }

        const newUser = {
            id: `user-${Date.now()}`, // Simple unique ID
            full_name: name,
            username: username,
            email: email,
            password: password, // In a real app, hash passwords!
            role: role,
            avatar_url: 'https://via.placeholder.com/128x128',
            excel_coin_balance: 500, // Starting balance
            favorites: [],
            enrolled_courses: [],
            transactions: [],
            created_at: new Date().toISOString()
        };

        await localDb.put('users', newUser);
        this.currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        showNotification('Account created successfully!', 'success');
        this.updateUIForAuth();
        return true;
    },

    logout() {
        console.log('AuthService: Logging out.');
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        showNotification('Logged out successfully.', 'info');
        this.updateUIForAuth();
        window.location.href = 'index.html'; // Redirect to home after logout
    },

    async updateCoinBalance(userId, amount, type, description) {
        const user = await localDb.getUser(userId);
        if (user) {
            user.excel_coin_balance = (user.excel_coin_balance || 0) + amount;
            if (!user.transactions) user.transactions = [];
            user.transactions.push({
                id: `txn-${Date.now()}`,
                amount: amount,
                type: type, // e.g., 'deposit', 'session_payment', 'bonus'
                description: description,
                date: new Date().toISOString(),
                balance_after: user.excel_coin_balance
            });
            await localDb.updateUser(userId, {
                excel_coin_balance: user.excel_coin_balance,
                transactions: user.transactions
            });
            this.updateCurrentUser(user); // Update local storage and UI
            return true;
        }
        return false;
    },

    updateUIForAuth() {
        const currentUser = this.getCurrentUser();
        const joinBtn = document.getElementById('join-btn');
        const userDropdownWrapper = document.getElementById('user-dropdown-wrapper');
        const userAvatarSmall = document.getElementById('user-avatar-small');
        const userNameDisplay = document.getElementById('user-name-display');
        const coinsDisplay = document.getElementById('coinsDisplay');
        const coinBalanceSpan = coinsDisplay?.querySelector('.coin-balance');
        const myDashboardLink = document.getElementById('my-dashboard-link');
        const tutorNavLink = document.getElementById('tutor-nav-link');

        // Mobile elements
        const mobileJoinBtn = document.getElementById('mobile-join-btn');
        const mobileUserDropdownWrapper = document.getElementById('mobile-user-dropdown-wrapper');
        const mobileUserAvatarSmall = document.getElementById('mobile-user-avatar-small');
        const mobileUserNameDisplay = document.getElementById('mobile-user-name-display');
        const mobileCoinsDisplay = document.getElementById('mobileCoinsDisplay');
        const mobileCoinBalanceSpan = mobileCoinsDisplay?.querySelector('.coin-balance');
        const mobileMyDashboardLink = document.getElementById('mobile-my-dashboard-link');
        const mobileTutorNavLink = document.getElementById('mobile-tutor-nav-link');


        if (currentUser) {
            if (joinBtn) joinBtn.style.display = 'none';
            if (userDropdownWrapper) userDropdownWrapper.style.display = 'flex';
            if (userAvatarSmall) userAvatarSmall.src = currentUser.avatar_url || 'https://via.placeholder.com/32x32';
            if (userNameDisplay) userNameDisplay.textContent = `Hi! ${currentUser.full_name.split(' ')[0]}`;
            if (coinBalanceSpan) coinBalanceSpan.textContent = currentUser.excel_coin_balance.toLocaleString();
            if (coinsDisplay) coinsDisplay.style.display = 'flex';

            if (currentUser.role === 'mentor') {
                if (myDashboardLink) myDashboardLink.style.display = 'block';
                if (tutorNavLink) tutorNavLink.href = 'dashboard.html';
            } else {
                if (myDashboardLink) myDashboardLink.style.display = 'none';
                if (tutorNavLink) tutorNavLink.href = 'become-a-mentor.html';
            }

            // Mobile UI updates
            if (mobileJoinBtn) mobileJoinBtn.style.display = 'none';
            if (mobileUserDropdownWrapper) mobileUserDropdownWrapper.style.display = 'flex';
            if (mobileUserAvatarSmall) mobileUserAvatarSmall.src = currentUser.avatar_url || 'https://via.placeholder.com/32x32';
            if (mobileUserNameDisplay) mobileUserNameDisplay.textContent = `Hi! ${currentUser.full_name.split(' ')[0]}`;
            if (mobileCoinBalanceSpan) mobileCoinBalanceSpan.textContent = currentUser.excel_coin_balance.toLocaleString();
            if (mobileCoinsDisplay) mobileCoinsDisplay.style.display = 'flex';

            if (currentUser.role === 'mentor') {
                if (mobileMyDashboardLink) mobileMyDashboardLink.style.display = 'block';
                if (mobileTutorNavLink) mobileTutorNavLink.href = 'dashboard.html';
            } else {
                if (mobileMyDashboardLink) mobileMyDashboardLink.style.display = 'none';
                if (mobileTutorNavLink) mobileTutorNavLink.href = 'become-a-mentor.html';
            }

        } else {
            if (joinBtn) joinBtn.style.display = 'block';
            if (userDropdownWrapper) userDropdownWrapper.style.display = 'none';
            if (coinsDisplay) coinsDisplay.style.display = 'none';
            if (myDashboardLink) myDashboardLink.style.display = 'none';
            if (tutorNavLink) tutorNavLink.href = 'become-a-mentor.html';

            // Mobile UI updates
            if (mobileJoinBtn) mobileJoinBtn.style.display = 'block';
            if (mobileUserDropdownWrapper) mobileUserDropdownWrapper.style.display = 'none';
            if (mobileCoinsDisplay) mobileCoinsDisplay.style.display = 'none';
            if (mobileMyDashboardLink) mobileMyDashboardLink.style.display = 'none';
            if (mobileTutorNavLink) mobileTutorNavLink.href = 'become-a-mentor.html';
        }
    }
};

// --- Auth Modal Logic ---
const authModalOverlay = document.getElementById('auth-modal-overlay');
const closeAuthModalBtn = document.getElementById('close-auth-modal');
const authTabBtns = document.querySelectorAll('.auth-tab-btn');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const joinBtn = document.getElementById('join-btn');
const mobileJoinBtn = document.getElementById('mobile-join-btn');

export function showAuthModal(tab = 'login') {
    authModalOverlay?.classList.remove('is-hidden');
    switchAuthTab(tab);
}

function hideAuthModal() {
    authModalOverlay?.classList.add('is-hidden');
}

function switchAuthTab(tab) {
    authTabBtns.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    authForms.forEach(form => {
        if (form.id === `${tab}-tab`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
}

authTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

closeAuthModalBtn?.addEventListener('click', hideAuthModal);
authModalOverlay?.addEventListener('click', (e) => {
    if (e.target === authModalOverlay) {
        hideAuthModal();
    }
});

joinBtn?.addEventListener('click', () => showAuthModal('signup'));
mobileJoinBtn?.addEventListener('click', () => showAuthModal('signup'));

// --- Password Visibility Toggle ---
document.querySelectorAll('.toggle-password-visibility').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        const passwordInput = document.getElementById(targetId);
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
});

// --- Password Strength Meter (Signup) ---
const signupPasswordInput = document.getElementById('signup-password');
const passwordStrengthMeter = document.querySelector('.password-strength-meter');
const strengthBar = passwordStrengthMeter?.querySelector('.strength-bar');
const strengthText = passwordStrengthMeter?.querySelector('.strength-text');
const passwordCriteria = document.querySelectorAll('.password-criteria li');

signupPasswordInput?.addEventListener('input', () => {
    const password = signupPasswordInput.value;
    let strength = 0;
    const criteria = {
        length: password.length >= 8,
        capital: /[A-Z]/.test(password),
        symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    if (criteria.length) strength++;
    if (criteria.capital) strength++;
    if (criteria.symbol) strength++;

    passwordCriteria.forEach(li => {
        const criterion = li.dataset.criterion;
        if (criteria[criterion]) {
            li.classList.add('met');
        } else {
            li.classList.remove('met');
        }
    });

    let strengthColor = 'var(--error-color)';
    let strengthLabel = 'Weak';

    if (strength === 1) {
        strengthColor = 'var(--warning-color)';
        strengthLabel = 'Moderate';
    } else if (strength === 2) {
        strengthColor = 'var(--secondary-color)';
        strengthLabel = 'Good';
    } else if (strength === 3) {
        strengthColor = 'var(--success-color)';
        strengthLabel = 'Strong';
    }

    if (strengthBar) strengthBar.style.width = `${(strength / 3) * 100}%`;
    if (strengthBar) strengthBar.style.backgroundColor = strengthColor;
    if (strengthText) strengthText.textContent = strengthLabel;
});

// --- Signup Form Steps ---
const signupNextBtn = document.getElementById('signup-next-btn');
const signupBackBtn = document.getElementById('signup-back-btn');
const signupSteps = document.querySelectorAll('.signup-step');
let currentSignupStep = 1;

function showSignupStep(step) {
    signupSteps.forEach(s => {
        if (parseInt(s.dataset.step) === step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

signupNextBtn?.addEventListener('click', () => {
    // Basic validation for step 1
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const termsAccepted = document.getElementById('signup-terms').checked;

    let isValid = true;
    if (!name) { document.getElementById('signup-name-error').textContent = 'Full name is required.'; isValid = false; } else { document.getElementById('signup-name-error').textContent = ''; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { document.getElementById('signup-email-error').textContent = 'Valid email is required.'; isValid = false; } else { document.getElementById('signup-email-error').textContent = ''; }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) { document.getElementById('signup-password-error').textContent = 'Password must meet all criteria.'; isValid = false; } else { document.getElementById('signup-password-error').textContent = ''; }
    if (password !== confirmPassword) { document.getElementById('signup-confirm-password-error').textContent = 'Passwords do not match.'; isValid = false; } else { document.getElementById('signup-confirm-password-error').textContent = ''; }
    if (!termsAccepted) { showNotification('You must agree to the terms and conditions.', 'error'); isValid = false; }

    if (isValid) {
        currentSignupStep = 2;
        showSignupStep(currentSignupStep);
    }
});

signupBackBtn?.addEventListener('click', () => {
    currentSignupStep = 1;
    showSignupStep(currentSignupStep);
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value;
    const role = document.querySelector('input[name="signup-role"]:checked').value;

    let isValid = true;
    if (!username) { document.getElementById('signup-username-error').textContent = 'Username is required.'; isValid = false; } else { document.getElementById('signup-username-error').textContent = ''; }

    if (isValid) {
        const success = await AuthService.signup(name, email, password, role, username);
        if (success) {
            document.getElementById('success-username').textContent = AuthService.getCurrentUser().username;
            currentSignupStep = 3;
            showSignupStep(currentSignupStep);
        }
    }
});

document.getElementById('start-exploring-btn')?.addEventListener('click', () => {
    hideAuthModal();
    window.location.href = 'index.html';
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    let isValid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) { document.getElementById('login-email-error').textContent = 'Valid email is required.'; isValid = false; } else { document.getElementById('login-email-error').textContent = ''; }
    if (!password) { document.getElementById('login-password-error').textContent = 'Password is required.'; isValid = false; } else { document.getElementById('login-password-error').textContent = ''; }

    if (isValid) {
        const success = await AuthService.login(email, password);
        if (success) {
            hideAuthModal();
            // Redirect or refresh as needed, AuthService.updateUIForAuth() handles UI
        }
    }
});

// --- User Dropdown Logic ---
const userProfileBtn = document.getElementById('user-profile-btn');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const logoutBtn = document.getElementById('logout-btn');

userProfileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdownMenu?.classList.toggle('show');
});

logoutBtn?.addEventListener('click', () => {
    AuthService.logout();
});

document.addEventListener('click', (e) => {
    if (userDropdownMenu && !userDropdownMenu.contains(e.target) && !userProfileBtn.contains(e.target)) {
        userDropdownMenu.classList.remove('show');
    }
});

// Mobile user dropdown logic
const mobileUserProfileBtn = document.getElementById('mobile-user-profile-btn');
const mobileUserDropdownMenu = document.getElementById('mobile-user-dropdown-menu');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

mobileUserProfileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileUserDropdownMenu?.classList.toggle('show');
});

mobileLogoutBtn?.addEventListener('click', () => {
    AuthService.logout();
});

document.addEventListener('click', (e) => {
    if (mobileUserDropdownMenu && !mobileUserDropdownMenu.contains(e.target) && !mobileUserProfileBtn.contains(e.target)) {
        mobileUserDropdownMenu.classList.remove('show');
    }
});


// --- Mobile Menu Toggle ---
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');
const closeMobileMenu = document.getElementById('closeMobileMenu');

mobileMenuToggle?.addEventListener('click', () => {
    mobileNavOverlay?.classList.add('active');
});

closeMobileMenu?.addEventListener('click', () => {
    mobileNavOverlay?.classList.remove('active');
});

mobileNavOverlay?.addEventListener('click', (e) => {
    if (e.target === mobileNavOverlay) {
        mobileNavOverlay?.classList.remove('active');
    }
});


// Initialize Auth Service on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    AuthService.init();
});
