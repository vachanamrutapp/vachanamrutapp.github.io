// Global variables
let vachanamrutData = [];
let videoData = [];
let currentLanguage = 'gujarati'; // Default language
let favourites = JSON.parse(localStorage.getItem('favourites')) || [];
let sections = [];
let currentSection = null;
let bookmarkedVachanamrutId = localStorage.getItem('bookmarkedVachanamrutId');
let currentSectionVachanamruts = [];
let currentVachanamrutIndex = -1;

// DOM elements
const sectionsScreen = document.getElementById('home-screen');
const vachanamrutDetailScreen = document.getElementById('vachanamrut-detail-screen');
const favouritesScreen = document.getElementById('favourites-screen');
const settingsScreen = document.getElementById('settings-screen');
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
const readingFooter = document.getElementById('reading-footer');
const navPrevBtn = document.getElementById('nav-prev-btn');
const navNextBtn = document.getElementById('nav-next-btn');
const navSlider = document.getElementById('nav-slider');
const readingProgress = document.getElementById('reading-progress');

// ... (init function remains same)

// Show vachanamrut detail
function showVachanamrut(vachanamrut, pushState = true) {
    // Ensure ID is a number
    const safeId = parseInt(vachanamrut.id);


    // Update URL
    if (pushState) {
        // Clean URL: remove index.html if present
        const cleanPath = window.location.pathname.replace('index.html', '');
        const newUrl = `${cleanPath}?id=${safeId}&lang=${currentLanguage}`;
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
    // Share functionality
    shareBtn.addEventListener('click', async () => {
        const cleanPath = window.location.origin + window.location.pathname.replace('index.html', '');
        const shareUrl = `${cleanPath}?id=${safeId}&lang=${currentLanguage}`;
        const shareData = {
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                // User cancelled or error
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl); // Copy the generated shareUrl
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
    if (currentLanguage === 'english') {
        vachanamrutFooterText.textContent = `Vachanamrut ${cleanVachanamrutName}`;
    } else {
        vachanamrutFooterText.textContent = `॥ ઇતિ વચનામૃતમ્ ${cleanVachanamrutName} ॥`;
    }

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

    // Update Navigation Footer
    updateReadingFooter(safeId);
}

function updateReadingFooter(currentId) {
    // If we have context (from section detail)
    if (currentSectionVachanamruts.length > 0) {
        currentVachanamrutIndex = currentSectionVachanamruts.findIndex(v => v.id === currentId);

        // Use index + 1 for display and slider
        const currentNum = currentVachanamrutIndex + 1;
        const totalNum = currentSectionVachanamruts.length;

        readingProgress.textContent = `${currentNum} / ${totalNum}`;
        navSlider.max = totalNum;
        navSlider.value = currentNum;

        // Button states
        navPrevBtn.disabled = currentVachanamrutIndex <= 0;
        navNextBtn.disabled = currentVachanamrutIndex >= totalNum - 1;

        readingFooter.style.display = 'flex';
    } else {
        // Fallback if accessed directly without section context, try to find section
        const section = sections.find(s => s.vachanamruts.some(v => v.id === currentId));
        if (section) {
            currentSectionVachanamruts = section.vachanamruts;
            updateReadingFooter(currentId); // Retry
        } else {
            readingFooter.style.display = 'none';
        }
    }
}

function setupReadingNavigation() {
    navPrevBtn.addEventListener('click', () => {
        if (currentVachanamrutIndex > 0) {
            const prevVachanamrut = currentSectionVachanamruts[currentVachanamrutIndex - 1];
            showVachanamrut(prevVachanamrut);
        }
    });

    navNextBtn.addEventListener('click', () => {
        if (currentVachanamrutIndex < currentSectionVachanamruts.length - 1) {
            const nextVachanamrut = currentSectionVachanamruts[currentVachanamrutIndex + 1];
            showVachanamrut(nextVachanamrut);
        }
    });

    navSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        readingProgress.textContent = `${val} / ${currentSectionVachanamruts.length}`;
    });

    navSlider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        const targetIndex = val - 1;
        if (targetIndex >= 0 && targetIndex < currentSectionVachanamruts.length) {
            showVachanamrut(currentSectionVachanamruts[targetIndex]);
        }
    });
}

// Initialize app
async function init() {
    // Check for language in URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');

    console.log('URL Search:', window.location.search);
    console.log('URL Lang:', urlLang);
    console.log('Local Storage Lang:', localStorage.getItem('appLanguage'));

    // Load saved language preference (URL takes precedence)
    currentLanguage = urlLang || localStorage.getItem('appLanguage') || 'gujarati';

    // Sync URL language to localStorage
    if (urlLang) {
        localStorage.setItem('appLanguage', urlLang);
    }

    console.log('Current Language set to:', currentLanguage);
    document.body.className = currentLanguage; // Set body class
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

        // Setup Reading Nav
        setupReadingNavigation();

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

async function loadVachanamrutData() {
    const promises = [];

    // Determine file count based on language
    // Both languages now limited to 262 based on chapter-mappings.json
    const fileCount = 262;

    // Load files using current language
    console.log(`Loading data for language: ${currentLanguage}`);
    for (let i = 1; i <= fileCount; i++) {
        const url = `./assets/data/${currentLanguage}/vachanamrut-${i}.json`;
        // console.log(`Fetching: ${url}`); // Commented out to avoid spam
        promises.push(
            fetch(url)
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

    sections.forEach((section, index) => {
        // Create Chapter Tile
        const tile = document.createElement('div');
        tile.className = 'chapter-tile';
        tile.dataset.sectionIndex = index;

        // Get language-specific content
        const sectionName = currentLanguage === 'english' ? (section.nameEn || section.name) : section.name;
        const description = currentLanguage === 'english' ? (section.descriptionEn || section.description || '') : (section.description || '');

        // Count label based on language
        const countLabel = currentLanguage === 'english' ? `${section.count} Vachanamruts` : `${section.count} વચનામૃત`;

        tile.innerHTML = `
            <span class="chapter-number">${index + 1}</span>
            <div class="chapter-header">
                <h3 class="chapter-name">${sectionName}</h3>
                <span class="chapter-count">${countLabel}</span>
            </div>
            <p class="chapter-description">${description}</p>
        `;

        // Click handler to show section detail
        tile.addEventListener('click', () => {
            showSectionDetail(index);
        });

        sectionsList.appendChild(tile);
    });
}

// Show section detail screen with vachanamrut list
function showSectionDetail(sectionIndex) {
    currentSection = sections[sectionIndex];

    // Get section screen elements
    const sectionDetailScreen = document.getElementById('section-detail-screen');
    const sectionTitle = document.getElementById('section-title');
    const sectionDescription = document.getElementById('section-description');
    const sectionImage = document.getElementById('section-image');
    const sectionImageContainer = document.getElementById('section-image-container');
    const vachanamrutList = document.getElementById('vachanamrut-list');

    // Use language-specific content
    const name = currentLanguage === 'english' ? (currentSection.nameEn || currentSection.name) : currentSection.name;
    const description = currentLanguage === 'english' ? (currentSection.descriptionEn || currentSection.description) : currentSection.description;

    // Set header content
    sectionTitle.textContent = name;
    sectionDescription.textContent = description;

    // Handle Image
    if (currentSection.image) {
        sectionImage.src = currentSection.image;
        sectionImageContainer.style.display = 'block';
    } else {
        sectionImageContainer.style.display = 'none';
    }

    // Render vachanamrut tiles
    renderSectionVachanamruts(currentSection, vachanamrutList);

    // Store for navigation
    currentSectionVachanamruts = currentSection.vachanamruts;

    // Show section detail screen
    showScreen('section-detail-screen');
    backBtn.style.display = 'block';
    bookmarkBtn.style.display = 'none';
    fabBtn.style.display = 'none';
}

// Render vachanamrut tiles in section detail
function renderSectionVachanamruts(section, container) {
    container.innerHTML = '';

    section.vachanamruts.forEach((vachanamrut, index) => {
        const tile = document.createElement('div');
        tile.className = 'vachanamrut-tile';
        tile.dataset.id = vachanamrut.id;

        // Clean title and number
        const title = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';
        const cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();

        // Check if bookmarked
        const isBookmarked = bookmarkedVachanamrutId && parseInt(bookmarkedVachanamrutId) === vachanamrut.id;
        const bookmarkIcon = isBookmarked ? '<i class="fas fa-bookmark vachanamrut-tile-bookmark"></i>' : '';

        tile.innerHTML = `
            <span class="vachanamrut-tile-number">${index + 1}</span>
            <div class="vachanamrut-tile-content">
                <div class="vachanamrut-tile-name">${cleanNumber}</div>
                <div class="vachanamrut-tile-title">${title}</div>
            </div>
            ${bookmarkIcon}
        `;

        tile.addEventListener('click', () => {
            showVachanamrut(vachanamrut);
        });

        container.appendChild(tile);
    });
}

// Render Vachanamruts inside dropdown (kept for backwards compatibility)
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
    // Assuming menuScreen is defined elsewhere or will be defined.
    // For now, commenting out to avoid error if not present.
    // if (menuScreen.classList.contains('active')) {
    //     renderFavourites();
    // }
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

// Scroll to bookmark - Updated for new tile-based UI
function scrollToBookmark() {
    // Find section containing the bookmarked ID
    const sectionIndex = sections.findIndex(s => s.vachanamruts.some(v => v.id === parseInt(bookmarkedVachanamrutId)));

    if (sectionIndex !== -1) {
        // Navigate to the section detail screen
        showSectionDetail(sectionIndex);

        // Find the specific vachanamrut tile and scroll to it
        // Need a small timeout to allow rendering
        setTimeout(() => {
            const vachanamrutList = document.getElementById('vachanamrut-list');
            if (vachanamrutList) {
                const tile = Array.from(vachanamrutList.children).find(child =>
                    parseInt(child.dataset.id) === parseInt(bookmarkedVachanamrutId)
                );

                if (tile) {
                    tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a highlight effect
                    tile.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                    setTimeout(() => {
                        tile.style.boxShadow = '';
                    }, 2000);
                }
            }
        }, 300);
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
    const fabMenu = document.getElementById('fab-menu');
    const fabFavourites = document.getElementById('fab-favourites');
    const fabSettings = document.getElementById('fab-settings');
    let isMenuOpen = false;

    // FAB Click - Toggle menu
    fabBtn.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;

        if (isMenuOpen) {
            // Open menu
            fabMenu.classList.add('active');
            fabBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            // Close menu
            fabMenu.classList.remove('active');
            fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
        }
    });

    // Favourites button click
    fabFavourites.addEventListener('click', () => {
        showScreen('favourites-screen');
        renderFavourites();
        // Close menu
        isMenuOpen = false;
        fabMenu.classList.remove('active');
        fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });

    // Settings button click
    fabSettings.addEventListener('click', () => {
        showScreen('settings-screen');
        // Close menu
        isMenuOpen = false;
        fabMenu.classList.remove('active');
        fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
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
    } else if (screenId === 'section-detail-screen') {
        footer.style.display = 'block';
        // backBtn and fabBtn are handled in showSectionDetail
    } else if (screenId === 'favourites-screen' || screenId === 'settings-screen') {
        footer.style.display = 'none';
        backBtn.style.display = 'block';
        bookmarkBtn.style.display = 'none';
        fabBtn.style.display = 'none';
    } else {
        footer.style.display = 'none';
        // Buttons are handled in showVachanamrut for detail screen
    }

    // Handle reading footer visibility
    if (screenId === 'vachanamrut-detail-screen') {
        // visibility set by updateReadingFooter
    } else {
        const rf = document.getElementById('reading-footer');
        if (rf) rf.style.display = 'none';
    }
}

// Setup navigation
function setupNavigation() {
    const sectionDetailScreen = document.getElementById('section-detail-screen');

    backBtn.addEventListener('click', () => {
        if (vachanamrutDetailScreen.classList.contains('active')) {
            // From vachanamrut detail → go back to section detail (if we have a current section)
            if (currentSection) {
                // Find section index
                const sectionIndex = sections.findIndex(s => s.name === currentSection.name);
                if (sectionIndex !== -1) {
                    showSectionDetail(sectionIndex);
                } else {
                    showScreen('home-screen');
                }
            } else {
                showScreen('home-screen');
            }
        } else if (sectionDetailScreen && sectionDetailScreen.classList.contains('active')) {
            // From section detail → go back to home
            showScreen('home-screen');
            currentSection = null;
        } else if (favouritesScreen.classList.contains('active') || settingsScreen.classList.contains('active')) {
            showScreen('home-screen');
        }
    });

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

    // Set language selector value
    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) {
        languageToggle.checked = (currentLanguage === 'english');
    }

    // Save Language Button Logic
    // Language Toggle Logic
    if (languageToggle) {
        languageToggle.addEventListener('change', () => {
            // If checked -> English, else -> Gujarati
            const selectedLanguage = languageToggle.checked ? 'english' : 'gujarati';

            // Update language preference
            currentLanguage = selectedLanguage;
            localStorage.setItem('appLanguage', currentLanguage);
            document.body.className = currentLanguage; // Set body class

            // Reload the page to apply changes
            // Small delay to show animation
            setTimeout(() => {
                location.reload();
            }, 300);
        });
    }
});