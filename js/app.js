// Global variables
let SQL = null;
let db = null;
let initSqlPromise = null;
let vachanamrutData = [];
let videoData = [];
let currentLanguage = 'gujarati'; // Default language
let favourites = JSON.parse(localStorage.getItem('favourites')) || [];
let sections = [];
let currentSection = null;
let bookmarkedVachanamrutId = localStorage.getItem('bookmarkedVachanamrutId');
let currentSectionVachanamruts = [];
let currentVachanamrutIndex = -1;
let videoEnabled = localStorage.getItem('videoEnabled') === 'true'; // Default false
let audioEnabled = localStorage.getItem('audioEnabled') !== 'false'; // Default true
let audioPlayer = new Audio();
let isPlaying = false;
let currentAudioId = -1;
let appTheme = localStorage.getItem('appTheme') || 'default';
let appFontSizePercent = parseInt(localStorage.getItem('appFontSizePercent')) || 100;
let activeVachanamrutId = -1;
let timelineEvents = [];
let timelineFilter = { location: 'all', year: 'all', query: '' };

// DOM elements
const sectionsScreen = document.getElementById('home-screen');

// Toast Notification helper
function showToast(message, iconClass = 'fas fa-info-circle') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    container.innerHTML = `<div class="toast-message"><i class="${iconClass}"></i><span>${message}</span></div>`;
    container.classList.add('active');
    
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        container.classList.remove('active');
    }, 2500);
}

// Apply font size helper
function applyFontSize() {
    const textElement = document.getElementById('vachanamrut-text');
    const displayElement = document.getElementById('font-size-display');
    if (textElement) {
        textElement.style.fontSize = `${1.38 * (appFontSizePercent / 100)}rem`;
    }
    if (displayElement) {
        displayElement.textContent = `${appFontSizePercent}%`;
    }
}

// Apply theme helper
function applyTheme() {
    const card = document.getElementById('vachanamrut-card');
    if (!card) return;
    
    card.classList.remove('theme-default', 'theme-sepia', 'theme-dark');
    card.classList.add(`theme-${appTheme}`);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === appTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Setup Reader font size and theme controls
function setupReaderControls() {
    const decBtn = document.getElementById('font-dec-btn');
    const incBtn = document.getElementById('font-inc-btn');
    
    if (decBtn && incBtn) {
        decBtn.addEventListener('click', () => {
            if (appFontSizePercent > 80) {
                appFontSizePercent -= 10;
                localStorage.setItem('appFontSizePercent', appFontSizePercent);
                applyFontSize();
            }
        });
        incBtn.addEventListener('click', () => {
            if (appFontSizePercent < 180) {
                appFontSizePercent += 10;
                localStorage.setItem('appFontSizePercent', appFontSizePercent);
                applyFontSize();
            }
        });
    }
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            appTheme = e.target.dataset.theme;
            localStorage.setItem('appTheme', appTheme);
            applyTheme();
        });
    });
}

// Setup Scroll progress bar tracking
function setupScrollProgress() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen && activeScreen.id === 'vachanamrut-detail-screen') {
                const scrollTop = mainContent.scrollTop;
                const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight;
                const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
                const progressBar = document.getElementById('scroll-progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${scrollPercent}%`;
                }
            }
        });
    }
}


const vachanamrutDetailScreen = document.getElementById('vachanamrut-detail-screen');
const favouritesScreen = document.getElementById('favourites-screen');
const settingsScreen = document.getElementById('settings-screen');
const timelineScreen = document.getElementById('timeline-screen');
const sectionsList = document.getElementById('sections-list');
const vachanamrutCard = document.getElementById('vachanamrut-card');
const vachanamrutTitle = document.getElementById('vachanamrut-title');
const vachanamrutVideo = document.getElementById('vachanamrut-video');
const vachanamrutSetting = document.getElementById('vachanamrut-setting');
const vachanamrutImageContainer = document.getElementById('vachanamrut-image-container');
const vachanamrutImage = document.getElementById('vachanamrut-image');
const vachanamrutVerses = document.getElementById('vachanamrut-verses');
const vachanamrutText = document.getElementById('vachanamrut-text');
const vachanamrutFooterText = document.getElementById('vachanamrut-footer-text');
const backBtn = document.getElementById('back-btn');
let bookmarkBtn = document.getElementById('bookmark-pill-btn');
const fabBtn = document.getElementById('fab-btn');
const footer = document.getElementById('footer');
const readingFooter = document.getElementById('reading-footer');
const navPrevBtn = document.getElementById('nav-prev-btn');
const navNextBtn = document.getElementById('nav-next-btn');
const navSlider = document.getElementById('nav-slider');
const readingProgress = document.getElementById('reading-progress');
const audioPlayerContainer = document.getElementById('audio-player-container');
const audioFabView = document.getElementById('audio-fab-view');
const audioBarTitle = document.getElementById('audio-bar-title');
const audioBtnPrev = document.getElementById('audio-btn-prev');
const audioBtnPlay = document.getElementById('audio-btn-play');
const audioBtnNext = document.getElementById('audio-btn-next');
const audioBtnClose = document.getElementById('audio-btn-close');
const audioProgressBar = document.getElementById('audio-progress-bar');
const audioProgressFill = document.getElementById('audio-progress-fill');
const audioTimer = document.getElementById('audio-timer');



let isDraggingScrubber = false;

// ... (init function remains same)

// Show vachanamrut detail
function showVachanamrut(vachanamrut, pushState = true) {
    // Ensure ID is a number
    const safeId = parseInt(vachanamrut.id);
    activeVachanamrutId = safeId;


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

    // Facts pill only applies to the 262 main Vachanamruts — Partharos and
    // Khagol-Bhugol have no `timeline_events` row.
    const factsPillBtn = document.getElementById('facts-pill-btn');
    if (factsPillBtn) {
        factsPillBtn.style.display = (safeId >= 1 && safeId <= 262) ? '' : 'none';
    }

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
                showToast('Shared successfully!', 'fas fa-share-alt');
            } catch (error) {
                // User cancelled or error
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('Link copied to clipboard / લિંક કોપી કરી!', 'fas fa-check');
            } catch (err) {
                console.error('Failed to copy:', err);
                showToast('Failed to copy link', 'fas fa-exclamation-triangle');
            }
        }
    });

    // Video embed
    vachanamrutVideo.innerHTML = '';
    if (vachanamrut.id && videoEnabled) {
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
    if (setting) {
        vachanamrutSetting.textContent = setting;
        vachanamrutSetting.style.display = 'block';
    } else {
        vachanamrutSetting.textContent = '';
        vachanamrutSetting.style.display = 'none';
    }

    // Setup chapter-specific images for Partharo
    const partharoImages = {
        10001: 'images/Partharo/swaminarayan-birth.webp',
        10002: 'images/Partharo/swaminarayan-balleela.webp',
        10003: 'images/Partharo/swaminarayan-loj.webp',
        10004: 'images/Partharo/swaminarayan-samadhi.jpg',
        10005: 'images/Partharo/swaminarayan-aarti.webp'
    };

    if (partharoImages[safeId]) {
        vachanamrutImage.src = partharoImages[safeId];
        vachanamrutImage.alt = cleanTitle;
        vachanamrutImageContainer.style.display = 'block';
    } else {
        vachanamrutImage.src = '';
        vachanamrutImageContainer.style.display = 'none';
    }

    // Render Sanskrit verses if present
    if (vachanamrut.verses && vachanamrut.verses.trim()) {
        vachanamrutVerses.innerHTML = `<div class="sanskrit-verses-content">${vachanamrut.verses.replace(/\n/g, '<br>')}</div>`;
        vachanamrutVerses.style.display = 'block';
    } else {
        vachanamrutVerses.innerHTML = '';
        vachanamrutVerses.style.display = 'none';
    }

    // Clean and format text
    const text = vachanamrut.text ? vachanamrut.text.replace(/\n/g, '\n\n').trim() : '';
    vachanamrutText.innerHTML = text.split('\n\n').map(paragraph =>
        paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
    ).join('');

    // Set footer text
    if (safeId >= 10001 && safeId <= 10005) {
        const partharoNum = safeId - 10000;
        if (currentLanguage === 'english') {
            vachanamrutFooterText.textContent = `Partharo ${partharoNum}`;
        } else {
            vachanamrutFooterText.textContent = `॥ ઇતિ પરથારો ${partharoNum} ॥`;
        }
    } else if (safeId === 10006) {
        if (currentLanguage === 'english') {
            vachanamrutFooterText.textContent = `Khagol Bhugol`;
        } else {
            vachanamrutFooterText.textContent = `॥ ઇતિ ખગોળ ભૂગોળ ॥`;
        }
    } else {
        const cleanVachanamrutName = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();
        if (currentLanguage === 'english') {
            vachanamrutFooterText.textContent = `Vachanamrut ${cleanVachanamrutName}`;
        } else {
            vachanamrutFooterText.textContent = `॥ ઇતિ વચનામૃતમ્ ${cleanVachanamrutName} ॥`;
        }
    }

    showScreen('vachanamrut-detail-screen');
    applyFontSize();
    applyTheme();
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

    // Setup Audio Player
    setupAudioPlayer(vachanamrut);
}

function setupAudioPlayer(vachanamrut) {
    if (!audioEnabled) {
        audioPlayerContainer.style.display = 'none';
        return;
    }

    const vachanamrutId = parseInt(vachanamrut.id);
    
    // No audio button/player inside individual Partharo chapters
    if (vachanamrutId >= 10001 && vachanamrutId <= 10005) {
        audioPlayer.pause();
        isPlaying = false;
        updateAudioBarUI();
        audioPlayerContainer.style.display = 'none';
        return;
    }

    let cleanNumber = vachanamrut.vachanamrut.replace(/\n/g, ' ').trim();

    if (currentLanguage === 'english' && vachanamrutId >= 10001 && vachanamrutId <= 10005) {
        cleanNumber = `Partharo ${vachanamrutId - 10000}`;
    }

    // Set audio title
    if (audioBarTitle) {
        audioBarTitle.textContent = cleanNumber;
    }

    // Reset if new vachanamrut
    if (currentAudioId !== vachanamrutId) {
        audioPlayer.pause();
        if (vachanamrutId === 10000) {
            audioPlayer.src = `./assets/data/audio/1 Partharo.mp3`;
        } else if (vachanamrutId === 10006) {
            audioPlayer.src = `./assets/data/audio/264 Khagol Bhugol.mp3`;
        } else {
            audioPlayer.src = `./assets/data/audio/${vachanamrutId}.mp3`;
        }
        audioPlayer.load();
        currentAudioId = vachanamrutId;
        isPlaying = false;
        updateAudioBarUI();
        if (audioProgressBar) audioProgressBar.value = 0;
        if (audioProgressFill) audioProgressFill.style.width = '0%';
        audioTimer.textContent = '0:00 / 0:00';
        
        // Reset FAB progress circle
        const progressCircle = document.querySelector('.audio-fab-progress-circle');
        if (progressCircle) progressCircle.style.strokeDashoffset = '150.8';
        
        // Reset state to FAB on loading new vachanamrut
        audioPlayerContainer.classList.remove('state-bar');
        audioPlayerContainer.classList.add('state-fab');
    }

    audioPlayerContainer.style.display = 'flex';
}

function toggleAudio() {
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play().catch(error => {
            console.error('Audio playback failed:', error);
        });
    }
    isPlaying = !isPlaying;
    updateAudioBarUI();
}

function updateAudioBarUI() {
    if (audioPlayerContainer) {
        if (isPlaying) {
            audioPlayerContainer.classList.add('is-playing');
        } else {
            audioPlayerContainer.classList.remove('is-playing');
        }
    }

    if (audioBtnPlay) {
        const icon = audioBtnPlay.querySelector('i');
        if (icon) {
            if (isPlaying) {
                icon.className = 'fas fa-pause';
            } else {
                icon.className = 'fas fa-play';
            }
        }
    }
    if (audioFabView) {
        const icon = audioFabView.querySelector('i');
        if (icon) {
            if (isPlaying) {
                icon.className = 'fas fa-music'; // MUSIC ICON WHEN PLAYING
            } else {
                icon.className = 'fas fa-play';
            }
        }
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Audio player event listeners
audioPlayer.addEventListener('loadedmetadata', () => {
    audioTimer.textContent = `0:00 / ${formatTime(audioPlayer.duration)}`;
});

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        // Update FAB progress ring
        const progressCircle = document.querySelector('.audio-fab-progress-circle');
        if (progressCircle) {
            const percent = audioPlayer.currentTime / audioPlayer.duration;
            const circumference = 150.8;
            const offset = circumference - (percent * circumference);
            progressCircle.style.strokeDashoffset = offset;
        }

        // Update progress bar
        if (!isDraggingScrubber) {
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            if (audioProgressBar) audioProgressBar.value = percent;
            if (audioProgressFill) audioProgressFill.style.width = `${percent}%`;
            audioTimer.textContent = `${formatTime(audioPlayer.currentTime)} / ${formatTime(audioPlayer.duration)}`;
        }
    }
});

audioPlayer.addEventListener('ended', () => {
    isPlaying = false;
    updateAudioBarUI();
    if (audioProgressBar) audioProgressBar.value = 0;
    if (audioProgressFill) audioProgressFill.style.width = '0%';
    
    // Reset FAB progress circle
    const progressCircle = document.querySelector('.audio-fab-progress-circle');
    if (progressCircle) progressCircle.style.strokeDashoffset = '150.8';

    if (audioPlayer.duration) {
        audioTimer.textContent = `0:00 / ${formatTime(audioPlayer.duration)}`;
    } else {
        audioTimer.textContent = '0:00 / 0:00';
    }
});

// Setup scrubber events
if (audioProgressBar) {
    let isMouseDown = false;
    let hasCommittedSeek = false;

    const startDrag = () => {
        isDraggingScrubber = true;
        isMouseDown = true;
        hasCommittedSeek = false;
    };

    const updateDrag = () => {
        isDraggingScrubber = true;
        const percent = audioProgressBar.value;
        if (audioProgressFill) audioProgressFill.style.width = `${percent}%`;
        if (audioPlayer.duration) {
            const time = (percent / 100) * audioPlayer.duration;
            audioTimer.textContent = `${formatTime(time)} / ${formatTime(audioPlayer.duration)}`;
        }
    };

    const endDrag = () => {
        if ((isDraggingScrubber || isMouseDown) && !hasCommittedSeek) {
            hasCommittedSeek = true;
            isMouseDown = false;
            
            if (audioPlayer.duration) {
                const time = (audioProgressBar.value / 100) * audioPlayer.duration;
                audioPlayer.currentTime = time;
            }
            
            // Delay resetting drag flag slightly to prevent timeupdate race condition
            setTimeout(() => {
                isDraggingScrubber = false;
            }, 150);
        }
    };

    audioProgressBar.addEventListener('mousedown', startDrag);
    audioProgressBar.addEventListener('touchstart', startDrag, { passive: true });
    
    audioProgressBar.addEventListener('input', updateDrag);
    
    audioProgressBar.addEventListener('change', endDrag);
    audioProgressBar.addEventListener('mouseup', endDrag);
    audioProgressBar.addEventListener('touchend', endDrag);
    audioProgressBar.addEventListener('pointerup', endDrag);
}

// Play/Pause button
if (audioBtnPlay) {
    audioBtnPlay.addEventListener('click', toggleAudio);
}

// Skip Forward 15s button
if (audioBtnNext) {
    audioBtnNext.addEventListener('click', () => {
        if (audioPlayer.duration) {
            audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 15);
        }
    });
}

// Skip Backward 15s button
if (audioBtnPrev) {
    audioBtnPrev.addEventListener('click', () => {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
    });
}

// Close player button (Minimize to FAB)
if (audioBtnClose) {
    audioBtnClose.addEventListener('click', () => {
        audioPlayerContainer.classList.remove('state-bar');
        audioPlayerContainer.classList.add('state-fab');
    });
}

// FAB View button click handlers
if (audioFabView) {
    audioFabView.addEventListener('click', () => {
        audioPlayerContainer.classList.remove('state-fab');
        audioPlayerContainer.classList.add('state-bar');
        if (!isPlaying) {
            toggleAudio();
        }
    });
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
            loadChapterMappings(),
            loadTimelineData()
        ]);

        // Setup Timeline filters and listeners
        setupTimelineFilters();

        // Process sections from data
        processSections();

        // Render sections
        renderSections();

        // Setup navigation
        setupNavigation();

        // Setup Menu
        setupMenu();

        // Setup Vachanamrut Facts Modal
        setupFactsModal();

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

async function initSql() {
    if (initSqlPromise) return initSqlPromise;

    initSqlPromise = (async () => {
        if (!SQL) {
            SQL = await initSqlJs({
                locateFile: file => `js/${file}`
            });
        }
        if (!db) {
            const response = await fetch('./assets/data/vachanamrut.db');
            const arrayBuffer = await response.arrayBuffer();
            db = new SQL.Database(new Uint8Array(arrayBuffer));
        }
    })();

    return initSqlPromise;
}

async function loadVachanamrutData() {
    console.log(`Loading SQLite data for language: ${currentLanguage}`);
    await initSql();

    const stmt = db.prepare("SELECT id, type, number, vachanamrut, title, setting, text, verses FROM scriptures WHERE language = :lang");
    stmt.bind({ ":lang": currentLanguage });

    vachanamrutData = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        const item = {
            id: row.id,
            number: row.number,
            vachanamrut: row.vachanamrut,
            title: row.title,
            setting: row.setting,
            text: row.text
        };
        if (row.type === 'partharo' && row.verses) {
            item.verses = row.verses;
        }
        vachanamrutData.push(item);
    }
    stmt.free();
    console.log(`Loaded ${vachanamrutData.length} records from SQLite.`);
}

// Load video data
async function loadVideoData() {
    try {
        await initSql();
        const stmt = db.prepare("SELECT number, title, url, videoId FROM videos");
        videoData = [];
        while (stmt.step()) {
            videoData.push(stmt.getAsObject());
        }
        stmt.free();
        console.log(`Loaded ${videoData.length} video entries from SQLite.`);
    } catch (error) {
        console.error('Error loading video data:', error);
    }
}

// Load chapter mappings
async function loadChapterMappings() {
    try {
        await initSql();
        const stmt = db.prepare("SELECT id, name_gu, name_en, image, description_gu, description_en, vachanamruts FROM sections ORDER BY id ASC");
        sections = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            row.vachanamruts = JSON.parse(row.vachanamruts);
            sections.push(row);
        }
        stmt.free();
        console.log(`Loaded ${sections.length} sections from SQLite.`);
    } catch (error) {
        console.error('Error loading chapter mappings:', error);
    }
}

// Load timeline and facts data from SQLite
async function loadTimelineData() {
    try {
        console.log(`Loading SQLite timeline data for language: ${currentLanguage}`);
        await initSql();
        const isGuj = currentLanguage === 'gujarati';
        const stmt = db.prepare(`
            SELECT
                s.id, s.vachanamrut, s.title,
                t.gregorian_date, t.gregorian_date_raw,
                ${isGuj ? 't.hindu_date_gu'      : 't.hindu_date_en'}      AS hindu_date,
                ${isGuj ? 't.time_of_day_gu'    : 't.time_of_day_en'}     AS time_of_day,
                t.location_en                                              AS location,
                ${isGuj ? 't.town_gu'           : 't.town_en'}            AS town,
                ${isGuj ? 't.season_gu'         : 't.season_en'}          AS season,
                ${isGuj ? 't.season_months_gu'  : 't.season_months_en'}   AS season_months,
                t.maharaj_age_years, t.maharaj_age_days,
                t.clothing_en                                              AS clothing
            FROM timeline_events t
            JOIN scriptures s ON t.vachanamrut_id = s.id
            WHERE s.language = :lang AND s.type = 'vachanamrut'
            ORDER BY t.gregorian_date ASC
        `);
        stmt.bind({ ":lang": currentLanguage });

        timelineEvents = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();

            // Query questions in current language
            const qStmt = db.prepare(`
                SELECT
                    ${isGuj ? 'questioner_name_gu' : 'questioner_name_en'} AS questioner_name,
                    ${isGuj ? 'question_text_gu'   : 'question_text_en'}   AS question_text
                FROM vachanamrut_questions WHERE vachanamrut_id = :id
            `);
            qStmt.bind({ ":id": row.id });
            const questions = [];
            while (qStmt.step()) {
                questions.push(qStmt.getAsObject());
            }
            qStmt.free();

            timelineEvents.push({
                id: row.id,
                vachanamrut: row.vachanamrut,
                title: row.title,
                gregorianDate: row.gregorian_date,
                gregorianDateRaw: row.gregorian_date_raw,
                hinduDate: row.hindu_date,
                timeOfDay: row.time_of_day,
                location: row.location,
                town: row.town,
                season: row.season,
                seasonMonths: row.season_months,
                maharajAgeYears: row.maharaj_age_years,
                maharajAgeDays: row.maharaj_age_days,
                clothing: row.clothing,
                questions: questions
            });
        }
        stmt.free();
        console.log(`Loaded ${timelineEvents.length} timeline events from SQLite.`);
    } catch (error) {
        console.error('Error loading timeline data:', error);
    }
}

// Process sections from loaded data
function processSections() {
    sections.forEach(section => {
        // On first call, vachanamruts are numeric IDs from JSON — save them permanently
        if (Array.isArray(section.vachanamruts) && section.vachanamruts.length > 0 && typeof section.vachanamruts[0] === 'number') {
            section._originalIds = section.vachanamruts.slice(); // Store a copy
        }

        // Always re-map from stored IDs if available (handles language switch)
        if (section._originalIds && section._originalIds.length > 0) {
            const vachanamrutObjects = section._originalIds
                .map(id => vachanamrutData.find(v => v.id === id))
                .filter(v => v !== undefined);
            section.vachanamruts = vachanamrutObjects;
            section.count = vachanamrutObjects.length;
        } else if (!section.vachanamruts || section.vachanamruts.length === 0) {
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
        const sectionName = currentLanguage === 'english' ? (section.name_en || section.name_gu) : section.name_gu;
        const description = currentLanguage === 'english' ? (section.description_en || section.description_gu || '') : (section.description_gu || '');

        // Count label based on language
        let countLabel;
        if (section.name_en === 'Partharo' || section.name_gu === 'પરથારો') {
            countLabel = currentLanguage === 'english' ? `${section.count} Parthara` : `${section.count} પરથારા`;
        } else {
            countLabel = currentLanguage === 'english' ? `${section.count} Vachanamruts` : `${section.count} વચનામૃત`;
        }

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

// Render timeline flow list and populate filter stats
function renderTimeline() {
    const timelineFlow = document.getElementById('timeline-flow');
    if (!timelineFlow) return;
    
    timelineFlow.innerHTML = '';
    
    // Populate dropdowns if they are empty
    populateTimelineFilters();
    
    // Calculate stats
    const totalCount = timelineEvents.length;
    const locationsCount = new Set(timelineEvents.map(e => e.town).filter(Boolean)).size;
    const questionsCount = timelineEvents.reduce((sum, e) => sum + e.questions.length, 0);
    
    // Update stats counters in UI
    const totalVal = document.querySelector('#stat-total-disc .stat-value');
    const locVal = document.getElementById('stat-loc-count');
    const qVal = document.getElementById('stat-q-count');
    
    if (totalVal) totalVal.textContent = totalCount;
    if (locVal) locVal.textContent = locationsCount;
    if (qVal) qVal.textContent = questionsCount;
    
    // Filter events
    const query = timelineFilter.query.toLowerCase().trim();
    const filtered = timelineEvents.filter(e => {
        const matchLoc = timelineFilter.location === 'all' || e.town === timelineFilter.location;
        const matchYear = timelineFilter.year === 'all' || (e.gregorianDate && e.gregorianDate.startsWith(timelineFilter.year));
        
        let matchQuery = true;
        if (query) {
            const matchTitle = e.title.toLowerCase().includes(query);
            const matchNumber = e.vachanamrut.toLowerCase().includes(query);
            const matchLocStr = e.location.toLowerCase().includes(query);
            const matchClothing = e.clothing.toLowerCase().includes(query);
            const matchQuestioners = e.questions.some(q => q.questioner_name.toLowerCase().includes(query) || q.question_text.toLowerCase().includes(query));
            matchQuery = matchTitle || matchNumber || matchLocStr || matchClothing || matchQuestioners;
        }
        
        return matchLoc && matchYear && matchQuery;
    });
    
    // Render events
    if (filtered.length === 0) {
        const noResultsText = currentLanguage === 'english' ? 'No matching events found.' : 'કોઈ મેળ ખાતા પ્રસંગો મળ્યા નથી.';
        const searchAnotherText = currentLanguage === 'english' ? 'Try adjusting your filters or search keywords.' : 'તમારા ફિલ્ટર્સ અથવા શોધ શબ્દો બદલવાનો પ્રયત્ન કરો.';
        timelineFlow.innerHTML = `
            <div class="timeline-empty-state">
                <i class="fas fa-search-minus"></i>
                <h4>${noResultsText}</h4>
                <p>${searchAnotherText}</p>
            </div>
        `;
        return;
    }
    
    // Map of towns for translation
    const townTranslations = {
        'Gadhada': 'ગઢડા',
        'Vartal': 'વરતાલ',
        'Sarangpur': 'સારંગપુર',
        'Loya': 'લોયા',
        'Kariyani': 'કારિયાણી',
        'Panchala': 'પંચાળા',
        'Ahmedabad': 'અમદાવાદ',
        'Ashlali': 'આશ્લાલી',
        'Jetalpur': 'જેતલપુર'
    };
    
    filtered.forEach(e => {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'timeline-card-container';
        cardContainer.dataset.id = e.id;
        
        // Build questions list markup
        let questionsHtml = '';
        if (e.questions.length > 0) {
            questionsHtml = `
                <div class="timeline-detail-item">
                    <strong>${currentLanguage === 'english' ? 'Questions Asked:' : 'પૂછાયેલા પ્રશ્નો:'}</strong>
                    <ul class="timeline-questions-list">
                        ${e.questions.map(q => `
                            <li>
                                <span class="timeline-questioner-name">${q.questioner_name}</span>: 
                                "${q.question_text}"
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            questionsHtml = `
                <div class="timeline-detail-item">
                    <strong>${currentLanguage === 'english' ? 'Questions Asked:' : 'પૂછાયેલા પ્રશ્નો:'}</strong>
                    <p style="font-size: 0.75rem; color: #5d4e75; font-style: italic; margin-left: 4px;">
                        ${currentLanguage === 'english' ? 'No direct questions recorded.' : 'કોઈ સીધા પ્રશ્નો નોંધાયા નથી.'}
                    </p>
                </div>
            `;
        }
        
        // Translate time of day
        let timeLabel = e.timeOfDay;
        if (currentLanguage !== 'english') {
            const timeTranslations = {
                'night': 'રાત્રિ',
                'evening': 'સાંજ',
                'afternoon': 'બપોર',
                'morning': 'સવાર',
                'noon': 'મધ્યાહ્ન',
                'three hours before sunrise': 'પ્રભાત (સૂર્યોદય પૂર્વે)',
                'sunrise': 'સૂર્યોદય'
            };
            timeLabel = timeTranslations[e.timeOfDay.toLowerCase()] || e.timeOfDay;
        }
        
        const readText = currentLanguage === 'english' ? 'Read' : 'વાંચો';
        const detailsText = currentLanguage === 'english' ? 'Details' : 'વિગતો';
        
        cardContainer.innerHTML = `
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <div class="timeline-date-time">
                        <span class="timeline-gregorian">${e.gregorianDateRaw}</span>
                        <span class="timeline-hindu">${e.hinduDate}</span>
                    </div>
                    <span class="timeline-tod-badge ${e.timeOfDay.toLowerCase().replace(/\s+/g, '-')}">${timeLabel}</span>
                </div>
                <div class="timeline-card-title">
                    <span class="timeline-card-title-prefix">${e.vachanamrut}</span>
                    ${e.title}
                </div>
                <div class="timeline-location-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <span class="timeline-town-badge">${currentLanguage === 'english' ? e.town : (townTranslations[e.town] || e.town)}</span>
                        ${e.location}
                    </div>
                </div>
                
                <!-- Expandable details -->
                <div class="timeline-card-details">
                    <div class="timeline-detail-item">
                        <strong>${currentLanguage === 'english' ? "Shriji Maharaj's Appearance / Clothing:" : 'શ્રીજીમહારાજના વસ્ત્રો / શણગાર:'}</strong>
                        <p>${e.clothing}</p>
                    </div>
                    ${questionsHtml}
                </div>
                
                <div class="timeline-card-actions">
                    <button class="timeline-expand-btn">
                        <i class="fas fa-chevron-down"></i> ${detailsText}
                    </button>
                    <button class="timeline-read-btn">
                        <i class="fas fa-book-open"></i> ${readText}
                    </button>
                </div>
            </div>
        `;
        
        // Expand/Collapse click handler
        const expandBtn = cardContainer.querySelector('.timeline-expand-btn');
        expandBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            cardContainer.classList.toggle('expanded');
        });
        
        // Read click handler
        const readBtn = cardContainer.querySelector('.timeline-read-btn');
        readBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const vach = vachanamrutData.find(v => v.id === e.id);
            if (vach) {
                showVachanamrut(vach);
            }
        });
        
        timelineFlow.appendChild(cardContainer);
    });
}

// Populate filters in the UI
function populateTimelineFilters() {
    const locationSelect = document.getElementById('timeline-filter-location');
    const yearSelect = document.getElementById('timeline-filter-year');
    if (!locationSelect || !yearSelect) return;
    
    // Only build options once or when language changes
    const builtFlag = locationSelect.dataset.builtForLang;
    if (builtFlag === currentLanguage && locationSelect.options.length > 1) return;
    
    // Clear existing options
    locationSelect.innerHTML = '';
    yearSelect.innerHTML = '';
    
    // Labels
    const locAllText = currentLanguage === 'english' ? 'All Locations' : 'બધા સ્થળો';
    const yearAllText = currentLanguage === 'english' ? 'All Years' : 'બધા વર્ષો';
    
    // Add "All" default
    locationSelect.innerHTML = `<option value="all">${locAllText}</option>`;
    yearSelect.innerHTML = `<option value="all">${yearAllText}</option>`;
    
    // Extract unique locations/towns and years
    const towns = Array.from(new Set(timelineEvents.map(e => e.town))).filter(Boolean).sort();
    const townTranslations = {
        'Gadhada': 'ગઢડા',
        'Vartal': 'વરતાલ',
        'Sarangpur': 'સારંગપુર',
        'Loya': 'લોયા',
        'Kariyani': 'કારિયાણી',
        'Panchala': 'પંચાળા',
        'Ahmedabad': 'અમદાવાદ',
        'Ashlali': 'આશ્લાલી',
        'Jetalpur': 'જેતલપુર'
    };
    
    towns.forEach(town => {
        const display = currentLanguage === 'english' ? town : (townTranslations[town] || town);
        locationSelect.innerHTML += `<option value="${town}">${display}</option>`;
    });
    
    const years = Array.from(new Set(timelineEvents.map(e => {
        return e.gregorianDate ? e.gregorianDate.substring(0, 4) : '';
    }))).filter(Boolean).sort();
    
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });
    
    // Mark as built
    locationSelect.dataset.builtForLang = currentLanguage;
    
    // Reset values
    locationSelect.value = timelineFilter.location;
    yearSelect.value = timelineFilter.year;
}

// Set up event listeners for filters
function setupTimelineFilters() {
    const searchInput = document.getElementById('timeline-search');
    const locationSelect = document.getElementById('timeline-filter-location');
    const yearSelect = document.getElementById('timeline-filter-year');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            timelineFilter.query = e.target.value;
            renderTimeline();
        });
    }
    
    if (locationSelect) {
        locationSelect.addEventListener('change', (e) => {
            timelineFilter.location = e.target.value;
            renderTimeline();
        });
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            timelineFilter.year = e.target.value;
            renderTimeline();
        });
    }
    
    // Clicking locations count card directs focus to Location dropdown
    const locStatCard = document.getElementById('stat-locations');
    if (locStatCard && locationSelect) {
        locStatCard.addEventListener('click', () => {
            locationSelect.focus();
            showToast(currentLanguage === 'english' ? 'Select a location to filter' : 'ફિલ્ટર કરવા માટે સ્થળ પસંદ કરો');
        });
    }
    
    // Clicking span card directs focus to Year dropdown
    const spanStatCard = document.getElementById('stat-span');
    if (spanStatCard && yearSelect) {
        spanStatCard.addEventListener('click', () => {
            yearSelect.focus();
            showToast(currentLanguage === 'english' ? 'Select a year to filter' : 'ફિલ્ટર કરવા માટે વર્ષ પસંદ કરો');
        });
    }
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
    const name = currentLanguage === 'english' ? (currentSection.name_en || currentSection.name_gu) : currentSection.name_gu;
    const description = currentLanguage === 'english' ? (currentSection.description_en || currentSection.description_gu) : currentSection.description_gu;

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

    // Setup section audio player if it is Partharo (Floating Audio Button)
    if (currentSection.name_en === 'Partharo' || currentSection.name_gu === 'પરથારો') {
        const dummyPartharo = {
            id: 10000,
            vachanamrut: currentLanguage === 'english' ? 'Partharo' : 'પરથારો',
            title: currentLanguage === 'english' ? 'Partharo Preface' : 'વચનામૃત પ્રસ્તાવના'
        };
        setupAudioPlayer(dummyPartharo);
    }

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
        showToast('Bookmark removed / બુકમાર્ક હટાવ્યો', 'fas fa-bookmark');
    } else {
        // Set bookmark
        bookmarkedVachanamrutId = id;
        localStorage.setItem('bookmarkedVachanamrutId', id);
        showToast('Bookmarked successfully / બુકમાર્ક સેવ કર્યો!', 'fas fa-bookmark');
    }
    updateBookmarkButtonState(id);
    renderSections(); // Re-render to update indicators
}

// Toggle Favourite
function toggleFavourite(id) {
    const index = favourites.indexOf(id);
    let isAdded = false;
    if (index === -1) {
        favourites.push(id);
        isAdded = true;
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
    
    if (isAdded) {
        showToast('Added to Favourites / ફેવરિટમાં સેવ કર્યો!', 'fas fa-heart');
    } else {
        showToast('Removed from Favourites / ફેવરિટમાંથી હટાવ્યો', 'fas fa-heart');
    }
}

// Update bookmark button icon
function updateBookmarkButtonState(currentId) {
    const btn = document.getElementById('bookmark-pill-btn');
    if (!btn) return;
    const textSpan = document.getElementById('bookmark-pill-text');
    const icon = btn.querySelector('i');
    
    const isBookmarked = bookmarkedVachanamrutId && parseInt(bookmarkedVachanamrutId) === currentId;
    
    if (isBookmarked) {
        btn.classList.add('active');
        if (icon) {
            icon.className = 'fas fa-bookmark'; // Solid icon
        }
        if (textSpan) {
            textSpan.textContent = currentLanguage === 'english' ? 'Bookmarked' : 'બુકમાર્ક કરેલ';
        }
    } else {
        btn.classList.remove('active');
        if (icon) {
            icon.className = 'far fa-bookmark'; // Regular icon
        }
        if (textSpan) {
            textSpan.textContent = currentLanguage === 'english' ? 'Bookmark' : 'બુકમાર્ક';
        }
    }
}

// ===========================================================
// Vachanamrut Facts Modal
// ===========================================================
function setupFactsModal() {
    const btn = document.getElementById('facts-pill-btn');
    const overlay = document.getElementById('facts-modal-overlay');
    const closeBtn = document.getElementById('facts-modal-close');
    if (!btn || !overlay || !closeBtn) return;

    btn.addEventListener('click', () => {
        if (!activeVachanamrutId) return;
        openFactsModal(activeVachanamrutId);
    });
    closeBtn.addEventListener('click', closeFactsModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeFactsModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'flex') closeFactsModal();
    });
}

async function openFactsModal(vachanamrutId) {
    const overlay = document.getElementById('facts-modal-overlay');
    const body = document.getElementById('facts-modal-body');
    const modal = document.getElementById('facts-modal');
    if (!overlay || !body || !modal) return;

    // Inherit current reading theme so colors stay consistent
    modal.classList.remove('theme-sepia', 'theme-dark');
    const card = document.getElementById('vachanamrut-card');
    if (card) {
        if (card.classList.contains('theme-sepia')) modal.classList.add('theme-sepia');
        else if (card.classList.contains('theme-dark')) modal.classList.add('theme-dark');
    }

    body.innerHTML = '<div class="facts-empty">Loading…</div>';
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('facts-modal-open');

    try {
        const facts = await loadVachanamrutFacts(vachanamrutId);
        body.innerHTML = renderFactsModalBody(facts);
    } catch (err) {
        console.error('Facts modal error:', err);
        body.innerHTML = '<div class="facts-empty">Could not load facts.</div>';
    }
}

function closeFactsModal() {
    const overlay = document.getElementById('facts-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('closing');
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('closing');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('facts-modal-open');
    }, 180);
}

// Pull all the data the modal needs in one place.
async function loadVachanamrutFacts(vachanamrutId) {
    await initSql();
    const id = parseInt(vachanamrutId);

    const eventStmt = db.prepare(`
        SELECT vachanamrut_id, gregorian_date, gregorian_date_raw,
               hindu_date_en, hindu_date_gu,
               time_of_day_en, time_of_day_gu,
               location_en, location_gu, town_en, town_gu,
               season_en, season_gu, season_months_en, season_months_gu,
               maharaj_age_years, maharaj_age_days,
               clothing_en, clothing_gu
        FROM timeline_events WHERE vachanamrut_id = :id
    `);
    eventStmt.bind({ ':id': id });
    const event = eventStmt.step() ? eventStmt.getAsObject() : null;
    eventStmt.free();

    if (!event) return { event: null };

    const qStmt = db.prepare(`
        SELECT questioner_name_en, questioner_name_gu, question_text_en, question_text_gu
        FROM vachanamrut_questions WHERE vachanamrut_id = :id ORDER BY id ASC
    `);
    qStmt.bind({ ':id': id });
    const questions = [];
    while (qStmt.step()) questions.push(qStmt.getAsObject());
    qStmt.free();

    // Cross-references — life events and mandirs around this date
    const refsStmt = db.prepare(`
        SELECT 'life' AS source, event_date AS date, name_en, name_gu, event_type AS subtype
        FROM life_events
        UNION ALL
        SELECT 'mandir', consecration_date, name_en, name_gu, 'mandir'
        FROM mandirs
    `);
    const allRefs = [];
    while (refsStmt.step()) allRefs.push(refsStmt.getAsObject());
    refsStmt.free();

    const eventJd = isoToJd(event.gregorian_date);
    const xrefs = allRefs
        .map(r => ({ ...r, deltaDays: isoToJd(r.date) - eventJd }))
        .sort((a, b) => Math.abs(a.deltaDays) - Math.abs(b.deltaDays))
        .slice(0, 3);

    return { event, questions, xrefs };
}

// Format days-from-event as a human phrase.
function formatXrefDelta(deltaDays) {
    const abs = Math.abs(deltaDays);
    const isEnglish = currentLanguage === 'english';
    const beforeAfter = deltaDays > 0
        ? (isEnglish ? 'after' : 'પછી')
        : (isEnglish ? 'before' : 'પહેલાં');
    if (abs === 0) return isEnglish ? 'same day' : 'એ જ દિવસે';
    if (abs < 60) return isEnglish ? `${abs} days ${beforeAfter}` : `${abs} દિવસ ${beforeAfter}`;
    const months = Math.round(abs / 30);
    if (months < 18) return isEnglish ? `${months} months ${beforeAfter}` : `${months} મહિના ${beforeAfter}`;
    const years = (abs / 365.25).toFixed(1);
    return isEnglish ? `${years} years ${beforeAfter}` : `${years} વર્ષ ${beforeAfter}`;
}

function isoToJd(iso) {
    if (!iso) return 0;
    return Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86400000);
}

function renderFactsModalBody(facts) {
    if (!facts.event) {
        return `
            <div class="facts-empty">
                <i class="fas fa-info-circle"></i>
                <div>
                    <span class="lang-eng">No timeline data available for this entry.</span>
                    <span class="lang-guj">આ વચનામૃત માટે કોઈ સમયરેખા માહિતી ઉપલબ્ધ નથી.</span>
                </div>
            </div>`;
    }
    const e = facts.event;

    const ageRow = factRow(
        { en: "Mahārāj's Age", gu: 'મહારાજની ઉંમર' },
        {
            en: `${e.maharaj_age_years} years, ${e.maharaj_age_days} days`,
            gu: `${e.maharaj_age_years} વર્ષ, ${e.maharaj_age_days} દિવસ`,
        },
        { img: 'images/facts/authors/SwaminarayanBhagwaan.webp' }
    );

    const seasonRow = factRow(
        { en: 'Season', gu: 'ઋતુ' },
        {
            en: `${e.season_en || '—'} <span class="fact-secondary">${e.season_months_en || ''}</span>`,
            gu: `${e.season_gu || '—'} <span class="fact-secondary">${e.season_months_gu || ''}</span>`,
        },
        { img: seasonIconFor(e.season_en) }
    );

    // Combined Date + Time tile. Time is shown as a subtitle under the date.
    // Icon prefers the time-of-day PNG (sun/moon/day) when known, else FA calendar.
    const dateStr = e.gregorian_date_raw || e.gregorian_date || '—';
    const todEnLower = (e.time_of_day_en || '').toLowerCase();
    const isUnspecified = !e.time_of_day_en || todEnLower === 'unspecified';
    const todEnDisplay = isUnspecified ? '' : `<span class="fact-secondary">${e.time_of_day_en}</span>`;
    const todGuDisplay = isUnspecified ? '' : `<span class="fact-secondary">${e.time_of_day_gu || e.time_of_day_en}</span>`;
    const dateTimeRow = factRow(
        { en: 'Date & Time', gu: 'તારીખ અને સમય' },
        { en: `${dateStr}${todEnDisplay}`, gu: `${dateStr}${todGuDisplay}` },
        { img: timeOfDayIconFor(e.time_of_day_en), fa: 'fa-calendar-day' }
    );

    const xrefsHtml = (facts.xrefs && facts.xrefs.length)
        ? `<div class="facts-section"><h4 class="facts-section-title"><i class="fas fa-link"></i><span class="lang-eng">Around This Time</span><span class="lang-guj">આ સમય આસપાસ</span></h4><div class="facts-xref-list">${facts.xrefs.map(x => renderXref(x)).join('')}</div></div>`
        : '';

    // Dedupe questioners — Mahārāj often asks several questions in one Vachanamrut.
    const uniqueQuestioners = [];
    const seen = new Set();
    (facts.questions || []).forEach(q => {
        const key = q.questioner_name_en || q.questioner_name_gu || '';
        if (!seen.has(key)) { seen.add(key); uniqueQuestioners.push(q); }
    });
    const questionsHtml = uniqueQuestioners.length
        ? `<div class="facts-section"><h4 class="facts-section-title"><i class="fas fa-comments"></i><span class="lang-eng">Questioners</span><span class="lang-guj">પ્રશ્નકર્તા</span></h4><div class="facts-questioners">${uniqueQuestioners.map(renderQuestioner).join('')}</div></div>`
        : '';

    return `
        <div class="facts-section">
            <div class="facts-grid">
                ${ageRow}${seasonRow}${dateTimeRow}
            </div>
        </div>
        ${xrefsHtml}
        ${questionsHtml}
    `;
}

function factRow(label, value, icon) {
    const iconHtml = renderFactIcon(icon);
    return `
        <div class="fact-row${iconHtml ? ' fact-row-with-icon' : ''}">
            ${iconHtml}
            <div class="fact-row-body">
                <div class="fact-label"><span class="lang-eng">${label.en}</span><span class="lang-guj">${label.gu}</span></div>
                <div class="fact-value lang-eng">${value.en}</div>
                <div class="fact-value lang-guj">${value.gu}</div>
            </div>
        </div>
    `;
}

function renderFactIcon(icon) {
    if (!icon) return '';
    if (icon.img) return `<img class="fact-icon-img" src="${icon.img}" alt="" aria-hidden="true">`;
    if (icon.fa)  return `<span class="fact-icon-fa"><i class="fas ${icon.fa}"></i></span>`;
    return '';
}

// Map season → decorative season image (or winter calendar for Hemant/Shishir).
function seasonIconFor(season_en) {
    const map = {
        'Vasant':  'images/facts/spring-season.png',
        'Grishma': 'images/facts/summer-calendar.png',
        'Varsha':  'images/facts/rainy-season.png',
        'Sharad':  'images/facts/fall-season.png',
        'Hemant':  'images/facts/winter-calendar.png',
        'Shishir': 'images/facts/winter-calendar.png',
    };
    return map[season_en] || null;
}

// Map time of day → sun/moon/day. Returns null for unspecified so the FA fallback kicks in.
function timeOfDayIconFor(tod_en) {
    if (!tod_en) return null;
    const t = tod_en.toLowerCase();
    if (t.includes('night')) return 'images/facts/moon.png';
    if (t.includes('morning') || t.includes('sunrise')) return 'images/facts/day.png';
    if (t.includes('afternoon') || t.includes('evening') || t.includes('noon')) return 'images/facts/sun.png';
    return null;
}

const XREF_EMOJI = {
    mandir:    '🛕',
    scripture: '📖',
    gadi:      '🪑',
    diksha:    '🕉️',
    birth:     '🌟',
    departure: '🕊️',
    milestone: '📍',
};

function renderXref(x) {
    let name = currentLanguage === 'english' ? x.name_en : x.name_gu;
    if (x.source === 'mandir') {
        name = currentLanguage === 'english' ? `${name} Mandir` : `${name} મંદિર`;
    }
    const key = x.source === 'mandir' ? 'mandir' : (x.subtype || 'milestone');
    const emoji = XREF_EMOJI[key] || '📍';
    return `
        <div class="facts-xref">
            <span class="facts-xref-emoji" aria-hidden="true">${emoji}</span>
            <div class="facts-xref-text">
                <strong>${name}</strong>
                <span class="facts-xref-delta">${formatXrefDelta(x.deltaDays)}</span>
            </div>
        </div>
    `;
}

function renderQuestioner(q) {
    return `
        <div class="facts-questioner-chip">
            <i class="fas fa-user"></i>
            <span class="lang-eng">${q.questioner_name_en || '—'}</span>
            <span class="lang-guj">${q.questioner_name_gu || q.questioner_name_en || '—'}</span>
        </div>
    `;
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
    const fabTimeline = document.getElementById('fab-timeline');
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

    // Timeline button click
    if (fabTimeline) {
        fabTimeline.addEventListener('click', () => {
            showScreen('timeline-screen');
            // Close menu
            isMenuOpen = false;
            fabMenu.classList.remove('active');
            fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
        });
    }

    // Settings button click
    fabSettings.addEventListener('click', () => {
        showScreen('settings-screen');
        // Close menu
        isMenuOpen = false;
        fabMenu.classList.remove('active');
        fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });

    // Authors / Compilers button click
    const fabAuthors = document.getElementById('fab-authors');
    if (fabAuthors) {
        fabAuthors.addEventListener('click', () => {
            showScreen('authors-screen');
            isMenuOpen = false;
            fabMenu.classList.remove('active');
            fabBtn.innerHTML = '<i class="fas fa-cog"></i>';
        });
    }

    // Reset App Button
    const resetBtn = document.getElementById('reset-app-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Use setTimeout to ensure the UI is stable before showing the modal
            setTimeout(() => {
                if (confirm('Are you sure you want to reset the app? This will delete all bookmarks and favourites.')) {
                    localStorage.clear();
                    location.reload();
                }
            }, 50);
        });
    }
}

// Show screen
function showScreen(screenId, pushState = true) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show requested screen
    document.getElementById(screenId).classList.add('active');

    // Toggle reading theme class on body
    if (screenId === 'vachanamrut-detail-screen') {
        document.body.classList.add('reading-screen');
    } else {
        document.body.classList.remove('reading-screen');
    }

    // Reset scroll position
    window.scrollTo(0, 0);
    document.getElementById('main-content').scrollTo(0, 0);

    // Reset scroll progress bar
    const progressBar = document.getElementById('scroll-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }



    // Toggle footer and navbar buttons visibility
    if (screenId === 'home-screen') {
        footer.style.display = 'block';
        backBtn.style.display = 'none';
        bookmarkBtn.style.display = 'none';
        fabBtn.style.display = 'flex';

        // Re-render home screen sections to ensure correct language translation
        renderSections();

        // Clear URL query param if going home
        if (pushState) {
            const newUrl = window.location.pathname;
            window.history.pushState({}, '', newUrl);
        }
    } else if (screenId === 'section-detail-screen') {
        footer.style.display = 'block';
        // backBtn and fabBtn are handled in showSectionDetail
    } else if (screenId === 'favourites-screen' || screenId === 'settings-screen' || screenId === 'timeline-screen' || screenId === 'authors-screen') {
        footer.style.display = 'none';
        backBtn.style.display = 'block';
        bookmarkBtn.style.display = 'none';
        fabBtn.style.display = 'none';
        
        if (screenId === 'timeline-screen') {
            renderTimeline();
        }
    } else {
        footer.style.display = 'none';
        // Buttons are handled in showVachanamrut for detail screen
    }

    // Handle reading footer visibility (only visible on reading detail screen)
    const rf = document.getElementById('reading-footer');
    if (screenId === 'vachanamrut-detail-screen') {
        // visibility of rf is set by updateReadingFooter
    } else {
        if (rf) rf.style.display = 'none';
    }

    // Handle audio player visibility
    const isPartharoSectionScreen = screenId === 'section-detail-screen' && currentSection && (currentSection.name_en === 'Partharo' || currentSection.name_gu === 'પરથારો');
    if (screenId === 'vachanamrut-detail-screen' || isPartharoSectionScreen) {
        if (audioEnabled && currentAudioId !== -1) {
            audioPlayerContainer.style.display = 'flex';
            if (isPartharoSectionScreen) {
                audioPlayerContainer.classList.add('no-footer');
            } else {
                audioPlayerContainer.classList.remove('no-footer');
            }
        }
    } else {
        audioPlayerContainer.style.display = 'none';
        
        // Pause audio if leaving the screen
        audioPlayer.pause();
        isPlaying = false;
        updateAudioBarUI();
        audioPlayerContainer.classList.remove('state-bar');
        audioPlayerContainer.classList.add('state-fab');
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
                const sectionIndex = sections.findIndex(s => s.name_gu === currentSection.name_gu);
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
        } else if (favouritesScreen.classList.contains('active') || settingsScreen.classList.contains('active') || timelineScreen.classList.contains('active') || document.getElementById('authors-screen').classList.contains('active')) {
            showScreen('home-screen');
        }
    });

    // View Timeline Button click on home screen
    const viewTimelineBtn = document.getElementById('view-timeline-btn');
    if (viewTimelineBtn) {
        viewTimelineBtn.addEventListener('click', () => {
            showScreen('timeline-screen');
        });
    }

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
    setupReaderControls();
    setupScrollProgress();


    // Set active header language buttons
    const langBtnGuj = document.getElementById('lang-btn-guj');
    const langBtnEng = document.getElementById('lang-btn-eng');
    
    if (langBtnGuj && langBtnEng) {
        if (currentLanguage === 'english') {
            langBtnEng.classList.add('active');
            langBtnGuj.classList.remove('active');
        } else {
            langBtnGuj.classList.add('active');
            langBtnEng.classList.remove('active');
        }

        const switchLanguage = async (selectedLanguage) => {
            if (currentLanguage === selectedLanguage) return;
            
            // Show premium loading overlay
            showLoadingOverlay();
            
            currentLanguage = selectedLanguage;
            localStorage.setItem('appLanguage', currentLanguage);
            document.body.className = currentLanguage;

            // Highlight the active button
            if (currentLanguage === 'english') {
                langBtnEng.classList.add('active');
                langBtnGuj.classList.remove('active');
            } else {
                langBtnGuj.classList.add('active');
                langBtnEng.classList.remove('active');
            }

            try {
                // Reload all data for the new language
                // CRITICAL: Must reload chapter-mappings.json to reset numeric IDs
                // because processSections() only maps IDs when they are numbers.
                // After the first call, they become objects and get skipped on re-run.
                await Promise.all([
                    loadVachanamrutData(),
                    loadChapterMappings(),
                    loadTimelineData()
                ]);
                processSections();

                // Dynamically re-render the active screen
                const activeScreen = document.querySelector('.screen.active');
                const activeScreenId = activeScreen ? activeScreen.id : 'home-screen';

                if (activeScreenId === 'home-screen') {
                    renderSections();
                } else if (activeScreenId === 'section-detail-screen') {
                    if (currentSection) {
                        const sectionIndex = sections.findIndex(s => s.name_gu === currentSection.name_gu || s.name_en === currentSection.name_en);
                        if (sectionIndex !== -1) {
                            showSectionDetail(sectionIndex);
                        } else {
                            showScreen('home-screen');
                        }
                    } else {
                        showScreen('home-screen');
                    }
                                } else if (activeScreenId === 'vachanamrut-detail-screen') {
                    if (activeVachanamrutId !== -1) {
                        const newVachanamrut = vachanamrutData.find(v => v.id === activeVachanamrutId);
                        if (newVachanamrut) {
                            // Sync currentSection & currentSectionVachanamruts with new language data
                            if (currentSection) {
                                const newSec = sections.find(s => s.name_gu === currentSection.name_gu || s.name_en === currentSection.name_en);
                                if (newSec) {
                                    currentSection = newSec;
                                    currentSectionVachanamruts = newSec.vachanamruts;
                                }
                            }
                            showVachanamrut(newVachanamrut, false); // false to not push browser history state
                        } else {
                            showScreen('home-screen');
                        }
                    } else {
                        showScreen('home-screen');
                    }
                } else if (activeScreenId === 'favourites-screen') {
                    renderFavourites();
                } else if (activeScreenId === 'timeline-screen') {
                    renderTimeline();
                }
            } catch (error) {
                console.error('Dynamic language switch error:', error);
            } finally {
                // Smooth fade out
                setTimeout(() => {
                    hideLoadingOverlay();
                }, 300);
            }
        };

        langBtnGuj.addEventListener('click', () => switchLanguage('gujarati'));
        langBtnEng.addEventListener('click', () => switchLanguage('english'));
    }

    // Set media toggles
    const videoToggle = document.getElementById('video-toggle');
    const audioToggle = document.getElementById('audio-toggle');
    
    if (videoToggle) {
        videoToggle.checked = videoEnabled;
        videoToggle.addEventListener('change', () => {
            videoEnabled = videoToggle.checked;
            localStorage.setItem('videoEnabled', videoEnabled);
        });
    }
    
    if (audioToggle) {
        audioToggle.checked = audioEnabled;
        audioToggle.addEventListener('change', () => {
            audioEnabled = audioToggle.checked;
            localStorage.setItem('audioEnabled', audioEnabled);
        });
    }




});

// App Loading Overlay functions
function showLoadingOverlay() {
    let overlay = document.getElementById('app-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'app-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading / લોડ થઈ રહ્યું છે...</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.add('active');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}