// Global variables
let slokas = [];
let currentSloka = null;
let currentLang = 'gujarati'; // 'gujarati', 'english', or 'hindi'
let isLoading = false;

// DOM elements
const listScreen = document.getElementById('list-screen');
const detailScreen = document.getElementById('detail-screen');
const slokasList = document.getElementById('slokas-list');
const slokaImage = document.getElementById('sloka-image');
const slokaSanskrit = document.getElementById('sloka-sanskrit');
const slokaText = document.getElementById('sloka-text');
const slokaTranslation = document.getElementById('sloka-translation');
const languageSelect = document.getElementById('language-select');
const prevSlokaBtn = document.getElementById('prev-sloka-btn');
const nextSlokaBtn = document.getElementById('next-sloka-btn');
const slokaSlider = document.getElementById('sloka-slider');
const slokaCounter = document.getElementById('sloka-counter');
const backBtn = document.getElementById('back-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarkBubble = document.getElementById('bookmark-bubble');


// SQLite Database support
let SQL = null;
let db = null;
let initSqlPromise = null;

async function initSql() {
    if (initSqlPromise) return initSqlPromise;

    initSqlPromise = (async () => {
        if (!SQL) {
            SQL = await initSqlJs({
                locateFile: file => `../js/${file}`
            });
        }
        if (!db) {
            const response = await fetch('./assets/data/shikshapatri.db');
            if (!response.ok) {
                throw new Error(`Failed to load SQLite db: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            db = new SQL.Database(new Uint8Array(arrayBuffer));
        }
    })();

    return initSqlPromise;
}

function getBhashyaForSloka(bhashyaId) {
    if (!db || !bhashyaId) return null;
    try {
        const stmt = db.prepare("SELECT * FROM bhashya WHERE id = :id");
        stmt.bind({ ":id": bhashyaId });
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
            if (result.content && typeof result.content === 'string') {
                result.content = JSON.parse(result.content);
            }
            if (result.verses && typeof result.verses === 'string') {
                result.verses = JSON.parse(result.verses);
            }
        }
        stmt.free();
        return result;
    } catch (err) {
        console.error('Error querying bhashya:', err);
        return null;
    }
}

// Initialize app
async function init() {
    showLoadingState();

    try {
        // Load data from SQLite database (with fallback to data.json)
        try {
            await initSql();
            const stmt = db.prepare("SELECT id, sanskrit, gujarati, english, hindi, bhashya_id FROM slokas ORDER BY id ASC");
            slokas = [];
            while (stmt.step()) {
                slokas.push(stmt.getAsObject());
            }
            stmt.free();
            console.log(`Loaded ${slokas.length} slokas from SQLite (shikshapatri.db)`);
        } catch (dbErr) {
            console.warn('SQLite load failed, falling back to data.json:', dbErr);
            const response = await fetch('assets/data.json');
            slokas = await response.json();
        }

        // Set slider max
        slokaSlider.max = slokas.length;
        slokaSlider.setAttribute('aria-valuemax', slokas.length);

        // Load language: match Vachanamrut system language (gujarati or english) unless locally overridden
        const vachLang = (localStorage.getItem('appLanguage') === 'english') ? 'english' : 'gujarati';
        const lastSyncedLang = localStorage.getItem('shikshapatri-synced-system-lang');
        let overrideLang = localStorage.getItem('shikshapatri-lang-override');

        if (lastSyncedLang !== vachLang) {
            // Vachanamrut system language changed, sync Shikshapatri to match
            overrideLang = null;
            localStorage.removeItem('shikshapatri-lang-override');
            localStorage.setItem('shikshapatri-synced-system-lang', vachLang);
        }

        currentLang = overrideLang || vachLang;
        updateLanguagePills();

        // Update bookmark header button & bubble
        updateHeaderBookmarkBtn();

        // Render slokas list
        renderSlokas();

        // Setup navigation
        setupNavigation();

        // Setup keyboard navigation
        setupKeyboardNavigation();

        // Handle URL deep link (?id=X or #X)
        const urlParams = new URLSearchParams(window.location.search);
        let deepLinkId = urlParams.get('id');
        if (!deepLinkId && window.location.hash) {
            const hash = window.location.hash.replace('#', '').replace('sloka-', '');
            if (!isNaN(parseInt(hash))) deepLinkId = hash;
        }
        if (deepLinkId) {
            const slokaNum = parseInt(deepLinkId);
            if (slokaNum >= 1 && slokaNum <= slokas.length) {
                showSloka(slokaNum, false);
            }
        } else {
            // Auto-scroll to bookmarked sloka on home screen if one exists
            setTimeout(() => scrollToBookmarkedSloka(false), 200);
            setTimeout(() => scrollToBookmarkedSloka(true), 500);
        }

        // Browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.slokaId) {
                showSloka(event.state.slokaId, false);
            } else {
                returnToListScreen(false);
            }
        });

    } catch (error) {
        console.error('Error loading data:', error);
        showErrorState();
    }
}

// Clean trailing sloka numbers from Sanskrit verse (e.g. '।।१૬૧।।' -> '।।')
function cleanSanskritVerse(text) {
    if (!text) return '';
    return text.replace(/(\s*(?:।।|॥|\|\||।|\|)\s*[०-९0-9]+\s*(?:।।|॥|\|\||।|\|)?\s*)$/, ' ।।').trim();
}

// Format bhashya Sanskrit verse with newline after first line
function formatBhashyaShlok(text) {
    if (!text) return '';
    text = text.trim();
    if (text.includes('\n')) {
        return text.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');
    }
    // 1. Break after double danda with verse number when followed by another verse (e.g. ।।७७।। साष्टाङ्ग...)
    text = text.replace(/((?:॥|[।|]{2})\s*[\u0966-\u096F\u0AE6-\u0AEF0-9\s\-–—]*(?:॥|[।|]{2}))\s+(?=[\u0900-\u097F])/g, '$1<br><br>');
    // 2. Break after first line of sloka (single danda with space before or after, followed by next line)
    text = text.replace(/(?<![।|॥])(?:\s+[।|]\s*|\s*[।|]\s+)(?=[\u0900-\u097F])(?![।|॥])/g, ' ।<br>');
    return text;
}

// Convert numbers to Devanagari numerals
function toDevanagari(num) {
    const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).replace(/[0-9]/g, d => devanagariDigits[parseInt(d, 10)]);
}

// Show loading state
function showLoadingState() {
    isLoading = true;
    slokasList.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'sloka-card skeleton';
        skeleton.style.height = '80px';
        skeleton.setAttribute('aria-hidden', 'true');
        slokasList.appendChild(skeleton);
    }
}

// Show error state
function showErrorState() {
    isLoading = false;
    slokasList.innerHTML = `
        <div class="error-message" role="alert">
            <p>Error loading slokas. Please check your connection and try again.</p>
            <button onclick="init()" aria-label="Retry loading slokas">Retry</button>
        </div>
    `;
}

// Render slokas list
function renderSlokas() {
    isLoading = false;
    slokasList.innerHTML = '';
    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');

    slokas.forEach(sloka => {
        const card = document.createElement('div');
        card.className = 'sloka-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Extract first line of Sanskrit
        const firstLine = (sloka.sanskrit || '').split('\n')[0].trim();

        // Get translation based on current language
        let translationText = '';
        if (currentLang === 'english') {
            translationText = sloka.english || '';
        } else if (currentLang === 'hindi') {
            translationText = sloka.hindi || sloka.english || '';
        } else {
            translationText = sloka.gujarati || '';
        }

        const isBookmarked = bookmarkedSloka && parseInt(bookmarkedSloka) === parseInt(sloka.id);
        const ariaPreview = translationText ? translationText.substring(0, 60) : firstLine;
        card.setAttribute('aria-label', `Sloka ${sloka.id}${isBookmarked ? ' (bookmarked)' : ''}: ${ariaPreview}...`);

        if (isBookmarked) {
            card.classList.add('bookmarked');
        }
        card.setAttribute('data-sloka-id', sloka.id);

        // Click handler
        card.onclick = () => showSloka(sloka.id);

        // Keyboard handler
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showSloka(sloka.id);
            }
        };

        // Format full 2-line Sanskrit verse without trailing verse number
        const cleanedSanskrit = cleanSanskritVerse(sloka.sanskrit);
        const sanskritVerses = cleanedSanskrit.replace(/\n/g, '<br>');
        const bookmarkBadge = isBookmarked
            ? `<div class="sloka-card-bookmark" title="Bookmarked Sloka"><i class="fas fa-bookmark" aria-hidden="true"></i></div>`
            : '';

        card.innerHTML = `
            <div class="sloka-header">
                <div class="sloka-number-bubble" aria-hidden="true">${sloka.id}</div>
                <div class="sloka-content-preview">
                    <div class="sloka-sanskrit-preview">${sanskritVerses}</div>
                    <div class="sloka-translation-preview">${translationText}</div>
                </div>
                ${bookmarkBadge}
            </div>
        `;
        slokasList.appendChild(card);
    });
}

// Show sloka detail
function showSloka(id, pushState = true) {
    currentSloka = slokas.find(s => s.id === id);
    if (!currentSloka) return;

    if (pushState) {
        const cleanPath = window.location.pathname;
        window.history.pushState({ slokaId: id }, '', `${cleanPath}?id=${id}`);
    }

    // Set sloka title badge above image
    const slokaTitleBadge = document.getElementById('sloka-title-badge');
    if (slokaTitleBadge) {
        slokaTitleBadge.textContent = `श्लोक ${toDevanagari(id)}`;
    }

    // Set image with lazy loading
    slokaImage.src = `assets/pictorial/${id}.png`;
    slokaImage.alt = `Pictorial illustration for Sloka ${id}`;
    slokaImage.loading = 'lazy';

    // Format Sanskrit verse without trailing verse number (preventing orphan line wrapping)
    const cleanedSanskrit = cleanSanskritVerse(currentSloka.sanskrit);
    slokaSanskrit.innerHTML = cleanedSanskrit.replace(/\n/g, '<br>');

    if (currentLang === 'gujarati') {
        slokaText.textContent = currentSloka.gujarati;
        slokaText.classList.add('gujarati');
        slokaText.classList.remove('hindi');
        slokaTranslation.style.display = 'none';
    } else if (currentLang === 'hindi') {
        slokaText.textContent = currentSloka.hindi || currentSloka.english;
        slokaText.classList.add('hindi');
        slokaText.classList.remove('gujarati');
        slokaTranslation.style.display = 'none';
    } else {
        slokaText.textContent = currentSloka.english;
        slokaText.classList.remove('gujarati');
        slokaText.classList.remove('hindi');
        slokaTranslation.style.display = 'none';
    }

    slokaSlider.value = id;
    slokaSlider.setAttribute('aria-valuenow', id);
    slokaSlider.setAttribute('aria-valuetext', `Sloka ${id} of ${slokas.length}`);
    slokaCounter.textContent = `${id} / ${slokas.length}`;

    listScreen.classList.remove('active');
    detailScreen.classList.add('active');
    backBtn.style.display = 'flex';
    backBtn.setAttribute('aria-label', 'Go back to slokas list');
    backBtn.setAttribute('title', 'Go back to slokas list');
    backBtn.onclick = () => returnToListScreen(true);
    document.getElementById('sloka-navigation').style.display = 'flex';
    const appFooter = document.getElementById('app-footer');
    if (appFooter) appFooter.style.display = 'none';

    // Update bookmark button state in detail view
    updateHeaderBookmarkBtn();

    // Reset scroll position when entering detail view
    window.scrollTo(0, 0);
    document.getElementById('main-content').scrollTop = 0;

    // Render Shatanand Muni Bhashya (only when in Gujarati)
    const bhashyaCard = document.getElementById('bhashya-card');
    const bhashyaBody = document.getElementById('bhashya-body');
    const bhashyaHeader = document.getElementById('bhashya-header');
    const bhashyaToggleIcon = document.getElementById('bhashya-toggle-icon');

    if (bhashyaCard && bhashyaBody && currentSloka.bhashya_id && currentLang === 'gujarati') {
        const bhashya = getBhashyaForSloka(currentSloka.bhashya_id);
        if (bhashya && bhashya.content && bhashya.content.length > 0) {
            let html = '';
            bhashya.content.forEach(item => {
                const text = (item.text || '').trim();
                if (item.type === 'shlok') {
                    html += `<div class="bhashya-shlok">${formatBhashyaShlok(text)}</div>`;
                } else {
                    // Detect if text is a Sanskrit sloka mistakenly marked as paragraph
                    const devChars = (text.match(/[\u0900-\u097F]/g) || []).length;
                    const gujChars = (text.match(/[\u0A80-\u0AFF]/g) || []).length;

                    if (devChars > 15 && gujChars === 0) {
                        html += `<div class="bhashya-shlok">${formatBhashyaShlok(text)}</div>`;
                    } else {
                        // Check if paragraph starts with a Sanskrit verse followed by Gujarati
                        const match = text.match(/^([\u0900-\u097F\s\u0964\u0965।,।\.\-\'\"]{15,}[॥।|]{1,2}\s*[\u0966-\u096F\u0AE6-\u0AEF0-9\s\-–—]+[॥।|]{1,2})\s*(.*)$/s);
                        if (match && match[1] && match[2] && (match[2].match(/[\u0A80-\u0AFF]/g) || []).length > 0) {
                            html += `<div class="bhashya-shlok">${formatBhashyaShlok(match[1].trim())}</div>`;
                            html += `<p class="bhashya-paragraph">${match[2].trim()}</p>`;
                        } else {
                            html += `<p class="bhashya-paragraph">${text}</p>`;
                        }
                    }
                }
            });
            bhashyaBody.innerHTML = html;
            bhashyaCard.style.display = 'block';

            // Collapse by default
            bhashyaBody.style.display = 'none';
            if (bhashyaToggleIcon) bhashyaToggleIcon.style.transform = 'rotate(0deg)';
            if (bhashyaHeader) {
                bhashyaHeader.setAttribute('aria-expanded', 'false');
                bhashyaHeader.onclick = () => {
                    const isCollapsed = bhashyaBody.style.display === 'none';
                    bhashyaBody.style.display = isCollapsed ? 'block' : 'none';
                    bhashyaHeader.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
                    if (bhashyaToggleIcon) {
                        bhashyaToggleIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                };
            }
        } else {
            bhashyaCard.style.display = 'none';
        }
    } else if (bhashyaCard) {
        bhashyaCard.style.display = 'none';
    }

    updateNavButtons();

    // Focus on the content for screen readers
    slokaImage.focus();
}

// Update navigation buttons
function updateNavButtons() {
    const currentId = currentSloka.id;

    prevSlokaBtn.disabled = currentId === 1;
    prevSlokaBtn.setAttribute('aria-label', currentId === 1 ? 'No previous sloka' : `Go to sloka ${currentId - 1}`);

    nextSlokaBtn.disabled = currentId === slokas.length;
    nextSlokaBtn.setAttribute('aria-label', currentId === slokas.length ? 'No next sloka' : `Go to sloka ${currentId + 1}`);
}

// Update language selector value
function updateLanguagePills() {
    if (languageSelect) {
        languageSelect.value = currentLang;
    }
}

// Helper to set back button on list screen to return to Vachanamrut
function setBackToVachanamrut() {
    backBtn.style.display = 'flex';
    backBtn.setAttribute('aria-label', 'Back to Vachanamrut');
    backBtn.setAttribute('title', 'Back to Vachanamrut / વચનામૃત');
    backBtn.onclick = () => {
        window.location.href = '../';
    };
}

// Helper to return from detail view to slokas list
function returnToListScreen(pushState = true) {
    if (pushState) {
        const cleanPath = window.location.pathname;
        window.history.pushState({}, '', cleanPath);
    }
    detailScreen.classList.remove('active');
    listScreen.classList.add('active');
    setBackToVachanamrut();
    renderSlokas();
    updateHeaderBookmarkBtn();
    document.getElementById('sloka-navigation').style.display = 'none';
    const appFooter = document.getElementById('app-footer');
    if (appFooter) appFooter.style.display = 'block';
    currentSloka = null;
    // Scroll to bookmarked sloka when returning to list view
    setTimeout(scrollToBookmarkedSloka, 100);
}

// Setup navigation
function setupNavigation() {
    setBackToVachanamrut();
    updateHeaderBookmarkBtn();

    prevSlokaBtn.onclick = () => {
        if (currentSloka.id > 1) {
            showSloka(currentSloka.id - 1);
        }
    };

    nextSlokaBtn.onclick = () => {
        if (currentSloka.id < slokas.length) {
            showSloka(currentSloka.id + 1);
        }
    };

    slokaSlider.oninput = () => {
        const id = parseInt(slokaSlider.value);
        showSloka(id);
    };

    languageSelect.onchange = (e) => {
        currentLang = e.target.value;
        // Save as a Shikshapatri local override without altering Vachanamrut system language
        localStorage.setItem('shikshapatri-lang-override', currentLang);
        updateLanguagePills();
        if (currentSloka) {
            showSloka(currentSloka.id, false);
        } else {
            renderSlokas();
        }
    };
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Only handle if detail screen is active
        if (!detailScreen.classList.contains('active')) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (currentSloka && currentSloka.id > 1) {
                    e.preventDefault();
                    showSloka(currentSloka.id - 1);
                }
                break;
            case 'ArrowRight':
                if (currentSloka && currentSloka.id < slokas.length) {
                    e.preventDefault();
                    showSloka(currentSloka.id + 1);
                }
                break;
            case 'Escape':
                e.preventDefault();
                backBtn.click();
                break;
            case 'b':
            case 'B':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    toggleBookmark();
                }
                break;
        }
    });
}

// Swipe gesture handling
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}

function handleSwipe() {
    // Only handle swipes on detail screen
    if (!detailScreen.classList.contains('active')) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Check if it's a horizontal swipe (not vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
            // Swipe right - previous sloka
            if (currentSloka && currentSloka.id > 1) {
                showSloka(currentSloka.id - 1);
            }
        } else {
            // Swipe left - next sloka
            if (currentSloka && currentSloka.id < slokas.length) {
                showSloka(currentSloka.id + 1);
            }
        }
    }
}

// Add touch event listeners with passive option for performance
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchend', handleTouchEnd, { passive: true });

// Bookmark functionality
function toggleBookmark() {
    if (!currentSloka) return;

    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');
    if (bookmarkedSloka && parseInt(bookmarkedSloka) === parseInt(currentSloka.id)) {
        // Remove bookmark
        localStorage.removeItem('shikshapatri-bookmark');
    } else {
        // Set bookmark
        localStorage.setItem('shikshapatri-bookmark', currentSloka.id);
    }

    // Update button state and re-render slokas
    updateHeaderBookmarkBtn();
    renderSlokas();
}

function updateHeaderBookmarkBtn() {
    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');
    if (detailScreen.classList.contains('active')) {
        bookmarkBtn.style.display = 'flex';
        updateBookmarkButtonState();
        bookmarkBtn.onclick = toggleBookmark;
    } else {
        if (bookmarkedSloka) {
            bookmarkBtn.style.display = 'flex';
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.setAttribute('aria-label', `Scroll to bookmarked sloka ${bookmarkedSloka}`);
            bookmarkBtn.setAttribute('title', `Go to bookmarked sloka ${bookmarkedSloka}`);
            bookmarkBtn.onclick = scrollToBookmarkedSloka;
        } else {
            bookmarkBtn.style.display = 'none';
            bookmarkBtn.classList.remove('bookmarked');
        }
    }
    updateBookmarkBubble();
}

function updateBookmarkButtonState() {
    if (!currentSloka) return;

    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');
    const isBookmarked = bookmarkedSloka && parseInt(bookmarkedSloka) === parseInt(currentSloka.id);

    if (isBookmarked) {
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.setAttribute('aria-label', 'Remove bookmark from this sloka');
        bookmarkBtn.setAttribute('title', 'Remove bookmark');
        bookmarkBtn.setAttribute('aria-pressed', 'true');
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.setAttribute('aria-label', 'Bookmark this sloka');
        bookmarkBtn.setAttribute('title', 'Bookmark this sloka');
        bookmarkBtn.setAttribute('aria-pressed', 'false');
    }
}

function updateBookmarkBubble() {
    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');
    if (bookmarkedSloka) {
        bookmarkBubble.textContent = bookmarkedSloka;
        bookmarkBubble.style.display = 'flex';
    } else {
        bookmarkBubble.style.display = 'none';
    }
}

function scrollToBookmarkedSloka(smooth = true) {
    const bookmarkedSloka = localStorage.getItem('shikshapatri-bookmark');
    if (!bookmarkedSloka) return;

    // Only scroll if on the list screen
    if (!listScreen || !listScreen.classList.contains('active')) return;

    const slokaElement = document.querySelector(`[data-sloka-id="${bookmarkedSloka}"]`);
    if (slokaElement) {
        slokaElement.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'center'
        });

        slokaElement.classList.add('bookmark-highlight');
        setTimeout(() => {
            slokaElement.classList.remove('bookmark-highlight');
        }, 1600);
    } else {
        setTimeout(() => {
            const el = document.querySelector(`[data-sloka-id="${bookmarkedSloka}"]`);
            if (el && listScreen && listScreen.classList.contains('active')) {
                el.scrollIntoView({
                    behavior: smooth ? 'smooth' : 'auto',
                    block: 'center'
                });
                el.classList.add('bookmark-highlight');
                setTimeout(() => el.classList.remove('bookmark-highlight'), 1600);
            }
        }, 120);
    }
}

// 

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => {
            console.log('SW registered');
            reg.update();
        })
        .catch(err => console.log('SW registration failed'));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

// Start app
init();