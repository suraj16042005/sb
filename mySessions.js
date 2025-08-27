import { AuthService } from './auth.js';
import { localDb } from './localDb.js';
import { showNotification } from './script.js'; // Import showNotification from script.js

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
        // Redirect to login or show a message if not logged in
        window.location.href = '/index.html'; // Or showAuthModal()
        return;
    }

    // Update sidebar profile summary
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserRole = document.getElementById('sidebar-user-role');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    const mentorApplicationsLink = document.getElementById('mentor-applications-link');
    const manageCoursesLink = document.getElementById('manage-courses-link');
    const earningsLink = document.getElementById('earnings-link');

    if (sidebarUserName) sidebarUserName.textContent = currentUser.full_name || currentUser.username;
    if (sidebarUserRole) sidebarUserRole.textContent = currentUser.role === 'mentor' ? 'Mentor' : (currentUser.role === 'admin' ? 'Admin' : 'Student');
    if (sidebarUserAvatar) sidebarUserAvatar.src = currentUser.avatar_url || 'https://via.placeholder.com/80x80';

    // Show/hide mentor-specific links
    if (currentUser.role === 'mentor' || currentUser.role === 'admin') {
        if (manageCoursesLink) manageCoursesLink.style.display = 'flex';
        if (earningsLink) earningsLink.style.display = 'flex';
    } else {
        if (manageCoursesLink) manageCoursesLink.style.display = 'none';
        if (earningsLink) earningsLink.style.display = 'none';
    }

    // Show admin-specific links
    if (currentUser.role === 'admin') {
        if (mentorApplicationsLink) mentorApplicationsLink.style.display = 'flex';
    } else {
        if (mentorApplicationsLink) mentorApplicationsLink.style.display = 'none';
    }

    // Highlight current nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Render Wishlist
    await renderWishlist(currentUser.id);
});

async function renderWishlist(userId) {
    const wishlistCoursesGrid = document.getElementById('wishlist-courses-grid');
    const noWishlistCoursesMessage = document.getElementById('no-wishlist-courses');

    if (!wishlistCoursesGrid || !noWishlistCoursesMessage) return;

    wishlistCoursesGrid.innerHTML = ''; // Clear previous content
    noWishlistCoursesMessage.style.display = 'none'; // Hide empty state by default

    try {
        const user = await localDb.getUser(userId);
        if (!user || !user.favorites || user.favorites.length === 0) {
            noWishlistCoursesMessage.style.display = 'block';
            return;
        }

        const allCourses = await localDb.getCourses();
        const users = await localDb.getUsers(); // To get mentor details

        const favoritedCourses = user.favorites.map(favCourseId => {
            const course = allCourses.find(c => c.id === favCourseId);
            if (course) {
                const mentor = users.find(u => u.id === course.mentor_id);
                return {
                    ...course,
                    mentor_name: mentor ? mentor.full_name : 'Unknown Mentor',
                    mentor_avatar_url: mentor ? mentor.avatar_url : 'https://via.placeholder.com/32x32',
                };
            }
            return null;
        }).filter(Boolean); // Remove any nulls if course not found

        if (favoritedCourses.length === 0) {
            noWishlistCoursesMessage.style.display = 'block';
            return;
        }

        favoritedCourses.forEach(course => {
            const card = document.createElement('div');
            card.classList.add('course-card');
            card.classList.add('favorited'); // Always favorited in wishlist

            const languagesHtml = course.languages_taught?.map(lang => `
                <img src="${getFlagIcon(lang)}" alt="${lang} flag" title="${lang}">
            `).join('') || '';

            const tagsHtml = course.tags?.slice(0, 3).map(tag => `<span class="subject-tag">${tag}</span>`).join('') || '';

            card.innerHTML = `
                <div class="course-header">
                    <div class="course-image">
                        <img src="${course.course_image_url}" alt="${course.title}" loading="lazy">
                    </div>
                    <span class="difficulty-badge ${course.difficulty_level}">${course.difficulty_level}</span>
                </div>
                <div class="course-content">
                    <h3 class="course-title">${course.title}</h3>
                    <p class="course-headline">${course.short_description}</p>
                    <div class="mentor-info">
                        <img src="${course.mentor_avatar_url}" alt="${course.mentor_name}" class="mentor-avatar-small">
                        <span class="mentor-name">${course.mentor_name}</span>
                    </div>
                    <div class="course-stats">
                        <div class="course-rating">
                            <span class="stars">${getStarRatingHtml(course.average_rating)}</span>
                            <span class="rating-text">${course.average_rating} (${course.total_reviews} reviews)</span>
                        </div>
                    </div>
                    <div class="languages-offered">
                        ${languagesHtml}
                    </div>
                    <div class="price-section">
                        <span class="coin-price">₹${course.price_per_session} <i class="fas fa-coins"></i></span>
                        ${course.is_available_now ? '<span class="available-now"><span class="dot"></span> Available Now</span>' : ''}
                    </div>
                    <div class="subject-tags">
                        ${tagsHtml}
                    </div>
                    <div class="course-actions">
                        <button class="btn btn-primary preview-btn">Preview</button>
                        <button class="favorite-btn" data-course-id="${course.id}"><i class="fas fa-heart"></i></button>
                    </div>
                </div>
            `;
            wishlistCoursesGrid.appendChild(card);
        });

        // Add event listeners for favorite buttons (to unfavorite from wishlist)
        document.querySelectorAll('#wishlist-courses-grid .favorite-btn').forEach(button => {
            button.onclick = async (e) => {
                e.stopPropagation();
                const courseId = button.dataset.courseId;
                const currentUser = AuthService.getCurrentUser();
                if (!currentUser) {
                    showNotification('Please log in to manage favorites.', 'info');
                    return;
                }

                let user = await localDb.getUser(currentUser.id);
                if (!user) return;

                let favorites = new Set(user.favorites || []);
                favorites.delete(courseId); // Always remove from wishlist

                user.favorites = Array.from(favorites);
                await localDb.updateUser(user.id, { favorites: user.favorites });
                AuthService.setCurrentUser(user); // Update local storage
                showNotification('Course removed from wishlist.', 'info');
                renderWishlist(currentUser.id); // Re-render wishlist
            };
        });

    } catch (error) {
        console.error('Failed to render wishlist:', error);
        showNotification('Failed to load wishlist. Please try again.', 'error');
        noWishlistCoursesMessage.style.display = 'block';
    }
}

// Utility functions (copied from script.js for self-containment or imported if preferred)
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

function getFlagIcon(language) {
    const flags = {
        english: 'gb',
        hindi: 'in',
        marathi: 'in',
        tamil: 'in',
        telugu: 'in',
        bengali: 'in',
        gujarati: 'in',
    };
    const flagCode = flags[language.toLowerCase()] || 'us';
    return `https://flagcdn.com/w20/${flagCode}.png`;
}
