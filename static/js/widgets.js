/**
 * Widgets and interactive functionality for Seth Robles' portfolio
 */

// Strava Widget
class StravaWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiBase = null; // Will be set from environment
        this.init();
    }

    async init() {
        if (!this.container) return;

        try {
            // Check if Strava API is configured
            const response = await fetch('/api/strava/latest?per_page=5');
            if (response.ok) {
                const data = await response.json();
                this.renderActivities(data.activities);
            } else {
                this.renderPlaceholder();
            }
        } catch (error) {
            console.log('Strava widget not configured, showing placeholder');
            this.renderPlaceholder();
        }
    }

    renderActivities(activities) {
        if (!activities || activities.length === 0) {
            this.renderPlaceholder();
            return;
        }

        const html = `
            <div class="strava-activities">
                <div class="activities-header">
                    <h4>Recent Activities</h4>
                    <a href="https://strava.com/athletes/sethrobles" target="_blank" rel="noopener noreferrer" class="strava-link">
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
        const date = new Date(activity.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="activity-item">
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-details">
                    <div class="activity-name">${activity.name}</div>
                    <div class="activity-stats">
                        <span class="activity-distance">${activity.distance}</span>
                        <span class="activity-duration">${activity.duration}</span>
                    </div>
                </div>
                <div class="activity-date">${date}</div>
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
            'Workout': '💪'
        };

        return icons[type] || '🏃‍♂️';
    }

    renderPlaceholder() {
        // Do nothing: placeholder removed so only embedded widget shows
        this.container.innerHTML = '';
    }
}

// Goodreads Widget
class GoodreadsWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        if (!this.container) return;

        this.renderPlaceholder();
    }

    renderPlaceholder() {
        // Do nothing: placeholder removed so only embedded widget shows
        this.container.innerHTML = '';
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

    .strava-activities {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1rem;
    }

    .activities-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .activities-header h4 {
        margin: 0;
        color: var(--text-primary);
    }

    .strava-link {
        font-size: 0.875rem;
        color: var(--accent);
    }

    .activities-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .activity-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: var(--bg-primary);
        border-radius: 6px;
        border: 1px solid var(--border);
    }

    .activity-icon {
        font-size: 1.5rem;
    }

    .activity-details {
        flex: 1;
    }

    .activity-name {
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
    }

    .activity-stats {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .activity-date {
        font-size: 0.875rem;
        color: var(--text-muted);
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
