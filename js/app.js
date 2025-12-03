// Global variables
let vachanamrutData = [];
let videoData = [];
let sections = [];
let currentSection = null;
let bookmarkedVachanamrutId = localStorage.getItem('bookmarkedVachanamrutId');

// DOM elements
const sectionsScreen = document.getElementById('home-screen');
const vachanamrutDetailScreen = document.getElementById('vachanamrut-detail-screen');
const sectionsList = document.getElementById('sections-list');
const vachanamrutCard = document.getElementById('vachanamrut-card');
const vachanamrutTitle = document.getElementById('vachanamrut-title');
const vachanamrutVideo = document.getElementById('vachanamrut-video');
const vachanamrutSetting = document.getElementById('vachanamrut-setting');
const vachanamrutText = document.getElementById('vachanamrut-text');
const vachanamrutFooterText = document.getElementById('vachanamrut-footer-text');
const backBtn = document.getElementById('back-btn');
let bookmarkBtn = document.getElementById('bookmark-btn');
const footer = document.getElementById('footer');

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

        // Initial screen setup
        showScreen('home-screen');

        // Auto-scroll to bookmark if exists
        if (bookmarkedVachanamrutId) {
            scrollToBookmark();
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('main-content').innerHTML = '<p>Error loading data. Please check your connection.</p>';
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

    console.log(`Loaded ${vachanamrutData.length} vachanamruts`);
}

// Load video data
async function loadVideoData() {
    try {
        const response = await fetch('./assets/youtube_videos.json');
        if (response.ok) {
            videoData = await response.json();
            console.log(`Loaded ${videoData.length} videos`);
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
            console.log('Loaded chapter mappings');
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

    console.log('Processed sections:', sections);
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

// Show vachanamrut detail
function showVachanamrut(vachanamrut) {
    // Clean number and title
    const cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();
    const cleanTitle = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';

    // Set title with both number and name
    vachanamrutTitle.innerHTML = `<span class="v-number">${cleanNumber}</span><br><span class="v-title-text">${cleanTitle}</span>`;

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

// Show screen
function showScreen(screenId) {
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
        }
    });

    // Initially hide back button
    backBtn.style.display = 'none';

    // Swipe to go back
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Check if swipe is horizontal and long enough (right swipe)
        // AND check if swipe started from the left edge (within 50px)
        if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50 && touchStartX < 50) {
            // Right swipe from edge - go back
            if (backBtn.style.display !== 'none') {
                backBtn.click();
            }
        }
    }
}

// Add Font Awesome for icons
function loadFontAwesome() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadFontAwesome();
    init();
});