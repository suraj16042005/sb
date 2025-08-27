import { localDb } from './localDb.js';
import { AuthService, showAuthModal, showNotification } from './script.js'; // Import necessary functions

document.addEventListener('DOMContentLoaded', async () => {
    console.log('course-detail.js: DOMContentLoaded fired.');
    await localDb.open(); // Ensure DB is open
    console.log('course-detail.js: IndexedDB opened.');

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    console.log('course-detail.js: Course ID from URL:', courseId);

    if (courseId) {
        await fetchAndRenderCourseDetails(courseId);
    } else {
        showNotification('Course ID not found in URL. Redirecting...', 'error');
        console.error('course-detail.js: Course ID not found in URL.');
        // Optionally redirect to a 404 page or course listing
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

async function fetchAndRenderCourseDetails(courseId) {
    console.log('course-detail.js: Fetching course details for ID:', courseId);
    const course = await localDb.get('courses', courseId);
    console.log('course-detail.js: Fetched course:', course);

    if (!course) {
        showNotification('Course not found. Redirecting...', 'error');
        console.error('course-detail.js: Course not found in DB for ID:', courseId);
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    console.log('course-detail.js: Fetching mentor details for mentor_id:', course.mentor_id);
    const mentor = await localDb.get('users', course.mentor_id);
    console.log('course-detail.js: Fetched mentor:', mentor);

    if (!mentor) {
        showNotification('Mentor not found for this course. Displaying with placeholder.', 'error');
        console.warn('course-detail.js: Mentor not found for course ID:', courseId, 'Mentor ID:', course.mentor_id);
    }

    // Update Breadcrumb
    const courseBreadcrumb = document.getElementById('course-breadcrumb');
    if (courseBreadcrumb) {
        courseBreadcrumb.textContent = course.title || 'Course Details';
        console.log('course-detail.js: Breadcrumb updated.');
    }

    // Update Course Header (mentor-profile-header-compact)
    const courseHeader = document.getElementById('course-header');
    if (courseHeader) {
        courseHeader.innerHTML = `
            <div class="mentor-profile-info">
                <img src="${mentor?.avatar_url || 'https://via.placeholder.com/128x128'}" alt="${mentor?.full_name || 'Unknown Mentor'}" class="mentor-profile-avatar">
                <div class="mentor-profile-details">
                    <h2>${course.title || 'N/A'}</h2>
                    <p class="mentor-headline">${course.short_description || 'No description available.'}</p>
                    <div class="mentor-meta">
                        <span><i class="fas fa-user"></i> ${mentor?.full_name || 'Unknown Mentor'}</span>
                        <span><i class="fas fa-star"></i> ${course.average_rating || 'N/A'} (${course.total_reviews || 0} reviews)</span>
                        <span><i class="fas fa-tag"></i> ${course.subject || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="mentor-profile-actions">
                <button class="btn btn-primary" id="enrollBtnHeader">Enroll Now</button>
            </div>
        `;
        document.getElementById('enrollBtnHeader')?.addEventListener('click', () => showEnrollmentModal(course, mentor));
        console.log('course-detail.js: Course header updated.');
    }

    // Update Course Preview Video
    const courseVideo = document.getElementById('course-video');
    if (courseVideo) {
        courseVideo.innerHTML = `
            <video controls poster="${course.course_image_url || 'https://via.placeholder.com/640x360?text=No+Video+Preview'}" style="width: 100%; height: 100%; border-radius: 12px;">
                <source src="${course.demo_video_url || 'https://www.w3schools.com/html/mov_bbb.mp4'}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
        console.log('course-detail.js: Course video updated.');
    }

    // Update Quick Actions (enrollBtn already exists, add listener)
    const enrollBtn = document.getElementById('enrollBtn');
    if (enrollBtn) {
        enrollBtn.addEventListener('click', () => showEnrollmentModal(course, mentor));
        console.log('course-detail.js: Quick actions enroll button listener added.');
    }

    // Favorite button logic
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        const currentUser = AuthService.getCurrentUser();
        let userFavorites = currentUser ? (currentUser.favorites || []) : [];
        if (userFavorites.includes(course.id)) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Added to Favorites';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
            favoriteBtn.classList.remove('favorited');
        }

        favoriteBtn.onclick = async () => {
            if (!currentUser) {
                showNotification('Please log in to favorite courses.', 'info');
                showAuthModal();
                return;
            }

            let user = await localDb.getUser(currentUser.id);
            if (!user) {
                showNotification('User data not found.', 'error');
                return;
            }

            let favorites = new Set(user.favorites || []);
            const isFavorited = favorites.has(course.id);

            if (isFavorited) {
                favorites.delete(course.id);
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
                favoriteBtn.classList.remove('favorited');
                showNotification('Course removed from favorites.', 'info');
            } else {
                favorites.add(course.id);
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Added to Favorites';
                favoriteBtn.classList.add('favorited');
                showNotification('Course added to favorites!', 'success');
            }
            user.favorites = Array.from(favorites);
            await localDb.updateUser(user.id, { favorites: user.favorites });
            AuthService.updateCurrentUser(user); // Update local storage
            console.log('course-detail.js: User favorites updated:', user.favorites);
        };
        console.log('course-detail.js: Favorite button logic initialized.');
    }

    // Update Pricing Card
    const coursePricing = document.getElementById('course-pricing');
    if (coursePricing) {
        coursePricing.innerHTML = `
            <div class="price-value">
                <span class="currency">₹</span>${course.price_per_session || 'N/A'} <i class="fas fa-coins"></i>
            </div>
            <p class="price-description">per session</p>
            <ul class="features-list">
                <li><i class="fas fa-check-circle"></i> Access to all course materials</li>
                <li><i class="fas fa-check-circle"></i> Flexible scheduling</li>
                <li><i class="fas fa-check-circle"></i> Direct messaging with mentor</li>
                <li><i class="fas fa-check-circle"></i> Certificate of completion</li>
            </ul>
        `;
        console.log('course-detail.js: Pricing card updated.');
    }

    // Update About Tab
    const courseAbout = document.getElementById('course-about');
    if (courseAbout) {
        courseAbout.innerHTML = `
            <h3>About This Course</h3>
            <p>${course.long_description || course.short_description || 'No detailed description available.'}</p>
            <h4>What you'll learn:</h4>
            <ul>
                ${course.what_you_will_learn?.map(item => `<li><i class="fas fa-check-circle"></i> ${item}</li>`).join('') || '<li>No specific learning outcomes provided.</li>'}
            </ul>
            <h4>Requirements:</h4>
            <ul>
                ${course.requirements?.map(item => `<li><i class="fas fa-check-circle"></i> ${item}</li>`).join('') || '<li>No specific requirements.</li>'}
            </ul>
            <h4>Target Audience:</h4>
            <p>${course.target_audience || 'Students interested in this subject.'}</p>
        `;
        console.log('course-detail.js: About tab updated.');
    }

    // Update Curriculum Tab
    const courseCurriculum = document.getElementById('course-curriculum');
    if (courseCurriculum) {
        courseCurriculum.innerHTML = `
            <h3>Course Curriculum</h3>
            <div class="curriculum-sections">
                ${course.curriculum?.map((section, index) => `
                    <div class="curriculum-section-item">
                        <div class="section-header">
                            <h4>${section.title || `Section ${index + 1}`}</h4>
                            <span>${section.lessons?.length || 0} Lessons</span>
                        </div>
                        <ul class="lessons-list">
                            ${section.lessons?.map(lesson => `
                                <li>
                                    <i class="fas fa-play-circle"></i> ${lesson.title || 'Untitled Lesson'}
                                    <span>${lesson.duration || 'N/A'}</span>
                                </li>
                            `).join('') || '<li>No lessons in this section.</li>'}
                        </ul>
                    </div>
                `).join('') || '<p>No curriculum details available.</p>'}
            </div>
        `;
        console.log('course-detail.js: Curriculum tab updated.');
    }

    // Update Reviews Tab
    const reviewsSummary = document.getElementById('reviews-summary');
    const reviewsList = document.getElementById('reviews-list');
    if (reviewsSummary && reviewsList) {
        reviewsSummary.innerHTML = `
            <h3>Student Reviews</h3>
            <div class="overall-rating">
                <span class="rating-score">${course.average_rating || 'N/A'}</span>
                <div class="stars">${getStarRatingHtml(course.average_rating || 0)}</div>
                <span class="total-reviews">(${course.total_reviews || 0} reviews)</span>
            </div>
            <div class="rating-breakdown">
                ${[5, 4, 3, 2, 1].map(star => {
                    const count = course.reviews?.filter(r => Math.floor(r.rating) === star).length || 0;
                    const percentage = course.total_reviews > 0 ? (count / course.total_reviews) * 100 : 0;
                    return `
                        <div class="rating-bar-item">
                            <span>${star} <i class="fas fa-star"></i></span>
                            <div class="bar-container"><div class="bar-fill" style="width: ${percentage}%"></div></div>
                            <span>${count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        reviewsList.innerHTML = `
            ${course.reviews?.map(review => `
                <div class="review-item">
                    <div class="reviewer-info">
                        <img src="${review.reviewer_avatar_url || 'https://via.placeholder.com/40x40'}" alt="${review.reviewer_name || 'Anonymous'}" class="reviewer-avatar">
                        <div class="reviewer-details">
                            <h4>${review.reviewer_name || 'Anonymous'}</h4>
                            <div class="stars">${getStarRatingHtml(review.rating || 0)}</div>
                        </div>
                    </div>
                    <p class="review-text">${review.comment || 'No comment provided.'}</p>
                    <span class="review-date">${review.date ? new Date(review.date).toLocaleDateString() : 'N/A'}</span>
                </div>
            `).join('') || '<p>No reviews yet.</p>'}
        `;
        console.log('course-detail.js: Reviews tab updated.');
    }

    // Update Mentor Tab
    const mentorInfo = document.getElementById('mentor-info');
    if (mentorInfo && mentor) {
        mentorInfo.innerHTML = `
            <h3>About the Mentor</h3>
            <div class="mentor-profile-card">
                <img src="${mentor.avatar_url || 'https://via.placeholder.com/128x128'}" alt="${mentor.full_name || 'Unknown Mentor'}" class="mentor-profile-large-avatar">
                <h4>${mentor.full_name || 'Unknown Mentor'} ${mentor.role === 'mentor' ? '<i class="fas fa-check-circle verified-badge" title="Verified Mentor"></i>' : ''}</h4>
                <p class="mentor-headline">${mentor.headline || 'Experienced Educator'}</p>
                <p class="mentor-bio">${mentor.bio || 'No bio provided.'}</p>
                <div class="mentor-stats">
                    <span><i class="fas fa-book-open"></i> ${mentor.courses_taught || 0} Courses</span>
                    <span><i class="fas fa-users"></i> ${mentor.students_taught || 0} Students</span>
                    <span><i class="fas fa-star"></i> ${mentor.average_rating || 'N/A'} Rating</span>
                </div>
                <div class="mentor-languages">
                    <h5>Languages:</h5>
                    <p>${mentor.languages_taught?.join(', ') || 'Not specified'}</p>
                </div>
                <div class="mentor-contact">
                    <button class="btn btn-secondary"><i class="fas fa-envelope"></i> Message Mentor</button>
                    <a href="#" class="btn btn-secondary"><i class="fas fa-user-circle"></i> View Full Profile</a>
                </div>
            </div>
        `;
        console.log('course-detail.js: Mentor tab updated.');
    }

    // Tab navigation logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tab)?.classList.add('active');
        });
    });
    console.log('course-detail.js: Tab navigation listeners added.');
}

function getStarRatingHtml(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < (5 - fullStars - (halfStar ? 1 : 0)); i++) {
        starsHtml += '<i class="far fa-star"></i>'; // Empty star
    }
    return starsHtml;
}

// Enrollment Modal Logic
const enrollmentModalOverlay = document.getElementById('enrollmentModalOverlay');
const closeEnrollmentModalBtn = document.getElementById('closeEnrollmentModal');
const confirmEnrollmentBtn = document.getElementById('confirmEnrollmentBtn');

closeEnrollmentModalBtn?.addEventListener('click', () => {
    enrollmentModalOverlay?.classList.remove('active');
    console.log('course-detail.js: Enrollment modal closed via close button.');
});

enrollmentModalOverlay?.addEventListener('click', (e) => {
    if (e.target === enrollmentModalOverlay) {
        enrollmentModalOverlay?.classList.remove('active');
        console.log('course-detail.js: Enrollment modal closed via overlay click.');
    }
});

function showEnrollmentModal(course, mentor) {
    console.log('course-detail.js: Showing enrollment modal for course:', course.title);
    const enrollmentCourseInfo = document.getElementById('enrollment-course-info');
    const enrollmentDetails = document.getElementById('enrollment-details');
    const enrollmentPrice = document.getElementById('enrollmentPrice');

    // Reset modal state - FIX: Check for element existence before assignment
    const enrollmentStep = document.getElementById('enrollmentStep');
    if (enrollmentStep) enrollmentStep.style.display = 'block';
    const enrollmentSuccess = document.getElementById('enrollmentSuccess');
    if (enrollmentSuccess) enrollmentSuccess.style.display = 'none';
    const enrollmentFooter = document.getElementById('enrollment-footer');
    if (enrollmentFooter) enrollmentFooter.style.display = 'flex'; // Show footer actions

    if (enrollmentCourseInfo) {
        enrollmentCourseInfo.innerHTML = `
            <img src="${course.course_image_url || 'https://via.placeholder.com/64x64'}" alt="${course.title || 'Course'}" class="mentor-summary-avatar">
            <div class="mentor-summary-details">
                <h4>${course.title || 'N/A'}</h4>
                <p>${mentor?.full_name || 'Unknown Mentor'}</p>
                <div class="rating-stars">${getStarRatingHtml(course.average_rating || 0)}</div>
            </div>
        `;
    }

    if (enrollmentDetails) {
        enrollmentDetails.innerHTML = `
            <p>You are about to enroll in <strong>${course.title || 'this course'}</strong> by <strong>${mentor?.full_name || 'Unknown Mentor'}</strong>.</p>
            <p>This course costs <strong>${course.price_per_session || 'N/A'} coins</strong> per session.</p>
            <p>Upon enrollment, you will gain access to all course materials and be able to schedule your first session.</p>
            <div class="form-group">
                <label for="session-count">Number of sessions:</label>
                <input type="number" id="session-count" value="1" min="1" max="10" style="width: 80px; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;">
            </div>
            <p>Total cost will be calculated based on sessions selected.</p>
        `;
        const sessionCountInput = document.getElementById('session-count');
        if (sessionCountInput) {
            sessionCountInput.addEventListener('input', () => {
                const count = parseInt(sessionCountInput.value) || 1;
                const total = count * (course.price_per_session || 0);
                if (enrollmentPrice) enrollmentPrice.textContent = `🪙 ${total}`;
            });
        }
    }

    if (enrollmentPrice) enrollmentPrice.textContent = `🪙 ${course.price_per_session || 0}`; // Initial price for 1 session

    enrollmentModalOverlay?.classList.add('active');
}

confirmEnrollmentBtn?.addEventListener('click', async () => {
    console.log('course-detail.js: Confirm Enrollment button clicked.');
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
        showNotification('Please log in to enroll in courses.', 'info');
        showAuthModal();
        return;
    }

    const sessionCountInput = document.getElementById('session-count');
    const numberOfSessions = parseInt(sessionCountInput?.value) || 1;
    const courseId = new URLSearchParams(window.location.search).get('id');
    const course = await localDb.get('courses', courseId);

    if (!course) {
        showNotification('Course data not found for enrollment.', 'error');
        console.error('course-detail.js: Course data not found for enrollment for ID:', courseId);
        return;
    }

    const totalCost = numberOfSessions * (course.price_per_session || 0);

    if (currentUser.excel_coin_balance < totalCost) {
        showNotification('Insufficient coins. Please buy more coins.', 'error');
        console.warn('course-detail.js: Insufficient coins for user:', currentUser.id, 'Balance:', currentUser.excel_coin_balance, 'Cost:', totalCost);
        // Optionally redirect to pricing page or show buy coins modal
        return;
    }

    try {
        // Deduct coins
        await AuthService.updateCoinBalance(currentUser.id, -totalCost, 'Session Payment', `Enrollment in ${course.title} (${numberOfSessions} sessions)`);
        console.log('course-detail.js: Coins deducted successfully.');

        // Add course to user's enrolled courses (if not already there)
        let user = await localDb.getUser(currentUser.id);
        if (!user.enrolled_courses) {
            user.enrolled_courses = [];
        }
        const existingEnrollment = user.enrolled_courses.find(ec => ec.course_id === course.id);
        if (existingEnrollment) {
            existingEnrollment.sessions_booked = (existingEnrollment.sessions_booked || 0) + numberOfSessions;
            existingEnrollment.last_enrolled_at = new Date().toISOString();
            console.log('course-detail.js: Existing enrollment updated.');
        } else {
            user.enrolled_courses.push({
                course_id: course.id,
                enrolled_at: new Date().toISOString(),
                sessions_booked: numberOfSessions,
                status: 'active'
            });
            console.log('course-detail.js: New enrollment added.');
        }
        await localDb.updateUser(user.id, { enrolled_courses: user.enrolled_courses });
        AuthService.updateCurrentUser(user); // Update local storage

        showNotification('Enrollment successful!', 'success');
        // FIX: Check for element existence before assignment
        const enrollmentStep = document.getElementById('enrollmentStep');
        if (enrollmentStep) enrollmentStep.style.display = 'none';
        const enrollmentSuccess = document.getElementById('enrollmentSuccess');
        if (enrollmentSuccess) enrollmentSuccess.style.display = 'block';
        const enrollmentFooter = document.getElementById('enrollment-footer');
        if (enrollmentFooter) enrollmentFooter.style.display = 'none'; // Hide footer actions
        AuthService.updateUIForAuth(); // Update coin balance in navbar
        console.log('course-detail.js: Enrollment process completed successfully.');
    } catch (error) {
        console.error('course-detail.js: Enrollment failed:', error);
        showNotification('Enrollment failed. Please try again.', 'error');
    }
});
