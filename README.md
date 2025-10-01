# Vachanamrut Progressive Web App

A clean, modern Progressive Web App for reading Vachanamruts with minimal padding and text-focused design.

## Features

- 📱 Progressive Web App (PWA) - Works offline and can be installed
- 🎯 Clean, minimal design focused on text readability
- 📚 Organized into 9 sections as per traditional categorization
- 🔍 Easy navigation between sections and individual Vachanamruts
- 📱 Responsive design for all devices
- ⚡ Fast loading with service worker caching

## Structure

### Landing Page
The app displays 9 main sections:
- ગઢડા પ્રથમ (78)
- સારંગપુર (18)
- કારિયાણી (12)
- લોયા (18)
- પંચાળા (7)
- ગઢડા મધ્ય (67)
- વરતાલ (20)
- અમદાવાદ (3)
- ગઢડા અંત્ય (39)

### Navigation Flow
1. **Sections Screen**: Choose from 9 main sections
2. **Vachanamruts List**: View all Vachanamruts in selected section
3. **Vachanamrut Detail**: Read the full text with setting and content

## Files Structure

```
vachanamrut-app/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline functionality
├── css/
│   └── styles.css     # Main stylesheet with minimal padding design
├── js/
│   └── app.js         # Main application logic
├── images/
│   ├── icon-192.png   # PWA icons
│   ├── icon-512.png
│   └── app-icon.png
└── assets/
    └── data/          # Vachanamrut JSON files
        ├── vachanamrut-1.json
        ├── vachanamrut-2.json
        └── ...
```

## Technical Implementation

- **Vanilla JavaScript** - No frameworks, fast and lightweight
- **CSS Grid & Flexbox** - Modern responsive layout
- **Service Worker** - Offline capability and caching
- **Progressive Enhancement** - Works on all modern browsers
- **Mobile-First Design** - Optimized for mobile reading

## Data Processing

The app automatically processes the Vachanamrut JSON files to:
1. Extract section names from the `vachanamrut` field
2. Group Vachanamruts by section
3. Sort them by number within each section
4. Display accurate counts for each section

## Installation

1. Copy all files to a web server
2. Access via HTTPS (required for PWA features)
3. The app can be installed on mobile devices via "Add to Home Screen"

## Browser Support

- Chrome/Edge 60+
- Firefox 60+
- Safari 11+
- Mobile browsers with PWA support