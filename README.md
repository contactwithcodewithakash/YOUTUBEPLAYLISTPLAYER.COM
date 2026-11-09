# Waveify — Modern YouTube Playlist Player 🎵

A modern, fast, and feature-rich YouTube Playlist streaming web app inspired by Spotify and Apple Music. Stream YouTube playlists with full background playback support, queue management, liked songs, sleep timers, and a dynamic audio visualizer.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/contactwithcodewithakash/YOUTUBEPLAYLISTPLAYER.COM?style=social)](https://github.com/contactwithcodewithakash/YOUTUBEPLAYLISTPLAYER.COM)

---

## ✨ Features

- 🎧 **Modern Music App UI/UX**: Spotify/Apple Music-inspired deep dark interface with glassmorphic cards, ambient glow, and animated soundwave equalizers.
- 🌟 **Built-in Curated Hub**: Enjoy instant playlists out of the box (Lofi Beats, Synthwave & Cyberpunk, Top Hits & Pop, Deep Focus & Coding, Workout Motivation, Acoustic Café) with zero setup required.
- 📱 **Mobile & Background Playback**: Engineered with background audio loops and stall-recovery watchdogs to keep music playing seamlessly even when the screen is locked or browsing other tabs.
- 📲 **MediaSession API Support**: Control tracks (Play, Pause, Next, Previous, Seeking) directly from your lock screen, notification shade, or Bluetooth headset.
- ❤️ **Liked Songs / Favorites**: Heart any song to save it to your personal local library with persistent storage.
- 📋 **Interactive Play Queue**: View what's playing next, reorder tracks, or jump directly to any track in the queue.
- 🔍 **Live In-Playlist Search**: Instantly filter tracks in any playlist by song title or channel/artist name.
- 🌙 **Sleep Timer**: Schedule audio to pause after 15m, 30m, 45m, 1 hour, or at the end of the current track.
- 📀 **Fullscreen Cinema & Visualizer Mode**: Enjoy an immersive full-screen vinyl player with real-time simulated soundwave visualizers (press `F`).
- ⚡ **Playback Speed Selector**: Switch between `0.75x`, `1.0x`, `1.25x`, `1.5x`, and `2.0x` speeds.
- 🔑 **Custom YouTube API Key Support**: Add your own YouTube Data API v3 key directly in the UI to bypass quota limitations.
- ⌨️ **Rich Keyboard Shortcuts**: Quick controls for desktop power users.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>→</kbd> | Next Track |
| <kbd>←</kbd> | Previous Track |
| <kbd>↑</kbd> | Volume Up (+5%) |
| <kbd>↓</kbd> | Volume Down (-5%) |
| <kbd>M</kbd> | Mute / Unmute |
| <kbd>S</kbd> | Toggle Shuffle |
| <kbd>R</kbd> | Toggle Repeat (Off / All / One) |
| <kbd>L</kbd> | Like / Favorite Track |
| <kbd>F</kbd> | Toggle Fullscreen Cinema Mode |
| <kbd>Q</kbd> | Open Play Queue |
| <kbd>?</kbd> | Open Shortcuts Cheat Sheet |
| <kbd>Esc</kbd> | Close Modal / Fullscreen |

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

### 3. (Optional) Custom YouTube API Key Setup
If you want to stream playlists using your own Google Cloud YouTube Data API quota:
1. Open Google Cloud Console: [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a project and enable the **YouTube Data API v3**.
3. Go to **Credentials** > **Create Credentials** > **API Key**.
4. In the app, click the **API Key** button in the header and paste your key.

---

## 🛠️ Tech Stack

- **HTML5 & Vanilla JavaScript (ES6+)**
- **YouTube IFrame Player API & YouTube Data API v3**
- **Modern CSS3 (Flexbox, CSS Grid, Glassmorphism, CSS Custom Properties)**
- **FontAwesome 6 Icons & Google Fonts (Plus Jakarta Sans, Inter)**

---

## 👨‍💻 Developer

**Akash Wawdhane**  
- GitHub: [@contactwithcodewithakash](https://github.com/contactwithcodewithakash)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
