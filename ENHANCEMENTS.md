# RetroVault Enhancement Roadmap

This document outlines the planned enhancements for RetroVault, aimed at transforming it into a premium, world-class emulator experience.

---

## 🚀 Prioritization Matrix

| Feature | Category | Difficulty | Audience Retention | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Search & Filter** | Library | Low | High | P0 | ✅ Completed |
| **Customizable Shells** | Gameplay | Low | Medium | P1 | ✅ Completed |
| **Automatic Metadata Scraping** | Library | Medium | High | P1 | ⏳ Planned |
| **Fast-Forward / Rewind** | Gameplay | Medium | High | P1 | ✅ Completed |
| **Haptic Feedback** | Gameplay | Low | Medium | P1 | ✅ Completed |
| **Advanced Shaders (WebGPU/WebGL)** | Technical | High | Medium | P2 | ⏳ Planned |
| **Multiplayer (WebRTC)** | Technical | Very High | Very High | P3 | ⏳ Planned |

---

## 📂 1. The "Library" Experience (The Vault Feel)

To make RetroVault feel like a premium digital archive rather than just a file loader:

### **Automatic Metadata Scraping**

- **Goal:** Transform a list of filenames into a beautiful, visual library.
- **Details:** Use ROM hashes to fetch box art, release dates, and descriptions from APIs like **IGDB** or **ScreenScraper**.
- **Impact:** High visual "wow" factor upon folders being scanned.

### **Search & Filter**

- **Goal:** Ease of navigation.
- **Details:** Filter by console (GBA, SNES, etc.), genre, or title search.
- **Impact:** Essential for users with large collections.

---

## 🎮 2. Gameplay & Visuals (Skeuomorphic Polish)

Enhancing the tactile and visual "feel" of the emulator:

### **Haptic Feedback**

- **Goal:** Improve the mobile/touch experience.
- **Details:** Trigger short vibrations on button presses (A/B, D-pad) using the Vibration API.
- **Impact:** Substantial improvement in "hand feel" on mobile devices.

### **Customizable Shells**

- **Goal:** Personalization.
- **Details:** Allow users to toggle between "Plastic Gray," "Atomic Purple," "Clear," or "Yellow." Support custom hex codes via Tailwind/CSS Variables.
- **Impact:** High engagement for aesthetic-focused users.

### **Fast-Forward & Rewind**

- **Goal:** Modern convenience.
- **Details:** Allow skipping past slow intros or rewinding 5-10 seconds of gameplay to fix mistakes.
- **Impact:** A staple feature of "premium" modern emulators.

---

## 🛠️ 3. Technical "Deep Dives" (Engineering Excellence)

High-complexity features that serve as major resume highlights:

### **WebGPU/WebGL CRT Shaders**

- **Goal:** Authentic retro visual style.
- **Details:** Implement advanced shaders that simulate CRT curvature, phosphor patterns, and bloom, rather than simple scanlines.
- **Impact:** Massive appeal to retro purists.

### **Multiplayer (WebRTC)**

- **Goal:** The "Holy Grail."
- **Details:** Use **PeerJS** or raw WebRTC to emulate the "Link Cable" over the internet.
- **Impact:** Unique selling point that drives viral adoption and long-term retention.

---

## 🧩 4. Chrome Extension Potential (Future Phase)

*Note: These are lower priority as the focus remains on the web app for now.*

- **Side Panel Integration:** Using `chrome.sidePanel` to keep the emulator open while browsing.
- **URL Detection:** Auto-detect games on websites and show a "Play in RetroVault" icon.
- **Native File Handling:** Registering the extension as a handler for `.gba` or `.nes` files globally.
