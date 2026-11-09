/**
 * YouTube Playlist Music Player Logic
 * IMPORTANT: You must provide a valid YouTube Data API v3 key below.
 */
const YOUTUBE_API_KEY = 'AIzaSyDFBQ4-uJ6ORdJb72BwcFtQiPRTblA6Tng';

// --- State Management ---
const state = {
    playlistId: null,
    playlistInfo: null,
    tracks: [],
    originalTracks: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0: none, 1: all, 2: one
    volume: 100,
    theme: 'dark',
    eq: {
        enabled: true,
        preset: 'flat',
        bands: [0, 0, 0, 0, 0]
    }
};

// --- DOM Elements ---
const DOM = {
    form: document.getElementById('load-playlist-form'),
    urlInput: document.getElementById('playlist-url'),
    errorMsg: document.getElementById('error-message'),

    // Playlist Info
    infoSection: document.getElementById('playlist-info'),
    thumb: document.getElementById('playlist-thumbnail'),
    title: document.getElementById('playlist-title'),
    owner: document.getElementById('playlist-owner'),
    count: document.getElementById('playlist-count'),
    syncBtn: document.getElementById('sync-playlist-btn'),
    playAllBtn: document.getElementById('play-all-btn'),

    // Track List
    trackContainer: document.getElementById('playlist-tracks'),

    // Player Bar
    nowPlayingBox: document.getElementById('now-playing-box'),
    nowPlayingThumb: document.getElementById('now-playing-thumb'),
    nowPlayingTitle: document.getElementById('now-playing-title'),
    nowPlayingPlaylist: document.getElementById('now-playing-playlist'),
    nowPlayingInfoDiv: document.querySelector('.now-playing-info'),
    expandFullPlayerBtn: document.getElementById('expand-full-player-btn'),

    // Controls
    playPauseBtn: document.getElementById('play-pause-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    repeatBtn: document.getElementById('repeat-btn'),

    // Progress
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    seekBar: document.getElementById('seek-bar'),

    // Volume
    muteBtn: document.getElementById('mute-btn'),
    volumeSlider: document.getElementById('volume-slider'),

    // Theme
    themeToggle: document.getElementById('theme-toggle'),

    // Full Music Player Page
    fullPlayerScreen: document.getElementById('full-player-screen'),
    closeFullPlayerBtn: document.getElementById('close-full-player-btn'),
    fullPlayerBackdrop: document.getElementById('full-player-backdrop'),
    fullPlayerPlaylistName: document.getElementById('full-player-playlist-name'),
    fullPlayerCover: document.getElementById('full-player-cover'),
    fullPlayerVinyl: document.getElementById('full-player-vinyl'),
    fullVisualizerBars: document.getElementById('full-visualizer-bars'),
    fullPlayerTitle: document.getElementById('full-player-title'),
    fullPlayerArtist: document.getElementById('full-player-artist'),
    fullCurrentTime: document.getElementById('full-current-time'),
    fullDuration: document.getElementById('full-duration'),
    fullSeekBar: document.getElementById('full-seek-bar'),
    fullPlayPauseBtn: document.getElementById('full-play-pause-btn'),
    fullPrevBtn: document.getElementById('full-prev-btn'),
    fullNextBtn: document.getElementById('full-next-btn'),
    fullShuffleBtn: document.getElementById('full-shuffle-btn'),
    fullRepeatBtn: document.getElementById('full-repeat-btn'),
    fullMuteBtn: document.getElementById('full-mute-btn'),
    fullVolumeSlider: document.getElementById('full-volume-slider'),
    fullOpenEqBtn: document.getElementById('full-open-eq-btn'),

    // Audio Equalizer
    openEqBtn: document.getElementById('open-eq-btn'),
    eqModal: document.getElementById('eq-modal'),
    eqBackdrop: document.getElementById('eq-backdrop'),
    closeEqBtn: document.getElementById('close-eq-btn'),
    resetEqBtn: document.getElementById('reset-eq-btn'),
    eqPowerToggle: document.getElementById('eq-power-toggle'),
    eqPowerStatus: document.getElementById('eq-power-status'),
    eqActivePresetName: document.getElementById('eq-active-preset-name'),
    eqCurvePath: document.getElementById('eq-curve-path'),
    eqSpectrumBars: document.getElementById('eq-spectrum-bars'),
    eqPresetBtns: document.querySelectorAll('.eq-preset-btn'),
    eqFaders: [
        document.getElementById('eq-fader-0'),
        document.getElementById('eq-fader-1'),
        document.getElementById('eq-fader-2'),
        document.getElementById('eq-fader-3'),
        document.getElementById('eq-fader-4')
    ],
    eqFills: [
        document.getElementById('eq-fill-0'),
        document.getElementById('eq-fill-1'),
        document.getElementById('eq-fill-2'),
        document.getElementById('eq-fill-3'),
        document.getElementById('eq-fill-4')
    ],
    eqThumbs: [
        document.getElementById('eq-thumb-0'),
        document.getElementById('eq-thumb-1'),
        document.getElementById('eq-thumb-2'),
        document.getElementById('eq-thumb-3'),
        document.getElementById('eq-thumb-4')
    ],
    eqSliders: [
        document.getElementById('eq-band-0'),
        document.getElementById('eq-band-1'),
        document.getElementById('eq-band-2'),
        document.getElementById('eq-band-3'),
        document.getElementById('eq-band-4')
    ],
    eqDbLabels: [
        document.getElementById('eq-val-0'),
        document.getElementById('eq-val-1'),
        document.getElementById('eq-val-2'),
        document.getElementById('eq-val-3'),
        document.getElementById('eq-val-4')
    ]
};

// --- YouTube IFrame API ---
let player;
let isPlayerReady = false;
let progressInterval;
let consecutiveErrors = 0;
let isTransitioning = false;
let isSeeking = false;
let autoplayRetryTimeout = null;
let lastCurrentTime = 0;
let consecutiveStalls = 0;

// Silent audio loop to maintain background playback permission on iOS Safari & Android
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

function onYouTubeIframeAPIReady() {
    const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
        ? window.location.origin
        : undefined;

    // Optimized player parameters for lowest latency & small packet streaming
    const playerVars = {
        'playsinline': 1,
        'autoplay': 1,
        'controls': 0,
        'disablekb': 1,
        'fs': 0,
        'rel': 0,
        'enablejsapi': 1,
        'iv_load_policy': 3, // Disable annotations/cards (saves network roundtrips)
        'modestbranding': 1,
        'autohide': 1
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
}

function onPlayerReady(event) {
    isPlayerReady = true;
    try {
        player.setVolume(state.volume);
        // Request small quality (144p/audio-optimized) for instant packet delivery
        if (player.setPlaybackQuality) {
            player.setPlaybackQuality('small');
        }
        applyEqToAudioOutput();
    } catch (e) {}

    // Setup initial lock screen / mediaSession handlers
    setupMediaSessionHandlers();

    // Check if we need to auto-resume from local storage
    if (state.tracks.length > 0 && state.currentIndex >= 0 && state.currentIndex < state.tracks.length) {
        // Just cue the video, don't auto-play on initial page load to avoid browser blocks
        player.cueVideoById(state.tracks[state.currentIndex].videoId);
        updatePlayerUI();
    }
}

function onPlayerStateChange(event) {
    // YT.PlayerState: UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
    if (event.data === YT.PlayerState.PLAYING) {
        state.isPlaying = true;
        isTransitioning = false;
        consecutiveErrors = 0;
        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-circle-pause"></i>';
        if (DOM.fullPlayPauseBtn) DOM.fullPlayPauseBtn.innerHTML = '<i class="fa-solid fa-circle-pause"></i>';
        if (DOM.fullPlayerVinyl) DOM.fullPlayerVinyl.classList.add('playing');
        if (DOM.fullVisualizerBars) DOM.fullVisualizerBars.classList.add('playing');

        const currentItem = DOM.trackContainer.children[state.currentIndex];
        if (currentItem) {
            const indexEl = currentItem.querySelector('.track-index');
            if (indexEl) indexEl.innerHTML = '<div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>';
        }
        startProgressInterval();
        enableBackgroundAudio();
        applyEqToAudioOutput();
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        // Check if paused near the end of track (YouTube mobile freeze / end-screen bug)
        const curr = (player && player.getCurrentTime) ? (player.getCurrentTime() || 0) : 0;
        const dur = (player && player.getDuration) ? (player.getDuration() || 0) : 0;

        if (dur > 0 && curr >= dur - 1.2 && !isTransitioning) {
            console.log("Paused near end of track, auto-advancing...");
            triggerSongEnd();
            return;
        }

        if (!isTransitioning) {
            state.isPlaying = false;
            DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
            if (DOM.fullPlayPauseBtn) DOM.fullPlayPauseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
            if (DOM.fullPlayerVinyl) DOM.fullPlayerVinyl.classList.remove('playing');
            if (DOM.fullVisualizerBars) DOM.fullVisualizerBars.classList.remove('playing');

            const currentItem = DOM.trackContainer.children[state.currentIndex];
            if (currentItem) {
                const indexEl = currentItem.querySelector('.track-index');
                if (indexEl) indexEl.innerHTML = state.currentIndex + 1;
            }
            stopProgressInterval();
            disableBackgroundAudio();
            updateAcousticSubBass(0);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    } else if (event.data === YT.PlayerState.BUFFERING) {
        // Enforce smallest quality so buffer fills fast with small packets
        try {
            if (player && player.setPlaybackQuality) {
                player.setPlaybackQuality('small');
            }
        } catch (e) {}

        // Check if buffering at the end of track
        const curr = (player && player.getCurrentTime) ? (player.getCurrentTime() || 0) : 0;
        const dur = (player && player.getDuration) ? (player.getDuration() || 0) : 0;

        if (dur > 0 && curr >= dur - 1.0 && !isTransitioning) {
            console.log("Buffering near end of track, auto-advancing...");
            triggerSongEnd();
            return;
        }

        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        if (DOM.fullPlayPauseBtn) DOM.fullPlayPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else if (event.data === YT.PlayerState.ENDED) {
        console.log("YouTube ENDED event received");
        triggerSongEnd();
    } else if (event.data === YT.PlayerState.CUED || event.data === -1) {
        // Mobile autoplay fallback: force play if in active session or transition
        if (state.isPlaying || isTransitioning) {
            try {
                player.playVideo();
            } catch (e) {
                console.warn("Could not force play cued video", e);
            }
        }
    }
}

function onPlayerError(event) {
    console.error("YouTube Player Error", event.data);
    consecutiveErrors++;

    if (consecutiveErrors >= 5) {
        showError("Too many playback errors. These videos might be restricted from embedded playback.");
        state.isPlaying = false;
        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
        return;
    }

    // Skip to next song quickly on error (e.g. video not embeddable)
    if (state.tracks.length > 0) {
        setTimeout(() => playNext(true), 400);
    }
}

// --- Playlist Loading ---

DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.urlInput.blur(); // Hide mobile keyboard
    const url = DOM.urlInput.value.trim();
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
        showError('Invalid YouTube Playlist URL or ID. Please check the link and try again.');
        return;
    }

    if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
        showError('API Key Missing: Please add your YouTube Data API v3 Key in app.js.');
        return;
    }

    const submitBtn = document.getElementById('load-submit-btn') || DOM.form.querySelector('button[type="submit"]');

    try {
        hideError();
        if (submitBtn) {
            submitBtn.innerHTML = '<span>Loading...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }
        DOM.playAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Loading state

        const info = await fetchPlaylistInfo(playlistId);
        if (!info || info.items.length === 0) {
            throw new Error('Playlist not found or is private.');
        }

        const items = await fetchAllPlaylistItems(playlistId);

        // Filter out deleted/private videos
        const validTracks = items.filter(item => {
            const title = item.snippet.title;
            return title !== 'Private video' && title !== 'Deleted video';
        }).map(item => ({
            id: item.id,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.videoOwnerChannelTitle || '',
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || 'https://via.placeholder.com/120x90'
        }));

        if (validTracks.length === 0) {
            throw new Error('Playlist has no playable tracks.');
        }

        // Update State
        state.playlistId = playlistId;
        state.playlistInfo = info.items[0].snippet;
        state.originalTracks = [...validTracks];

        if (state.isShuffle) {
            state.tracks = shuffleArray([...validTracks]);
        } else {
            state.tracks = [...validTracks];
        }

        state.currentIndex = 0;
        state.isPlaying = false;

        // Update UI
        renderPlaylistInfo();
        renderTrackList();
        updatePlayerUI();
        saveState();

        // Load first track (but don't play automatically unless user clicked play-all, which we handle later)
        if (isPlayerReady) {
            player.cueVideoById(state.tracks[state.currentIndex].videoId);
        }

        DOM.playAllBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

    } catch (err) {
        console.error(err);
        showError(err.message || 'Failed to load playlist. Check your internet connection or API Key.');
        DOM.playAllBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = '<span>Load Playlist</span> <i class="fa-solid fa-arrow-right"></i>';
            submitBtn.disabled = false;
        }
    }
});

function extractPlaylistId(url) {
    if (!url) return null;
    const trimmed = url.trim();
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = trimmed.match(regExp);
    if (match && match[1]) {
        return match[1];
    }
    // Direct playlist ID check (e.g. PL..., RD..., OLAK5uy_...)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
        return trimmed;
    }
    return null;
}

async function fetchPlaylistInfo(playlistId) {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.error?.message || response.statusText;
        if (response.status === 403 && errMsg.includes('referer')) {
            errMsg += " -> Fix: Go to Google Cloud Console > Credentials, and add this website's URL (and localhost for local testing) to your API key's Website Restrictions.";
        }
        throw new Error(`API Error: ${errMsg}`);
    }
    return response.json();
}

async function fetchAllPlaylistItems(playlistId) {
    let items = [];
    let nextPageToken = '';

    do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            let errMsg = errData.error?.message || response.statusText;
            if (response.status === 403 && errMsg.includes('referer')) {
                errMsg += " -> Fix: Update your API key's Website Restrictions in Google Cloud Console.";
            }
            throw new Error(`API Error: ${errMsg}`);
        }

        const data = await response.json();
        items = items.concat(data.items);
        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    return items;
}

function showError(msg) {
    DOM.errorMsg.textContent = msg;
    DOM.errorMsg.classList.remove('hidden');
}

function hideError() {
    DOM.errorMsg.classList.add('hidden');
}

// --- UI Rendering ---

function renderPlaylistInfo() {
    DOM.infoSection.classList.remove('hidden');

    const snippet = state.playlistInfo;
    const thumbUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || 'https://via.placeholder.com/640x360';

    DOM.thumb.src = thumbUrl;
    DOM.title.textContent = snippet.title;
    DOM.owner.innerHTML = `<i class="fa-solid fa-circle-user"></i> ${escapeHTML(snippet.channelTitle || 'Channel')}`;
    DOM.count.textContent = `${state.tracks.length} songs`;

    const countBadge = document.getElementById('track-header-count');
    if (countBadge) countBadge.textContent = state.tracks.length;
}

function renderTrackList() {
    DOM.trackContainer.innerHTML = '';

    const countBadge = document.getElementById('track-header-count');
    if (countBadge) countBadge.textContent = state.tracks.length;

    if (state.tracks.length === 0) {
        DOM.trackContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon-wrap">
                    <i class="fa-solid fa-compact-disc fa-spin-pulse" style="--fa-animation-duration: 8s;"></i>
                </div>
                <h4>No Playlist Loaded</h4>
                <p>Paste any YouTube playlist URL on the left panel to load your tracks and start listening.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    state.tracks.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = `track-item ${index === state.currentIndex ? 'active' : ''}`;
        div.dataset.index = index;
        div.onclick = () => {
            playSong(index);
            openFullPlayer();
        };

        const isCurrent = (index === state.currentIndex);
        div.innerHTML = `
            <div class="track-index">${isCurrent && state.isPlaying ? '<div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>' : (index + 1)}</div>
            <div class="track-play-icon"><i class="fa-solid fa-play"></i></div>
            <img class="track-thumb" src="${track.thumbnail}" alt="Thumbnail" loading="lazy" width="44" height="44">
            <div class="track-info">
                <div class="track-title">${escapeHTML(track.title)}</div>
                <div class="track-channel">${escapeHTML(track.channelTitle)}</div>
            </div>
        `;

        fragment.appendChild(div);
    });

    DOM.trackContainer.appendChild(fragment);
}

function updateTrackHighlight() {
    // Fast O(1) class toggle instead of looping through entire tracklist
    const prevActive = DOM.trackContainer.querySelector('.track-item.active');
    if (prevActive) {
        prevActive.classList.remove('active');
        const prevIdx = parseInt(prevActive.dataset.index, 10);
        const prevIndexEl = prevActive.querySelector('.track-index');
        if (prevIndexEl && !isNaN(prevIdx)) {
            prevIndexEl.innerHTML = prevIdx + 1;
        }
    }

    const currentItem = DOM.trackContainer.children[state.currentIndex];
    if (currentItem) {
        currentItem.classList.add('active');
        const currentIndexEl = currentItem.querySelector('.track-index');
        if (currentIndexEl) {
            currentIndexEl.innerHTML = state.isPlaying
                ? '<div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>'
                : (state.currentIndex + 1);
        }
        try {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            currentItem.scrollIntoView(false);
        }
    }
}

function updatePlayerUI() {
    if (state.currentIndex < 0 || state.tracks.length === 0) return;

    const track = state.tracks[state.currentIndex];

    // Bottom Player Bar
    DOM.nowPlayingThumb.src = track.thumbnail;
    DOM.nowPlayingThumb.classList.remove('hidden');
    DOM.nowPlayingInfoDiv.classList.remove('hidden');

    DOM.nowPlayingTitle.textContent = track.title;
    DOM.nowPlayingPlaylist.textContent = state.playlistInfo ? state.playlistInfo.title : 'My Playlist';

    // Full Music Player Page
    if (DOM.fullPlayerCover) DOM.fullPlayerCover.src = track.thumbnail;
    if (DOM.fullPlayerTitle) DOM.fullPlayerTitle.textContent = track.title;
    if (DOM.fullPlayerArtist) DOM.fullPlayerArtist.textContent = track.channelTitle || 'Artist';
    if (DOM.fullPlayerPlaylistName) DOM.fullPlayerPlaylistName.textContent = state.playlistInfo ? state.playlistInfo.title : 'YouTube Playlist';

    if (DOM.fullPlayerVinyl) {
        DOM.fullPlayerVinyl.classList.toggle('playing', state.isPlaying);
    }
    if (DOM.fullVisualizerBars) {
        DOM.fullVisualizerBars.classList.toggle('playing', state.isPlaying);
    }
    if (DOM.fullPlayPauseBtn) {
        DOM.fullPlayPauseBtn.innerHTML = state.isPlaying
            ? '<i class="fa-solid fa-circle-pause"></i>'
            : '<i class="fa-solid fa-circle-play"></i>';
    }

    updateTrackHighlight();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Player Controls ---

function playSong(index) {
    if (index < 0 || index >= state.tracks.length) {
        isTransitioning = false;
        return;
    }

    state.currentIndex = index;
    state.isPlaying = true;
    const track = state.tracks[index];

    // 1. Instant UI update for zero lag perception
    DOM.nowPlayingThumb.src = track.thumbnail;
    DOM.nowPlayingThumb.classList.remove('hidden');
    DOM.nowPlayingInfoDiv.classList.remove('hidden');
    DOM.nowPlayingTitle.textContent = track.title;
    DOM.nowPlayingPlaylist.textContent = state.playlistInfo ? state.playlistInfo.title : 'My Playlist';

    if (DOM.fullPlayerCover) DOM.fullPlayerCover.src = track.thumbnail;
    if (DOM.fullPlayerTitle) DOM.fullPlayerTitle.textContent = track.title;
    if (DOM.fullPlayerArtist) DOM.fullPlayerArtist.textContent = track.channelTitle || 'Artist';
    if (DOM.fullPlayerPlaylistName) DOM.fullPlayerPlaylistName.textContent = state.playlistInfo ? state.playlistInfo.title : 'YouTube Playlist';

    // Reset seekbar and timers immediately
    DOM.currentTime.textContent = '0:00';
    DOM.duration.textContent = '0:00';
    DOM.seekBar.value = 0;
    DOM.seekBar.style.setProperty('--value', '0%');
    DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    if (DOM.fullCurrentTime) DOM.fullCurrentTime.textContent = '0:00';
    if (DOM.fullDuration) DOM.fullDuration.textContent = '0:00';
    if (DOM.fullSeekBar) {
        DOM.fullSeekBar.value = 0;
        DOM.fullSeekBar.style.setProperty('--value', '0%');
    }
    if (DOM.fullPlayPauseBtn) DOM.fullPlayPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    // Fast highlight in list
    updateTrackHighlight();

    // Lock screen media session integration
    updateMediaSession(track);

    // Save state
    saveState();

    // 2. Load and play in YouTube player (Request smallest packet size for fast delivery)
    if (isPlayerReady && player) {
        try {
            if (player.setPlaybackQuality) {
                player.setPlaybackQuality('small');
            }
            player.loadVideoById({
                videoId: track.videoId,
                startSeconds: 0,
                suggestedQuality: 'small'
            });
        } catch (e) {
            console.warn("loadVideoById fallback:", e);
            try {
                player.loadVideoById(track.videoId, 0, 'small');
            } catch (err) {
                player.loadVideoById(track.videoId);
            }
        }

        // Fast start: force play immediately
        try {
            player.playVideo();
            applyEqToAudioOutput();
        } catch (e) {}

        // Preload next track thumbnail for instant UI transition
        preloadNextTrack(index);

        // Fast autoplay watchdog: ensures playback starts within 350ms
        clearTimeout(autoplayRetryTimeout);
        autoplayRetryTimeout = setTimeout(() => {
            if (isPlayerReady && state.isPlaying) {
                try {
                    const s = player.getPlayerState();
                    if (s !== YT.PlayerState.PLAYING && s !== YT.PlayerState.BUFFERING) {
                        console.log("Autoplay watchdog: forcing playVideo()");
                        player.playVideo();
                    }
                } catch (e) {}
            }
        }, 350);
    }
}

function preloadNextTrack(currentIndex) {
    if (!state.tracks || state.tracks.length === 0) return;
    const nextIdx = (currentIndex + 1) % state.tracks.length;
    const nextTrack = state.tracks[nextIdx];
    if (nextTrack && nextTrack.thumbnail) {
        const img = new Image();
        img.src = nextTrack.thumbnail;
    }
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

function playNext(userTriggered = false) {
    if (state.tracks.length === 0) {
        isTransitioning = false;
        return;
    }

    // Natural end with Repeat One repeats the current song
    if (!userTriggered && state.repeatMode === 2) {
        handleSongEnd();
        return;
    }

    if (state.currentIndex < state.tracks.length - 1) {
        playSong(state.currentIndex + 1);
    } else if (state.repeatMode === 1 || state.repeatMode === 2) {
        // Repeat all (or user clicked next at end of playlist): loop back to start
        playSong(0);
    } else {
        // Stop at end
        try {
            player.stopVideo();
        } catch (e) {}
        state.isPlaying = false;
        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
        const currentItem = DOM.trackContainer.children[state.currentIndex];
        if (currentItem) {
            const indexEl = currentItem.querySelector('.track-index');
            if (indexEl) indexEl.innerHTML = state.currentIndex + 1;
        }
        isTransitioning = false;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }
}

function playPrev() {
    if (state.tracks.length === 0) return;

    // If we're more than 3 seconds in, restart the song
    try {
        if (player && player.getCurrentTime && player.getCurrentTime() > 3) {
            player.seekTo(0, true);
            DOM.currentTime.textContent = '0:00';
            DOM.seekBar.value = 0;
            DOM.seekBar.style.setProperty('--value', '0%');
            return;
        }
    } catch (e) {}

    if (state.currentIndex > 0) {
        playSong(state.currentIndex - 1);
    } else if (state.repeatMode === 1 || state.repeatMode === 2) {
        // Repeat all (or user clicked prev at start): wrap to end
        playSong(state.tracks.length - 1);
    }
}

// Debounced auto-advance trigger
function triggerSongEnd() {
    if (isTransitioning) return;
    isTransitioning = true;
    console.log("Auto-advancing to next song...");
    handleSongEnd();
    // Reset transition lock
    setTimeout(() => {
        isTransitioning = false;
    }, 1500);
}

function handleSongEnd() {
    if (state.repeatMode === 2) {
        console.log("Repeat One: Replaying current track...");
        const currentTrack = state.tracks[state.currentIndex];
        if (currentTrack && player && isPlayerReady) {
            try {
                player.seekTo(0, true);
                player.playVideo();
            } catch (e) {
                try {
                    player.loadVideoById({
                        videoId: currentTrack.videoId,
                        startSeconds: 0
                    });
                } catch (err) {}
            }
            DOM.currentTime.textContent = '0:00';
            DOM.seekBar.value = 0;
            DOM.seekBar.style.setProperty('--value', '0%');
            startProgressInterval();
        }
        setTimeout(() => {
            isTransitioning = false;
        }, 800);
    } else {
        playNext(false);
    }
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    updateShuffleUI();

    if (state.tracks.length === 0) {
        saveState();
        return;
    }

    const currentTrack = state.tracks[state.currentIndex];

    if (state.isShuffle) {
        state.tracks = shuffleArray([...state.originalTracks]);
    } else {
        state.tracks = [...state.originalTracks];
    }

    // Find the current track in the new array to preserve what's playing
    if (currentTrack) {
        const foundIndex = state.tracks.findIndex(t => t.videoId === currentTrack.videoId);
        state.currentIndex = (foundIndex !== -1) ? foundIndex : 0;
    }

    renderTrackList();
    updateTrackHighlight();
    saveState();
}

function updateShuffleUI() {
    const btns = [DOM.shuffleBtn, DOM.fullShuffleBtn].filter(Boolean);
    btns.forEach(btn => {
        btn.classList.toggle('active', state.isShuffle);
        btn.title = state.isShuffle ? "Shuffle On (S)" : "Shuffle Off (S)";
        btn.setAttribute('aria-label', state.isShuffle ? "Shuffle On" : "Shuffle Off");
    });
}

function updateRepeatUI() {
    // 0: None, 1: All, 2: One
    const btns = [DOM.repeatBtn, DOM.fullRepeatBtn].filter(Boolean);
    btns.forEach(btn => {
        if (state.repeatMode === 0) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            btn.title = "Repeat Off (R)";
            btn.setAttribute('aria-label', 'Repeat Off');
        } else if (state.repeatMode === 1) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            btn.title = "Repeat All (R)";
            btn.setAttribute('aria-label', 'Repeat All');
        } else if (state.repeatMode === 2) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span class="repeat-badge">1</span>';
            btn.title = "Repeat One (R)";
            btn.setAttribute('aria-label', 'Repeat One');
        }
    });
}

function toggleRepeat() {
    state.repeatMode = (state.repeatMode + 1) % 3;
    updateRepeatUI();
    saveState();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- MediaSession (Lockscreen & Background Audio Support) ---

function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    try {
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext(true));
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && isPlayerReady && player && player.getDuration) {
                player.seekTo(details.seekTime, true);
                DOM.currentTime.textContent = formatTime(details.seekTime);
                if (DOM.fullCurrentTime) DOM.fullCurrentTime.textContent = formatTime(details.seekTime);
            }
        });
    } catch (e) {
        console.warn('Error setting up mediaSession action handlers:', e);
    }
}

function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.channelTitle || (state.playlistInfo ? state.playlistInfo.title : 'YouTube Music'),
            album: state.playlistInfo ? state.playlistInfo.title : 'Playlist Player',
            artwork: [
                { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '192x192', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
        console.warn('Error updating MediaSession metadata:', e);
    }
}

// --- Progress & Volume ---

function startProgressInterval() {
    stopProgressInterval();
    // 250ms interval for smooth seekbar updates and fast end-detection
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
    if (DOM.fullCurrentTime) DOM.fullCurrentTime.textContent = formatTime(curr);
    if (DOM.fullDuration) DOM.fullDuration.textContent = formatTime(dur);

    if (dur > 0) {
        const val = (curr / dur) * 100;
        DOM.seekBar.value = val;
        DOM.seekBar.style.setProperty('--value', val + '%');
        if (DOM.fullSeekBar) {
            DOM.fullSeekBar.value = val;
            DOM.fullSeekBar.style.setProperty('--value', val + '%');
        }

        // Watchdog 1: Near-End Advance (trigger next song ~0.45s before end for gapless feeling)
        if (curr >= dur - 0.45 && !isTransitioning) {
            console.log("Watchdog: Song reached end threshold", curr, dur);
            triggerSongEnd();
            return;
        }

        // Watchdog 2: Stall Detector (if within 1.5s of end and audio has stopped advancing)
        if (curr >= dur - 1.5 && !isTransitioning) {
            if (Math.abs(curr - lastCurrentTime) < 0.05) {
                consecutiveStalls++;
                if (consecutiveStalls >= 3) { // 3 * 250ms = 750ms stall
                    console.log("Watchdog: Stalled near end of song, advancing...");
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

function handleSeek(val) {
    if (!isPlayerReady || !player.getDuration) return;
    const dur = player.getDuration();
    const seekTime = (val / 100) * dur;
    lastCurrentTime = seekTime;
    consecutiveStalls = 0;
    player.seekTo(seekTime, true);
    const formatted = formatTime(seekTime);
    DOM.currentTime.textContent = formatted;
    if (DOM.fullCurrentTime) DOM.fullCurrentTime.textContent = formatted;
    DOM.seekBar.value = val;
    DOM.seekBar.style.setProperty('--value', val + '%');
    if (DOM.fullSeekBar) {
        DOM.fullSeekBar.value = val;
        DOM.fullSeekBar.style.setProperty('--value', val + '%');
    }
}

DOM.seekBar.addEventListener('input', (e) => handleSeek(e.target.value));
if (DOM.fullSeekBar) {
    DOM.fullSeekBar.addEventListener('input', (e) => handleSeek(e.target.value));
}

function handleVolume(val) {
    state.volume = parseInt(val, 10);
    DOM.volumeSlider.value = state.volume;
    DOM.volumeSlider.style.setProperty('--value', state.volume + '%');
    if (DOM.fullVolumeSlider) {
        DOM.fullVolumeSlider.value = state.volume;
        DOM.fullVolumeSlider.style.setProperty('--value', state.volume + '%');
    }
    if (isPlayerReady && player) {
        if (state.volume > 0 && player.isMuted()) {
            player.unMute();
            updateMuteIcon(false);
        } else if (state.volume === 0) {
            player.mute();
            updateMuteIcon(true);
        }
        applyEqToAudioOutput();
    }
    saveState();
}

DOM.volumeSlider.addEventListener('input', (e) => handleVolume(e.target.value));
if (DOM.fullVolumeSlider) {
    DOM.fullVolumeSlider.addEventListener('input', (e) => handleVolume(e.target.value));
}

function toggleMute() {
    if (!isPlayerReady || !player) return;

    if (player.isMuted() || state.volume === 0) {
        player.unMute();
        state.volume = state.volume === 0 ? 100 : state.volume;
        DOM.volumeSlider.value = state.volume;
        DOM.volumeSlider.style.setProperty('--value', state.volume + '%');
        if (DOM.fullVolumeSlider) {
            DOM.fullVolumeSlider.value = state.volume;
            DOM.fullVolumeSlider.style.setProperty('--value', state.volume + '%');
        }
        applyEqToAudioOutput();
        updateMuteIcon(false);
    } else {
        player.mute();
        DOM.volumeSlider.value = 0;
        DOM.volumeSlider.style.setProperty('--value', '0%');
        if (DOM.fullVolumeSlider) {
            DOM.fullVolumeSlider.value = 0;
            DOM.fullVolumeSlider.style.setProperty('--value', '0%');
        }
        updateAcousticSubBass(0);
        updateMuteIcon(true);
    }
    saveState();
}

DOM.muteBtn.addEventListener('click', toggleMute);
if (DOM.fullMuteBtn) {
    DOM.fullMuteBtn.addEventListener('click', toggleMute);
}

function updateMuteIcon(isMuted) {
    const btns = [DOM.muteBtn, DOM.fullMuteBtn].filter(Boolean);
    btns.forEach(btn => {
        const i = btn.querySelector('i');
        if (i) {
            i.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Full Music Player Screen ---

function openFullPlayer() {
    if (DOM.fullPlayerScreen) {
        DOM.fullPlayerScreen.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        updatePlayerUI();
    }
}

function closeFullPlayer() {
    if (DOM.fullPlayerScreen) {
        DOM.fullPlayerScreen.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function toggleFullPlayer() {
    if (DOM.fullPlayerScreen) {
        if (DOM.fullPlayerScreen.classList.contains('hidden')) {
            openFullPlayer();
        } else {
            closeFullPlayer();
        }
    }
}

// Open full player when clicking bottom now-playing box or expand button
if (DOM.nowPlayingBox) {
    DOM.nowPlayingBox.addEventListener('click', () => {
        if (state.currentIndex >= 0 && state.tracks.length > 0) {
            openFullPlayer();
        }
    });
}

if (DOM.expandFullPlayerBtn) {
    DOM.expandFullPlayerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.currentIndex >= 0 && state.tracks.length > 0) {
            openFullPlayer();
        }
    });
}

if (DOM.closeFullPlayerBtn) {
    DOM.closeFullPlayerBtn.addEventListener('click', closeFullPlayer);
}

if (DOM.fullPlayerBackdrop) {
    DOM.fullPlayerBackdrop.addEventListener('click', closeFullPlayer);
}

// Full Player Controls
if (DOM.fullPlayPauseBtn) DOM.fullPlayPauseBtn.addEventListener('click', togglePlay);
if (DOM.fullNextBtn) DOM.fullNextBtn.addEventListener('click', () => playNext(true));
if (DOM.fullPrevBtn) DOM.fullPrevBtn.addEventListener('click', playPrev);
if (DOM.fullShuffleBtn) DOM.fullShuffleBtn.addEventListener('click', toggleShuffle);
if (DOM.fullRepeatBtn) DOM.fullRepeatBtn.addEventListener('click', toggleRepeat);

// --- Audio Equalizer (EQ) & Sound Enhancement Engine ---

const EQ_PRESETS = {
    flat: { name: 'Flat', bands: [0, 0, 0, 0, 0], desc: 'Neutral studio sound' },
    bass: { name: 'Bass Boost 🔊', bands: [8, 6, 2, 0, 1], desc: 'Deep warm sub-bass & punchy low-end' },
    rock: { name: 'Rock 🎸', bands: [5, 3, -1, 4, 6], desc: 'Dynamic V-curve with heavy guitars' },
    pop: { name: 'Pop ✨', bands: [-1, 2, 5, 3, -2], desc: 'Vocal presence & bright radio highs' },
    electronic: { name: 'Electronic ⚡', bands: [7, 5, 0, 4, 6], desc: 'Club bass, punchy kicks & crisp synths' },
    vocal: { name: 'Vocal Boost 🎤', bands: [-3, 0, 6, 5, 1], desc: 'Ultra-clear voice & crisp acoustic lyrics' },
    jazz: { name: 'Acoustic / Jazz 🎷', bands: [4, 2, 1, 3, 5], desc: 'Warm natural resonance & airy top' }
};

// Web Audio API Context (Lazy initialized on user gesture)
let audioCtx = null;
let subBassOsc = null;
let subBassGain = null;
let spectrumAnimId = null;

function initAudioContext() {
    if (audioCtx) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
        }
    } catch (e) {
        console.warn('Web Audio API not supported on this device:', e);
    }
    return audioCtx;
}

// 1. Play real frequency acoustic preview tone when dragging or tapping a band
function playFrequencyTone(bandIndex) {
    try {
        const ctx = initAudioContext();
        if (!ctx) return;

        const frequencies = [60, 230, 910, 3600, 14000];
        const types = ['sine', 'sine', 'triangle', 'sine', 'sine'];
        const freq = frequencies[bandIndex] || 440;
        const type = types[bandIndex] || 'sine';

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const vol = bandIndex === 0 ? 0.35 : (bandIndex === 4 ? 0.08 : 0.15);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
}

// 2. Real-Time Dynamic Acoustic Enhancer & Volume Headroom Scaling
function applyEqToAudioOutput() {
    if (!isPlayerReady || !player || !player.setVolume) return;

    if (!state.eq || !state.eq.enabled) {
        // Bypass: pure raw playback volume
        player.setVolume(state.volume);
        updateAcousticSubBass(0);
        return;
    }

    const bands = state.eq.bands || [0, 0, 0, 0, 0];
    const [b0, b1, b2, b3, b4] = bands;

    // Calculate acoustic energy boost across the 5 bands
    const bassEnergy = (b0 * 0.4 + b1 * 0.3);
    const midEnergy = (b2 * 0.2 + b3 * 0.2);
    const trebleEnergy = (b4 * 0.2);

    const compositeDb = (bassEnergy + midEnergy + trebleEnergy);

    // Apply perceptual loudness curve to player volume
    let effectiveVolume = state.volume;
    if (compositeDb > 0) {
        const boostMultiplier = 1 + (compositeDb / 12) * 0.22;
        effectiveVolume = Math.min(100, Math.round(state.volume * boostMultiplier));
    } else if (compositeDb < 0) {
        const cutMultiplier = Math.max(0.2, 1 + (compositeDb / 12) * 0.3);
        effectiveVolume = Math.max(0, Math.round(state.volume * cutMultiplier));
    }

    if (!player.isMuted()) {
        player.setVolume(effectiveVolume);
    }

    // Update acoustic sub-bass resonance if bass bands are boosted > 0
    if (state.isPlaying && bassEnergy > 0) {
        updateAcousticSubBass(Math.min(1, bassEnergy / 10));
    } else {
        updateAcousticSubBass(0);
    }
}

// 3. Sub-Bass Acoustic Resonance Generator (for rich, deep bass on mobile/headphones)
function updateAcousticSubBass(intensity) {
    try {
        const ctx = initAudioContext();
        if (!ctx) return;

        if (intensity <= 0) {
            if (subBassGain && ctx) {
                subBassGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
            }
            return;
        }

        if (!subBassOsc) {
            subBassOsc = ctx.createOscillator();
            subBassGain = ctx.createGain();
            subBassOsc.type = 'sine';
            subBassOsc.frequency.setValueAtTime(55, ctx.currentTime);
            subBassGain.gain.setValueAtTime(0, ctx.currentTime);
            subBassOsc.connect(subBassGain);
            subBassGain.connect(ctx.destination);
            subBassOsc.start();
        }

        const targetGain = intensity * 0.08;
        subBassGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
    } catch (e) {}
}

// 4. Update the visual Fader UI (Thumb position, fill bar height, dB label)
function updateFaderUI(index, db) {
    const clampedDb = Math.max(-12, Math.min(12, db));
    const normalized = (clampedDb + 12) / 24;
    const topPct = (1 - normalized) * 100;

    const thumb = DOM.eqThumbs[index];
    const fill = DOM.eqFills[index];
    const label = DOM.eqDbLabels[index];
    const slider = DOM.eqSliders[index];
    const fader = DOM.eqFaders[index];

    if (thumb) {
        thumb.style.top = topPct + '%';
    }

    if (fill) {
        if (clampedDb > 0) {
            fill.style.top = topPct + '%';
            fill.style.height = (50 - topPct) + '%';
            fill.classList.remove('negative');
        } else if (clampedDb < 0) {
            fill.style.top = '50%';
            fill.style.height = (topPct - 50) + '%';
            fill.classList.add('negative');
        } else {
            fill.style.height = '0%';
        }
    }

    if (label) {
        label.textContent = (clampedDb > 0 ? '+' : '') + clampedDb + 'dB';
        label.classList.toggle('negative', clampedDb < 0);
    }

    if (slider) {
        slider.value = clampedDb;
    }

    if (fader) {
        fader.setAttribute('aria-valuenow', clampedDb);
    }
}

// 5. Live Frequency Response SVG Curve
function updateEqCurve() {
    if (!DOM.eqCurvePath) return;

    const width = 500;
    const height = 70;
    const midY = 35;

    const bands = state.eq?.bands || [0, 0, 0, 0, 0];
    const points = bands.map((db, i) => {
        const x = (i / 4) * (width - 60) + 30;
        const y = midY - (db / 12) * (midY - 8);
        return { x, y };
    });

    let d = `M 0,${points[0].y} `;
    for (let i = 0; i < points.length; i++) {
        if (i === 0) {
            d += `L ${points[i].x},${points[i].y} `;
        } else {
            const prev = points[i - 1];
            const curr = points[i];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp2x = prev.x + (curr.x - prev.x) / 2;
            d += `C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y} `;
        }
    }
    d += `L ${width},${points[points.length - 1].y} L ${width},${height} L 0,${height} Z`;
    DOM.eqCurvePath.setAttribute('d', d);
}

// 6. Live Animated Spectrum Analyzer in EQ Display
function setupSpectrumBars() {
    if (!DOM.eqSpectrumBars) return;
    DOM.eqSpectrumBars.innerHTML = '';
    const numBars = 22;
    for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'eq-spec-bar';
        bar.style.height = '4px';
        DOM.eqSpectrumBars.appendChild(bar);
    }
    startSpectrumAnimation();
}

function startSpectrumAnimation() {
    if (spectrumAnimId) return;

    function renderFrame() {
        if (DOM.eqSpectrumBars && DOM.eqModal && !DOM.eqModal.classList.contains('hidden')) {
            const bars = DOM.eqSpectrumBars.children;
            const isPlaying = state.isPlaying;
            const eqBands = state.eq?.bands || [0, 0, 0, 0, 0];
            const isEnabled = state.eq?.enabled ?? true;

            for (let i = 0; i < bars.length; i++) {
                const bandIndex = Math.min(4, Math.floor((i / bars.length) * 5));
                const bandDb = isEnabled ? eqBands[bandIndex] : 0;
                const dbFactor = Math.max(0.2, (bandDb + 14) / 26);

                if (isPlaying) {
                    const noise = Math.sin(Date.now() * 0.008 + i * 0.6) * 0.5 + 0.5;
                    const randomFlicker = Math.random() * 0.35 + 0.65;
                    const h = Math.round((noise * 40 + 8) * dbFactor * randomFlicker);
                    bars[i].style.height = Math.max(4, Math.min(62, h)) + 'px';
                } else {
                    const h = Math.round(6 * dbFactor);
                    bars[i].style.height = Math.max(4, h) + 'px';
                }
            }
        }
        spectrumAnimId = requestAnimationFrame(renderFrame);
    }

    spectrumAnimId = requestAnimationFrame(renderFrame);
}

// 7. Universal Pointer / Touch Drag Controller (Works on all mobile, tablet, and desktop devices)
function setupPointerFaders() {
    DOM.eqFaders.forEach((faderZone, index) => {
        if (!faderZone) return;

        let isDragging = false;

        function updateFromPointer(clientY) {
            const groove = faderZone.querySelector('.eq-fader-groove');
            const rect = groove ? groove.getBoundingClientRect() : faderZone.getBoundingClientRect();
            const normalized = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height)));
            const db = Math.round(-12 + normalized * 24);

            setBandValue(index, db);
        }

        faderZone.addEventListener('pointerdown', (e) => {
            initAudioContext();
            isDragging = true;
            try {
                faderZone.setPointerCapture(e.pointerId);
            } catch (err) {}
            faderZone.classList.add('dragging');
            updateFromPointer(e.clientY);
            playFrequencyTone(index);
        });

        faderZone.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            updateFromPointer(e.clientY);
        });

        const handlePointerEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            faderZone.classList.remove('dragging');
            try {
                faderZone.releasePointerCapture(e.pointerId);
            } catch (err) {}
            saveState();
        };

        faderZone.addEventListener('pointerup', handlePointerEnd);
        faderZone.addEventListener('pointercancel', handlePointerEnd);

        // Keyboard navigation (Arrow Up/Down) for accessibility
        faderZone.addEventListener('keydown', (e) => {
            let current = state.eq.bands[index];
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setBandValue(index, Math.min(12, current + 1));
                playFrequencyTone(index);
                saveState();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setBandValue(index, Math.max(-12, current - 1));
                playFrequencyTone(index);
                saveState();
            }
        });
    });
}

function setBandValue(index, db) {
    if (!state.eq) state.eq = { enabled: true, preset: 'custom', bands: [0, 0, 0, 0, 0] };
    state.eq.bands[index] = db;
    state.eq.preset = 'custom';

    updateFaderUI(index, db);
    updateEqCurve();
    applyEqToAudioOutput();

    DOM.eqPresetBtns.forEach(btn => btn.classList.remove('active'));

    if (DOM.eqActivePresetName) {
        DOM.eqActivePresetName.textContent = 'Custom EQ • ' + (state.eq.enabled ? 'Enhanced Audio' : 'Bypassed');
    }
}

// 8. Apply Preset
function applyEqPreset(presetKey) {
    initAudioContext();
    const preset = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
    if (!state.eq) state.eq = { enabled: true, preset: 'flat', bands: [0, 0, 0, 0, 0] };

    state.eq.preset = presetKey;
    state.eq.bands = [...preset.bands];

    DOM.eqPresetBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    state.eq.bands.forEach((db, i) => {
        updateFaderUI(i, db);
    });

    updateEqCurve();
    applyEqToAudioOutput();

    if (presetKey === 'bass' || presetKey === 'electronic') playFrequencyTone(0);
    else if (presetKey === 'vocal') playFrequencyTone(2);
    else if (presetKey === 'rock') playFrequencyTone(4);

    if (DOM.eqActivePresetName) {
        DOM.eqActivePresetName.textContent = `${preset.name} • ${state.eq.enabled ? preset.desc : 'Bypassed'}`;
    }

    saveState();
}

// 9. Master EQ Power / Bypass Switch
function toggleEqPower(enabled) {
    initAudioContext();
    if (!state.eq) state.eq = { enabled: true, preset: 'flat', bands: [0, 0, 0, 0, 0] };
    state.eq.enabled = enabled;

    if (DOM.eqPowerToggle) DOM.eqPowerToggle.checked = enabled;
    if (DOM.eqPowerStatus) DOM.eqPowerStatus.textContent = enabled ? 'EQ ON' : 'BYPASS';

    const modal = DOM.eqModal;
    if (modal) {
        modal.classList.toggle('eq-disabled', !enabled);
    }

    if (DOM.eqActivePresetName) {
        const curPreset = EQ_PRESETS[state.eq.preset] || { name: 'Custom EQ', desc: 'Equalizer' };
        DOM.eqActivePresetName.textContent = enabled
            ? `${curPreset.name} • Enhanced Sound Active`
            : 'EQ Bypassed (Raw Audio Stream)';
    }

    applyEqToAudioOutput();
    saveState();
}

// Modal open/close
function openEqModal() {
    initAudioContext();
    if (DOM.eqModal) {
        DOM.eqModal.classList.remove('hidden');
        updateEqCurve();
        state.eq?.bands?.forEach((db, i) => updateFaderUI(i, db));
    }
}

function closeEqModal() {
    if (DOM.eqModal) {
        DOM.eqModal.classList.add('hidden');
    }
}

function toggleEqModal() {
    if (DOM.eqModal) {
        if (DOM.eqModal.classList.contains('hidden')) {
            openEqModal();
        } else {
            closeEqModal();
        }
    }
}

if (DOM.openEqBtn) DOM.openEqBtn.addEventListener('click', openEqModal);
if (DOM.fullOpenEqBtn) DOM.fullOpenEqBtn.addEventListener('click', openEqModal);
if (DOM.closeEqBtn) DOM.closeEqBtn.addEventListener('click', closeEqModal);
if (DOM.eqBackdrop) DOM.eqBackdrop.addEventListener('click', closeEqModal);

if (DOM.resetEqBtn) {
    DOM.resetEqBtn.addEventListener('click', () => applyEqPreset('flat'));
}

if (DOM.eqPowerToggle) {
    DOM.eqPowerToggle.addEventListener('change', (e) => {
        toggleEqPower(e.target.checked);
    });
}

DOM.eqPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset) applyEqPreset(preset);
    });
});

// --- Event Listeners ---

DOM.playAllBtn.addEventListener('click', () => {
    if (state.tracks.length > 0) {
        playSong(0);
    }
});

DOM.syncBtn.addEventListener('click', async () => {
    if (!state.playlistId) return;
    
    try {
        const icon = DOM.syncBtn.querySelector('i');
        icon.classList.add('fa-spin');
        
        const info = await fetchPlaylistInfo(state.playlistId);
        if (!info || info.items.length === 0) {
            throw new Error('Playlist not found or is private.');
        }

        const items = await fetchAllPlaylistItems(state.playlistId);

        // Filter out deleted/private videos
        const validTracks = items.filter(item => {
            const title = item.snippet.title;
            return title !== 'Private video' && title !== 'Deleted video';
        }).map(item => ({
            id: item.id,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.videoOwnerChannelTitle || '',
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || 'https://via.placeholder.com/120x90'
        }));

        if (validTracks.length === 0) {
            throw new Error('Playlist has no playable tracks.');
        }

        // Update State but preserve current track if possible
        let currentVideoId = null;
        if (state.tracks.length > 0 && state.currentIndex >= 0 && state.currentIndex < state.tracks.length) {
            currentVideoId = state.tracks[state.currentIndex].videoId;
        }

        state.playlistInfo = info.items[0].snippet;
        state.originalTracks = [...validTracks];

        if (state.isShuffle) {
            state.tracks = shuffleArray([...validTracks]);
        } else {
            state.tracks = [...validTracks];
        }

        // Try to maintain currently playing video index
        if (currentVideoId) {
            const newIndex = state.tracks.findIndex(t => t.videoId === currentVideoId);
            if (newIndex !== -1) {
                state.currentIndex = newIndex;
            } else {
                state.currentIndex = 0; // fallback if current song was removed
            }
        }

        // Update UI
        renderPlaylistInfo();
        renderTrackList();
        updatePlayerUI();
        saveState();

        icon.classList.remove('fa-spin');
        
    } catch (err) {
        console.error(err);
        showError(err.message || 'Failed to sync playlist.');
        DOM.syncBtn.querySelector('i').classList.remove('fa-spin');
    }
});

DOM.playPauseBtn.addEventListener('click', togglePlay);
DOM.nextBtn.addEventListener('click', () => playNext(true));
DOM.prevBtn.addEventListener('click', playPrev);
DOM.shuffleBtn.addEventListener('click', toggleShuffle);
DOM.repeatBtn.addEventListener('click', toggleRepeat);

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault(); // Prevent page scroll
            togglePlay();
            break;
        case 'arrowright':
            playNext(true);
            break;
        case 'arrowleft':
            playPrev();
            break;
        case 'm':
            toggleMute();
            break;
        case 's':
            toggleShuffle();
            break;
        case 'r':
            toggleRepeat();
            break;
        case 'f':
            toggleFullPlayer();
            break;
        case 'e':
            toggleEqModal();
            break;
        case 'escape':
            closeFullPlayer();
            closeEqModal();
            break;
    }
});

// --- Theme Management ---

DOM.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);

    const icon = DOM.themeToggle.querySelector('i');
    icon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

    saveState();
});

// --- Local Storage ---

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
        theme: state.theme,
        eq: {
            enabled: state.eq?.enabled ?? true,
            preset: state.eq?.preset || 'flat',
            bands: state.eq?.bands || [0, 0, 0, 0, 0]
        }
    };
    try {
        localStorage.setItem('playlistPlayerState', JSON.stringify(toSave));
    } catch (e) {
        console.error('Could not save to localStorage', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('playlistPlayerState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);

            // Restore UI
            if (state.playlistInfo) renderPlaylistInfo();
            if (state.tracks.length > 0) {
                renderTrackList();
                updatePlayerUI();
            }

            // Restore Toggles
            updateShuffleUI();
            updateRepeatUI();

            // Restore Volume
            DOM.volumeSlider.value = state.volume;
            DOM.volumeSlider.style.setProperty('--value', state.volume + '%');
            if (DOM.fullVolumeSlider) {
                DOM.fullVolumeSlider.value = state.volume;
                DOM.fullVolumeSlider.style.setProperty('--value', state.volume + '%');
            }

            // Restore EQ Settings
            if (state.eq) {
                const isEnabled = state.eq.enabled ?? true;
                if (DOM.eqPowerToggle) DOM.eqPowerToggle.checked = isEnabled;
                if (DOM.eqPowerStatus) DOM.eqPowerStatus.textContent = isEnabled ? 'EQ ON' : 'BYPASS';

                const presetKey = state.eq.preset || 'flat';
                DOM.eqPresetBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.preset === presetKey);
                });

                if (Array.isArray(state.eq.bands)) {
                    state.eq.bands.forEach((val, idx) => {
                        updateFaderUI(idx, val);
                    });
                }
                updateEqCurve();
                if (DOM.eqActivePresetName) {
                    const p = EQ_PRESETS[presetKey] || { name: 'Custom EQ', desc: 'Enhanced Sound' };
                    DOM.eqActivePresetName.textContent = isEnabled ? `${p.name} • ${p.desc}` : 'EQ Bypassed (Raw Audio Stream)';
                }
            } else {
                state.eq = { enabled: true, preset: 'flat', bands: [0, 0, 0, 0, 0] };
                state.eq.bands.forEach((val, idx) => updateFaderUI(idx, val));
                updateEqCurve();
            }

            // Restore Theme
            document.documentElement.setAttribute('data-theme', state.theme);
            const tIcon = DOM.themeToggle.querySelector('i');
            tIcon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        } else {
            updateShuffleUI();
            updateRepeatUI();
            state.eq = { enabled: true, preset: 'flat', bands: [0, 0, 0, 0, 0] };
            state.eq.bands.forEach((val, idx) => updateFaderUI(idx, val));
            updateEqCurve();
        }
    } catch (e) {
        console.error('Could not load from localStorage', e);
        updateShuffleUI();
        updateRepeatUI();
    }
}

// Initialize Universal Faders & Spectrum Display
setupPointerFaders();
setupSpectrumBars();
loadState();
