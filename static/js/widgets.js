/**
 * Widgets and interactive functionality for Seth Robles' portfolio
 */

// Social usernames (loaded from window.socialUsernames set in base.html)
let socialUsernames = window.socialUsernames || {
    strava: "sethrobles",
    hardcover: "Sethyopolopodis"
};

// Fitness Widget — rotating highlight tiles (Garmin stats + hand-written jokes)
// from data/garmin.json (auto) + data/highlights.json (jokes). Shows up to 6
// tiles chosen by a date-seeded shuffle, so the set is stable all day and
// rotates once a day. No recent list. Links to Strava.
class FitnessWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) this.init();
    }

    async init() {
        this.container.innerHTML = '<div class="fitness-loading">Loading highlights...</div>';
        try {
            const [garmin, highlights] = await Promise.all([
                this.fetchJson('/data/garmin.json'),
                this.fetchJson('/data/highlights.json'),
            ]);
            const auto = (garmin && garmin.highlights) || [];
            const jokes = (highlights && highlights.items) || [];
            const tiles = this.pickDaily(auto, jokes, 6, 1);
            if (!tiles.length) { this.renderEmpty(); return; }
            this.render(tiles);
        } catch (e) {
            console.log('Error loading fitness data:', e);
            this.renderError();
        }
    }

    async fetchJson(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    // Deterministic per-day pick: up to `total` tiles, aiming for `jokeTarget`
    // jokes, backfilling from whichever pool has more so it never comes up short.
    pickDaily(auto, jokes, total, jokeTarget) {
        const seed = this.daySeed();
        const a = this.shuffle(auto.slice(), seed);
        const j = this.shuffle(jokes.slice(), (seed ^ 0x9e3779b9) >>> 0);
        const nJoke = Math.min(jokeTarget, j.length, total);
        const nAuto = Math.min(total - nJoke, a.length);
        let chosen = a.slice(0, nAuto).concat(j.slice(0, nJoke));
        if (chosen.length < total) {
            const extra = a.slice(nAuto).concat(j.slice(nJoke));
            chosen = chosen.concat(extra.slice(0, total - chosen.length));
        }
        // final shuffle so auto/joke tiles aren't clustered together
        return this.shuffle(chosen, (seed ^ 0x85ebca6b) >>> 0);
    }

    daySeed() {
        const d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    // Seeded Fisher–Yates (small LCG) — same seed => same order.
    shuffle(arr, seed) {
        let s = (seed >>> 0) || 1;
        const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        for (let i = arr.length - 1; i > 0; i--) {
            const k = Math.floor(rnd() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[k]; arr[k] = tmp;
        }
        return arr;
    }

    stravaUrl() {
        const num = (window.socialUsernames && socialUsernames.strava_num) || '';
        return 'https://www.strava.com/athletes/' + num;
    }

    render(tiles) {
        this.container.innerHTML = `
            <div class="fitness-highlights">
                <div class="activities-header">
                    <h4>Highlights</h4>
                    <a href="${this.stravaUrl()}" target="_blank" rel="noopener noreferrer" class="fitness-link">View on Strava</a>
                </div>
                <div class="fitness-list">
                    ${tiles.map(t => this.renderTile(t)).join('')}
                </div>
            </div>
        `;
    }

    // Thin stat row mirroring the Reading widget's book rows: label on the left
    // (like a title); value + comment stacked on the right like the book's date
    // + rating. Icons omitted for now — getIcon() below still holds the glyphs.
    renderTile(tile) {
        const label = this.escapeHtml(tile.label || '');
        const value = this.escapeHtml(tile.value != null ? String(tile.value) : '');
        const comment = tile.detail
            ? `<span class="fitness-comment">${this.escapeHtml(tile.detail)}</span>`
            : '';
        return `
            <div class="fitness-row">
                <div class="fitness-details">
                    <div class="fitness-stat">${label}</div>
                </div>
                <div class="fitness-aside">
                    <span class="fitness-value">${value}</span>
                    ${comment}
                </div>
            </div>
        `;
    }

    getIcon(name) {
        const glyphs = {
            dumbbell: '<path d="M5 7v10M8 9v6M8 12h8M16 9v6M19 7v10"/>',
            pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
            run: '<circle cx="13" cy="4" r="1.6"/><path d="M4 20l3-4 3 1 1-4-3-2 4-3 3 4h3"/>',
            calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
            swim: '<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5S16 18 18 18s2-1.5 4-1.5"/><circle cx="8" cy="7" r="1.6"/><path d="M9.5 8.5l4 2.5-3 2"/>',
            food: '<path d="M6 3v8a2 2 0 004 0V3M8 11v10M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9"/>',
            trophy: '<path d="M8 4h8v4a4 4 0 01-8 0V4zM6 5H4v1a3 3 0 003 3M18 5h2v1a3 3 0 01-3 3M9 16h6M10 20h4M12 16v4"/>',
            star: '<polygon points="12 3 14.5 9 21 9.5 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.5 9.5 9"/>',
        };
        const inner = glyphs[name] || glyphs.pulse;
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    renderEmpty() {
        this.container.innerHTML = '<div class="fitness-empty"><p>No highlights yet.</p></div>';
    }

    renderError() {
        this.container.innerHTML = `<div class="fitness-error"><p>Unable to load highlights. <a href="${this.stravaUrl()}" target="_blank" rel="noopener noreferrer">View on Strava</a></p></div>`;
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
                    <h4>Recently read</h4>
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
        const title = this.escapeHtml(book.title);
        const author = this.escapeHtml(book.author);
        const reading = book.status === 'currently-reading';

        // Right-hand column: either a "currently reading" note, or the date read
        // plus a numeric rating when one exists.
        let aside;
        if (reading) {
            aside = '<span class="book-reading">Currently reading</span>';
        } else {
            const date = book.date_read ? `<span class="book-date">${this.formatDate(book.date_read)}</span>` : '';
            aside = `${date}${this.renderRating(book.rating)}`;
        }

        return `
            <div class="book-item${reading ? ' reading' : ''}">
                <div class="book-details">
                    <div class="book-name">${title}</div>
                    <div class="book-author">${author}</div>
                </div>
                <div class="book-aside">${aside}</div>
            </div>
        `;
    }

    renderRating(rating) {
        if (!rating || rating < 1 || rating > 5) return '';
        const val = Number.isInteger(rating) ? rating : rating.toFixed(1);
        return `<span class="book-rating">${val}<span class="book-rating-max"> / 5</span></span>`;
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
                <p>No books yet.</p>
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

// Initialize widgets once the DOM is parsed.
document.addEventListener('DOMContentLoaded', function () {
    new FitnessWidget('fitness-widget');
    new HardcoverWidget('hardcover-widget');
    new ImageLightbox();
});
