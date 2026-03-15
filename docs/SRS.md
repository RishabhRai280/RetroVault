# Software Requirements Specification (SRS): RetroVault v1.1.0

**Standard Compliance:** IEEE Std 830-1998  
**Document Version:** 1.1.0  
**Date:** March 15, 2026

---

## 1. Introduction

### 1.1. Purpose
The purpose of this document is to provide a complete and rigorous specification of the software requirements for RetroVault v1.1.0. This SRS defines the functional behavior, performance constraints, and external interface requirements for the browser-based emulation platform.

### 1.2. Scope
RetroVault is a client-side web application designed to run retro game ROMs (GBA, SNES, NES, GB) using WebAssembly-based emulation cores. The scope includes:
- Local file system orchestration.
- Skeuomorphic user interface rendering.
- Metadata enrichment via third-party APIs.
- Local data persistence for saves and settings.

### 1.3. Definitions, Acronyms, and Abbreviations
- **WASM**: WebAssembly.
- **ROM**: Read-Only Memory (Game File).
- **DMG**: Dot Matrix Game (Original Game Boy model).
- **Core**: A WASM-compiled Libretro emulator library.
- **FS Access API**: Browser File System Access API.

---

## 2. Overall Description

### 2.1. Product Perspective
RetroVault is a standalone web application that operates in a "Secure Context." It acts as a bridge between the browser's hardware-access layers and the Libretro emulation ecosystem.

### 2.2. Product Functions
The system performs the following primary functions:
- Recursive file system scanning.
- Dynamic core resolution and initialization.
- Input event translation (Keyboard/Touch to HW).
- In-memory state snapshotting and storage.
- Real-time performance telemetry.

### 2.3. User Characteristics
The system is intended for gamers, preservationists, and developers. No technical proficiency is required for basic gameplay, but advanced features (Keybindings, Telemetry) cater to power users.

---

## 3. Specific Requirements

### 3.1. External Interface Requirements
#### 3.1.1. User Interfaces
- **REQ-UI-101**: The system SHALL render a fixed-ratio skeuomorphic DMG shell (`490px x 860px`).
- **REQ-UI-102**: The system SHALL provide a responsive multi-column layout on viewports > 1200px.
- **REQ-UI-103**: The system SHALL implement a "Retro-Technical" theme using IndexedDB-stored CSS variables.

#### 3.1.2. Hardware Interfaces
- **REQ-HW-201**: The system SHALL utilize the Vibration API for 10ms haptic pulses on tactile input events.
- **REQ-HW-202**: The system SHALL utilize the Screen Wake Lock API (where available) to prevent display sleep during gameplay.

### 3.2. Functional Requirements

#### 3.2.1. ROM Vault Management
- **REQ-FN-301**: The system SHALL recursively scan directory handles in the browser's "Secure Context."
- **REQ-FN-302**: The system SHALL filter files based on a whitelist of supported retro-extensions (GBA, SFC, NES, etc.).
- **REQ-FN-303**: The system SHALL derive unique Game IDs based on a combined hash of `FileName` and `FileSize`.

#### 3.2.2. Emulation Execution (v1.1.0)
- **REQ-FN-401**: The system SHALL initialize Libretro cores in isolated WebAssembly runtimes.
- **REQ-FN-402**: The system SHALL support **Fast-Forward** (3.0x speed) and **Rewind** (buffered state playback) actions.
- **REQ-FN-403**: The system SHALL implement an automated 30-second persistence loop for SRAM binary data.

#### 3.2.3. Data Enrichment (v1.1.0)
- **REQ-FN-501**: The system SHALL fetch title metadata from the Wikipedia Action API asynchronously.
- **REQ-FN-502**: The system SHALL cache enrichment results in IndexedDB to minimize redundant network traffic.

### 3.3. Performance Requirements
- **REQ-PR-601**: The system SHALL maintain 60 FPS (± 5%) for 95% of gameplay frames on modern Chrome/Edge browsers.
- **REQ-PR-602**: Input processing loop (Input -> WASM Memory) SHALL have a latency of < 16.6ms (1 frame).

### 3.4. Software Quality Attributes
- **Privacy**: No user-provided ROM data shall ever be transmitted via network protocols.
- **Interoperability**: The system SHALL utilize `localforage` to ensure cross-driver compatibility for persistence.

---

## 4. Database Requirements
The system utilizes four distinct **Key-Value Stores** via IndexedDB:

- **Store: Settings**: Stores `KeyBindings`, `Volume`, and `CasingTheme`.
- **Store: Metadata**: Stores Wikipedia enrichment data and scraped titles.
- **Store: Saves**: Stores binary state blobs (`Uint8Array`) and associated timestamps.
- **Store: History**: Stores cumulative cumulative playtime and "Last Played" metadata.

---

## 5. Omni-Platform Portability Requirements (Future Scope)

### 5.1. Desktop Distribution (macOS/Windows)
- **REQ-PL-501**: The system SHALL provide a production-ready installer for macOS (.dmg) and Windows (.exe).
- **REQ-PL-502**: The desktop application SHALL utilize native file system access with persistent permissions.

### 5.2. Browser Extension Integration
- **REQ-PL-601**: The system SHALL provide a Chrome-compatible extension supporting the `sidePanel` API.
- **REQ-PL-602**: The extension SHALL synchronize user metadata and play history with the web version where local storage is shared.

### 5.3. Terminal / CLI Capability
- **REQ-PL-701**: The CLI SHALL support ROM scanning and meta-data display via standard terminal output.
- **REQ-PL-702**: The CLI SHALL provide an optional "headful" mode that spawns an optimized emulation window.
