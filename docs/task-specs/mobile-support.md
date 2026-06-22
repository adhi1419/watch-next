# Task: Mobile Support

## Summary
Add responsive mobile layout to Watch Next. Breakpoint: `md:` (768px). Below 768px = mobile layout.

## Design Decisions (from grill session 2026-06-22)

| Area | Mobile behavior |
|------|----------------|
| Detail Panel | Full-page overlay (keeps poster banner + X close) |
| Top bar | Logo + avatar only |
| Navigation | Bottom dock: TV Shows, Movies, Search, History icons |
| Discover/History pill | Stays floating above content (unchanged) |
| Search | Spotlight-style full-screen overlay (tap search icon in dock) |
| Filters | Inside search overlay |
| Carousel scroll button | Keep as-is (serves as scroll indicator) |
| Grid columns | Already responsive (auto-fill, minmax 360px) — no change |
| Touch targets | 44px minimum on all interactive elements |
| Performance | No changes needed |

## Implementation Steps

### Step 1: Mobile top bar
- Hide search input, TV/Movie toggle, and filter button below `md:`
- Keep only logo (left) and avatar (right)
- Top bar height stays 60px

### Step 2: Bottom dock
- Fixed bottom bar, visible only below `md:`
- 4 tabs: TV Shows (Tv icon), Movies (Film icon), Search (Search icon), History (Clock icon)
- Active tab highlighted with accent color
- TV/Movies tabs set filterType + view=discover
- History tab sets view=history
- Search tab opens spotlight overlay
- Safe area padding for notched phones: `pb-[env(safe-area-inset-bottom)]`

### Step 3: Search overlay
- Full-screen overlay triggered by Search dock tab
- Auto-focused input at top with X to close
- Results render below as same TitleCard grid
- Filters (sort, genre, platform) accessible via filter icon next to input
- Filter panel slides down below input (not a separate sheet)
- Closing overlay clears search state

### Step 4: Detail panel → mobile overlay
- Below `md:`: panel becomes `fixed inset-0 z-200` (full screen)
- Remove `main-scroll:has(aside)` padding-right effect on mobile
- Keep poster banner, scrollable content, X close button
- Add overscroll-behavior-contain to prevent background scroll

### Step 5: Touch targets
- Genre pills: add `min-h-[44px]` below `md:`
- Episode checkboxes: ensure 44px tap area
- Filter dropdowns: increase padding
- Bottom dock icons: 44px minimum

### Step 6: Viewport cleanup
- ✅ Already done: min-w-0, overflow-hidden, reduced padding
- Add `<meta name="apple-mobile-web-app-capable" content="yes">` for iOS
- Ensure body has no horizontal overflow

## Test Plan (TDD)

Each step gets tests BEFORE implementation:

1. **Top bar**: assert search/toggle hidden at mobile viewport, visible at desktop
2. **Bottom dock**: assert dock renders below md:, tab clicks change route/state
3. **Search overlay**: assert overlay opens on search tap, closes on X, input auto-focuses
4. **Detail panel**: assert panel is full-screen (inset-0) at mobile, side-panel at desktop
5. **Touch targets**: assert min-height 44px on interactive elements at mobile viewport

## Out of scope
- PWA / service worker
- Offline support
- Native app wrapper
- Tablet-specific layouts (md: breakpoint handles it)
