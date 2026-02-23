# RetroVault
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Status](https://img.shields.io/badge/Status-Proposed_Architecture-brightgreen)
![License](https://img.shields.io/badge/License-MIT-purple)

## Welcome to RetroVault
**RetroVault** is a local-first, Progressive Web App (PWA) emulation platform designed to evoke nostalgia through a high-fidelity "Virtual Handheld" interface. 

It allows users to upload, manage, and play retro game backups directly in their browser without relying on external servers, providing an authentic, private, and frictionless gaming experience.

---

## 📚 Documentation Index

To understand the full scope of the RetroVault project, please refer to the following industry-standard documentation in this directory:

### 1. [Product Requirements Document (PRD)](./PRD.md)
Contains the executive vision, core target audience, key value propositions, phased feature roadmap, and strategy for future opt-in scaling.
- **Audience:** Product Managers, Stakeholders, Core Contributors

### 2. [Software Requirements Specification (SRS)](./SRS.md)
Details strict system rules, Functional (FR) and Non-Functional Requirements (NFR). Explains the exact UI/UX states necessary for development alongside detailed database (IndexedDB/OPFS) object schemas.
- **Audience:** Developers, QA Engineers, Designers

### 3. [System Architecture](./Architecture.md)
Outlines the decoupled computing logic separating the UI from Emulation. Covers layers (Presentation, Input, Emulation Core, Storage, Output), application lifecycle flow, and the open-source Monorepo directory mapping. Features intricate `mermaid.js` component and sequence diagrams.
- **Audience:** Software Architects, Core Engine Contributors

### 4. [Database & Storage Architecture](./Database_Architecture.md)
A deep dive into the dual-layer storage constraints utilizing the Origin Private File System (OPFS) for blob ingestion alongside IndexedDB for relational fast lookup. Explains data lifecycle mapping across the ingestion, emulation, and save-persistence states.
- **Audience:** Data Engineers, Architecture Leads

### 5. [UI Wireframes & Component Ecosystem](./Wireframes.md)
Textual representations of the global layout matrices simulating a retro physical device. Breaks down strictly defined active CSS Grid states, nested React/Svelte component trees, and UX pause overlay controls.
- **Audience:** UI/UX Designers, Frontend Engineers

### 6. [Local Development Guide](./Development_Guide.md)
Exhaustive step-by-step framework instructions setting up the local pnpm Turborepo workspace. Defines the critical mental model for understanding the asynchronous data bridge operating between the UI Canvas thread and Web Workers.
- **Audience:** New Contributors, Open Source Developers

### 7. [Test Strategy Workflows](./workflows/Setup.md)
Outlines precise methods ensuring the underlying libretro WebAssembly cores do not drop below a strict 60 FPS constraint while maintaining pixel-perfect alias alignments. Includes PR contribution and code-style validation rules.
- **Audience:** Core Engine Testers, Community Contributors

---

## Why RetroVault?
* **Zero Registration:** Start playing instantly via local browser storage.
* **100% Privacy Absolute:** Game data, ROM backups, and SRAM battery saves never leave your host device.
* **Aesthetic Focus:** More than just an emulator — an immersive, responsive frontend that turns your ROM collection into a gorgeous, personalized digital museum.

---

> **Safety & Legality Disclaimer**  
> RetroVault is strictly an emulator frontend and runtime. It contains no copyrighted BIOS files, ROMs, or proprietary assets. It is designed solely as a tool for playing user-owned backups. Emulation is entirely client-side, meaning no illicit material is hosted, transmitted, or facilitated by the application's distribution servers.