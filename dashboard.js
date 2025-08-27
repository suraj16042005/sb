import { CourseService } from './courseService.js';
import { AuthService } from './auth.js';
import { localDb } from './localDb.js'; // Import localDb for direct transaction access
import { showNotification } from './script.js'; // Import showNotification

let currentUser = null;
let userProfile = null;
let dashboardData = {
    mentorProfile: {},
    courses: [],
    sessions: [],
    messages: [],
    notifications: [],
    earnings: {
        balance: 0,
        transactions: []
    },
    mentorApplications: [], // New: Mentor applications
    allUsers: [] // New: All users for mentor management
};
let earningsChart; // To hold the chart instance

// Course Creation Wizard State
let currentCourseWizardStep = 0;
const courseWizardSteps = Array.from(document.querySelectorAll('.course-wizard-step[id^="course-step-"]'));
const totalCourseWizardSteps = courseWizardSteps.length;

document.addEventListener('DOMContentLoaded', initDashboard);

// --- INITIALIZATION ---
async function initDashboard() {
    await initAuth();
    
    // Check if user is mentor or admin
    if (!userProfile || (userProfile.role !== 'mentor' && userProfile.role !== 'admin')) {
        window.location.href = '/index.html'; // Redirect if not mentor/admin
        return;
    }
    
    await loadDashboardData();
    setupEventListeners();
    renderDashboard();
    // updateUIForAuthenticatedUser(); // This is now handled by script.js's DOMContentLoaded
    updateCourseWizardStepVisibility(); // Initialize course wizard visibility
    updateCourseWizardProgressBar(); // Initialize course wizard progress
}

const initAuth = async () => {
    try {
        currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            userProfile = await AuthService.getUserProfile(); // Fetch full profile from localDb via AuthService
        } else {
            window.location.href = '/index.html';
            return;
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/index.html';
    }
};

const loadDashboardData = async () => {
    try {
        // Load mentor's profile
        dashboardData.mentorProfile = {
            name: userProfile.full_name,
            headline: userProfile.headline || 'Expert Mentor',
            bio: userProfile.bio || '',
            avatar: userProfile.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80',
            subjects: userProfile.subjects || [] // Ensure subjects are loaded
        };

        // Load mentor's courses
        dashboardData.courses = await CourseService.getMentorCourses(currentUser.id);
        dashboardData.mentorProfile.subjects = [...new Set(dashboardData.courses.map(c => c.subject))]; // Extract unique subjects

        // Load course sessions (for this mentor's courses)
        const allSessions = [];
        for (const course of dashboardData.courses) {
            const sessions = await CourseService.getCourseSessions(course.id, currentUser.id);
            allSessions.push(...sessions.map(session => ({
                ...session,
                course_title: course.title // Add course title for display
            })));
        }
        dashboardData.sessions = allSessions;
        
        // Load course messages (for this mentor's courses)
        const allMessages = [];
        for (const course of dashboardData.courses) {
            const messages = await CourseService.getCourseMessages(course.id);
            allMessages.push(...messages);
        }
        dashboardData.messages = allMessages;

        // Mock notifications for now
        dashboardData.notifications = [
            { id: 1, text: 'New booking for Advanced Calculus!', icon: 'fa-calendar-plus', time: '2 hours ago', read: false },
            { id: 2, text: 'Your course "Web Dev with React" is trending!', icon: 'fa-fire', time: '1 day ago', read: false },
            { id: 3, text: 'Payout of 5000 coins processed.', icon: 'fa-wallet', time: '3 days ago', read: true }
        ];

        // Load earnings/transactions using localDb
        dashboardData.earnings.transactions = await localDb.getTransactionsForUser(currentUser.id);
        dashboardData.earnings.balance = userProfile.excel_coin_balance || 0;

        // New: Load mentor applications and all users for admin view
        if (userProfile.role === 'admin') {
            dashboardData.mentorApplications = await localDb.getMentorApplications();
            dashboardData.allUsers = await localDb.getUsers();
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
};

const renderDashboard = () => {
    // Update profile summary in sidebar
    document.getElementById('profile-menu-avatar').src = dashboardData.mentorProfile.avatar;
    document.getElementById('profile-menu-name').textContent = dashboardData.mentorProfile.name;
    document.getElementById('profile-menu-headline').textContent = dashboardData.mentorProfile.headline;

    // Show admin link if user is admin
    const adminMentorManagementLink = document.getElementById('admin-mentor-management-link');
    if (adminMentorManagementLink) {
        adminMentorManagementLink.style.display = userProfile.role === 'admin' ? 'block' : 'none';
    }

    renderNotifications();
    renderRecentSessions();
    initChart('monthly');
    updateBadges();
};

// --- UI Update for Header (from script.js) ---
// This function is no longer needed here as script.js handles the main navbar.
// Keeping it commented out for reference, but it should not be called.
/*
function updateUIForAuthenticatedUser() {
    const joinBtn = document.getElementById('join-btn');
    const userDropdownWrapper = document.getElementById('user-dropdown-wrapper');
    const userNameDisplay = document.getElementById('user-name-display');
    const userAvatarSmall = document.getElementById('user-avatar-small');
    const myDashboardLink = document.getElementById('my-dashboard-link');
    const tutorNavLink = document.getElementById('tutor-nav-link');
    const coinsDisplay = document.getElementById('coinsDisplay');

    if (joinBtn) joinBtn.style.display = 'none';
    if (userDropdownWrapper) userDropdownWrapper.style.display = 'block';
    
    if (userProfile) {
        if (userNameDisplay) userNameDisplay.textContent = `Hi! ${userProfile.full_name.split(' ')[0]}`;
        if (userAvatarSmall) userAvatarSmall.src = userProfile.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=320&h=320';
        
        if (myDashboardLink) {
            if (userProfile.role === 'mentor' || userProfile.role === 'admin') {
                myDashboardLink.style.display = 'block'; // Changed to block for consistency with mobile
            } else {
                myDashboardLink.style.display = 'none';
            }
        }

        if (tutorNavLink) {
            tutorNavLink.href = userProfile.role === 'mentor' ? '/dashboard.html' : '/become-a-mentor.html';
        }
    }

    // Update coins display in header
    if (coinsDisplay && userProfile) {
        const coinBalance = coinsDisplay.querySelector('.coin-balance');
        if (coinBalance) {
            coinBalance.textContent = (userProfile.excel_coin_balance || 0).toLocaleString();
        }
    }
}
*/

// --- VIEW/NAVIGATION MANAGEMENT ---
const switchView = (viewId) => {
    document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');
    
    updateHeader(viewId);
};

const updateHeader = (viewId) => {
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const titles = {
        'dashboard-home': [`Welcome back, ${dashboardData.mentorProfile.name.split(' ')[0]}!`, 'Here\'s your performance overview for this month.'],
        'schedule': ['My Schedule', 'View and manage your upcoming sessions.'],
        'courses': ['My Courses', 'Manage your course listings and content.'],
        'messages': ['Messages', 'Communicate with your students.'],
        'analytics': ['Analytics', 'Track your performance and growth.'],
        'earnings': ['Earnings', 'View your transaction history and manage payouts.'],
        'profile': ['My Profile', 'Update your personal and professional information.'],
        'mentor-management': ['Mentor Management', 'Manage mentor applications and existing mentors.'], // New title
        'settings': ['Settings', 'Configure your account and notification preferences.'],
    };
    const [title, subtitle] = titles[viewId] || [viewId, ''];
    if (headerTitle) headerTitle.textContent = title;
    if (headerSubtitle) headerSubtitle.textContent = subtitle;
};

// --- DYNAMIC RENDERING ---
const renderNotifications = () => {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;

    const unreadCount = dashboardData.notifications.filter(n => !n.read).length;
    let html = `<div class="dropdown-header">Notifications (${unreadCount} new)</div>`;
    dashboardData.notifications.forEach(n => {
        html += `
            <div class="notification-item ${n.read ? '' : 'unread'}">
                <i class="fas ${n.icon}"></i>
                <div class="notification-content">
                    <p>${n.text}</p>
                    <small>${n.time}</small>
                </div>
            </div>
        `;
    });
    html += `<div class="dropdown-footer"><a href="#">View All Notifications</a></div>`;
    dropdown.innerHTML = html;
};

const renderRecentSessions = () => {
    const tableBody = document.querySelector('#recent-sessions-table tbody');
    if (!tableBody) return;

    let html = '';
    const recentSessions = dashboardData.sessions?.slice(0, 3) || [];
    recentSessions.forEach(s => {
        const scheduledDate = new Date(s.scheduled_start).toLocaleDateString();
        const studentName = s.enrollment?.student?.full_name || 'Unknown Student';
        html += `
            <tr>
                <td>${studentName}</td>
                <td>${s.course_title || 'N/A'}</td>
                <td>${scheduledDate}</td>
                <td><span class="status ${s.status.toLowerCase()}">${s.status}</span></td>
                <td><span class="coin-value">-</span></td>
                <td><button class="btn-secondary btn-sm" data-session-id="${s.id}">Details</button></td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
};

const renderSchedule = () => {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    let html = '<h3>Upcoming Sessions</h3>';
    const upcomingSessions = dashboardData.sessions?.filter(s => s.status === 'scheduled') || [];
    if (upcomingSessions.length === 0) {
        html += '<p>No upcoming sessions.</p>';
    } else {
        upcomingSessions.forEach(s => {
            const scheduledDate = new Date(s.scheduled_start).toLocaleDateString();
            const studentName = s.enrollment?.student?.full_name || 'Unknown Student';
            html += `<div class="schedule-item"><span>${scheduledDate} - ${studentName} (${s.course_title})</span><button class="btn-secondary btn-sm">View Details</button></div>`;
        });
    }
    
    html += '<h3>Past Sessions</h3>';
    const pastSessions = dashboardData.sessions?.filter(s => s.status !== 'scheduled') || [];
    if (pastSessions.length === 0) {
        html += '<p>No past sessions.</p>';
    } else {
        pastSessions.forEach(s => {
            const scheduledDate = new Date(s.scheduled_start).toLocaleDateString();
            const studentName = s.enrollment?.student?.full_name || 'Unknown Student';
            html += `<div class="schedule-item past"><span>${scheduledDate} - ${studentName} (${s.course_title})</span><span class="status ${s.status.toLowerCase()}">${s.status}</span></div>`;
        });
    }
    container.innerHTML = html;
};

const renderCourses = () => {
    const container = document.getElementById('courses-container');
    if (!container) return;

    let html = '<button class="btn btn-primary" id="add-new-course-btn"><i class="fas fa-plus-circle"></i> Add New Course</button>'; // Keep the button
    const courses = dashboardData.courses || [];
    if (courses.length === 0) {
        html += '<p>You have not created any courses yet. Click "Create New Course" to get started!</p>';
    } else {
        courses.forEach(c => {
            html += `
                <div class="course-manage-item">
                    <div class="course-info">
                        <h4>${c.title}</h4>
                        <p>
                            <span class="status ${c.is_active ? 'published' : 'draft'}">${c.is_active ? 'Published' : 'Draft'}</span>
                            <span>${c.enrollment_count || 0} students</span>
                            <span class="coin-value">${c.price_per_session || 0}/session</span>
                        </p>
                    </div>
                    <div class="course-actions">
                        <button class="btn-secondary btn-sm"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-secondary btn-sm"><i class="fas fa-users"></i> View Students</button>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html;
};

const renderConversations = () => {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    let html = '';
    
    // Group messages by course
    const courseMessages = {};
    (dashboardData.messages || []).forEach(msg => {
        if (!courseMessages[msg.course_id]) {
            courseMessages[msg.course_id] = {
                course_id: msg.course_id,
                messages: [],
                lastMessage: null,
                unread: 0
            };
        }
        courseMessages[msg.course_id].messages.push(msg);
        if (!msg.is_read && msg.sender_id !== currentUser.id) {
            courseMessages[msg.course_id].unread++;
        }
    });
    
    const conversations = Object.values(courseMessages);
    if (conversations.length === 0) {
        html = '<p>No conversations yet.</p>';
    } else {
        conversations.forEach(c => {
            const lastMsg = c.messages[c.messages.length - 1];
            const course = dashboardData.courses?.find(course => course.id === c.course_id);
            html += `
                <div class="conversation-item ${c.unread > 0 ? 'unread' : ''}" data-conv-id="${c.course_id}">
                    <img src="${course?.course_image_url || 'https://images.pexels.com/photos/1516321318423-f06f85e504b3?w=48&h=48&fit=crop'}" alt="${course?.title}">
                    <div class="conv-details">
                        <div class="conv-header">
                            <strong>${course?.title || 'Course Chat'}</strong>
                            <small>${lastMsg ? new Date(lastMsg.created_at).toLocaleDateString() : ''}</small>
                        </div>
                        <p>${lastMsg?.message_text || 'No messages yet'}</p>
                    </div>
                    ${c.unread > 0 ? `<span class="unread-dot">${c.unread}</span>` : ''}
                </div>
            `;
        });
    }
    list.innerHTML = html;
};

const renderMessages = async (courseId) => {
    const course = dashboardData.courses?.find(c => c.id === courseId);
    if (!course) return;
    
    try {
        const messages = await CourseService.getCourseMessages(courseId);
        
        const chatHeader = document.getElementById('chat-header');
        if (chatHeader) chatHeader.innerHTML = `Chat: <strong>${course.title}</strong>`;
        
        const body = document.getElementById('chat-body');
        if (!body) return;

        let html = '';
        
        messages.forEach(m => {
            const isMe = m.sender_id === currentUser.id;
            const senderName = isMe ? 'You' : m.sender?.full_name || 'Unknown';
            html += `
                <div class="message ${isMe ? 'sent' : 'received'}">
                    <div class="message-bubble">
                        <strong>${senderName}:</strong>
                        <p>${m.message_text}</p>
                        <small>${new Date(m.created_at).toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
        });
        
        body.innerHTML = html;
        body.scrollTop = body.scrollHeight;
        
        // Update chat input to send to this course
        const chatInput = document.querySelector('#chat-footer input');
        const sendBtn = document.querySelector('#chat-footer button');
        
        if (sendBtn) {
            // Remove previous listener to prevent multiple attachments
            const oldSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(oldSendBtn, sendBtn);
            
            oldSendBtn.onclick = async () => {
                const messageText = chatInput.value.trim();
                if (messageText) {
                    try {
                        await CourseService.sendCourseMessage(courseId, currentUser.id, messageText);
                        chatInput.value = '';
                        renderMessages(courseId); // Refresh messages
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                }
            };
        }
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
};

const renderEarnings = () => {
    const container = document.getElementById('earnings-container');
    if (!container) return;

    const balance = dashboardData.earnings?.balance || 0;
    let html = `
        <div class="earnings-summary">
            <div>
                <span>Available Balance</span>
                <strong class="coin-value">${balance.toLocaleString()}</strong>
            </div>
            <button class="btn-primary" id="withdraw-earnings-btn-2">Withdraw Funds</button>
        </div>
        <h3>Transaction History</h3>
        <div class="table-responsive">
            <table>
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
                <tbody>
    `;
    const transactions = dashboardData.earnings?.transactions || [];
    if (transactions.length === 0) {
        html += '<tr><td colspan="3">No transactions found.</td></tr>';
    } else {
        transactions.forEach(t => {
            html += `
                <tr>
                    <td>${new Date(t.created_at).toLocaleDateString()}</td>
                    <td>${t.description}</td>
                    <td class="${t.amount > 0 ? 'credit' : 'debit'}"><span class="coin-value">${Math.abs(t.amount).toLocaleString()}</span></td>
                </tr>
            `;
        });
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
};

const renderProfileForm = () => {
    const profile = dashboardData.mentorProfile;
    const profileNameInput = document.getElementById('profile-name');
    const profileEmailInput = document.getElementById('profile-email');
    const profileHeadlineInput = document.getElementById('profile-headline');
    const profileBioTextarea = document.getElementById('profile-bio');
    const profileAvatarUrlInput = document.getElementById('profile-avatar-url');
    // Note: 'profileSubjects' input is not in dashboard.html, so it's removed here.

    if (profileNameInput) profileNameInput.value = profile.name || '';
    if (profileEmailInput && currentUser) profileEmailInput.value = currentUser.email || '';
    if (profileHeadlineInput) profileHeadlineInput.value = profile.headline || '';
    if (profileBioTextarea) profileBioTextarea.value = profile.bio || '';
    if (profileAvatarUrlInput) profileAvatarUrlInput.value = profile.avatar || '';
};

const renderSettingsForm = () => {
    const settingsEmailInput = document.getElementById('settings-email');
    const settingsPasswordInput = document.getElementById('settings-password');
    const emailNotificationsCheckbox = document.getElementById('email-notifications');
    const smsNotificationsCheckbox = document.getElementById('sms-notifications');
    const profileVisibilityCheckbox = document.getElementById('profile-visibility');

    if (settingsEmailInput && currentUser) {
        settingsEmailInput.value = currentUser.email || '';
    }
    // Password fields should not be pre-filled for security
    if (settingsPasswordInput) {
        settingsPasswordInput.value = ''; // Ensure it's empty
    }

    // Load actual settings from userProfile if they exist, otherwise use defaults
    // For now, using hardcoded defaults as userProfile doesn't store these specific settings
    if (emailNotificationsCheckbox) emailNotificationsCheckbox.checked = true; 
    if (smsNotificationsCheckbox) smsNotificationsCheckbox.checked = false; 
    if (profileVisibilityCheckbox) profileVisibilityCheckbox.checked = true; 
};

const renderMentorManagement = () => {
    const pendingApplicationsTableBody = document.querySelector('#pending-applications-table tbody');
    const currentMentorsTableBody = document.querySelector('#current-mentors-table tbody');

    if (!pendingApplicationsTableBody || !currentMentorsTableBody) return;

    let pendingHtml = '';
    const pendingApplications = dashboardData.mentorApplications.filter(app => app.status === 'pending');
    if (pendingApplications.length === 0) {
        pendingHtml = '<tr><td colspan="5">No pending mentor applications.</td></tr>';
    } else {
        pendingApplications.forEach(app => {
            const applicantUser = dashboardData.allUsers.find(user => user.id === app.userId);
            pendingHtml += `
                <tr>
                    <td>${applicantUser ? applicantUser.full_name : 'N/A'}</td>
                    <td>${applicantUser ? applicantUser.email : 'N/A'}</td>
                    <td>${new Date(app.submittedAt).toLocaleDateString()}</td>
                    <td><span class="status pending">${app.status}</span></td>
                    <td>
                        <button class="btn-success btn-sm approve-mentor-btn" data-app-id="${app.id}" data-user-id="${app.userId}">Approve</button>
                        <button class="btn-danger btn-sm reject-mentor-btn" data-app-id="${app.id}">Reject</button>
                        <button class="btn-secondary btn-sm view-details-btn" data-app-id="${app.id}">View Details</button>
                    </td>
                </tr>
            `;
        });
    }
    pendingApplicationsTableBody.innerHTML = pendingHtml;

    let mentorsHtml = '';
    const currentMentors = dashboardData.allUsers.filter(user => user.role === 'mentor');
    if (currentMentors.length === 0) {
        mentorsHtml = '<tr><td colspan="5">No mentors found.</td></tr>';
    } else {
        currentMentors.forEach(mentor => {
            mentorsHtml += `
                <tr>
                    <td>${mentor.full_name}</td>
                    <td>${mentor.email}</td>
                    <td>${mentor.role}</td>
                    <td><span class="status ${mentor.is_blocked ? 'blocked' : 'active'}">${mentor.is_blocked ? 'Blocked' : 'Active'}</span></td>
                    <td>
                        <button class="btn-warning btn-sm toggle-block-mentor-btn" data-user-id="${mentor.id}">
                            ${mentor.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    currentMentorsTableBody.innerHTML = mentorsHtml;
};

const updateBadges = () => {
    // Count unread messages across all courses
    let unreadMessages = 0;
    (dashboardData.messages || []).forEach(msg => {
        if (!msg.is_read && msg.sender_id !== currentUser.id) {
            unreadMessages++;
        }
    });
    
    const messageBadge = document.getElementById('messages-badge'); // Corrected ID from 'message-badge' to 'messages-badge'
    if (messageBadge) {
        messageBadge.textContent = unreadMessages;
        messageBadge.style.display = unreadMessages > 0 ? 'inline-block' : 'none';
    }

    const unreadNotifications = (dashboardData.notifications || []).filter(n => !n.read).length;
    const notificationBadge = document.getElementById('notification-badge');
    if (notificationBadge) {
        notificationBadge.textContent = unreadNotifications;
        notificationBadge.style.display = unreadNotifications > 0 ? 'flex' : 'none';
    }
};

// --- CHART LOGIC ---
const initChart = (period) => {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;

    // Mock chart data for now
    const chartData = {
        monthly: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            data: [3200, 4500, 2800, 5000]
        },
        biannual: {
            labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            data: [9600, 10500, 12500, 11000, 14000, 18250]
        }
    };

    const chartConfig = {
        type: 'line',
        data: {
            labels: chartData[period].labels,
            datasets: [{
                label: 'Earnings',
                data: chartData[period].data,
                fill: true,
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                borderColor: 'rgba(147, 51, 234, 1)',
                tension: 0.4,
                pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverRadius: 7,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, // Keep this false, but control parent size
            scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    };

    if (earningsChart) {
        earningsChart.destroy();
    }
    earningsChart = new Chart(ctx, chartConfig);
};

// --- MODAL LOGIC ---
const showModal = (title, body, footer) => {
    const modalTitleEl = document.getElementById('modal-title');
    const modalBodyEl = document.getElementById('modal-body');
    const modalFooterEl = document.getElementById('modal-footer');
    const genericModalEl = document.getElementById('generic-modal');

    if (modalTitleEl) modalTitleEl.innerHTML = title;
    if (modalBodyEl) modalBodyEl.innerHTML = body;
    if (modalFooterEl) modalFooterEl.innerHTML = footer || '<button class="btn-secondary" id="modal-cancel-btn">Close</button>';
    if (genericModalEl) genericModalEl.style.display = 'flex';
};

const hideModal = () => {
    const genericModalEl = document.getElementById('generic-modal');
    if (genericModalEl) genericModalEl.style.display = 'none';
};

// --- COURSE WIZARD LOGIC ---
const showCourseWizardModal = () => {
    const wizardOverlay = document.getElementById('course-wizard-overlay');
    if (wizardOverlay) wizardOverlay.style.display = 'flex';
    currentCourseWizardStep = 0; // Reset to first step
    updateCourseWizardStepVisibility();
    updateCourseWizardProgressBar();
};

const hideCourseWizardModal = () => {
    const wizardOverlay = document.getElementById('course-wizard-overlay');
    if (wizardOverlay) wizardOverlay.style.display = 'none';
    document.getElementById('course-creation-form')?.reset(); // Clear form
};

const updateCourseWizardStepVisibility = () => {
    courseWizardSteps.forEach((step, index) => {
        step.style.display = index === currentCourseWizardStep ? 'block' : 'none';
    });

    const backBtn = document.getElementById('course-wizard-back-btn');
    const nextBtn = document.getElementById('course-wizard-next-btn');
    const submitBtn = document.getElementById('course-wizard-submit-btn');

    if (backBtn) backBtn.style.display = currentCourseWizardStep > 0 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = currentCourseWizardStep < totalCourseWizardSteps - 1 ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = currentCourseWizardStep === totalCourseWizardSteps - 1 ? 'inline-block' : 'none';
};

const updateCourseWizardProgressBar = () => {
    const progressBarFill = document.getElementById('courseWizardProgressBarFill');
    const progressText = document.getElementById('courseWizardProgressText');
    if (!progressBarFill || !progressText) return;

    const progress = ((currentCourseWizardStep + 1) / totalCourseWizardSteps) * 100;
    progressBarFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentCourseWizardStep + 1} of ${totalCourseWizardSteps}`;
};

const validateCourseWizardStep = (stepIndex) => {
    let isValid = true;
    const currentStepElement = courseWizardSteps[stepIndex];
    if (!currentStepElement) return false;

    const inputs = currentStepElement.querySelectorAll('input[required], select[required], textarea[required]');
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error-input'); // Add a class for visual feedback
            showNotification(`Please fill in all required fields in Step ${stepIndex + 1}.`, 'error');
        } else {
            input.classList.remove('error-input');
        }
    });
    return isValid;
};

const populateCourseReviewSummary = () => {
    const summaryContainer = document.getElementById('course-review-summary');
    if (!summaryContainer) return;

    const form = document.getElementById('course-creation-form');
    const formData = new FormData(form);
    let html = '<h3>Course Details</h3><ul>';

    const fields = {
        'course-title': 'Title',
        'course-short-description': 'Short Description',
        'course-description': 'Full Description',
        'course-image-url': 'Image URL',
        'course-subject': 'Subject',
        'course-language': 'Language',
        'course-difficulty': 'Difficulty Level',
        'course-price': 'Price per Session',
        'course-duration': 'Session Duration (min)',
        'course-sessions': 'Total Sessions'
    };

    for (const [id, label] of Object.entries(fields)) {
        const value = formData.get(id);
        if (value) {
            html += `<li><strong>${label}:</strong> ${value}</li>`;
        }
    }

    const isActive = document.getElementById('course-is-active')?.checked;
    html += `<li><strong>Publish Course:</strong> ${isActive ? 'Yes' : 'No'}</li>`;
    
    summaryContainer.innerHTML = html + '</ul>';
};


// --- EVENT LISTENERS ---
const setupEventListeners = () => {
    // Sidebar Navigation
    document.querySelectorAll('.sidebar-nav .nav-link, .quick-actions .action-btn[data-view], a[data-view]').forEach(link => {
        link.addEventListener('click', async (e) => { // Made async for mentor management
            e.preventDefault();
            const viewId = e.currentTarget.dataset.view;
            switchView(viewId);
            // Pre-render content when switching views
            if (viewId === 'schedule') renderSchedule();
            if (viewId === 'courses') renderCourses();
            if (viewId === 'messages') renderConversations();
            if (viewId === 'earnings') renderEarnings();
            if (viewId === 'profile') renderProfileForm();
            if (viewId === 'settings') renderSettingsForm();
            if (viewId === 'mentor-management') {
                await loadDashboardData(); // Reload data for admin view
                renderMentorManagement();
            }
        });
    });

    // Header Dropdowns (Notification button is dashboard-specific)
    const notificationBtn = document.getElementById('notification-btn');
    // The user-profile-btn in the main navbar is handled by script.js
    
    notificationBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        document.getElementById('notifications-dropdown')?.classList.toggle('show');
        // Mark notifications as read (mock)
        dashboardData.notifications.forEach(n => n.read = true);
        renderNotifications();
        updateBadges();
    });
    
    // Close dropdowns if clicked outside (handled by script.js for main navbar, but dashboard-specific ones need it)
    window.addEventListener('click', (e) => {
        const notificationsDropdown = document.getElementById('notifications-dropdown');
        if (notificationsDropdown && notificationBtn && !notificationBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.remove('show');
        }
        // User dropdown is handled by script.js
    });

    // Chart Period Selector
    document.getElementById('earnings-chart-period')?.addEventListener('change', (e) => initChart(e.target.value));

    // Course Creation Wizard
    const addNewCourseBtn = document.getElementById('add-new-course-btn');
    const closeWizardBtn = document.getElementById('close-wizard-btn');
    const courseWizardOverlay = document.getElementById('course-wizard-overlay');
    const courseWizardBackBtn = document.getElementById('course-wizard-back-btn');
    const courseWizardNextBtn = document.getElementById('course-wizard-next-btn');
    const courseWizardSubmitBtn = document.getElementById('course-wizard-submit-btn');
    const courseCreationForm = document.getElementById('course-creation-form');

    if (addNewCourseBtn) addNewCourseBtn.addEventListener('click', showCourseWizardModal);
    if (closeWizardBtn) closeWizardBtn.addEventListener('click', hideCourseWizardModal);
    if (courseWizardOverlay) courseWizardOverlay.addEventListener('click', (e) => {
        if (e.target === courseWizardOverlay) {
            hideCourseWizardModal();
        }
    });

    courseWizardBackBtn?.addEventListener('click', () => {
        if (currentCourseWizardStep > 0) {
            currentCourseWizardStep--;
            updateCourseWizardStepVisibility();
            updateCourseWizardProgressBar();
        }
    });

    courseWizardNextBtn?.addEventListener('click', () => {
        if (validateCourseWizardStep(currentCourseWizardStep)) {
            if (currentCourseWizardStep < totalCourseWizardSteps - 1) {
                currentCourseWizardStep++;
                if (currentCourseWizardStep === totalCourseWizardSteps - 1) { // If it's the review step
                    populateCourseReviewSummary();
                }
                updateCourseWizardStepVisibility();
                updateCourseWizardProgressBar();
            }
        }
    });

    courseWizardSubmitBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (validateCourseWizardStep(currentCourseWizardStep)) { // Final validation on review step
            const newCourse = {
                id: crypto.randomUUID(), // Generate unique ID
                mentor_id: currentUser.id,
                title: document.getElementById('course-title').value,
                short_description: document.getElementById('course-short-description').value,
                description: document.getElementById('course-description').value,
                subject: document.getElementById('course-subject').value,
                language: document.getElementById('course-language').value,
                difficulty_level: document.getElementById('course-difficulty').value,
                price_per_session: parseInt(document.getElementById('course-price').value),
                duration_minutes: parseInt(document.getElementById('course-duration').value),
                total_sessions: parseInt(document.getElementById('course-sessions').value),
                course_image_url: document.getElementById('course-image-url').value || 'https://images.pexels.com/photos/1516321318423-f06f85e504b3?w=320&h=180&fit=crop',
                is_active: document.getElementById('course-is-active').checked,
                average_rating: 0, // Default
                total_reviews: 0, // Default
                enrollment_count: 0, // Default
                created_at: new Date().toISOString()
            };

            try {
                await CourseService.createCourse(newCourse);
                showNotification('Course created successfully!', 'success');
                hideCourseWizardModal();
                await loadDashboardData(); // Reload data
                renderCourses(); // Re-render courses view
            } catch (error) {
                console.error('Error creating course:', error);
                showNotification('Failed to create course.', 'error');
            }
        }
    });

    // Profile Form Submission
    const profileForm = document.getElementById('profile-form');
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedProfile = {
            full_name: document.getElementById('profile-name').value,
            headline: document.getElementById('profile-headline').value,
            bio: document.getElementById('profile-bio').value,
            avatar_url: document.getElementById('profile-avatar-url').value
        };
        try {
            await AuthService.updateProfile(currentUser.id, updatedProfile);
            showNotification('Profile updated successfully!', 'success');
            // Re-load dashboard data to reflect changes
            await loadDashboardData();
            renderDashboard();
            // updateUIForAuthenticatedUser(); // This is now handled by script.js's updateUIForAuth
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Failed to update profile.', 'error');
        }
    });

    // Settings Form Submission
    const settingsForm = document.getElementById('settings-form');
    settingsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('settings-password').value;
        const updates = {};

        if (newPassword) {
            updates.password = newPassword;
        }
        // Add other settings updates here if they were stored in userProfile
        updates.email_notifications = document.getElementById('email-notifications')?.checked;
        updates.sms_notifications = document.getElementById('sms-notifications')?.checked;
        updates.profile_visibility = document.getElementById('profile-visibility')?.checked;

        try {
            await AuthService.updateProfile(currentUser.id, updates); // Use updateProfile for settings too
            showNotification('Settings updated successfully!', 'success');
            // Clear password field after successful update
            document.getElementById('settings-password').value = '';
        } catch (error) {
            console.error('Error updating settings:', error);
            showNotification('Failed to update settings.', 'error');
        }
    });

    // Modal close buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'modal-cancel-btn' || e.target.id === 'close-modal-btn' || e.target.matches('.close-modal-btn i')) {
            hideModal();
        }
    });

    // Logout button in sidebar
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
        await AuthService.signOut();
        window.location.href = '/index.html';
    });

    // Dynamic Event Listeners (using event delegation)
    document.body.addEventListener('click', async (e) => { // Made async for mentor management
        // Session Actions
        const actionBtn = e.target.closest('button[data-session-id]');
        if (actionBtn) {
            const sessionId = actionBtn.dataset.sessionId;
            const session = dashboardData.sessions.find(s => s.id == sessionId);
            if (session) {
                showModal(
                    `Session with ${session.enrollment?.student?.full_name || 'Unknown Student'}`,
                    `<p><strong>Course:</strong> ${session.course_title || 'N/A'}</p><p><strong>Date:</strong> ${new Date(session.scheduled_start).toLocaleDateString()}</p><p><strong>Status:</strong> ${session.status}</p>`,
                    `<button class="btn-secondary" id="modal-cancel-btn">Close</button><button class="btn-primary">Message Student</button>`
                );
            }
        }
        
        // Withdraw Earnings
        if (e.target.id === 'withdraw-earnings-btn' || e.target.id === 'withdraw-earnings-btn-2') {
             showModal(
                'Withdraw Earnings',
                `
                <p>Your available balance is <strong class="coin-value">${dashboardData.earnings.balance.toLocaleString()}</strong>.</p>
                <div class="form-group">
                    <label for="withdraw-amount">Amount to withdraw</label>
                    <input type="number" id="withdraw-amount" placeholder="e.g., 5000">
                </div>
                <div class="form-group">
                    <label for="bank-account">Select Bank Account</label>
                    <select id="bank-account"><option>HDFC Bank - **** 1234</option></select>
                </div>
                `,
                `<button class="btn-secondary" id="modal-cancel-btn">Cancel</button><button class="btn-primary" id="confirm-withdrawal-btn">Confirm Withdrawal</button>`
            );
            document.getElementById('confirm-withdrawal-btn')?.addEventListener('click', async () => {
                const amountInput = document.getElementById('withdraw-amount');
                const amount = amountInput ? parseInt(amountInput.value) : 0;
                if (isNaN(amount) || amount <= 0 || amount > dashboardData.earnings.balance) {
                    showNotification('Please enter a valid amount within your balance.', 'error');
                    return;
                }
                try {
                    await AuthService.updateCoinBalance(currentUser.id, -amount, 'Withdrawal', 'Funds withdrawal');
                    showNotification('Withdrawal successful!', 'success');
                    hideModal();
                    await loadDashboardData(); // Reload data
                    renderEarnings(); // Re-render earnings view
                    // updateUIForAuthenticatedUser(); // This is now handled by script.js's updateUIForAuth
                } catch (error) {
                    console.error('Withdrawal failed:', error);
                    showNotification('Withdrawal failed.', 'error');
                }
            });
        }

        // Select Conversation
        const convItem = e.target.closest('.conversation-item');
        if (convItem) {
            document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
            convItem.classList.add('active');
            renderMessages(convItem.dataset.convId); // This is now courseId
        }

        // Mentor Management Actions
        if (e.target.classList.contains('approve-mentor-btn')) {
            const appId = e.target.dataset.appId;
            const userId = e.target.dataset.userId;
            const application = dashboardData.mentorApplications.find(app => app.id === appId);
            if (application) {
                try {
                    // Update user role and merge application details into user profile
                    const userToUpdate = dashboardData.allUsers.find(u => u.id === userId);
                    if (userToUpdate) {
                        const updatedUser = {
                            ...userToUpdate,
                            role: 'mentor',
                            headline: application.headline || 'New Mentor', // Use application headline or default
                            bio: application.bio,
                            phone: application.phone,
                            dob: application.dob,
                            gender: application.gender,
                            city: application.city,
                            languages: application.languages,
                            educationLevel: application.educationLevel,
                            institution: application.institution,
                            gradYear: application.gradYear,
                            fieldOfStudy: application.fieldOfStudy,
                            profession: application.profession,
                            experience: application.experience,
                            teachingExperience: application.teachingExperience,
                            previousTeachingDetails: application.previousTeachingDetails,
                            subjects: application.subjects,
                            customSubjects: application.customSubjects,
                            teachingApproach: application.teachingApproach,
                            targetAudience: application.targetAudience,
                            profilePhoto: application.profilePhoto,
                            idFront: application.idFront,
                            idBack: application.idBack,
                            eduCert: application.eduCert,
                            profCert: application.profCert,
                            teachingCred: application.teachingCred,
                            demoVideo: application.demoVideo,
                            ndaAgree: application.ndaAgree,
                            digitalSignature: application.digitalSignature,
                            is_blocked: false // Ensure not blocked on approval
                        };
                        await localDb.updateUser(userId, updatedUser);
                        await localDb.updateMentorApplication(appId, { status: 'approved' });
                        showNotification('Mentor approved successfully!', 'success');
                        await loadDashboardData();
                        renderMentorManagement();
                    } else {
                        showNotification('User not found for this application.', 'error');
                    }
                } catch (error) {
                    console.error('Error approving mentor:', error);
                    showNotification('Failed to approve mentor.', 'error');
                }
            }
        }

        if (e.target.classList.contains('reject-mentor-btn')) {
            const appId = e.target.dataset.appId;
            try {
                await localDb.updateMentorApplication(appId, { status: 'rejected' });
                showNotification('Mentor application rejected.', 'info');
                await loadDashboardData();
                renderMentorManagement();
            } catch (error) {
                console.error('Error rejecting mentor:', error);
                showNotification('Failed to reject mentor application.', 'error');
            }
        }

        if (e.target.classList.contains('toggle-block-mentor-btn')) {
            const userId = e.target.dataset.userId;
            const mentor = dashboardData.allUsers.find(u => u.id === userId);
            if (mentor) {
                const newBlockStatus = !mentor.is_blocked;
                try {
                    await localDb.updateUser(userId, { is_blocked: newBlockStatus });
                    showNotification(`Mentor ${newBlockStatus ? 'blocked' : 'unblocked'} successfully!`, 'success');
                    await loadDashboardData();
                    renderMentorManagement();
                } catch (error) {
                    console.error('Error toggling mentor block status:', error);
                    showNotification('Failed to update mentor status.', 'error');
                }
            }
        }

        if (e.target.classList.contains('view-details-btn')) {
            const appId = e.target.dataset.appId;
            const application = dashboardData.mentorApplications.find(app => app.id === appId);
            if (application) {
                let detailsHtml = `
                    <p><strong>Applicant ID:</strong> ${application.userId}</p>
                    <p><strong>Full Name:</strong> ${application.fullName}</p>
                    <p><strong>Email:</strong> ${application.email}</p>
                    <p><strong>Phone:</strong> ${application.phone}</p>
                    <p><strong>City:</strong> ${application.city}</p>
                    <p><strong>Bio:</strong> ${application.bio}</p>
                    <p><strong>Languages:</strong> ${application.languages ? application.languages.join(', ') : 'N/A'}</p>
                    <p><strong>Education Level:</strong> ${application.educationLevel}</p>
                    <p><strong>Institution:</strong> ${application.institution}</p>
                    <p><strong>Graduation Year:</strong> ${application.gradYear}</p>
                    <p><strong>Field of Study:</strong> ${application.fieldOfStudy}</p>
                    <p><strong>Profession:</strong> ${application.profession || 'N/A'}</p>
                    <p><strong>Years Experience:</strong> ${application.experience || 'N/A'}</p>
                    <p><strong>Taught Before:</strong> ${application.teachingExperience}</p>
                    ${application.teachingExperience === 'yes' ? `<p><strong>Previous Teaching Details:</strong> ${application.previousTeachingDetails}</p>` : ''}
                    <p><strong>Subjects:</strong> ${application.subjects ? application.subjects.join(', ') : 'N/A'}</p>
                    <p><strong>Teaching Approach:</strong> ${application.teachingApproach ? application.teachingApproach.join(', ') : 'N/A'}</p>
                    <p><strong>Target Audience:</strong> ${application.targetAudience}</p>
                    <p><strong>Profile Photo:</strong> ${application.profilePhoto || 'N/A'}</p>
                    <p><strong>ID Front:</strong> ${application.idFront || 'N/A'}</p>
                    <p><strong>ID Back:</strong> ${application.idBack || 'N/A'}</p>
                    <p><strong>Education Certificate:</strong> ${application.eduCert || 'N/A'}</p>
                    <p><strong>Professional Certificate:</strong> ${application.profCert || 'N/A'}</p>
                    <p><strong>Teaching Credential:</strong> ${application.teachingCred || 'N/A'}</p>
                    <p><strong>Demo Video:</strong> ${application.demoVideo || 'N/A'}</p>
                    <p><strong>NDA Agreed:</strong> ${application.ndaAgree ? 'Yes' : 'No'}</p>
                    <p><strong>Digital Signature:</strong> ${application.digitalSignature}</p>
                    <p><strong>Status:</strong> <span class="status ${application.status}">${application.status}</span></p>
                    <p><strong>Submitted At:</strong> ${new Date(application.submittedAt).toLocaleString()}</p>
                `;
                showModal(`Application Details for ${application.fullName}`, detailsHtml, `<button class="btn-secondary" id="modal-cancel-btn">Close</button>`);
            }
        }
    });
};
