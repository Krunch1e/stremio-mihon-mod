<div align="center">

<img src="/assets/images/stremio_symbol.png" width="90" alt="Stremio logo">

# Stremio Mihon Mod

**Tachiyomi / Mihon style organization meets Stremio.**  
A custom, enhanced frontend mod for Stremio introducing custom category tabs, in-library real-time search, dynamic genre filtering, official IMDb ratings on poster cards, and a filtered "Currently Watching" Home screen shelf.

[![License](https://img.shields.io/github/license/Stremio/stremio-web?color=7b5bf5)](/LICENSE.md)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web-blue)](#installation)
[![Stremio](https://img.shields.io/badge/Stremio-v5%20Desktop-7b5bf5)](https://www.stremio.com)

</div>

---

## Highlights & Features

| Feature | Vanilla Stremio | Stremio Mihon Mod |
| :--- | :---: | :---: |
| **Custom Category Tabs** | ❌ (Flat poster list) | ✅ **Tachiyomi / Mihon style tabs** (*Watching*, *Plan to Watch*, *Completed*, etc.) |
| **Custom Categories Manager** | ❌ | ✅ **Add, rename, delete & reorder** your own custom categories |
| **In-Library Real-Time Search** | ❌ (Searches global addons) | ✅ **Instant title search** strictly scoped to your library items |
| **Dynamic Genre Filtering** | ❌ | ✅ **Auto-detects all genres** across your saved library items |
| **Official IMDb Rating Badges** | ❌ | ✅ **Gold star rating badges** on poster cards with 1-click **IMDb Top** sort |
| **Custom Category Badges** | ❌ | ✅ **Category tags** rendered directly on posters with 1-click reassignment |
| **Filtered Home Shelf** | ❌ (Shows all recent) | ✅ **Exclusively displays** titles from your *Watching* category |
| **Watched Auto-Categorization** | ❌ | ✅ Automatically categorizes watched items to *Completed* |
| **Native Zero-Delay Launcher** | ❌ | ✅ Silent C# Windows launcher (`StremioMihon.exe`) with hardware MPV playback |

---

## Screenshots & Interface

### 1. Library with Category Tabs & IMDb Rating Badges
- Switch between custom tabs (*Watching*, *Plan to Watch*, *Completed*, *On Hold*, *Dropped*, *Uncategorized*) with live item count chips.
- Direct 1-click reassignment by clicking any card's category tag or using the context menu.
- Real-time search bar instantly filtering visible titles.
- Gold IMDb rating badges with one-click **IMDb Top** rating sort.

### 2. Leveled Controls Toolbar
- Type selector (*All*, *Movie*, *Series*).
- Dynamic Genre dropdown auto-populated from your saved media metadata.
- Integrated sort chips (*Last Watched*, *A-Z*, *Z-A*, *IMDb Top*).

### 3. Filtered Home Shelf
- Replaces the generic continue watching shelf with a dedicated **Currently Watching** row displaying only titles assigned to your *Watching* category.

---

## Installation & Setup

### Prerequisites
- [Stremio Desktop (v5+)](https://www.stremio.com) installed on Windows.
- [Node.js (v18+)](https://nodejs.org) (for running the local WebUI server).

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Krunch1e/stremio-mihon-mod.git
   cd stremio-mihon-mod
   ```

2. **Install dependencies and build:**
   ```bash
   npm install
   npm run build
   ```

3. **Launch with Native Desktop Shell:**
   - Double-click `launcher/StremioMihon.exe` (or run `launcher/Launch-Stremio-Mihon.bat`).
   - The launcher silently starts the local streaming server (`11470`), starts the local WebUI server (`8080`), and connects the native Stremio desktop shell (`stremio-shell-ng.exe`) with hardware MPV acceleration.

4. **Desktop Shortcut (Optional):**
   - Run `powershell -ExecutionPolicy Bypass -File launcher/Create-Desktop-Shortcut.ps1` to create a desktop shortcut named **Stremio Mihon** that launches the mod directly.

---

## Architecture & How It Works

Stremio's native desktop application is built with a decoupled architecture:
1. **The Native Engine & Shell**: `stremio-shell-ng.exe` + `libmpv-2.dll` + local streaming server (`server.js` on port 11470).
2. **The Frontend WebUI**: Webpack React application communicating with `stremio-core` WebAssembly in a Web Worker.

`StremioMihon.exe` boots the native shell with:
```bash
stremio-shell-ng.exe --webui-url="http://localhost:8080/?streamingServerUrl=http%3A%2F%2F127.0.0.1%3A11470%2F"
```
Because this uses Stremio's native shell integration, **hardware video decoding, GPU acceleration, audio passthrough, and torrent streaming function identically to official Stremio**.

---

## Directory Structure

```
stremio-mihon-mod/
├── src/
│   ├── common/
│   │   ├── MihonCategories.js   # Category management, localStorage persistence & events
│   │   ├── RatingsService.js    # Cinemeta metadata caching & IMDb rating parser
│   │   └── CoreSuspender.js     # React 18 Suspense synchronization for Core models
│   ├── components/
│   │   ├── MihonCategoryBar/    # Category tab bar & category management modals
│   │   ├── LibItem/             # Library poster item with category & rating badges
│   │   └── MultiselectMenu/     # Leveled dropdown menus with portal support
│   └── routes/
│       ├── Board/               # Filtered Currently Watching home shelf
│       ├── Library/             # Library view with Mihon tabs, genre filter & search
│       └── Player/              # Asynchronous WebAssembly stream decoder
├── launcher/
│   ├── StremioMihon.cs          # Native C# launcher source code
│   ├── StremioMihon.exe         # Compiled zero-delay native launcher binary
│   └── Create-Desktop-Shortcut.ps1 # One-click Windows desktop shortcut installer
├── http_server.js               # Lightweight local HTTP server with zero-cache headers
└── package.json
```

---

## Credits & License

- Based on the official [Stremio Web](https://github.com/Stremio/stremio-web) frontend by [Smart Code Ltd](https://www.stremio.com).
- Category tabs concept inspired by [Mihon](https://github.com/mihonapp/mihon) / [Tachiyomi](https://github.com/tachiyomiorg/tachiyomi).
- Licensed under the **GNU General Public License v3.0 (GPL-3.0)** - see [LICENSE.md](/LICENSE.md) for details.
