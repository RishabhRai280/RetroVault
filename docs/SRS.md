# Software Requirements Specification (SRS)
## RetroVault

**Version:** 1.0.0
**Status:** Open Source Architecture

---

## 1. Introduction
This Software Requirements Specification (SRS) details the system behavior, requirements, UI flows, and data interactions for **RetroVault**, a web-based, local-first emulator and personal gaming library. It defines what the software will do and how it will perform under specific conditions.

## 2. Global Constraints & Standards
* **Local-First Processing**: The application must never transmit ROM files, save data, or library content back to a centralized server. All processing runs entirely inside the browser's context.
* **Open Source Cores**: Utilizes community-maintained `libretro` WebAssembly cores under their respective licenses.
* **Offline Functionality**: Must function fully offline (excluding optional metadata scraping) by leveraging Service Workers to cache WASM binaries and frontend assets.

## 3. Functional Requirements (FR)

### FR-1: Emulation & Gameplay
* **FR-1.1 System Support**: The system must initially support Game Boy (GB), Game Boy Color (GBC), and Game Boy Advance (GBA) binaries.
* **FR-1.2 Gamepad Support**: The application shall accept plug-and-play inputs from Xbox, PlayStation, and generic Bluetooth controllers via the HTML5 Gamepad API.
* **FR-1.3 Touch Controls**: For mobile users, an interactive multi-touch on-screen controller overlay must dynamically appear.
* **FR-1.4 Fast Forward/Rewind**: The system shall provide toggles to uncap the emulator's framerate for fast-forwarding, and utilize Libretro core capabilities to rewind gameplay state.

### FR-2: Library Management
* **FR-2.1 Ingestion**: The system must support drag-and-drop of `.gb`, `.gbc`, `.gba`, and `.zip` files directly into the window.
* **FR-2.2 Auto-Scraping**: The backend shall hash imported ROMs (SHA-1) and asynchronously fetch box art from a CORS-friendly public API without leaking PII.
* **FR-2.3 Vault View**: Users shall be able to browse a searchable, filterable visual grid of their locally ingested library.

### FR-3: Save & State Management
* **FR-3.1 Battery Saves (SRAM)**: The system shall trigger automatic background extraction and persistence of `.sav` files to local storage either every 60 seconds or immediately upon pausing execution.
* **FR-3.2 Save States**: The system must allow users to "Freeze" (Save) and "Resume" (Load) exact machine state snapshots, attaching an auto-generated HTML5 `<canvas>` screenshot as a thumbnail.
* **FR-3.3 Export/Import**: Users must be provided an interface to bulk export or individually import save binaries to/from their local operating system.

### FR-4: The Digital Museum (Stats)
* **FR-4.1 Playtime Tracking**: A Web Worker timer shall silently track active, unpaused playtime down to the second for each specific title.
* **FR-4.2 Last Played Tracking**: The system must log unix timestamps upon launch, allowing chronologically-sorted views of "Recently Played" titles.

## 4. Non-Functional Requirements (NFR)
* **NFR-1 Performance**: The emulation cycle must execute at a strict 60 FPS constraint on mid-range tier devices (e.g., iPhone 11, Snapdragon 700 processors). Input polling latency must remain beneath 50ms.
* **NFR-2 Reliability (Offline)**: Upon successful load of the PWA shell, it must achieve a 100% offline success rate for all core emulation tasks.
* **NFR-3 Storage Scalability**: The system must scale gracefully up to libraries exceeding 100 titles. It must gracefully manage the browser's Origin Private File System (OPFS) and alert the user well before limits are breached (via `navigator.storage`).
* **NFR-4 Responsiveness & Scalability**: The "Virtual Shell" UI must adapt gracefully with robust CSS paradigms (grid/flexbox) targeting standard aspect ratios, massive ultrawide monitors, and strict vertical mobile phones.
* **NFR-5 Accessibility (a11y)**: Must comply broadly with WCAG guidelines: enforcing high-contrast text layers and supporting 100% keyboard navigability natively inside all application menus.

## 5. UI/UX States & Flows

### State 1: "No Cartridge" (Standby)
* **Visuals**: A skeuomorphic device shell with a slightly tinted green/grey "screen" background, rendered with dynamic CSS scanline overlays.
* **Animation**: Slow, pulsing "Power" LED element.
* **Interaction**: Clicking the cartridge slot or executing a file drag triggers a file upload dialog or automated ingestion sequence.

### State 2: "Booting / Loading"
* **Audio**: Play a synthetic boot chime generated via Web Audio API oscillators (circumventing copyrighted audio).
* **Visuals**: A dropping-logo style progress bar spanning real-time parsing phases. 
* **Screen Text**: `READING DATA... [HASH/TITLE]`.

### State 3: "Active Gameplay"
* **Visuals**: A clean, distraction-free active canvas. Mouse cursors are hidden automatically after 2000 milliseconds of inactivity.
* **Interaction**: Pressing `Escape` or tapping a persistent transparent touch-zone suspends the Worker loop and triggers the overlay menu.

### State 4: "The Vault" (Library View)
* **Visuals**: Transitions into a rich 3D or flat aesthetic array of collected cartridge sprites or fetched box art thumbnails.
* **Metadata Display**: Hover/Touch focus on a library item exposes: "Total Time Played", "Last Played", and related metadata.

## 6. Data Schema

The underlying local database utilizes **Dexie.js** wrapping standard **IndexedDB**, mapped strictly to the native Origin Private File System (OPFS) binaries.

```typescript
// Core database schema
interface VaultDatabase extends Dexie {
  games: Dexie.Table<GameRecord, string>; // string = SHA-1 Hash
  stats: Dexie.Table<GameStats, string>;
  saves: Dexie.Table<SaveFile, string>;
}

// Table: games
type GameRecord = {
  hash: string;         // Primary Key (SHA-1)
  title: string;        // Extracted from Header
  system: 'GB' | 'GBC' | 'GBA';
  fileRef: string;      // Pointer to OPFS file location
  addedAt: number;      // Unix Timestamp
  boxArtBlob?: Blob;    // Optional cached image
}

// Table: stats
type GameStats = {
  hash: string;         // Primary Key / Foreign Key
  playTimeSeconds: number;
  lastPlayed: number;
  launchCount: number;
}

// Table: saves
type SaveFile = {
  id: string;           // UUID
  gameHash: string;     // Foreign Key
  type: 'SRAM' | 'STATE';
  timestamp: number;
  screenshot?: Blob;    // Thumbnail for save states
  dataRef: string;      // Pointer to OPFS file location
}
```
