# UI Wireframes & Component Architecture
## RetroVault

---

## 1. Global Layout (The Virtual Handheld)
The application shell is wrapped in a responsive CSS Flex/Grid layout that simulates an immersive physical device. 

```text
+-------------------------------------------------------------+
|                       [ App Header ]                        |
|  (Hamburger Menu)      RetroVault            (Battery/Time) |
+-------------------------------------------------------------+
|                                                             |
|   +-----------------------------------------------------+   |
|   |                  [ Screen Bezel ]                   |   |
|   |   +---------------------------------------------+   |   |
|   |   |                                             |   |   |
|   |   |             [ Main Canvas Area ]            |   |   |
|   |   |          (Renders game or library)          |   |   |
|   |   |                                             |   |   |
|   |   |                                             |   |   |
|   |   +---------------------------------------------+   |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   [D-PAD]                                       [BUTTONS]   |
|      ^                                           (X) (Y)    |
|    <   >                                       (A) (B)      |
|      v                                                      |
|                                                             |
|           [SELECT] [START]       [MENU OVERLAY]             |
+-------------------------------------------------------------+
```

## 2. Core View States

### 2.1 Standby View (No Cartridge)
*   **Canvas Area**: Displays a glowing "Insert Cartridge" animation with subtle CRT scanline CSS effects.
*   **Action**: 
    1. Drag and drop a `.gba`, `.gbc`, `.gb` or `.zip` file anywhere on the screen.
    2. Alternatively, clicking the center opens a native OS file picker.
*   **Footer**: "Powered by Libretro | 100% Local & Private".

### 2.2 The Vault (Library View)
*   **Canvas Area**: A masonry or uniform grid of game box art / cartridge sprites.
*   **Top Bar**: 
    *   Search input (`Search library...`)
    *   System filter chips (`GB`, `GBC`, `GBA`, `All`).
*   **Grid Layout**: Automatically scales; 3 columns on mobile devices, 5+ on desktop/ultrawide displays.
*   **Hover/Tap State**: Focus expands the item slightly and reveals:
    *   "Play" Fab Button.
    *   "Total Playtime" overlay.
    *   "Last Played" timestamp.

### 2.3 Gameplay View
*   **Canvas Area**: Pixel-perfect rendering of the emulated game. `image-rendering: pixelated;` is applied to ensure sharpness.
*   **Controls**: 
    *   **Desktop**: Keyboard mapping activates.
    *   **Mobile**: The on-screen touch D-Pad and Action buttons become interactive with multi-touch support.
*   **Interaction**: Swiping down from the top edge or pressing the `Escape` key pauses the emulator core and invokes the **Pause Overlay**.

### 2.4 Pause Overlay
A sleek, semi-transparent frosted-glass menu layered over a dynamically blurred gameplay canvas.
*   **Resume Game**: Unpauses the Web Worker.
*   **Save State**: Displays 5 slot placeholders. Creating a save automatically captures a low-res image of the current canvas.
*   **Load State**: Restores chosen slot.
*   **Controls/Settings**: Modifies touch opacity, audio volume, and keybindings.
*   **Exit to Vault**: Safely dumps SRAM, ends the Worker context, and returns to Library view.

## 3. Core React/Svelte Component Tree

```text
<App>
  <Header />
  <VirtualShell>
    <CanvasRenderer>
       <!-- Routing Context determines active view -->
       <StandbyDropzone /> 
       <!-- OR -->
       <VaultLibraryGrid /> 
       <!-- OR -->
       <EmulationRuntime /> 
    </CanvasRenderer>
    
    <TouchControllerOverlay /> 
  </VirtualShell>
</App>
```
