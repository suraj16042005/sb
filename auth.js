import { localDb } from './localDb.js';
import { showNotification } from './script.js';

const authModalOverlay = document.getElementById('auth-modal-overlay');
const authTabBtns = document.querySelectorAll('.auth-tab-btn');
const authForms = document.querySelectorAll('.auth-form');
const closeAuthModalBtn = document.getElementById('close-auth-modal');

// Password visibility toggles
const togglePasswordVisibilityBtns = document.querySelectorAll('.toggle-password-visibility');

export function initAuthModalUI() {
    authTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            authTabBtns.forEach(b => b.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    closeAuthModalBtn?.addEventListener('click', hideAuthModal);
    authModalOverlay?.addEventListener('click', (e) => {
        if (e.target === authModalOverlay) {
            hideAuthModal();
        }
    });

    // Initialize password visibility toggles
    togglePasswordVisibilityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const passwordInput = document.getElementById(targetId);
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                btn.querySelector('i').classList.remove('fa-eye');
                btn.querySelector('i').classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                btn.querySelector('i').classList.remove('fa-eye-slash');
                btn.querySelector('i').classList.add('fa-eye');
            }
        });
    });
}

export function showAuthModal() {
    authModalOverlay?.classList.remove('is-hidden');
}

export function hideAuthModal() {
    authModalOverlay?.classList.add('is-hidden');
}

export function showFormError(inputElement, message) {
    const errorSpan = inputElement.closest('.form-group')?.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.textContent = message;
        inputElement.classList.add('input-error'); // Add a class for styling
    }
}

export function clearFormError(inputElement) {
    const errorSpan = inputElement.closest('.form-group')?.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.textContent = '';
        inputElement.classList.remove('input-error');
    }
}

export class AuthService {
    static async login(email, password) {
        const users = await localDb.getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            showNotification('Login successful!', 'success');
            return user;
        } else {
            showNotification('Invalid email or password.', 'error');
            return null;
        }
    }

    static async signup(fullName, email, password, username, role) {
        const users = await localDb.getUsers();

        if (users.some(u => u.email === email)) {
            showNotification('Email already registered.', 'error');
            return null;
        }
        if (users.some(u => u.username === username)) {
            showNotification('Username already taken.', 'error');
            return null;
        }

        // If user selects 'mentor', register them as 'student'
        const actualRole = (role === 'mentor') ? 'student' : role;

        const newUser = {
            id: `user${Date.now()}`, // Simple unique ID
            email,
            password,
            full_name: fullName,
            username,
            role: actualRole, // Store the actual role (student)
            excel_coin_balance: actualRole === 'student' ? 500 : 0, // Students start with 500 coins
            bio: '',
            headline: '',
            avatar_url: 'https://via.placeholder.com/32x32', // Default avatar
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            favorites: [], // Initialize favorites array
            enrolled_courses: [] // Initialize enrolled courses array
        };

        await localDb.addUser(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        showNotification('Account created successfully!', 'success');
        return newUser;
    }

    static logout() {
        localStorage.removeItem('currentUser');
        showNotification('Logged out successfully.', 'info');
    }

    static getCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    static async updateCurrentUser(updates) {
        let user = AuthService.getCurrentUser();
        if (user) {
            user = { ...user, ...updates, updated_at: new Date().toISOString() };
            await localDb.updateUser(user.id, user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        return null;
    }

    // New methods for dashboard.js
    static async getUserProfile() {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            return localDb.getUser(currentUser.id);
        }
        return null;
    }

    static async updateProfile(userId, updates) {
        const updatedUser = await localDb.updateUser(userId, updates);
        if (updatedUser) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Update local storage too
        }
        return updatedUser;
    }

    static async updateCoinBalance(userId, amount, type, description) {
        const user = await localDb.getUser(userId);
        if (user) {
            const newBalance = user.excel_coin_balance + amount;
            const updatedUser = await localDb.updateUser(userId, { excel_coin_balance: newBalance });

            // Add transaction record
            const transaction = {
                id: `txn${Date.now()}`,
                user_id: userId,
                amount: amount,
                type: type, // e.g., 'Purchase', 'Session Payment', 'Refund', 'Withdrawal', 'Bonus'
                description: description,
                date: new Date().toISOString()
            };
            await localDb.add('transactions', transaction);

            if (updatedUser) {
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            return updatedUser;
        }
        return null;
    }

    static async signOut() {
        AuthService.logout();
    }
}
