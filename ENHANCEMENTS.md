# RetroVault Enhancement Roadmap

This document outlines the planned enhancements for RetroVault, aimed at transforming it into a premium, world-class emulator experience.

---

## 🚀 Prioritization Matrix

| Feature | Category | Difficulty | Audience Retention | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Search & Filter** | Library | Low | High | P0 | ✅ Completed |
| **Customizable Shells** | Gameplay | Low | Medium | P1 | ✅ Completed |
| **System Event Logging**| UI/UX    | Low | Medium | P2 | ✅ Completed |
| **UI Aesthetic Overhaul**| UI/UX    | Medium| High   | P1 | ✅ Completed |
| **Automatic Metadata Scraping** | Library | Medium | High | P1 | ✅ Completed |
| **Fast-Forward / Rewind** | Gameplay | Medium | High | P1 | ✅ Completed |
| **Haptic Feedback** | Gameplay | Low | Medium | P1 | ✅ Completed |
| **Advanced Shaders (WebGPU/WebGL)** | Technical | High | Medium | P2 | ⏳ Planned |
| **Multiplayer (WebRTC)** | Technical | Very High | Very High | P3 | ⏳ Planned |
| **Native Desktop (Electron)** | Platform | Medium | High | P1 | ⏳ Planned |
| **Chrome Extension** | Platform | Medium | High | P2 | ⏳ Planned |
| **CLI / Terminal Player** | Platform | High | Medium | P3 | ⏳ Planned |

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

## 🧩 4. Platform Expansion (The Omni-Vault)

Moving RetroVault beyond the browser tab to own the desktop and terminal experience:

### **Native Desktop Apps (macOS & Windows)**
- **Goal:** Standalone performance and native OS integration.
- **Details:** Use **Electron** or **Tauri** to wrap the web core. Enable native file system access without recurring prompt dialogs.
- **Impact:** Significant boost in professional feel and high-performance threading.

### **Chrome Extension Integration**
- **Goal:** Zero-click access and contextual discovery.
- **Details:** Implement `chrome.sidePanel` and context menus. Allow "Instant Play" when a browser detects a ROM link on any website.
- **Impact:** Frictionless entry point for casual and power users alike.

### **CLI / Terminal Version**
- **Goal:** Minimalist engineering and server-side capability.
- **Details:** A Node/Rust-based CLI that renders emulation via Sixel/Kitty protocols or opens an optimized discrete window. 
- **Impact:** Unique appeal to developer/enthusiast demographics.
