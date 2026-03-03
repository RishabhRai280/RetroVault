# Feature: Library Search & Platform Filter

## Overview

The Library Search and Platform Filter feature allows users to quickly navigate large ROM collections by searching for titles or filtering by specific emulation platforms.

## Implementation Details

### State Management

Two new pieces of state were added to the main `App.tsx` component:

- `searchQuery`: A string representing the current search text.
- `platformFilter`: A union type (`'ALL' | 'GBA' | 'SNES' | 'NES'`) representing the active platform filter.

### Filtering Logic

The library is filtered in real-time using a computed `filteredGames` array:

```tsx
const filteredGames = games.filter((game: GameMetadata) => {
  const matchesSearch = (game.title || game.fileName).toLowerCase().includes(searchQuery.toLowerCase());
  const matchesPlatform = platformFilter === 'ALL' || game.platform === platformFilter;
  return matchesSearch && matchesPlatform;
});
```

### UI Components

- **Search Input**: A stylized text input with a "clear" button that appears when text is present.
- **Platform Pills**: A horizontal scrollable list of platform buttons (`ALL`, `GBA`, `SNES`, `NES`) that highlight when active.

### Responsive Design

The search and filter bars are implemented for both:

- **Desktop Sidebar**: Integrated at the top of the Library card.
- **Mobile Bottom Sheet**: Integrated into the Library tab of the mobile menu.

## Future Enhancements

- Addition of "Favorites" toggle in filters.
- Support for more platforms (MD, GB, GBC).
- Sorting options (Recent, Title, Playtime).
