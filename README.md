# YouTube Playlist Music Player 🎵

A sleek, modern, Spotify/Apple Music-inspired web player for streaming YouTube playlists with seamless background audio playback and keyboard controls.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/contactwithcodewithakash/YOUTUBEPLAYLISTPLAYER.COM?style=social)](https://github.com/contactwithcodewithakash/YOUTUBEPLAYLISTPLAYER.COM)

---

## ✨ Features

- 🎧 **Modern Music App UI/UX**: Spotify/Apple Music-inspired deep dark interface with glassmorphism, subtle radial glow, and animated soundwave equalizers.
- 🔗 **YouTube Playlist Streaming**: Simply paste any YouTube playlist link to immediately fetch all songs, track counts, channel info, and album art.
- 🔄 **Live Sync Button**: Easily refresh and sync your playlist to fetch any newly added tracks from YouTube.
- 📱 **Mobile & Background Playback**: Engineered with background audio loops and stall-recovery watchdogs to keep music playing seamlessly even when the screen is locked or browsing other tabs.
- 📲 **MediaSession API Support**: Control tracks (Play, Pause, Next, Previous, Seeking) directly from your lock screen, notification shade, or Bluetooth headset.
- 🔀 **Shuffle & Repeat Modes**: Shuffle songs with Fisher-Yates randomization, Repeat All, or Repeat One.
- 🎨 **Dark / Light Theme Toggle**: Seamless toggle between sleek deep dark mode and crisp light mode.
- ⌨️ **Desktop Keyboard Shortcuts**: Full control via keyboard for power users.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>→</kbd> | Next Track |
| <kbd>←</kbd> | Previous Track |
| <kbd>M</kbd> | Mute / Unmute |
| <kbd>S</kbd> | Toggle Shuffle |
| <kbd>R</kbd> | Toggle Repeat (Off / All / One) |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/contactwithcodewithakash/YOUTUBEPLAYLISTPLAYER.COM.git
cd YOUTUBEPLAYLISTPLAYER.COM
```

### 2. Run Locally
Open `index.html` directly in any modern browser, or serve it using any local static web server:
```bash
# Using Python
python -m http.server 8000

# Using Node / npx
npx serve
```

---

## 🛠️ Tech Stack

- **HTML5 & Vanilla JavaScript (ES6+)**
- **YouTube IFrame Player API & YouTube Data API v3**
- **Modern CSS3 (Flexbox, Glassmorphism, CSS Custom Properties)**
- **FontAwesome 6 Icons & Google Fonts (Plus Jakarta Sans, Inter)**

---

## 👨‍💻 Developer

**Akash Wawdhane**  
- GitHub: [@contactwithcodewithakash](https://github.com/contactwithcodewithakash)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
