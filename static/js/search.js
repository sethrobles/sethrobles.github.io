// Reusable search and filter logic for blog and project pages
function setupSearchAndFilter({
    searchInputId,
    tagFilterSelector,
    gridId,
    noResultsId,
    cardSelector
}) {
    const searchInput = document.getElementById(searchInputId);
    const tagFilters = document.querySelectorAll(tagFilterSelector);
    const grid = document.getElementById(gridId);
    const noResults = document.getElementById(noResultsId);
    const entryCards = document.querySelectorAll(cardSelector);

    let currentFilter = 'all';
    let currentSearch = '';

    function filterEntries() {
        let visibleCount = 0;

        entryCards.forEach(card => {
            const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            // Split tags by comma, then trim and lowercase each tag
            const tagsAttr = card.getAttribute('data-tags') || '';
            const tagsArr = tagsAttr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            const summary = card.querySelector('.card-summary')?.textContent.toLowerCase() || '';
            // Search in title, tags, and summary
            const matchesSearch = currentSearch === '' || title.includes(currentSearch) || tagsArr.some(tag => tag.includes(currentSearch)) || summary.includes(currentSearch);
            const matchesFilter = currentFilter === 'all' || tagsArr.includes(currentFilter.toLowerCase());

            if (matchesSearch && matchesFilter) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide no results message
        if (visibleCount === 0) {
            noResults.style.display = 'block';
            grid.style.display = 'none';
        } else {
            noResults.style.display = 'none';
            grid.style.display = 'grid';
        }
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            filterEntries();
        });
    }

    // Tag filtering
    tagFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Update active state
            tagFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');

            // Update filter
            currentFilter = filter.getAttribute('data-tag');
            filterEntries();
        });
    });
}
