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
    theme: 'dark'
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
    nowPlayingThumb: document.getElementById('now-playing-thumb'),
    nowPlayingTitle: document.getElementById('now-playing-title'),
    nowPlayingPlaylist: document.getElementById('now-playing-playlist'),
    nowPlayingInfoDiv: document.querySelector('.now-playing-info'),

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
    themeToggle: document.getElementById('theme-toggle')
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
}

function onPlayerReady(event) {
    isPlayerReady = true;
    player.setVolume(state.volume);

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
        const currentItem = DOM.trackContainer.children[state.currentIndex];
        if (currentItem) {
            const indexEl = currentItem.querySelector('.track-index');
            if (indexEl) indexEl.innerHTML = '<div class="equalizer-bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>';
        }
        startProgressInterval();
        enableBackgroundAudio();
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
            const currentItem = DOM.trackContainer.children[state.currentIndex];
            if (currentItem) {
                const indexEl = currentItem.querySelector('.track-index');
                if (indexEl) indexEl.innerHTML = state.currentIndex + 1;
            }
            stopProgressInterval();
            disableBackgroundAudio();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    } else if (event.data === YT.PlayerState.BUFFERING) {
        // Check if buffering at the end of track
        const curr = (player && player.getCurrentTime) ? (player.getCurrentTime() || 0) : 0;
        const dur = (player && player.getDuration) ? (player.getDuration() || 0) : 0;

        if (dur > 0 && curr >= dur - 1.0 && !isTransitioning) {
            console.log("Buffering near end of track, auto-advancing...");
            triggerSongEnd();
            return;
        }

        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
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
        setTimeout(playNext, 400);
    }
}

// --- Playlist Loading ---

DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.urlInput.blur(); // Hide mobile keyboard
    const url = DOM.urlInput.value.trim();
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
        showError('Invalid YouTube Playlist URL. Ensure it contains "list=".');
        return;
    }

    if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
        showError('API Key Missing: Please add your YouTube Data API v3 Key in app.js.');
        return;
    }

    try {
        hideError();
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
    }
});

function extractPlaylistId(url) {
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
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
        div.onclick = () => playSong(index);

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

    DOM.nowPlayingThumb.src = track.thumbnail;
    DOM.nowPlayingThumb.classList.remove('hidden');
    DOM.nowPlayingInfoDiv.classList.remove('hidden');

    DOM.nowPlayingTitle.textContent = track.title;
    DOM.nowPlayingPlaylist.textContent = state.playlistInfo ? state.playlistInfo.title : 'My Playlist';

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

    // Reset seekbar and timers immediately
    DOM.currentTime.textContent = '0:00';
    DOM.duration.textContent = '0:00';
    DOM.seekBar.value = 0;
    DOM.seekBar.style.setProperty('--value', '0%');
    DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    // Fast highlight in list
    updateTrackHighlight();

    // Lock screen media session integration
    updateMediaSession(track);

    // Save state
    saveState();

    // 2. Load and play in YouTube player
    if (isPlayerReady && player) {
        try {
            player.loadVideoById({
                videoId: track.videoId,
                startSeconds: 0
            });
        } catch (e) {
            console.warn("loadVideoById fallback:", e);
            player.loadVideoById(track.videoId);
        }

        // Mobile autoplay watchdog: ensure playback begins if browser hesitates
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
        }, 800);
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

function playNext() {
    if (state.tracks.length === 0) {
        isTransitioning = false;
        return;
    }

    if (state.repeatMode === 2) {
        // Repeat one
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
        // Repeat all: loop back to start
        playSong(0);
    } else {
        // Stop at end
        try {
            player.stopVideo();
        } catch (e) {}
        state.isPlaying = false;
        DOM.playPauseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
        isTransitioning = false;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }
}

function playPrev() {
    if (state.tracks.length === 0) return;

    // If we're more than 3 seconds in, just restart the song
    try {
        if (player.getCurrentTime() > 3) {
            player.seekTo(0);
            return;
        }
    } catch (e) {}

    if (state.currentIndex > 0) {
        playSong(state.currentIndex - 1);
    } else if (state.repeatMode === 1) {
        // Repeat all: wrap to end
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
        try {
            player.seekTo(0);
            player.playVideo();
        } catch (e) {}
        isTransitioning = false;
    } else {
        playNext();
    }
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.classList.toggle('active', state.isShuffle);

    if (state.tracks.length === 0) return;

    const currentTrack = state.tracks[state.currentIndex];

    if (state.isShuffle) {
        state.tracks = shuffleArray([...state.originalTracks]);
    } else {
        state.tracks = [...state.originalTracks];
    }

    // Find the current track in the new array to preserve what's playing
    state.currentIndex = state.tracks.findIndex(t => t.videoId === currentTrack.videoId);
    if (state.currentIndex === -1) state.currentIndex = 0;

    renderTrackList();
    updateTrackHighlight();
    saveState();
}

function toggleRepeat() {
    // 0: None, 1: All, 2: One
    state.repeatMode = (state.repeatMode + 1) % 3;

    const icon = DOM.repeatBtn.querySelector('i');

    if (state.repeatMode === 0) {
        DOM.repeatBtn.classList.remove('active');
        icon.className = 'fa-solid fa-repeat';
    } else if (state.repeatMode === 1) {
        DOM.repeatBtn.classList.add('active');
        icon.className = 'fa-solid fa-repeat';
    } else if (state.repeatMode === 2) {
        DOM.repeatBtn.classList.add('active');
        icon.className = 'fa-solid fa-repeat-1'; // repeat one icon
    }

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
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && isPlayerReady && player && player.getDuration) {
                player.seekTo(details.seekTime, true);
                DOM.currentTime.textContent = formatTime(details.seekTime);
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

    if (dur > 0) {
        const val = (curr / dur) * 100;
        DOM.seekBar.value = val;
        DOM.seekBar.style.setProperty('--value', val + '%');

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

DOM.seekBar.addEventListener('input', (e) => {
    if (!isPlayerReady || !player.getDuration) return;
    const dur = player.getDuration();
    const val = e.target.value;
    const seekTime = (val / 100) * dur;
    lastCurrentTime = seekTime;
    consecutiveStalls = 0;
    player.seekTo(seekTime, true);
    DOM.currentTime.textContent = formatTime(seekTime);
    DOM.seekBar.style.setProperty('--value', val + '%');
});

DOM.volumeSlider.addEventListener('input', (e) => {
    state.volume = parseInt(e.target.value);
    DOM.volumeSlider.style.setProperty('--value', state.volume + '%');
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
        state.volume = state.volume === 0 ? 100 : state.volume;
        DOM.volumeSlider.value = state.volume;
        player.setVolume(state.volume);
        updateMuteIcon(false);
    } else {
        player.mute();
        DOM.volumeSlider.value = 0;
        updateMuteIcon(true);
    }
});

function updateMuteIcon(isMuted) {
    const i = DOM.muteBtn.querySelector('i');
    if (isMuted) {
        i.className = 'fa-solid fa-volume-xmark';
    } else {
        i.className = 'fa-solid fa-volume-high';
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

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
DOM.nextBtn.addEventListener('click', playNext);
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
            playNext();
            break;
        case 'arrowleft':
            playPrev();
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
        theme: state.theme
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
            DOM.shuffleBtn.classList.toggle('active', state.isShuffle);

            const rIcon = DOM.repeatBtn.querySelector('i');
            if (state.repeatMode === 0) {
                DOM.repeatBtn.classList.remove('active');
                rIcon.className = 'fa-solid fa-repeat';
            } else if (state.repeatMode === 1) {
                DOM.repeatBtn.classList.add('active');
                rIcon.className = 'fa-solid fa-repeat';
            } else if (state.repeatMode === 2) {
                DOM.repeatBtn.classList.add('active');
                rIcon.className = 'fa-solid fa-repeat-1';
            }

            // Restore Volume
            DOM.volumeSlider.value = state.volume;
            DOM.volumeSlider.style.setProperty('--value', state.volume + '%');

            // Restore Theme
            document.documentElement.setAttribute('data-theme', state.theme);
            const tIcon = DOM.themeToggle.querySelector('i');
            tIcon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    } catch (e) {
        console.error('Could not load from localStorage', e);
    }
}

// Initialize
loadState();
