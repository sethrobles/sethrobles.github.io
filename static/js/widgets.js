/**
 * Widgets and interactive functionality for Seth Robles' portfolio
 */

// Social usernames (loaded from window.socialUsernames set in base.html)
let socialUsernames = window.socialUsernames || {
    strava: "sethrobles",
    hardcover: "Sethyopolopodis"
};

// Strava Widget
class StravaWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiBase = null; // Will be set from environment
        this.init();
    }

    async init() {
        if (!this.container) return;

        // Show loading state
        this.container.innerHTML = '<div class="strava-loading">Loading activities...</div>';

        try {
            const response = await fetch('/data/strava.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.activities && data.activities.length > 0) {
                this.renderActivities(data.activities);
            } else {
                this.renderEmpty();
            }
        } catch (error) {
            console.log('Error loading Strava data:', error);
            this.renderError();
        }
    }

    renderActivities(activities) {
        if (!activities || activities.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="strava-activities">
                <div class="activities-header">
                    <h4>Recent Activities</h4>
                    <a href="https://strava.com/athletes/${socialUsernames.strava_num}" target="_blank" rel="noopener noreferrer" class="strava-link">
                        View on Strava
                    </a>
                </div>
                <div class="activities-list">
                    ${activities.map(activity => this.renderActivity(activity)).join('')}
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderActivity(activity) {
        const date = this.formatDate(activity.start_date_local);
        const duration = this.formatDuration(activity.moving_time_s);
        const name = this.escapeHtml(activity.name);

        // For workouts, show calories instead of distance
        // For other activities, show distance if > 0
        let primaryStat = '';
        if (activity.type === 'Workout') {
            const calories = activity.calories || 0;
            primaryStat = calories > 0 ? `<span class="activity-calories">${calories} cal</span>` : '';
        } else {
            const distance = this.formatDistance(activity.distance_m);
            primaryStat = activity.distance_m > 0 ? `<span class="activity-distance">${distance}</span>` : '';
        }

        return `
            <div class="activity-item">
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-details">
                    <div class="activity-name">${name}</div>
                    <div class="activity-stats">
                        ${primaryStat}
                        <span class="activity-duration">${duration}</span>
                    </div>
                </div>
                <div class="activity-date">${date}</div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    formatDistance(distanceM) {
        if (distanceM < 1000) {
            return `${Math.round(distanceM)}m`;
        } else {
            const km = distanceM / 1000;
            return km >= 10
                ? `${km.toFixed(1)}km`
                : `${km.toFixed(2)}km`;
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="strava-empty">
                <p>No activities found. Check back soon!</p>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div class="strava-error">
                <p>Unable to load activities. <a href="https://www.strava.com/athletes/${socialUsernames.strava_num}" target="_blank" rel="noopener noreferrer">View on Strava</a></p>
            </div>
        `;
    }

    getActivityIcon(type) {
        const icons = {
            'Run': '🏃‍♂️',
            'Ride': '🚴‍♂️',
            'Walk': '🚶‍♂️',
            'Swim': '🏊‍♂️',
            'Hike': '🥾',
            'Workout': '🏋️',
            'Yoga': '🧘'
        };

        return icons[type] || '🏃‍♂️';
    }

    renderPlaceholder() {
        // Do nothing: placeholder removed so only embedded widget shows
        this.container.innerHTML = '';
    }
}

// Hardcover Widget
class HardcoverWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    async init() {
        if (!this.container) return;

        // Show loading state
        this.container.innerHTML = '<div class="hardcover-loading">Loading books...</div>';

        try {
            const response = await fetch('/data/hardcover.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.books && data.books.length > 0) {
                this.renderBooks(data.books);
            } else {
                this.renderEmpty();
            }
        } catch (error) {
            console.log('Error loading Hardcover data:', error);
            this.renderError();
        }
    }

    renderBooks(books) {
        if (!books || books.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="hardcover-books">
                <div class="books-header">
                    <h4>Recent Books</h4>
                    <a href="https://hardcover.app/@${socialUsernames.hardcover}" target="_blank" rel="noopener noreferrer" class="hardcover-link">
                        View on Hardcover
                    </a>
                </div>
                <div class="books-list">
                    ${books.map(book => this.renderBook(book)).join('')}
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderBook(book) {
        const date = this.formatDate(book.date_read);
        const title = this.escapeHtml(book.title);
        const author = this.escapeHtml(book.author);
        // Use a data URI for a simple book placeholder when no cover is available (50x75 to match CSS)
        const placeholderBook = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNzUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9Ijc1IiBmaWxsPSIjZjVmNWY1Ii8+CiAgPHBhdGggZD0iTTggOEg0MlY2N0g4WiIgZmlsbD0iI2RkZCIvPgogIDxwYXRoIGQ9Ik04IDhWNjdINDJWOFoiIGZpbGw9IiNjY2MiLz4KICA8bGluZSB4MT0iMTIiIHkxPSIxOCIgeDI9IjM4IiB5Mj0iMTgiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICA8bGluZSB4MT0iMTIiIHkxPSIyOCIgeDI9IjM4IiB5Mj0iMjgiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICA8bGluZSB4MT0iMTIiIHkxPSIzOCIgeDI9IjM4IiB5Mj0iMzgiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KPC9zdmc+';
        const coverUrl = book.cover_image_url || placeholderBook;
        const rating = book.rating ? this.renderRating(book.rating) : '';
        const statusBadge = book.status === 'currently-reading' ? '<span class="book-status">Reading</span>' : '';

        return `
            <div class="book-item">
                <div class="book-cover">
                    <img src="${coverUrl}" alt="${title}" onerror="this.src='${placeholderBook}'">
                    ${statusBadge}
                </div>
                <div class="book-details">
                    <div class="book-name">${title}</div>
                    <div class="book-author">${author}</div>
                    <div class="book-meta">
                        ${rating}
                    </div>
                </div>
                <div class="book-date">${date}</div>
            </div>
        `;
    }

    renderRating(rating) {
        if (!rating || rating < 1 || rating > 5) return '';
        const stars = '⭐'.repeat(Math.round(rating));
        return `<span class="book-rating">${stars}</span>`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="hardcover-empty">
                <p>No books found. Check back soon!</p>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div class="hardcover-error">
                <p>Unable to load books. <a href="https://hardcover.app/@${socialUsernames.hardcover}" target="_blank" rel="noopener noreferrer">View on Hardcover</a></p>
            </div>
        `;
    }
}

// Image Lightbox for project detail pages
class ImageLightbox {
    constructor() {
        this.init();
    }

    init() {
        // Add click handlers to project images
        document.addEventListener('click', (e) => {
            if (e.target.matches('.markdown-content img')) {
                this.openLightbox(e.target);
            }
        });

        // Close lightbox on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLightbox();
            }
        });
    }

    openLightbox(img) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <img src="${img.src}" alt="${img.alt}" class="lightbox-image">
                <button class="lightbox-close" aria-label="Close lightbox">×</button>
            </div>
        `;

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        // Add close handlers
        lightbox.addEventListener('click', (e) => {
            if (e.target.classList.contains('lightbox-overlay') ||
                e.target.classList.contains('lightbox-close')) {
                this.closeLightbox();
            }
        });

        // Animate in
        setTimeout(() => lightbox.classList.add('active'), 10);
    }

    closeLightbox() {
        const lightbox = document.querySelector('.lightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(lightbox);
                document.body.style.overflow = '';
            }, 200);
        }
    }
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
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
}

// Initialize all widgets when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Strava widget
    const stravaWidget = new StravaWidget('strava-widget');

    // Initialize Hardcover widget
    const hardcoverWidget = new HardcoverWidget('hardcover-widget');

    // Initialize image lightbox
    const imageLightbox = new ImageLightbox();

    // Initialize smooth scrolling
    initSmoothScrolling();

    // Add loading states
    addLoadingStates();

    // Add intersection observer for animations
    addScrollAnimations();
});

// Add loading states to buttons
function addLoadingStates() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('btn-primary') || this.classList.contains('btn-secondary')) {
                const originalText = this.innerHTML;
                this.innerHTML = `
                    <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                    </svg>
                    Loading...
                `;
                this.disabled = true;

                // Reset after a delay (in real app, this would be after the action completes)
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });
}

// Add scroll animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.card, .hobby-widget, .info-card').forEach(el => {
        observer.observe(el);
    });
}

// Add CSS for lightbox and animations
const additionalStyles = `
    .lightbox {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    .lightbox.active {
        opacity: 1;
    }

    .lightbox-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        cursor: pointer;
    }

    .lightbox-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 90vw;
        max-height: 90vh;
    }

    .lightbox-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
    }

    .lightbox-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .strava-placeholder,
    .goodreads-placeholder {
        text-align: center;
        padding: 1rem;
    }

    .placeholder-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .placeholder-subtitle {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
    }

    .animate-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
