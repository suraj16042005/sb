import { AuthService } from './authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Navbar elements (from script.js)
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const joinBtn = document.getElementById('join-btn');
    const authModalCloseBtn = document.getElementById('auth-modal-close-btn');
    const authTabBtns = document.querySelectorAll('.auth-tab-btn');
    const authModalBodies = document.querySelectorAll('.auth-modal-body');
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupNextBtn = document.getElementById('signup-next-btn');
    const signupBackBtn = document.getElementById('signup-back-btn');
    const signupSteps = document.querySelectorAll('.signup-step');
    const successUsernameSpan = document.getElementById('success-username');

    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    // --- Auth Modal Functions (Copied from script.js) ---
    const showAuthModal = () => {
        authModalOverlay.classList.remove('is-hidden');
    };

    const hideAuthModal = () => {
        authModalOverlay.classList.add('is-hidden');
        // Reset forms and errors
        loginForm.reset();
        signupForm.reset();
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
        switchAuthTab('login'); // Go back to login tab
        signupSteps.forEach((step, index) => {
            step.classList.remove('active');
            if (index === 0) step.classList.add('active');
        });
        signupNextBtn.style.display = 'block';
        signupBackBtn.style.display = 'none';
        signupForm.querySelector('button[type="submit"]').style.display = 'none';
    };

    const switchAuthTab = (tabName) => {
        authTabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        authModalBodies.forEach(body => {
            if (body.id === `${tabName}-body`) {
                body.classList.add('active');
            } else {
                body.classList.remove('active');
            }
        });
    };

    const togglePasswordVisibility = (icon) => {
        const passwordInput = icon.previousElementSibling;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    };

    const validateFormGroup = (input, message) => {
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        if (message) {
            formGroup.classList.add('error');
            errorElement.textContent = message;
            return false;
        } else {
            formGroup.classList.remove('error');
            errorElement.textContent = '';
            return true;
        }
    };

    // --- Auth Form Submission (Copied from script.js) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await AuthService.signIn(email, password);
            alert('Login successful!');
            hideAuthModal();
            window.location.href = '/dashboard.html'; // Redirect to dashboard
        } catch (error) {
            console.error('Login error:', error);
            validateFormGroup(document.getElementById('login-email'), error.message || 'Login failed. Please check your credentials.');
        }
    });

    signupNextBtn.addEventListener('click', () => {
        const fullNameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmPasswordInput = document.getElementById('signup-confirm-password');
        const termsCheckbox = document.getElementById('signup-terms');

        let isValid = true;
        isValid = validateFormGroup(fullNameInput, fullNameInput.value.trim() === '' ? 'Full Name is required.' : '') && isValid;
        isValid = validateFormGroup(emailInput, !emailInput.value.includes('@') ? 'Please enter a valid email.' : '') && isValid;
        isValid = validateFormGroup(passwordInput, passwordInput.value.length < 8 ? 'Password must be at least 8 characters.' : '') && isValid;
        isValid = validateFormGroup(confirmPasswordInput, confirmPasswordInput.value !== passwordInput.value ? 'Passwords do not match.' : '') && isValid;
        if (!termsCheckbox.checked) {
            alert('You must agree to the Terms & Conditions.');
            isValid = false;
        }

        if (isValid) {
            signupSteps[0].classList.remove('active');
            signupSteps[1].classList.add('active');
            signupNextBtn.style.display = 'none';
            signupBackBtn.style.display = 'inline-block';
            signupForm.querySelector('button[type="submit"]').style.display = 'inline-block';
        }
    });

    signupBackBtn.addEventListener('click', () => {
        signupSteps[1].classList.remove('active');
        signupSteps[0].classList.add('active');
        signupNextBtn.style.display = 'inline-block';
        signupBackBtn.style.display = 'none';
        signupForm.querySelector('button[type="submit"]').style.display = 'none';
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const username = document.getElementById('signup-username').value;
        const bio = document.getElementById('signup-bio').value;

        try {
            const { user } = await AuthService.signUp(email, password, fullName, username);
            if (user) {
                await AuthService.updateProfile(user.id, { bio: bio });
                successUsernameSpan.textContent = fullName;
                signupSteps[1].classList.remove('active');
                signupSteps[2].classList.add('active');
                signupBackBtn.style.display = 'none';
                signupForm.querySelector('button[type="submit"]').style.display = 'none';
            }
        } catch (error) {
            console.error('Signup error:', error);
            validateFormGroup(document.getElementById('signup-email'), error.message || 'Signup failed. Please try again.');
        }
    });

    // --- Mobile Menu (Copied from script.js) ---
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.add('active');
    });

    closeMobileMenu.addEventListener('click', () => {
        mobileNav.classList.remove('active');
    });

    // Close sidebar if clicked outside on mobile
    document.body.addEventListener('click', (e) => {
        if (mobileNav.classList.contains('active') && !mobileNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            mobileNav.classList.remove('active');
        }
    });

    // --- Initial Load for Navbar (Copied from script.js) ---
    const initNavbar = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            if (user) {
                const profile = await AuthService.getUserProfile(user.id);
                document.getElementById('coinsDisplay').querySelector('.coin-balance').textContent = profile.excel_coin_balance.toLocaleString();
                joinBtn.textContent = 'Dashboard';
                joinBtn.onclick = () => window.location.href = '/dashboard.html';
            } else {
                joinBtn.addEventListener('click', showAuthModal);
            }
        } catch (error) {
            console.error('Navbar initialization error:', error);
            joinBtn.addEventListener('click', showAuthModal);
        }
    };

    // --- Landing Page Specific JS ---

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const icon = this.querySelector('i'); // Changed from span to i for Font Awesome
            
            // Toggle active state
            if (answer.classList.contains('active')) {
                answer.classList.remove('active');
                icon.classList.remove('fa-times'); // Change icon back to plus
                icon.classList.add('fa-plus');
                this.classList.remove('active'); // Deactivate question header
            } else {
                // Close all other answers
                document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('active'));
                document.querySelectorAll('.faq-question i').forEach(i => {
                    i.classList.remove('fa-times');
                    i.classList.add('fa-plus');
                });
                document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active')); // Deactivate other question headers
                
                answer.classList.add('active');
                icon.classList.remove('fa-plus'); // Change icon to times
                icon.classList.add('fa-times');
                this.classList.add('active'); // Activate question header
            }
        });
    });

    // Header scroll effect (for the main navbar)
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.navbar'); // Target the main navbar
        if (window.scrollY > 100) {
            header.classList.add('scrolled'); // Use the existing 'scrolled' class from styles.css
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Subject tabs functionality
    document.querySelectorAll('.subject-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            const category = this.dataset.category;
            const cards = document.querySelectorAll('.subject-card');
            
            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeInUp 0.5s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Animate elements on scroll
    function animateOnScroll() {
        const elements = document.querySelectorAll('.benefit-card, .feature-card, .teacher-card, .pricing-card, .subject-card, .community-stats, .hero h1, .hero .tagline, .hero-buttons, .hero-platform-showcase, .section-title, .free-tutor-cta, .instant-connect, .faq-item, .contact-form, .contact-info');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }

    // Set initial state for animation elements
    document.querySelectorAll('.benefit-card, .feature-card, .teacher-card, .pricing-card, .subject-card, .community-stats, .hero h1, .hero .tagline, .hero-buttons, .hero-platform-showcase, .section-title, .free-tutor-cta, .instant-connect, .faq-item, .contact-form, .contact-info').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease';
    });

    window.addEventListener('scroll', animateOnScroll);
    window.addEventListener('load', animateOnScroll);

    // Form submission
    document.querySelector('.contact-form').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your message! We\'ll get back to you soon.');
        this.reset();
    });

    // Add hover effects for cards (already handled by CSS, but keeping for consistency if JS effects are desired)
    document.querySelectorAll('.teacher-card, .benefit-card, .feature-card, .subject-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Button click animations (ripple effect - simplified for brevity, can be expanded)
    document.querySelectorAll('.cta-btn, .btn-primary, .btn-secondary, .instant-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Simple visual feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    });

    // Initialize navbar specific logic
    initNavbar();
});
