// Global variables
let vachanamrutData = [];
let videoData = [];
let sections = [];
let currentSection = null;
let bookmarkedVachanamrutId = localStorage.getItem('bookmarkedVachanamrutId');
let favourites = JSON.parse(localStorage.getItem('favourites')) || [];

// DOM elements
const sectionsScreen = document.getElementById('home-screen');
const vachanamrutDetailScreen = document.getElementById('vachanamrut-detail-screen');
const menuScreen = document.getElementById('menu-screen');
const sectionsList = document.getElementById('sections-list');
const vachanamrutCard = document.getElementById('vachanamrut-card');
const vachanamrutTitle = document.getElementById('vachanamrut-title');
const vachanamrutVideo = document.getElementById('vachanamrut-video');
const vachanamrutSetting = document.getElementById('vachanamrut-setting');
const vachanamrutText = document.getElementById('vachanamrut-text');
const vachanamrutFooterText = document.getElementById('vachanamrut-footer-text');
const backBtn = document.getElementById('back-btn');
let bookmarkBtn = document.getElementById('bookmark-btn');
const fabBtn = document.getElementById('fab-btn');
const footer = document.getElementById('footer');

// ... (init function remains same)

// Show vachanamrut detail
function showVachanamrut(vachanamrut, pushState = true) {
    // Ensure ID is a number
    const safeId = parseInt(vachanamrut.id);


    // Update URL
    if (pushState) {
        // Clean URL: remove index.html if present
        const cleanPath = window.location.pathname.replace('index.html', '');
        const newUrl = `${cleanPath}?id=${safeId}`;
        window.history.pushState({ vachanamrutId: safeId }, '', newUrl);
    }

    // Clean number and title
    const cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();
    const cleanTitle = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';

    // Check if favourite
    const isFav = favourites.includes(safeId);
    const heartIconClass = isFav ? 'fas' : 'far';

    // Set title with both number and name AND share button AND heart button
    vachanamrutTitle.innerHTML = `
        <div class="title-container">
            <button id="heart-btn" class="icon-btn heart-btn" aria-label="Favourite">
                <i class="${heartIconClass} fa-heart"></i>
            </button>
            <div class="title-content">
                <span class="v-number">${cleanNumber}</span><br>
                <span class="v-title-text">${cleanTitle}</span>
            </div>
            <button id="share-btn" class="icon-btn" aria-label="Share">
                <i class="fas fa-share-alt"></i>
            </button>
        </div>
    `;

    // Setup heart button
    document.getElementById('heart-btn').addEventListener('click', () => {
        toggleFavourite(safeId);
    });

    // Setup share button
    const shareBtn = document.getElementById('share-btn');
    shareBtn.addEventListener('click', async () => {
        // Generate clean share URL
        const cleanPath = window.location.pathname.replace('index.html', '');
        const shareUrl = `${window.location.origin}${cleanPath}?id=${safeId}`;

        const shareData = {
            title: `Vachanamrut ${cleanNumber}`,
            text: `${cleanNumber} - ${cleanTitle}`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {

            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                // Show toast or feedback
                const originalIcon = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    shareBtn.innerHTML = originalIcon;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    });

    // Video embed
    vachanamrutVideo.innerHTML = '';
    if (vachanamrut.id) {
        const video = videoData.find(v => v.number === vachanamrut.id);
        if (video && video.videoId) {
            vachanamrutVideo.innerHTML = `
                <div class="video-container">
                    <iframe 
                        src="https://www.youtube.com/embed/${video.videoId}" 
                        title="${video.title}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        }
    }

    // Clean and format setting
    const setting = vachanamrut.setting ? vachanamrut.setting.replace(/\n/g, ' ').trim() : '';
    vachanamrutSetting.textContent = setting;

    // Clean and format text
    const text = vachanamrut.text ? vachanamrut.text.replace(/\n/g, '\n\n').trim() : '';
    vachanamrutText.innerHTML = text.split('\n\n').map(paragraph =>
        paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
    ).join('');

    // Set footer text
    const cleanVachanamrutName = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();
    vachanamrutFooterText.textContent = `॥ ઇતિ વચનામૃતમ્ ${cleanVachanamrutName} ॥`;

    showScreen('vachanamrut-detail-screen');
    backBtn.style.display = 'block';
    bookmarkBtn.style.display = 'block';
    fabBtn.style.display = 'none'; // Hide FAB in detail view

    // Update bookmark button state
    updateBookmarkButtonState(vachanamrut.id);

    // Setup bookmark click listener (remove old listeners to prevent duplicates)
    const newBookmarkBtn = bookmarkBtn.cloneNode(true);
    bookmarkBtn.parentNode.replaceChild(newBookmarkBtn, bookmarkBtn);
    bookmarkBtn = newBookmarkBtn; // Update global reference

    // Add event listener
    bookmarkBtn.addEventListener('click', () => {
        toggleBookmark(vachanamrut.id);
    });
}

// Initialize app
async function init() {
    try {
        // Load all data
        await Promise.all([
            loadVachanamrutData(),
            loadVideoData(),
            loadChapterMappings()
        ]);

        // Process sections from data
        processSections();

        // Render sections
        renderSections();

        // Setup navigation
        setupNavigation();

        // Setup Menu
        setupMenu();

        // Capture deep link ID
        const urlParams = new URLSearchParams(window.location.search);
        let deepLinkId = urlParams.get('id');

        // Fallback: Check hash (e.g., #id=127 or #127)
        if (!deepLinkId && window.location.hash) {
            const hash = window.location.hash.substring(1); // Remove #
            if (hash.startsWith('id=')) {
                deepLinkId = hash.split('=')[1];
            } else if (!isNaN(parseInt(hash))) {
                deepLinkId = hash;
            }
        }


        // Initial screen setup
        if (deepLinkId) {
            const vachanamrut = vachanamrutData.find(v => v.id === parseInt(deepLinkId));
            if (vachanamrut) {
                showVachanamrut(vachanamrut, true); // Push state to restore URL after showScreen cleared it
            } else {
                showScreen('home-screen'); // Invalid ID, go home
            }
        } else {
            showScreen('home-screen');
            // Auto-scroll to bookmark if exists
            if (bookmarkedVachanamrutId) {
                scrollToBookmark();
            }
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.vachanamrutId) {
                const vachanamrut = vachanamrutData.find(v => v.id === event.state.vachanamrutId);
                if (vachanamrut) {
                    showVachanamrut(vachanamrut, false);
                }
            } else {
                showScreen('home-screen', false);
            }
        });

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('main-content').innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// Load all vachanamrut data
async function loadVachanamrutData() {
    const promises = [];

    // Load files from 1 to 262 (approximate total count)
    for (let i = 1; i <= 262; i++) {
        promises.push(
            fetch(`./assets/data/vachanamrut-${i}.json`)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    return null;
                })
                .then(data => {
                    if (data) {
                        data.id = i; // Assign ID based on file number
                        return data;
                    }
                    return null;
                })
                .catch(() => null)
        );
    }

    const results = await Promise.all(promises);
    vachanamrutData = results.filter(data => data !== null);
}

// Load video data
async function loadVideoData() {
    try {
        const response = await fetch('./assets/youtube_videos.json');
        if (response.ok) {
            videoData = await response.json();

        }
    } catch (error) {
        console.error('Error loading video data:', error);
    }
}

// Load chapter mappings
async function loadChapterMappings() {
    try {
        const response = await fetch('./assets/chapter-mappings.json');
        if (response.ok) {
            sections = await response.json();

        }
    } catch (error) {
        console.error('Error loading chapter mappings:', error);
    }
}

// Process sections from loaded data
// Process sections from loaded data
function processSections() {
    // Map vachanamruts to sections based on the loaded mappings
    sections.forEach(section => {
        // The section.vachanamruts currently holds IDs from the JSON
        // We need to check if it's an array of numbers (IDs) or already objects (if re-run)
        if (Array.isArray(section.vachanamruts) && section.vachanamruts.length > 0 && typeof section.vachanamruts[0] === 'number') {
            const ids = section.vachanamruts;

            // Map IDs to actual Vachanamrut objects
            const vachanamrutObjects = ids.map(id => vachanamrutData.find(v => v.id === id)).filter(v => v !== undefined);

            // Update the section with objects and count
            section.vachanamruts = vachanamrutObjects;
            section.count = vachanamrutObjects.length;
        } else if (Array.isArray(section.vachanamruts) && section.vachanamruts.length === 0) {
            // Empty section or already processed but empty
            section.count = 0;
        }
    });


}

// Render sections (landing page)
function renderSections() {
    sectionsList.innerHTML = '';

    sections.forEach(section => {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'section-wrapper';

        // Create Header Card
        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
            <div class="section-header">
                <h3 class="section-name">${section.name}</h3>
                <span class="section-count">(${section.count})</span>
            </div>
            <i class="fas fa-chevron-right section-icon"></i>
        `;

        // Create Dropdown Container
        const dropdown = document.createElement('div');
        dropdown.className = 'vachanamruts-dropdown';
        dropdown.id = `dropdown-${section.name.replace(/\s+/g, '-')}`;

        // Toggle Event
        card.addEventListener('click', () => {
            const isActive = card.classList.contains('active');

            // Close all other sections (Accordion behavior)
            document.querySelectorAll('.section-card').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.vachanamruts-dropdown').forEach(d => d.classList.remove('active'));

            if (!isActive) {
                card.classList.add('active');
                dropdown.classList.add('active');

                // Populate if empty
                if (dropdown.children.length === 0) {
                    renderVachanamruts(section, dropdown);
                }
            }
        });

        wrapper.appendChild(card);
        wrapper.appendChild(dropdown);
        sectionsList.appendChild(wrapper);
    });
}

// Render Vachanamruts inside dropdown
function renderVachanamruts(section, container) {
    section.vachanamruts.forEach(vachanamrut => {
        const item = document.createElement('div');
        item.className = 'vachanamrut-item';
        item.dataset.id = vachanamrut.id; // Add ID for scrolling

        // Clean title
        const title = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';
        const cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();

        item.innerHTML = `
            <span class="vachanamrut-number">${cleanNumber}</span>
            <span class="vachanamrut-title">${title}</span>
        `;

        // Add bookmark indicator if matches
        if (bookmarkedVachanamrutId && parseInt(bookmarkedVachanamrutId) === vachanamrut.id) {
            const indicator = document.createElement('i');
            indicator.className = 'fas fa-bookmark bookmark-indicator';
            item.insertBefore(indicator, item.firstChild);
        }

        item.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling to section card
            showVachanamrut(vachanamrut);
        });
        container.appendChild(item);
    });
}

// Show section vachanamruts - DEPRECATED/REMOVED
function showSection(section) {
    // No longer needed
}

// Toggle bookmark
function toggleBookmark(id) {
    if (bookmarkedVachanamrutId && parseInt(bookmarkedVachanamrutId) === id) {
        // Remove bookmark
        bookmarkedVachanamrutId = null;
        localStorage.removeItem('bookmarkedVachanamrutId');
    } else {
        // Set bookmark
        bookmarkedVachanamrutId = id;
        localStorage.setItem('bookmarkedVachanamrutId', id);
    }
    updateBookmarkButtonState(id);
    renderSections(); // Re-render to update indicators
}

// Toggle Favourite
function toggleFavourite(id) {
    const index = favourites.indexOf(id);
    if (index === -1) {
        favourites.push(id);
    } else {
        favourites.splice(index, 1);
    }
    localStorage.setItem('favourites', JSON.stringify(favourites));

    // Update UI
    const btn = document.getElementById('heart-btn');
    if (btn) {
        const isFav = favourites.includes(id);
        btn.innerHTML = `<i class="${isFav ? 'fas' : 'far'} fa-heart"></i>`;
    }

    // Refresh list if open
    if (menuScreen.classList.contains('active')) {
        renderFavourites();
    }
}

// Update bookmark button icon
function updateBookmarkButtonState(currentId) {
    const btn = document.getElementById('bookmark-btn');
    if (bookmarkedVachanamrutId && parseInt(bookmarkedVachanamrutId) === currentId) {
        btn.innerHTML = '<i class="fas fa-bookmark"></i>'; // Solid icon
    } else {
        btn.innerHTML = '<i class="far fa-bookmark"></i>'; // Regular icon
    }
}

// Scroll to bookmark
function scrollToBookmark() {
    // Find section containing the bookmarked ID
    const section = sections.find(s => s.vachanamruts.some(v => v.id === parseInt(bookmarkedVachanamrutId)));

    if (section) {
        // Find the dropdown and card for this section
        const dropdown = document.getElementById(`dropdown-${section.name.replace(/\s+/g, '-')}`);
        const card = dropdown.previousElementSibling; // The section card

        if (card && dropdown) {
            // Expand the section
            card.classList.add('active');
            dropdown.classList.add('active');

            // Render items if not already rendered
            if (dropdown.children.length === 0) {
                renderVachanamruts(section, dropdown);
            }

            // Find the specific item and scroll to it
            // Need a small timeout to allow rendering/expansion
            setTimeout(() => {
                const item = Array.from(dropdown.children).find(child =>
                    parseInt(child.dataset.id) === parseInt(bookmarkedVachanamrutId)
                );

                if (item) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: Add a highlight effect
                    item.style.background = 'rgba(255, 215, 0, 0.3)';
                    setTimeout(() => {
                        item.style.background = '';
                    }, 2000);
                }
            }, 300);
        }
    }
}

// Render Favourites List
function renderFavourites() {
    const list = document.getElementById('favourites-list');
    const msg = document.getElementById('no-favourites-msg');

    list.innerHTML = '';

    if (favourites.length === 0) {
        msg.style.display = 'block';
        return;
    }

    msg.style.display = 'none';

    favourites.forEach(id => {
        const vachanamrut = vachanamrutData.find(v => v.id === id);
        if (vachanamrut) {
            const card = document.createElement('div');
            card.className = 'fav-card';

            const cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();
            const cleanTitle = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';

            card.innerHTML = `
                <div class="fav-number">${cleanNumber}</div>
                <div class="fav-title">${cleanTitle}</div>
            `;

            card.addEventListener('click', () => {
                showVachanamrut(vachanamrut);
            });

            list.appendChild(card);
        }
    });
}

// Setup Menu Logic
function setupMenu() {
    // FAB Click
    fabBtn.addEventListener('click', () => {
        showScreen('menu-screen');
        renderFavourites();
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active class
            tab.classList.add('active');
            const targetId = `${tab.dataset.tab}-content`;
            document.getElementById(targetId).classList.add('active');

            if (tab.dataset.tab === 'favourites') {
                renderFavourites();
            }
        });
    });

    // Reset App Button
    document.getElementById('reset-app-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the app? This will delete all bookmarks and favourites.')) {
            localStorage.clear();
            location.reload();
        }
    });
}

// Show screen
function showScreen(screenId, pushState = true) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show requested screen
    document.getElementById(screenId).classList.add('active');

    // Reset scroll position
    window.scrollTo(0, 0);
    document.getElementById('main-content').scrollTo(0, 0);

    // Toggle footer and navbar buttons visibility
    if (screenId === 'home-screen') {
        footer.style.display = 'block';
        backBtn.style.display = 'none';
        bookmarkBtn.style.display = 'none';
        fabBtn.style.display = 'flex';

        // Clear URL query param if going home
        if (pushState) {
            const newUrl = window.location.pathname;
            window.history.pushState({}, '', newUrl);
        }
    } else if (screenId === 'menu-screen') {
        footer.style.display = 'none';
        backBtn.style.display = 'block';
        bookmarkBtn.style.display = 'none';
        fabBtn.style.display = 'none';
    } else {
        footer.style.display = 'none';
        // Buttons are handled in showVachanamrut for detail screen
    }
}

// Setup navigation
function setupNavigation() {
    backBtn.addEventListener('click', () => {
        if (vachanamrutDetailScreen.classList.contains('active')) {
            // Go back to home screen
            showScreen('home-screen');

            // Scroll to bookmark if exists
            if (bookmarkedVachanamrutId) {
                scrollToBookmark();
            }
        } else if (menuScreen.classList.contains('active')) {
            showScreen('home-screen');
        }
    });

    // Initially hide back button
    backBtn.style.display = 'none';

    // Initially hide back button
    backBtn.style.display = 'none';
}

// Add Font Awesome for icons
function loadFontAwesome() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
}

// Display App Version from SW
async function displayAppVersion() {
    try {
        const response = await fetch('./sw.js');
        if (response.ok) {
            const text = await response.text();
            const match = text.match(/const CACHE_NAME = ['"]([^'"]+)['"]/);
            if (match && match[1]) {
                const version = match[1];
                const versionElement = document.getElementById('app-version');
                if (versionElement) {
                    versionElement.textContent = `Version: ${version}`;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching SW version:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadFontAwesome();
    init();
    displayAppVersion();
});