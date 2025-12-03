// Global variables
let vachanamrutData = [];
let videoData = [];
let sections = [];
let currentSection = null;

// DOM elements
const sectionsScreen = document.getElementById('sections-screen');
const vachanamrutsScreen = document.getElementById('vachanamruts-screen');
const vachanamrutDetailScreen = document.getElementById('vachanamrut-detail-screen');
const sectionsList = document.getElementById('sections-list');
const vachanamrutsList = document.getElementById('vachanamruts-list');
const sectionTitle = document.getElementById('section-title');
const vachanamrutCard = document.getElementById('vachanamrut-card');
const vachanamrutTitle = document.getElementById('vachanamrut-title');
const vachanamrutVideo = document.getElementById('vachanamrut-video');
const vachanamrutSetting = document.getElementById('vachanamrut-setting');
const vachanamrutText = document.getElementById('vachanamrut-text');
const vachanamrutFooterText = document.getElementById('vachanamrut-footer-text');
const backBtn = document.getElementById('back-btn');
const footer = document.getElementById('footer');

// Initialize app
async function init() {
    try {
        // Load all data
        await Promise.all([
            loadVachanamrutData(),
            loadVideoData()
        ]);

        // Process sections from data
        processSections();

        // Render sections
        renderSections();

        // Setup navigation
        setupNavigation();

        // Initial screen setup
        showScreen('sections-screen');

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

// Process sections from loaded data
function processSections() {
    const sectionMap = {};

    vachanamrutData.forEach(item => {
        const vachanamrutText = item.vachanamrut.trim();

        // Extract section name and number
        let sectionName = '';
        let sectionNumber = 0;

        if (vachanamrutText.includes('ગઢડા પ્રથમ')) {
            sectionName = 'ગઢડા પ્રથમ';
            const match = vachanamrutText.match(/ગઢડા પ્રથમ (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('સારંગપુર')) {
            sectionName = 'સારંગપુર';
            const match = vachanamrutText.match(/સારંગપુર (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('કારિયાણી')) {
            sectionName = 'કારિયાણી';
            const match = vachanamrutText.match(/કારિયાણી (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('લોયા')) {
            sectionName = 'લોયા';
            const match = vachanamrutText.match(/લોયા (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('પંચાળા')) {
            sectionName = 'પંચાળા';
            const match = vachanamrutText.match(/પંચાળા (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('ગઢડા મધ્ય')) {
            sectionName = 'ગઢડા મધ્ય';
            const match = vachanamrutText.match(/ગઢડા મધ્ય (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('વરતાલ')) {
            sectionName = 'વરતાલ';
            const match = vachanamrutText.match(/વરતાલ (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('અમદાવાદ')) {
            sectionName = 'અમદાવાદ';
            const match = vachanamrutText.match(/અમદાવાદ (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        } else if (vachanamrutText.includes('ગઢડા અંત્ય')) {
            sectionName = 'ગઢડા અંત્ય';
            const match = vachanamrutText.match(/ગઢડા અંત્ય (\d+)/);
            sectionNumber = match ? parseInt(match[1]) : 0;
        }

        if (sectionName) {
            if (!sectionMap[sectionName]) {
                sectionMap[sectionName] = [];
            }
            sectionMap[sectionName].push({
                ...item,
                sectionNumber: sectionNumber
            });
        }
    });

    // Convert to array and sort
    sections = Object.entries(sectionMap).map(([name, vachanamruts]) => {
        // Sort vachanamruts by section number
        vachanamruts.sort((a, b) => a.sectionNumber - b.sectionNumber);

        return {
            name: name,
            count: vachanamruts.length,
            vachanamruts: vachanamruts
        };
    });

    // Sort sections in the desired order
    const sectionOrder = [
        'ગઢડા પ્રથમ',
        'સારંગપુર',
        'કારિયાણી',
        'લોયા',
        'પંચાળા',
        'ગઢડા મધ્ય',
        'વરતાલ',
        'અમદાવાદ',
        'ગઢડા અંત્ય'
    ];

    sections.sort((a, b) => {
        const aIndex = sectionOrder.indexOf(a.name);
        const bIndex = sectionOrder.indexOf(b.name);
        return aIndex - bIndex;
    });

    console.log('Processed sections:', sections);
}

// Render sections (landing page)
function renderSections() {
    sectionsList.innerHTML = '';

    sections.forEach(section => {
        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
            <div class="section-header">
                <h3 class="section-name">${section.name}</h3>
                <span class="section-count">(${section.count})</span>
            </div>
        `;

        card.addEventListener('click', () => showSection(section));
        sectionsList.appendChild(card);
    });
}

// Show section vachanamruts
function showSection(section) {
    currentSection = section;
    sectionTitle.textContent = `${section.name} (${section.count})`;

    vachanamrutsList.innerHTML = '';

    section.vachanamruts.forEach(vachanamrut => {
        const item = document.createElement('div');
        item.className = 'vachanamrut-item';

        // Clean title
        const title = vachanamrut.title ? vachanamrut.title.replace(/\n/g, ' ').trim() : '';

        item.innerHTML = `
            <span class="vachanamrut-number">${vachanamrut.vachanamrut.trim()}</span>
            <span class="vachanamrut-title">${title}</span>
        `;

        item.addEventListener('click', () => showVachanamrut(vachanamrut));
        vachanamrutsList.appendChild(item);
    });

    showScreen('vachanamruts-screen');
    backBtn.style.display = 'block';
}

// Show vachanamrut detail
function showVachanamrut(vachanamrut) {
    vachanamrutTitle.textContent = vachanamrut.vachanamrut.trim();

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

    // Toggle footer visibility
    if (screenId === 'sections-screen' || screenId === 'vachanamruts-screen') {
        footer.style.display = 'block';
    } else {
        footer.style.display = 'none';
    }
}

// Setup navigation
function setupNavigation() {
    backBtn.addEventListener('click', () => {
        if (vachanamrutDetailScreen.classList.contains('active')) {
            // Go back to vachanamruts list
            showScreen('vachanamruts-screen');
        } else if (vachanamrutsScreen.classList.contains('active')) {
            // Go back to sections
            showScreen('sections-screen');
            backBtn.style.display = 'none';
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
        if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50) {
            // Right swipe - go back
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