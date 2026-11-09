/**
 * Waveify — Modern YouTube Playlist Player Engine
 * Author: Akash Wawdhane
 * Enhanced with modern streaming app UX, Queue, Favorites, Sleep Timer, Curated Playlists, and Visualizer.
 */

// --- Default Configuration & Storage Keys ---
const DEFAULT_API_KEY = 'AIzaSyDFBQ4-uJ6ORdJb72BwcFtQiPRTblA6Tng';
const STORAGE_KEYS = {
    STATE: 'waveify_player_state_v2',
    FAVORITES: 'waveify_favorites_v2',
    LIBRARY: 'waveify_saved_library_v2',
    CUSTOM_KEY: 'waveify_custom_api_key'
};

// --- App State ---
const state = {
    apiKey: localStorage.getItem(STORAGE_KEYS.CUSTOM_KEY) || DEFAULT_API_KEY,
    currentView: 'playlist', // 'playlist' | 'discover' | 'favorites' | 'queue'
    playlistId: null,
    playlistInfo: null,
    tracks: [],
    originalTracks: [],
    filteredTracks: [],
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0: None, 1: Repeat All, 2: Repeat One
    playbackRate: 1.0,
    volume: 100,
    theme: 'dark',
    activeContextTrack: null,
    sleepTimerTimeout: null,
    sleepTimerInterval: null,
    sleepTimerEndTimestamp: null,
    stopAtEndOfTrack: false
};

// Favorites & Library Collections
let favorites = [];
let savedLibrary = [];

// --- Curated Built-in Playlists (Ready to stream without API dependencies) ---
const CURATED_PLAYLISTS = [
    {
        id: 'curated-lofi',
        title: 'Lofi Chill & Study Beats',
        description: 'Mellow beats, cozy melodies, and relaxing soundscapes for studying, coding, or sleeping.',
        cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
        tag: 'LOFI CHILL',
        channelTitle: 'Lofi Girl & ChillHop',
        tracks: [
            { id: 'lofi_1', videoId: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', channelTitle: 'Lofi Girl', thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300' },
            { id: 'lofi_2', videoId: '5qap5aO4i9A', title: 'ChilledCow - Lofi Hip Hop Beats (Classics)', channelTitle: 'Lofi Girl', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
            { id: 'lofi_3', videoId: 'DWcJFNfaw9c', title: 'Kupla - Kingdom in Blue (Full Album)', channelTitle: 'ChilledCow Records', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
            { id: 'lofi_4', videoId: 'rUxyKA_-grg', title: 'potsu - [just friends]', channelTitle: 'potsu', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
            { id: 'lofi_5', videoId: 'n61ULEU7QD0', title: 'Idealism - Both of Us', channelTitle: 'idealism', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300' },
            { id: 'lofi_6', videoId: 'DeumyOzKqgI', title: 'coffee shop radio // 24/7 lofi hip-hop', channelTitle: 'STEEZYASFUCK', thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300' }
        ]
    },
    {
        id: 'curated-synthwave',
        title: 'Synthwave & Cyberpunk Coding',
        description: 'Neon retro-futuristic synth music and retro electronic beats for deep coding sessions.',
        cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
        tag: 'SYNTHWAVE',
        channelTitle: 'NewRetroWave',
        tracks: [
            { id: 'synth_1', videoId: 'MV_3Dpw-BRY', title: 'Kavinsky - Nightcall (Drive Soundtrack)', channelTitle: 'Kavinsky', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
            { id: 'synth_2', videoId: 'er416SiqqR0', title: 'The Midnight - Sunset', channelTitle: 'The Midnight', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
            { id: 'synth_3', videoId: '8bX2gDwt8dE', title: 'HOME - Resonance', channelTitle: 'Electronic Gems', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
            { id: 'synth_4', videoId: 'IGqeyQhBPMI', title: 'Gunship - Tech Noir', channelTitle: 'GUNSHIP Music', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
            { id: 'synth_5', videoId: '2V34Q8jK7pU', title: 'Timecop1983 - On the Run', channelTitle: 'Timecop1983', thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300' }
        ]
    },
    {
        id: 'curated-tophits',
        title: 'Global Top Hits & Pop',
        description: 'The world’s biggest streaming anthems, chart-toppers, and viral global favorites.',
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        tag: 'TOP HITS',
        channelTitle: 'Top Hits Official',
        tracks: [
            { id: 'pop_1', videoId: '4NRXx6U8ABQ', title: 'The Weeknd - Blinding Lights', channelTitle: 'The Weeknd', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
            { id: 'pop_2', videoId: 'TUVcZfQe-Kw', title: 'Dua Lipa - Levitating', channelTitle: 'Dua Lipa', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
            { id: 'pop_3', videoId: 'H5v3kku4y6Q', title: 'Harry Styles - As It Was', channelTitle: 'Harry Styles', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
            { id: 'pop_4', videoId: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', channelTitle: 'Queen Official', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
            { id: 'pop_5', videoId: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', channelTitle: 'Ed Sheeran', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300' }
        ]
    },
    {
        id: 'curated-focus',
        title: 'Deep Focus & Ambient Piano',
        description: 'Peaceful solo piano and minimalist modern neoclassical textures for intense productivity.',
        cover: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=600&auto=format&fit=crop&q=80',
        tag: 'FOCUS PIANO',
        channelTitle: 'Neoclassical & Ambient',
        tracks: [
            { id: 'foc_1', videoId: 'q76bMs-NwRk', title: 'Ludovico Einaudi - Nuvole Bianche', channelTitle: 'Ludovico Einaudi', thumbnail: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=300' },
            { id: 'foc_2', videoId: 'koc38oXh3k0', title: 'Yiruma - River Flows in You', channelTitle: 'Yiruma Official', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
            { id: 'foc_3', videoId: 'b8m9zhNAgKs', title: 'Max Richter - On The Nature of Daylight', channelTitle: 'Max Richter', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
            { id: 'foc_4', videoId: '1yZ2P0t4qS8', title: 'Hans Zimmer - Time (Inception Soundtrack)', channelTitle: 'Hans Zimmer', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' }
        ]
    },
    {
        id: 'curated-workout',
        title: 'High Energy Electronic & Workout',
        description: 'Driving festival bass, energetic EDM anthems, and adrenaline-pumping workout tracks.',
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        tag: 'EDM WORKOUT',
        channelTitle: 'Ultra & Spinnin',
        tracks: [
            { id: 'edm_1', videoId: 'IcrbM1l_BoI', title: 'Avicii - Wake Me Up', channelTitle: 'Avicii', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
            { id: 'edm_2', videoId: 'gCYcHz2k5x0', title: 'Martin Garrix - Animals', channelTitle: 'Spinnin Records', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
            { id: 'edm_3', videoId: '60ItHLz5WEA', title: 'Alan Walker - Faded', channelTitle: 'Alan Walker', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
            { id: 'edm_4', videoId: '2vjPBrBU-TM', title: 'Sia - Chandelier', channelTitle: 'Sia', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' }
        ]
    },
    {
        id: 'curated-acoustic',
        title: 'Acoustic Coffeehouse Vibes',
        description: 'Intimate acoustic guitars, soft warm vocals, and indie folk acoustic coffee tunes.',
        cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
        tag: 'ACOUSTIC',
        channelTitle: 'Acoustic Sessions',
        tracks: [
            { id: 'ac_1', videoId: 'uJ_1HMAGb4k', title: 'Vance Joy - Riptide', channelTitle: 'Vance Joy', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300' },
            { id: 'ac_2', videoId: 'RBumgq5yVrA', title: 'Passenger - Let Her Go', channelTitle: 'Passenger', thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300' },
            { id: 'ac_3', videoId: 'lp-EO5I60KA', title: 'Ed Sheeran - Thinking Out Loud', channelTitle: 'Ed Sheeran', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
            { id: 'ac_4', videoId: 'hLQl3WQQoQ0', title: 'Adele - Someone Like You (Acoustic)', channelTitle: 'Adele', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' }
        ]
    }
];

// --- DOM References ---
const DOM = {
    // Navigation & Views
    sidebar: document.getElementById('app-sidebar'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item, .mobile-nav-item'),
    viewPanels: {
        playlist: document.getElementById('view-playlist'),
        discover: document.getElementById('view-discover'),
        favorites: document.getElementById('view-favorites'),
        queue: document.getElementById('view-queue')
    },
    favCounter: document.getElementById('fav-counter'),
    sidebarLibraryList: document.getElementById('sidebar-library-list'),
    openAddPlaylistBtn: document.getElementById('open-add-playlist-btn'),

    // Header & Input
    form: document.getElementById('load-playlist-form'),
    urlInput: document.getElementById('playlist-url'),
    loadBtn: document.getElementById('load-btn'),
    errorBanner: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    errorClose: document.getElementById('error-close-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    sleepTimerBtn: document.getElementById('sleep-timer-btn'),
    sleepTimerLabel: document.getElementById('sleep-timer-label'),
    apiSettingsBtn: document.getElementById('api-settings-btn'),
    shortcutsBtn: document.getElementById('shortcuts-btn'),

    // Hero Section
    playlistHero: document.getElementById('playlist-hero'),
    thumb: document.getElementById('playlist-thumbnail'),
    title: document.getElementById('playlist-title'),
    desc: document.getElementById('playlist-desc'),
    owner: document.getElementById('playlist-owner'),
    count: document.getElementById('playlist-count'),
    durationMeta: document.getElementById('playlist-duration'),
    playAllBtn: document.getElementById('play-all-btn'),
    heroPlayBtn: document.getElementById('hero-play-btn'),
    heroShuffleBtn: document.getElementById('hero-shuffle-btn'),
    savePlaylistBtn: document.getElementById('save-playlist-btn'),
    syncBtn: document.getElementById('sync-playlist-btn'),
    shareBtn: document.getElementById('share-playlist-btn'),
    heroBadge: document.getElementById('hero-badge'),

    // Tracklist View
    trackSearchInput: document.getElementById('track-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    toolbarStats: document.getElementById('toolbar-stats'),
    trackContainer: document.getElementById('playlist-tracks'),
    emptyDiscoverBtn: document.getElementById('empty-discover-btn'),

    // Discover & Favorites Views
    curatedGrid: document.getElementById('curated-grid'),
    favoritesTracks: document.getElementById('favorites-tracks'),
    favCountMeta: document.getElementById('fav-count-meta'),
    playFavoritesBtn: document.getElementById('play-favorites-btn'),
    shuffleFavoritesBtn: document.getElementById('shuffle-favorites-btn'),

    // Queue View
    queueNowPlaying: document.getElementById('queue-now-playing'),
    queueNextTracks: document.getElementById('queue-next-tracks'),
    clearQueueBtn: document.getElementById('clear-queue-btn'),

    // Bottom Player Bar
    appPlayer: document.getElementById('app-player'),
    nowPlayingCover: document.getElementById('open-cinema-btn'),
    nowPlayingThumb: document.getElementById('now-playing-thumb'),
    nowPlayingTitle: document.getElementById('now-playing-title'),
    nowPlayingPlaylist: document.getElementById('now-playing-playlist'),
    likeCurrentBtn: document.getElementById('like-current-btn'),
    miniEqualizer: document.getElementById('mini-equalizer'),

    // Controls
    playPauseBtn: document.getElementById('play-pause-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    repeatBtn: document.getElementById('repeat-btn'),
    speedBtn: document.getElementById('speed-btn'),
    speedLabel: document.getElementById('speed-label'),
    playerQueueBtn: document.getElementById('player-queue-btn'),
    cinemaToggleBtn: document.getElementById('cinema-toggle-btn'),

    // Progress
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    seekBar: document.getElementById('seek-bar'),
    seekTooltip: document.getElementById('seek-tooltip'),

    // Volume
    muteBtn: document.getElementById('mute-btn'),
    volumeSlider: document.getElementById('volume-slider'),

    // Cinema Overlay
    cinemaOverlay: document.getElementById('cinema-overlay'),
    cinemaCloseBtn: document.getElementById('cinema-close-btn'),
    cinemaVinyl: document.getElementById('cinema-vinyl'),
    cinemaThumb: document.getElementById('cinema-thumb'),
    cinemaTitle: document.getElementById('cinema-title'),
    cinemaArtist: document.getElementById('cinema-artist'),
    cinemaCurrentTime: document.getElementById('cinema-current-time'),
    cinemaDuration: document.getElementById('cinema-duration'),
    cinemaSeekBar: document.getElementById('cinema-seek-bar'),
    cinemaPlayPauseBtn: document.getElementById('cinema-play-pause-btn'),
    cinemaPrevBtn: document.getElementById('cinema-prev-btn'),
    cinemaNextBtn: document.getElementById('cinema-next-btn'),
    cinemaShuffleBtn: document.getElementById('cinema-shuffle-btn'),
    cinemaRepeatBtn: document.getElementById('cinema-repeat-btn'),

    // Modals & Popups
    apiModal: document.getElementById('api-modal'),
    closeApiModal: document.getElementById('close-api-modal'),
    customApiKeyInput: document.getElementById('custom-api-key-input'),
    saveApiKeyBtn: document.getElementById('save-api-key-btn'),
    resetApiKeyBtn: document.getElementById('reset-api-key-btn'),
    apiStatusText: document.getElementById('api-status-text'),

    sleepModal: document.getElementById('sleep-modal'),
    closeSleepModal: document.getElementById('close-sleep-modal'),
    timerOptionBtns: document.querySelectorAll('.timer-option-btn'),
    timerActiveInfo: document.getElementById('timer-active-info'),
    timerCountdown: document.getElementById('timer-countdown'),

    shortcutsModal: document.getElementById('shortcuts-modal'),
    closeShortcutsModal: document.getElementById('close-shortcuts-modal'),

    toastContainer: document.getElementById('toast-container'),
    contextMenu: document.getElementById('track-context-menu'),
    ctxPlayNow: document.getElementById('ctx-play-now'),
    ctxPlayNext: document.getElementById('ctx-play-next'),
    ctxAddQueue: document.getElementById('ctx-add-queue'),
    ctxCopyLink: document.getElementById('ctx-copy-link'),
    ctxOpenYt: document.getElementById('ctx-open-yt')
};

// --- YouTube IFrame API State ---
let player;
let isPlayerReady = false;
let progressInterval = null;
let consecutiveErrors = 0;
let isTransitioning = false;
let autoplayRetryTimeout = null;
let lastCurrentTime = 0;
let consecutiveStalls = 0;

// Silent audio loop to maintain background playback permission on mobile devices
const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
silentAudio.loop = true;

function enableBackgroundAudio() {
    try {
        silentAudio.play().catch(() => {});
    } catch (e) {}
}

function disableBackgroundAudio() {
    try {
        silentAudio.pause();
    } catch (e) {}
}

// --- YouTube IFrame API Callback ---
window.onYouTubeIframeAPIReady = function() {
    const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
        ? window.location.origin
        : undefined;

    const playerVars = {
        'playsinline': 1,
        'autoplay': 1,
        'controls': 0,
        'disablekb': 1,
        'fs': 0,
        'rel': 0,
        'enablejsapi': 1
    };

    if (origin) {
        playerVars.origin = origin;
    }

    player = new YT.Player('youtube-player', {
        height: '200',
        width: '200',
        videoId: '',
        playerVars: playerVars,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
};

function onPlayerReady(event) {
    isPlayerReady = true;
    try {
        player.setVolume(state.volume);
    } catch (e) {}

    setupMediaSessionHandlers();

    // Cue initial track if exists
    if (state.tracks.length > 0 && state.currentIndex >= 0 && state.currentIndex < state.tracks.length) {
        try {
            player.cueVideoById(state.tracks[state.currentIndex].videoId);
        } catch (e) {}
        updatePlayerUI();
    }
}

function onPlayerStateChange(event) {
    // YT.PlayerState: UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
    if (event.data === YT.PlayerState.PLAYING) {
        state.isPlaying = true;
        isTransitioning = false;
        consecutiveErrors = 0;
        updatePlayPauseIcons(true);
        startProgressInterval();
        enableBackgroundAudio();
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        const curr = (player && player.getCurrentTime) ? (player.getCurrentTime() || 0) : 0;
        const dur = (player && player.getDuration) ? (player.getDuration() || 0) : 0;

        // Watchdog near end of track
        if (dur > 0 && curr >= dur - 1.2 && !isTransitioning) {
            triggerSongEnd();
            return;
        }

        if (!isTransitioning) {
            state.isPlaying = false;
            updatePlayPauseIcons(false);
            stopProgressInterval();
            disableBackgroundAudio();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    } else if (event.data === YT.PlayerState.BUFFERING) {
        const curr = (player && player.getCurrentTime) ? (player.getCurrentTime() || 0) : 0;
        const dur = (player && player.getDuration) ? (player.getDuration() || 0) : 0;

        if (dur > 0 && curr >= dur - 1.0 && !isTransitioning) {
            triggerSongEnd();
            return;
        }
        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        DOM.cinemaPlayPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else if (event.data === YT.PlayerState.ENDED) {
        triggerSongEnd();
    } else if (event.data === YT.PlayerState.CUED || event.data === -1) {
        if (state.isPlaying || isTransitioning) {
            try {
                player.playVideo();
            } catch (e) {}
        }
    }
}

function onPlayerError(event) {
    console.warn("YouTube Player Error:", event.data);
    consecutiveErrors++;

    if (consecutiveErrors >= 6) {
        showError("Multiple consecutive tracks cannot be played embedded. Skipping stopped.");
        state.isPlaying = false;
        updatePlayPauseIcons(false);
        return;
    }

    showToast("Skipped unplayable or restricted video.", "circle-exclamation");
    setTimeout(playNext, 450);
}

function updatePlayPauseIcons(isPlaying) {
    const iconHtml = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    DOM.playPauseBtn.innerHTML = iconHtml;
    DOM.cinemaPlayPauseBtn.innerHTML = iconHtml;
    DOM.heroPlayBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i> Pause' : '<i class="fa-solid fa-play"></i> Play All';
    DOM.playAllBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';

    if (isPlaying) {
        DOM.cinemaVinyl.classList.add('playing');
        DOM.miniEqualizer.style.display = 'flex';
    } else {
        DOM.cinemaVinyl.classList.remove('playing');
        DOM.miniEqualizer.style.display = 'none';
    }
}

// --- Navigation & View Switching ---
function switchView(viewName) {
    state.currentView = viewName;

    // Update active nav links
    DOM.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update view panels
    Object.keys(DOM.viewPanels).forEach(key => {
        if (DOM.viewPanels[key]) {
            DOM.viewPanels[key].classList.toggle('active-view', key === viewName);
        }
    });

    // Close mobile sidebar if open
    DOM.sidebar.classList.remove('mobile-open');

    // Specific view updates
    if (viewName === 'discover') {
        renderCuratedGrid();
    } else if (viewName === 'favorites') {
        renderFavoritesView();
    } else if (viewName === 'queue') {
        renderQueueView();
    }
}

DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchView(item.dataset.view);
    });
});

if (DOM.mobileMenuBtn) {
    DOM.mobileMenuBtn.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('mobile-open');
    });
}

// --- Curated Hub Render ---
function renderCuratedGrid() {
    DOM.curatedGrid.innerHTML = '';
    CURATED_PLAYLISTS.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'curated-card';
        card.innerHTML = `
            <div class="curated-cover-box">
                <img src="${playlist.cover}" alt="${escapeHTML(playlist.title)}" class="curated-cover-img" loading="lazy">
                <span class="curated-tag">${playlist.tag}</span>
                <button class="curated-play-btn" title="Stream this playlist">
                    <i class="fa-solid fa-play"></i>
                </button>
            </div>
            <div class="curated-info">
                <div class="curated-title">${escapeHTML(playlist.title)}</div>
                <div class="curated-desc">${escapeHTML(playlist.description)}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            loadCuratedPlaylist(playlist);
        });

        DOM.curatedGrid.appendChild(card);
    });
}

function loadCuratedPlaylist(playlist) {
    state.playlistId = playlist.id;
    state.playlistInfo = {
        title: playlist.title,
        description: playlist.description,
        channelTitle: playlist.channelTitle,
        thumbnails: { high: { url: playlist.cover } }
    };
    state.originalTracks = [...playlist.tracks];
    state.tracks = state.isShuffle ? shuffleArray([...playlist.tracks]) : [...playlist.tracks];
    state.filteredTracks = [...state.tracks];
    state.currentIndex = 0;

    renderPlaylistHero();
    renderTrackList();
    switchView('playlist');
    playSong(0);
    saveState();
    showToast(`Loaded "${playlist.title}"`, "circle-check");
}

if (DOM.emptyDiscoverBtn) {
    DOM.emptyDiscoverBtn.addEventListener('click', () => {
        switchView('discover');
    });
}

// --- Playlist Fetching & Loading ---
DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.urlInput.blur();
    const url = DOM.urlInput.value.trim();
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
        showError('Invalid YouTube Playlist URL. Please ensure the link contains "list=...".');
        return;
    }

    try {
        hideError();
        DOM.loadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        showToast('Fetching playlist from YouTube...', 'arrows-rotate');

        const info = await fetchPlaylistInfo(playlistId);
        if (!info || !info.items || info.items.length === 0) {
            throw new Error('Playlist not found, private, or blocked by API restriction.');
        }

        const items = await fetchAllPlaylistItems(playlistId);

        const validTracks = items.filter(item => {
            const t = item.snippet?.title || '';
            return t !== 'Private video' && t !== 'Deleted video';
        }).map(item => ({
            id: item.id,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || 'YouTube Artist',
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'
        }));

        if (validTracks.length === 0) {
            throw new Error('This playlist has no public playable tracks.');
        }

        state.playlistId = playlistId;
        state.playlistInfo = info.items[0].snippet;
        state.originalTracks = [...validTracks];
        state.tracks = state.isShuffle ? shuffleArray([...validTracks]) : [...validTracks];
        state.filteredTracks = [...state.tracks];
        state.currentIndex = 0;

        renderPlaylistHero();
        renderTrackList();
        switchView('playlist');
        playSong(0);
        saveState();
        showToast(`Loaded ${validTracks.length} tracks successfully!`, 'circle-check');

    } catch (err) {
        console.error(err);
        let msg = err.message || 'Failed to load playlist.';
        if (msg.includes('referer') || msg.includes('403')) {
            msg += ' (Tip: Open "API Key" settings above to set your own unrestricted key).';
        }
        showError(msg);
        showToast('Playlist load error. Click API Key for settings.', 'circle-exclamation');
    } finally {
        DOM.loadBtn.innerHTML = '<span>Load</span> <i class="fa-solid fa-arrow-right"></i>';
    }
});

function extractPlaylistId(url) {
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

async function fetchPlaylistInfo(playlistId) {
    const key = state.apiKey || DEFAULT_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `YouTube API returned status ${res.status}`);
    }
    return res.json();
}

async function fetchAllPlaylistItems(playlistId) {
    const key = state.apiKey || DEFAULT_API_KEY;
    let items = [];
    let nextPageToken = '';

    do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${key}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error?.message || `Failed to fetch tracks (${res.status})`);
        }
        const data = await res.json();
        items = items.concat(data.items || []);
        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken && items.length < 300); // cap to 300 tracks for optimal performance

    return items;
}

// --- Render Playlist Hero ---
function renderPlaylistHero() {
    if (!state.playlistInfo) return;

    const info = state.playlistInfo;
    const thumbUrl = info.thumbnails?.high?.url || info.thumbnails?.medium?.url || info.thumbnails?.default?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';

    DOM.thumb.src = thumbUrl;
    DOM.title.textContent = info.title || 'Untitled Playlist';
    DOM.desc.textContent = info.description ? info.description.substring(0, 180) + '...' : 'Enjoy streaming seamless music powered by Waveify.';
    DOM.owner.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${escapeHTML(info.channelTitle || 'Curator')}`;
    DOM.count.textContent = `${state.tracks.length} tracks`;
    DOM.durationMeta.textContent = `~${Math.round(state.tracks.length * 3.5)} min`;

    DOM.heroBadge.textContent = state.playlistId.startsWith('curated-') ? 'CURATED VIBE' : 'PUBLIC PLAYLIST';

    // Update save to library bookmark icon state
    updateSaveBookmarkState();
}

// --- Render Tracklist ---
function renderTrackList() {
    const query = (DOM.trackSearchInput.value || '').trim().toLowerCase();
    let displayList = state.tracks;

    if (query) {
        displayList = state.tracks.filter(t => 
            t.title.toLowerCase().includes(query) || 
            t.channelTitle.toLowerCase().includes(query)
        );
        DOM.clearSearchBtn.classList.remove('hidden');
        DOM.toolbarStats.textContent = `Showing ${displayList.length} of ${state.tracks.length} tracks`;
    } else {
        DOM.clearSearchBtn.classList.add('hidden');
        DOM.toolbarStats.textContent = `Showing all ${state.tracks.length} tracks`;
    }

    state.filteredTracks = displayList;
    DOM.trackContainer.innerHTML = '';

    if (displayList.length === 0) {
        DOM.trackContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-illustration"><i class="fa-solid fa-magnifying-glass"></i></div>
                <h3>No Tracks Found</h3>
                <p>No songs match "${escapeHTML(query)}". Try another search or clear the filter.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    displayList.forEach((track, idx) => {
        const isCurrent = (state.currentIndex >= 0 && state.tracks[state.currentIndex]?.videoId === track.videoId);
        const isLiked = isTrackLiked(track.videoId);
        const originalIndex = state.tracks.findIndex(t => t.videoId === track.videoId);

        const row = document.createElement('div');
        row.className = `track-row ${isCurrent ? 'active' : ''}`;
        row.dataset.index = originalIndex;

        row.innerHTML = `
            <div class="track-num-cell">
                ${isCurrent && state.isPlaying 
                    ? `<div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>` 
                    : `<span class="track-num-text">${idx + 1}</span><i class="fa-solid fa-play track-row-play-icon"></i>`
                }
            </div>
            <div class="track-title-cell">
                <img src="${track.thumbnail}" alt="Thumbnail" class="track-thumb-img" loading="lazy">
                <div class="track-text-meta">
                    <span class="track-title-text">${escapeHTML(track.title)}</span>
                    <span class="track-artist-mobile">${escapeHTML(track.channelTitle)}</span>
                </div>
            </div>
            <div class="track-channel-cell">
                ${escapeHTML(track.channelTitle)}
            </div>
            <div class="track-actions-cell">
                <button class="row-action-btn like-track-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Unlike' : 'Like'}">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <button class="row-action-btn more-track-btn" title="More options">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
            </div>
        `;

        // Click row to play song
        row.addEventListener('click', (e) => {
            if (e.target.closest('.row-action-btn')) return;
            playSong(originalIndex);
        });

        // Like button inside row
        const likeBtn = row.querySelector('.like-track-btn');
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLikeTrack(track);
            const nowLiked = isTrackLiked(track.videoId);
            likeBtn.classList.toggle('liked', nowLiked);
            likeBtn.querySelector('i').className = `${nowLiked ? 'fa-solid' : 'fa-regular'} fa-heart`;
            updateLikeButtonState();
        });

        // Context menu trigger
        const moreBtn = row.querySelector('.more-track-btn');
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openContextMenu(e, track, originalIndex);
        });

        fragment.appendChild(row);
    });

    DOM.trackContainer.appendChild(fragment);
}

// Track Search Filter Listener
DOM.trackSearchInput.addEventListener('input', () => {
    renderTrackList();
});

DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.trackSearchInput.value = '';
    renderTrackList();
});

// --- Player Controls & Playback Engine ---
function playSong(index) {
    if (index < 0 || index >= state.tracks.length) {
        isTransitioning = false;
        return;
    }

    state.currentIndex = index;
    state.isPlaying = true;
    const track = state.tracks[index];

    // Immediate UI sync for zero visual latency
    updatePlayerUI();
    updatePlayPauseIcons(true);
    startProgressInterval();

    // YouTube playback
    if (isPlayerReady && player) {
        try {
            player.loadVideoById({
                videoId: track.videoId,
                startSeconds: 0
            });
            player.setPlaybackRate(state.playbackRate);
        } catch (e) {
            try {
                player.loadVideoById(track.videoId);
            } catch (err) {}
        }

        // Mobile autoplay watchdog
        clearTimeout(autoplayRetryTimeout);
        autoplayRetryTimeout = setTimeout(() => {
            if (isPlayerReady && state.isPlaying) {
                try {
                    const s = player.getPlayerState();
                    if (s !== YT.PlayerState.PLAYING && s !== YT.PlayerState.BUFFERING) {
                        player.playVideo();
                    }
                } catch (e) {}
            }
        }, 750);
    }

    saveState();
}

function togglePlay() {
    if (!isPlayerReady || state.tracks.length === 0) return;

    if (state.currentIndex === -1 && state.tracks.length > 0) {
        playSong(0);
        return;
    }

    if (state.isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function playNext() {
    if (state.tracks.length === 0) {
        isTransitioning = false;
        return;
    }

    // Check custom queue first
    if (state.queue.length > 0) {
        const nextTrack = state.queue.shift();
        const foundIdx = state.tracks.findIndex(t => t.videoId === nextTrack.videoId);
        if (foundIdx !== -1) {
            playSong(foundIdx);
            return;
        }
    }

    if (state.repeatMode === 2) {
        // Repeat One
        try {
            player.seekTo(0);
            player.playVideo();
        } catch (e) {}
        isTransitioning = false;
        return;
    }

    if (state.currentIndex < state.tracks.length - 1) {
        playSong(state.currentIndex + 1);
    } else if (state.repeatMode === 1) {
        // Repeat All
        playSong(0);
    } else {
        // End reached
        try {
            player.stopVideo();
        } catch (e) {}
        state.isPlaying = false;
        updatePlayPauseIcons(false);
        isTransitioning = false;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }
}

function playPrev() {
    if (state.tracks.length === 0) return;

    try {
        if (player.getCurrentTime() > 3) {
            player.seekTo(0);
            return;
        }
    } catch (e) {}

    if (state.currentIndex > 0) {
        playSong(state.currentIndex - 1);
    } else if (state.repeatMode === 1) {
        playSong(state.tracks.length - 1);
    }
}

function triggerSongEnd() {
    if (isTransitioning) return;
    isTransitioning = true;

    // Check Sleep Timer "End of Track" condition
    if (state.stopAtEndOfTrack) {
        cancelSleepTimer();
        state.isPlaying = false;
        if (isPlayerReady && player) player.pauseVideo();
        updatePlayPauseIcons(false);
        showToast("Sleep Timer: Playback stopped at end of track", "moon");
        isTransitioning = false;
        return;
    }

    playNext();
    setTimeout(() => {
        isTransitioning = false;
    }, 1200);
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
    DOM.cinemaShuffleBtn.classList.toggle('active', state.isShuffle);

    if (state.tracks.length === 0) return;

    const currentTrack = state.tracks[state.currentIndex];

    if (state.isShuffle) {
        state.tracks = shuffleArray([...state.originalTracks]);
    } else {
        state.tracks = [...state.originalTracks];
    }

    if (currentTrack) {
        state.currentIndex = state.tracks.findIndex(t => t.videoId === currentTrack.videoId);
        if (state.currentIndex === -1) state.currentIndex = 0;
    }

    renderTrackList();
    saveState();
    showToast(state.isShuffle ? "Shuffle On" : "Shuffle Off", "shuffle");
}

function toggleRepeat() {
    state.repeatMode = (state.repeatMode + 1) % 3;
    const iconClass = state.repeatMode === 2 ? 'fa-solid fa-repeat-1' : 'fa-solid fa-repeat';

    DOM.repeatBtn.querySelector('i').className = iconClass;
    DOM.cinemaRepeatBtn.querySelector('i').className = iconClass;

    DOM.repeatBtn.classList.toggle('active', state.repeatMode > 0);
    DOM.cinemaRepeatBtn.classList.toggle('active', state.repeatMode > 0);

    const labels = ["Repeat Off", "Repeat All", "Repeat One"];
    showToast(labels[state.repeatMode], "repeat");
    saveState();
}

function togglePlaybackSpeed() {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIdx = rates.indexOf(state.playbackRate);
    const nextIdx = (currentIdx + 1) % rates.length;
    state.playbackRate = rates[nextIdx];

    DOM.speedLabel.textContent = `${state.playbackRate}x`;
    if (isPlayerReady && player && player.setPlaybackRate) {
        player.setPlaybackRate(state.playbackRate);
    }
    showToast(`Speed: ${state.playbackRate}x`, "gauge-high");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Player UI Update ---
function updatePlayerUI() {
    if (state.currentIndex < 0 || state.tracks.length === 0) return;

    const track = state.tracks[state.currentIndex];

    // Bottom bar elements
    DOM.nowPlayingThumb.src = track.thumbnail;
    DOM.nowPlayingTitle.textContent = track.title;
    DOM.nowPlayingPlaylist.textContent = track.channelTitle || (state.playlistInfo ? state.playlistInfo.title : 'Waveify Music');

    // Cinema elements
    DOM.cinemaThumb.src = track.thumbnail;
    DOM.cinemaTitle.textContent = track.title;
    DOM.cinemaArtist.textContent = track.channelTitle;

    // Reset progress timers
    DOM.currentTime.textContent = '0:00';
    DOM.duration.textContent = '0:00';
    DOM.seekBar.value = 0;
    DOM.seekBar.style.setProperty('--value', '0%');
    DOM.cinemaSeekBar.value = 0;
    DOM.cinemaSeekBar.style.setProperty('--value', '0%');

    updateLikeButtonState();
    updateMediaSession(track);
    renderTrackList(); // Keep active row highlighted
}

function updateLikeButtonState() {
    if (state.currentIndex < 0 || !state.tracks[state.currentIndex]) return;
    const track = state.tracks[state.currentIndex];
    const isLiked = isTrackLiked(track.videoId);

    DOM.likeCurrentBtn.classList.toggle('liked', isLiked);
    DOM.likeCurrentBtn.querySelector('i').className = `${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart`;
}

// --- Progress Interval & Seek Engine ---
function startProgressInterval() {
    stopProgressInterval();
    progressInterval = setInterval(updateProgress, 250);
}

function stopProgressInterval() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress() {
    if (!isPlayerReady || !state.isPlaying) return;

    let curr = 0;
    let dur = 0;
    try {
        curr = player.getCurrentTime() || 0;
        dur = player.getDuration() || 0;
    } catch (e) {
        return;
    }

    DOM.currentTime.textContent = formatTime(curr);
    DOM.duration.textContent = formatTime(dur);
    DOM.cinemaCurrentTime.textContent = formatTime(curr);
    DOM.cinemaDuration.textContent = formatTime(dur);

    if (dur > 0) {
        const pct = (curr / dur) * 100;
        DOM.seekBar.value = pct;
        DOM.seekBar.style.setProperty('--value', `${pct}%`);
        DOM.cinemaSeekBar.value = pct;
        DOM.cinemaSeekBar.style.setProperty('--value', `${pct}%`);

        // Watchdog 1: Auto advance 0.45s before end
        if (curr >= dur - 0.45 && !isTransitioning) {
            triggerSongEnd();
            return;
        }

        // Watchdog 2: Stall detector
        if (curr >= dur - 1.5 && !isTransitioning) {
            if (Math.abs(curr - lastCurrentTime) < 0.05) {
                consecutiveStalls++;
                if (consecutiveStalls >= 3) {
                    consecutiveStalls = 0;
                    triggerSongEnd();
                    return;
                }
            } else {
                consecutiveStalls = 0;
            }
        } else {
            consecutiveStalls = 0;
        }
    }
    lastCurrentTime = curr;
}

// Seekbar input listeners
[DOM.seekBar, DOM.cinemaSeekBar].forEach(bar => {
    bar.addEventListener('input', (e) => {
        if (!isPlayerReady || !player.getDuration) return;
        const dur = player.getDuration();
        const val = e.target.value;
        const seekTime = (val / 100) * dur;
        lastCurrentTime = seekTime;
        consecutiveStalls = 0;
        player.seekTo(seekTime, true);
        DOM.currentTime.textContent = formatTime(seekTime);
        DOM.cinemaCurrentTime.textContent = formatTime(seekTime);
        DOM.seekBar.style.setProperty('--value', `${val}%`);
        DOM.cinemaSeekBar.style.setProperty('--value', `${val}%`);
    });
});

// Seek hover tooltip
DOM.seekBar.addEventListener('mousemove', (e) => {
    if (!isPlayerReady || !player.getDuration) return;
    const dur = player.getDuration();
    if (!dur) return;

    const rect = DOM.seekBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverTime = pos * dur;
    DOM.seekTooltip.textContent = formatTime(hoverTime);
    DOM.seekTooltip.style.left = `${pos * 100}%`;
});

// --- Volume Engine ---
DOM.volumeSlider.addEventListener('input', (e) => {
    state.volume = parseInt(e.target.value);
    DOM.volumeSlider.style.setProperty('--value', `${state.volume}%`);
    if (isPlayerReady) {
        player.setVolume(state.volume);
        if (state.volume > 0 && player.isMuted()) {
            player.unMute();
            updateMuteIcon(false);
        } else if (state.volume === 0) {
            player.mute();
            updateMuteIcon(true);
        }
    }
    saveState();
});

DOM.muteBtn.addEventListener('click', () => {
    if (!isPlayerReady) return;
    if (player.isMuted() || state.volume === 0) {
        player.unMute();
        state.volume = state.volume === 0 ? 80 : state.volume;
        DOM.volumeSlider.value = state.volume;
        DOM.volumeSlider.style.setProperty('--value', `${state.volume}%`);
        player.setVolume(state.volume);
        updateMuteIcon(false);
    } else {
        player.mute();
        DOM.volumeSlider.value = 0;
        DOM.volumeSlider.style.setProperty('--value', '0%');
        updateMuteIcon(true);
    }
});

function updateMuteIcon(isMuted) {
    DOM.muteBtn.querySelector('i').className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Favorites (Liked Songs) Engine ---
function loadFavorites() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        favorites = saved ? JSON.parse(saved) : [];
    } catch (e) {
        favorites = [];
    }
    updateFavoritesBadge();
}

function saveFavorites() {
    try {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (e) {}
    updateFavoritesBadge();
}

function isTrackLiked(videoId) {
    return favorites.some(t => t.videoId === videoId);
}

function toggleLikeTrack(track) {
    const idx = favorites.findIndex(t => t.videoId === track.videoId);
    if (idx !== -1) {
        favorites.splice(idx, 1);
        showToast("Removed from Liked Songs", "heart-crack");
    } else {
        favorites.push({
            id: track.id || `fav_${Date.now()}`,
            videoId: track.videoId,
            title: track.title,
            channelTitle: track.channelTitle,
            thumbnail: track.thumbnail
        });
        showToast("Added to Liked Songs ❤️", "heart");
    }
    saveFavorites();
    if (state.currentView === 'favorites') {
        renderFavoritesView();
    }
}

function updateFavoritesBadge() {
    DOM.favCounter.textContent = favorites.length;
    DOM.favCountMeta.textContent = `${favorites.length} songs`;
}

function renderFavoritesView() {
    DOM.favoritesTracks.innerHTML = '';

    if (favorites.length === 0) {
        DOM.favoritesTracks.innerHTML = `
            <div class="empty-state">
                <div class="empty-illustration"><i class="fa-regular fa-heart"></i></div>
                <h3>No Liked Songs Yet</h3>
                <p>Songs you like with the heart icon ❤️ will appear here for fast streaming.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    favorites.forEach((track, idx) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <div class="track-num-cell">
                <span class="track-num-text">${idx + 1}</span>
                <i class="fa-solid fa-play track-row-play-icon"></i>
            </div>
            <div class="track-title-cell">
                <img src="${track.thumbnail}" alt="Thumbnail" class="track-thumb-img" loading="lazy">
                <div class="track-text-meta">
                    <span class="track-title-text">${escapeHTML(track.title)}</span>
                    <span class="track-artist-mobile">${escapeHTML(track.channelTitle)}</span>
                </div>
            </div>
            <div class="track-channel-cell">
                ${escapeHTML(track.channelTitle)}
            </div>
            <div class="track-actions-cell">
                <button class="row-action-btn liked" title="Remove from Liked Songs">
                    <i class="fa-solid fa-heart"></i>
                </button>
            </div>
        `;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.row-action-btn')) return;
            // Play liked songs collection
            state.tracks = [...favorites];
            state.originalTracks = [...favorites];
            state.filteredTracks = [...favorites];
            state.playlistInfo = {
                title: 'Liked Songs',
                channelTitle: 'Your Library',
                thumbnails: { high: { url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600' } }
            };
            playSong(idx);
        });

        const favBtn = row.querySelector('.row-action-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLikeTrack(track);
        });

        fragment.appendChild(row);
    });

    DOM.favoritesTracks.appendChild(fragment);
}

DOM.likeCurrentBtn.addEventListener('click', () => {
    if (state.currentIndex >= 0 && state.tracks[state.currentIndex]) {
        toggleLikeTrack(state.tracks[state.currentIndex]);
        updateLikeButtonState();
    }
});

DOM.playFavoritesBtn.addEventListener('click', () => {
    if (favorites.length > 0) {
        state.tracks = [...favorites];
        state.originalTracks = [...favorites];
        state.currentIndex = 0;
        playSong(0);
        switchView('playlist');
    } else {
        showToast("No liked songs to play yet!", "heart");
    }
});

DOM.shuffleFavoritesBtn.addEventListener('click', () => {
    if (favorites.length > 0) {
        state.tracks = shuffleArray([...favorites]);
        state.originalTracks = [...favorites];
        state.isShuffle = true;
        DOM.shuffleBtn.classList.add('active');
        playSong(0);
        switchView('playlist');
    }
});

// --- Saved Library Playlists Engine ---
function loadSavedLibrary() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.LIBRARY);
        savedLibrary = saved ? JSON.parse(saved) : [];
    } catch (e) {
        savedLibrary = [];
    }
    renderSidebarLibrary();
}

function saveLibraryToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(savedLibrary));
    } catch (e) {}
    renderSidebarLibrary();
}

function renderSidebarLibrary() {
    DOM.sidebarLibraryList.innerHTML = '';
    savedLibrary.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = `library-item ${state.playlistId === item.id ? 'active' : ''}`;
        div.innerHTML = `
            <span class="library-item-title" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</span>
            <button class="library-item-del" title="Remove playlist">&times;</button>
        `;

        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('library-item-del')) return;
            // Load saved playlist
            state.playlistId = item.id;
            state.playlistInfo = item.info;
            state.tracks = [...item.tracks];
            state.originalTracks = [...item.tracks];
            state.filteredTracks = [...item.tracks];
            state.currentIndex = 0;
            renderPlaylistHero();
            renderTrackList();
            switchView('playlist');
            playSong(0);
            renderSidebarLibrary();
        });

        div.querySelector('.library-item-del').addEventListener('click', (e) => {
            e.stopPropagation();
            savedLibrary.splice(idx, 1);
            saveLibraryToStorage();
            updateSaveBookmarkState();
            showToast("Playlist removed from library", "bookmark");
        });

        DOM.sidebarLibraryList.appendChild(div);
    });
}

function updateSaveBookmarkState() {
    const isSaved = savedLibrary.some(p => p.id === state.playlistId);
    DOM.savePlaylistBtn.classList.toggle('active', isSaved);
    DOM.savePlaylistBtn.querySelector('i').className = isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
}

DOM.savePlaylistBtn.addEventListener('click', () => {
    if (!state.playlistId || state.tracks.length === 0) return;

    const existingIdx = savedLibrary.findIndex(p => p.id === state.playlistId);
    if (existingIdx !== -1) {
        savedLibrary.splice(existingIdx, 1);
        showToast("Playlist removed from Your Library", "bookmark");
    } else {
        savedLibrary.push({
            id: state.playlistId,
            title: state.playlistInfo?.title || 'My Playlist',
            info: state.playlistInfo,
            tracks: state.originalTracks
        });
        showToast("Playlist saved to Your Library!", "bookmark");
    }
    saveLibraryToStorage();
    updateSaveBookmarkState();
});

if (DOM.openAddPlaylistBtn) {
    DOM.openAddPlaylistBtn.addEventListener('click', () => {
        DOM.urlInput.focus();
        DOM.urlInput.scrollIntoView({ behavior: 'smooth' });
    });
}

// --- Queue Engine ---
function renderQueueView() {
    DOM.queueNowPlaying.innerHTML = '';
    DOM.queueNextTracks.innerHTML = '';

    if (state.currentIndex >= 0 && state.tracks[state.currentIndex]) {
        const track = state.tracks[state.currentIndex];
        const row = document.createElement('div');
        row.className = 'track-row active';
        row.innerHTML = `
            <div class="track-num-cell">
                <div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
            </div>
            <div class="track-title-cell">
                <img src="${track.thumbnail}" alt="Thumbnail" class="track-thumb-img">
                <div class="track-text-meta">
                    <span class="track-title-text">${escapeHTML(track.title)}</span>
                    <span class="track-artist-mobile">${escapeHTML(track.channelTitle)}</span>
                </div>
            </div>
            <div class="track-channel-cell">${escapeHTML(track.channelTitle)}</div>
            <div class="track-actions-cell">
                <span class="badge-pill accent-pill">NOW PLAYING</span>
            </div>
        `;
        DOM.queueNowPlaying.appendChild(row);
    }

    // Combine custom queued tracks with upcoming playlist tracks
    const upcoming = [...state.queue];
    for (let i = state.currentIndex + 1; i < state.tracks.length; i++) {
        upcoming.push(state.tracks[i]);
    }

    if (upcoming.length === 0) {
        DOM.queueNextTracks.innerHTML = `
            <div class="empty-state">
                <p>No upcoming tracks in the queue. Songs will stop after current track.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    upcoming.slice(0, 30).forEach((track, idx) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <div class="track-num-cell">
                <span class="track-num-text">${idx + 1}</span>
                <i class="fa-solid fa-play track-row-play-icon"></i>
            </div>
            <div class="track-title-cell">
                <img src="${track.thumbnail}" alt="Thumbnail" class="track-thumb-img">
                <div class="track-text-meta">
                    <span class="track-title-text">${escapeHTML(track.title)}</span>
                    <span class="track-artist-mobile">${escapeHTML(track.channelTitle)}</span>
                </div>
            </div>
            <div class="track-channel-cell">${escapeHTML(track.channelTitle)}</div>
            <div class="track-actions-cell">
                <button class="row-action-btn jump-queue-btn" title="Play Now"><i class="fa-solid fa-play"></i></button>
            </div>
        `;

        row.addEventListener('click', () => {
            const foundIdx = state.tracks.findIndex(t => t.videoId === track.videoId);
            if (foundIdx !== -1) playSong(foundIdx);
        });

        fragment.appendChild(row);
    });

    DOM.queueNextTracks.appendChild(fragment);
}

DOM.clearQueueBtn.addEventListener('click', () => {
    state.queue = [];
    renderQueueView();
    showToast("Play Queue cleared", "trash-can");
});

DOM.playerQueueBtn.addEventListener('click', () => {
    switchView('queue');
});

// --- Context Menu Engine ---
function openContextMenu(e, track, index) {
    state.activeContextTrack = { track, index };
    const menu = DOM.contextMenu;

    menu.classList.remove('hidden');
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

function closeContextMenu() {
    DOM.contextMenu.classList.add('hidden');
    state.activeContextTrack = null;
}

document.addEventListener('click', closeContextMenu);

DOM.ctxPlayNow.addEventListener('click', () => {
    if (state.activeContextTrack) {
        playSong(state.activeContextTrack.index);
    }
});

DOM.ctxPlayNext.addEventListener('click', () => {
    if (state.activeContextTrack) {
        state.queue.unshift(state.activeContextTrack.track);
        showToast(`"${state.activeContextTrack.track.title}" will play next`, "arrow-turn-down");
    }
});

DOM.ctxAddQueue.addEventListener('click', () => {
    if (state.activeContextTrack) {
        state.queue.push(state.activeContextTrack.track);
        showToast("Added to Queue", "list-plus");
    }
});

DOM.ctxCopyLink.addEventListener('click', () => {
    if (state.activeContextTrack) {
        const link = `https://www.youtube.com/watch?v=${state.activeContextTrack.track.videoId}`;
        navigator.clipboard.writeText(link).then(() => {
            showToast("Video link copied to clipboard!", "link");
        });
    }
});

DOM.ctxOpenYt.addEventListener('click', () => {
    if (state.activeContextTrack) {
        window.open(`https://www.youtube.com/watch?v=${state.activeContextTrack.track.videoId}`, '_blank');
    }
});

// --- Cinema / Fullscreen Visualizer Engine ---
function openCinema() {
    DOM.cinemaOverlay.classList.add('active');
}

function closeCinema() {
    DOM.cinemaOverlay.classList.remove('active');
}

DOM.nowPlayingCover.addEventListener('click', openCinema);
DOM.cinemaToggleBtn.addEventListener('click', openCinema);
DOM.cinemaCloseBtn.addEventListener('click', closeCinema);

// --- Sleep Timer Engine ---
function setSleepTimer(minutes) {
    cancelSleepTimer();

    if (minutes === 'end-track') {
        state.stopAtEndOfTrack = true;
        DOM.sleepTimerLabel.textContent = 'End Track';
        DOM.timerActiveInfo.classList.remove('hidden');
        DOM.timerCountdown.textContent = 'End of current track';
        showToast("Sleep Timer: Stop at end of current track", "moon");
        return;
    }

    const minNum = parseInt(minutes, 10);
    if (!minNum || minNum <= 0) return;

    state.sleepTimerEndTimestamp = Date.now() + minNum * 60 * 1000;
    DOM.timerActiveInfo.classList.remove('hidden');

    DOM.sleepTimerTimeout = setTimeout(() => {
        cancelSleepTimer();
        state.isPlaying = false;
        if (isPlayerReady && player) player.pauseVideo();
        updatePlayPauseIcons(false);
        showToast("Sleep Timer elapsed. Audio paused.", "moon");
    }, minNum * 60 * 1000);

    state.sleepTimerInterval = setInterval(() => {
        const remainingMs = state.sleepTimerEndTimestamp - Date.now();
        if (remainingMs <= 0) {
            cancelSleepTimer();
            return;
        }
        const remSec = Math.floor(remainingMs / 1000);
        const remMin = Math.floor(remSec / 60);
        const secDisplay = remSec % 60;
        const timeStr = `${remMin}:${secDisplay < 10 ? '0' : ''}${secDisplay}`;
        DOM.sleepTimerLabel.textContent = timeStr;
        DOM.timerCountdown.textContent = timeStr;
    }, 1000);

    showToast(`Sleep Timer set for ${minNum} minutes`, "moon");
}

function cancelSleepTimer() {
    if (state.sleepTimerTimeout) clearTimeout(state.sleepTimerTimeout);
    if (state.sleepTimerInterval) clearInterval(state.sleepTimerInterval);
    state.sleepTimerTimeout = null;
    state.sleepTimerInterval = null;
    state.sleepTimerEndTimestamp = null;
    state.stopAtEndOfTrack = false;
    DOM.sleepTimerLabel.textContent = 'Timer';
    DOM.timerActiveInfo.classList.add('hidden');
}

DOM.sleepTimerBtn.addEventListener('click', () => {
    DOM.sleepModal.classList.remove('hidden');
});

DOM.closeSleepModal.addEventListener('click', () => {
    DOM.sleepModal.classList.add('hidden');
});

DOM.timerOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const min = btn.dataset.minutes;
        if (min === '0') {
            cancelSleepTimer();
            showToast("Sleep timer cancelled", "moon");
        } else {
            setSleepTimer(min);
        }
        DOM.sleepModal.classList.add('hidden');
    });
});

// --- API Settings Modal ---
DOM.apiSettingsBtn.addEventListener('click', () => {
    DOM.customApiKeyInput.value = (state.apiKey && state.apiKey !== DEFAULT_API_KEY) ? state.apiKey : '';
    DOM.apiModal.classList.remove('hidden');
});

DOM.closeApiModal.addEventListener('click', () => {
    DOM.apiModal.classList.add('hidden');
});

DOM.saveApiKeyBtn.addEventListener('click', () => {
    const val = DOM.customApiKeyInput.value.trim();
    if (val) {
        state.apiKey = val;
        localStorage.setItem(STORAGE_KEYS.CUSTOM_KEY, val);
        DOM.apiStatusText.textContent = 'Using custom user API key';
        showToast("Custom API key saved successfully!", "circle-check");
    } else {
        state.apiKey = DEFAULT_API_KEY;
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_KEY);
        DOM.apiStatusText.textContent = 'Using default API key';
    }
    DOM.apiModal.classList.add('hidden');
});

DOM.resetApiKeyBtn.addEventListener('click', () => {
    state.apiKey = DEFAULT_API_KEY;
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_KEY);
    DOM.customApiKeyInput.value = '';
    DOM.apiStatusText.textContent = 'Using default API key';
    showToast("Reset to default API key", "rotate-left");
});

// --- Keyboard Shortcuts ---
DOM.shortcutsBtn.addEventListener('click', () => {
    DOM.shortcutsModal.classList.remove('hidden');
});
DOM.closeShortcutsModal.addEventListener('click', () => {
    DOM.shortcutsModal.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'arrowright':
            e.preventDefault();
            playNext();
            break;
        case 'arrowleft':
            e.preventDefault();
            playPrev();
            break;
        case 'arrowup':
            e.preventDefault();
            state.volume = Math.min(100, state.volume + 5);
            DOM.volumeSlider.value = state.volume;
            DOM.volumeSlider.dispatchEvent(new Event('input'));
            break;
        case 'arrowdown':
            e.preventDefault();
            state.volume = Math.max(0, state.volume - 5);
            DOM.volumeSlider.value = state.volume;
            DOM.volumeSlider.dispatchEvent(new Event('input'));
            break;
        case 'm':
            DOM.muteBtn.click();
            break;
        case 's':
            toggleShuffle();
            break;
        case 'r':
            toggleRepeat();
            break;
        case 'l':
            if (state.currentIndex >= 0 && state.tracks[state.currentIndex]) {
                toggleLikeTrack(state.tracks[state.currentIndex]);
                updateLikeButtonState();
            }
            break;
        case 'f':
            if (DOM.cinemaOverlay.classList.contains('active')) {
                closeCinema();
            } else {
                openCinema();
            }
            break;
        case 'q':
            switchView('queue');
            break;
        case '?':
            DOM.shortcutsModal.classList.toggle('hidden');
            break;
        case 'escape':
            closeCinema();
            DOM.apiModal.classList.add('hidden');
            DOM.sleepModal.classList.add('hidden');
            DOM.shortcutsModal.classList.add('hidden');
            closeContextMenu();
            break;
    }
});

// --- MediaSession (Lockscreen & Bluetooth Headset Controls) ---
function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    try {
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && isPlayerReady && player && player.getDuration) {
                player.seekTo(details.seekTime, true);
                DOM.currentTime.textContent = formatTime(details.seekTime);
            }
        });
    } catch (e) {}
}

function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.channelTitle || 'YouTube Music',
            album: state.playlistInfo ? state.playlistInfo.title : 'Waveify Player',
            artwork: [
                { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        navigator.mediaSession.playbackState = 'playing';
    } catch (e) {}
}

// --- Theme Management ---
DOM.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    DOM.themeToggle.querySelector('i').className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    saveState();
});

// --- Share Button ---
DOM.shareBtn.addEventListener('click', () => {
    const url = state.playlistId ? `https://www.youtube.com/playlist?list=${state.playlistId}` : window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Playlist URL copied to clipboard!", "share-nodes");
    });
});

// Sync / Refresh button
DOM.syncBtn.addEventListener('click', async () => {
    if (!state.playlistId) return;
    if (state.playlistId.startsWith('curated-')) {
        showToast("Curated vibes are always up-to-date!", "circle-check");
        return;
    }

    try {
        const icon = DOM.syncBtn.querySelector('i');
        icon.classList.add('fa-spin');
        showToast("Refreshing playlist...", "arrows-rotate");

        const items = await fetchAllPlaylistItems(state.playlistId);
        const validTracks = items.filter(item => {
            const t = item.snippet?.title || '';
            return t !== 'Private video' && t !== 'Deleted video';
        }).map(item => ({
            id: item.id,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || 'YouTube Artist',
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'
        }));

        state.originalTracks = [...validTracks];
        state.tracks = state.isShuffle ? shuffleArray([...validTracks]) : [...validTracks];
        renderTrackList();
        renderPlaylistHero();
        icon.classList.remove('fa-spin');
        showToast("Playlist refreshed successfully!", "circle-check");
    } catch (e) {
        DOM.syncBtn.querySelector('i').classList.remove('fa-spin');
        showToast("Failed to sync playlist.", "circle-exclamation");
    }
});

// --- Toast Notifications ---
function showToast(message, icon = 'info-circle') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${escapeHTML(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function showError(msg) {
    DOM.errorText.textContent = msg;
    DOM.errorBanner.classList.remove('hidden');
}

function hideError() {
    DOM.errorBanner.classList.add('hidden');
}

DOM.errorClose.addEventListener('click', hideError);

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// --- Local Storage State ---
function saveState() {
    const toSave = {
        playlistId: state.playlistId,
        playlistInfo: state.playlistInfo,
        tracks: state.tracks,
        originalTracks: state.originalTracks,
        currentIndex: state.currentIndex,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        volume: state.volume,
        theme: state.theme
    };
    try {
        localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(toSave));
    } catch (e) {}
}

function loadSavedState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATE);
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);

            if (state.playlistInfo) renderPlaylistHero();
            if (state.tracks && state.tracks.length > 0) {
                renderTrackList();
                updatePlayerUI();
            }

            DOM.shuffleBtn.classList.toggle('active', state.isShuffle);
            DOM.cinemaShuffleBtn.classList.toggle('active', state.isShuffle);

            const iconClass = state.repeatMode === 2 ? 'fa-solid fa-repeat-1' : 'fa-solid fa-repeat';
            DOM.repeatBtn.querySelector('i').className = iconClass;
            DOM.repeatBtn.classList.toggle('active', state.repeatMode > 0);

            DOM.volumeSlider.value = state.volume;
            DOM.volumeSlider.style.setProperty('--value', `${state.volume}%`);

            document.documentElement.setAttribute('data-theme', state.theme);
            DOM.themeToggle.querySelector('i').className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        } else {
            // Load curated Lofi Chill as starting experience
            loadCuratedPlaylist(CURATED_PLAYLISTS[0]);
        }
    } catch (e) {
        loadCuratedPlaylist(CURATED_PLAYLISTS[0]);
    }
}

// --- Wire Secondary Buttons ---
DOM.playPauseBtn.addEventListener('click', togglePlay);
DOM.cinemaPlayPauseBtn.addEventListener('click', togglePlay);
DOM.heroPlayBtn.addEventListener('click', togglePlay);
DOM.playAllBtn.addEventListener('click', togglePlay);

DOM.nextBtn.addEventListener('click', playNext);
DOM.cinemaNextBtn.addEventListener('click', playNext);

DOM.prevBtn.addEventListener('click', playPrev);
DOM.cinemaPrevBtn.addEventListener('click', playPrev);

DOM.shuffleBtn.addEventListener('click', toggleShuffle);
DOM.cinemaShuffleBtn.addEventListener('click', toggleShuffle);

DOM.repeatBtn.addEventListener('click', toggleRepeat);
DOM.cinemaRepeatBtn.addEventListener('click', toggleRepeat);

DOM.heroShuffleBtn.addEventListener('click', () => {
    state.isShuffle = true;
    DOM.shuffleBtn.classList.add('active');
    state.tracks = shuffleArray([...state.originalTracks]);
    renderTrackList();
    playSong(0);
});

DOM.speedBtn.addEventListener('click', togglePlaybackSpeed);

// --- Initialization ---
loadFavorites();
loadSavedLibrary();
loadSavedState();
renderCuratedGrid();
