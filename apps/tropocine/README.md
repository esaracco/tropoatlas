# TropoCine

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](../../LICENSE) [![TMDB API](https://img.shields.io/badge/Powered%20by-TMDB-01b4e4.svg)](https://developer.themoviedb.org/) [![Made with React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoCine is a free software film collection manager, part of the [TropoAtlas](../../README.md) suite. Synchronize your movie lists from The Movie Database (TMDB), explore directors and cast members, customize your metadata, and instantly locate your DVDs and Blu-rays on your shelves using connected LED strips.**

<div align="center"><img src="public/icon-180.png" alt="TropoCine logo" /></div>

---

## Features

- 🔎 **Instant Search & Multi-criteria Filter**: Browse and filter your film collection in real-time by title, people (directors and actors), genres, release year, rating, or date added.
- 🏷️ **Custom Metadata**: Enrich movie entries with custom fields saved directly into your TMDB list item comments: exact shelf location (`place`), purchase price (`price`), and personal rating (`note`).
- 💡 **Physical LED Shelf Locator & Ruler**: Select a movie, genres, directors, or cast members, and the corresponding slots on your shelf light up instantly via connected LED strips. Includes a dedicated physical ruler mode to illuminate whole shelves.
- 🎬 **TMDB Synchronization & Rich Metadata**:
  - Connects to personal or public lists from The Movie Database using list ID or URL slugs.
  - Automatically fetches movie posters, backdrops, runtime, overview/synopsis, director, and leading cast.
  - **Smart Incremental Sync**: Instantly updates changes, with an optional checkbox to force a full re-enrichment of all movies.
- 👥 **Unified People Discovery**:
  - Unified exploration covering both film directors and leading cast members.
  - Interactive cast tags inside movie detail modals allowing instant one-click collection filtering.
  - Dynamic cross-filtering recalculating available genres and people in real time.
- 📦 **Backup & Complete Collection Export**:
  - **Quick Export**: Exports all cached metadata and poster artwork into a portable ZIP archive.
  - **Full Extraction & Enrichment**: Proactively fetches missing details and high-resolution posters for offline safekeeping.
- 📥 **Offline Import & Restore**: Restore or migrate your film collection on another device by importing the ZIP backup without needing an internet connection.
- 📱 **Progressive Web App (PWA)**: Full offline navigation support and responsive touch interface optimized for desktop, tablet, and mobile.
- 🎨 **Multi-Theme Support**: Dark, Light, Orange, Blue (default), Purple, and Green themes with instant zero-flicker hydration.

---

## Screenshots

<img width="500" alt="Collection Grid" src="docs/img/1.png" />
<img width="500" alt="Film Details" src="docs/img/2.png" />
<img width="500" alt="Multi-criteria Filter" src="docs/img/3.png" />
<img width="500" alt="About and System Information" src="docs/img/4.png" />

---

## Requirements

- A [TMDB (The Movie Database)](https://www.themoviedb.org/) account
- A TMDB API Read Access Token (v4 auth Bearer token)
- A TMDB List ID (e.g. `8691537` or slug `8691537-ma-liste`)
- Node.js 18+
- NPM (Workspaces supported)

---

## Configuration

Copy the sample environment file into your application directory:

```bash
cp .env.sample .env
```

### Core Environment Variables

| Variable             | Description                                                                     | Default       |
| :------------------- | :------------------------------------------------------------------------------ | :------------ |
| `VITE_APP_NAME`      | Application identifier (do not change)                                          | `"tropocine"` |
| `VITE_DATA_PROVIDER` | Active data provider plugin                                                     | `"tmdb"`      |
| `VITE_CURRENCY`      | Currency symbol displayed for prices                                            | `€`           |
| `VITE_TMDB_LIST_ID`  | Your TMDB list ID or URL slug (e.g. `8691537` or `8691537-ma-liste`)            | _(Required)_  |
| `TMDB_TOKEN`         | Your TMDB Bearer token with write access _(No `VITE_` prefix to prevent leaks)_ | _(Required)_  |

> **Security Note**: `TMDB_TOKEN` does not have a `VITE_` prefix. During local development, the Vite dev server securely proxies requests to `/api/tmdb/` and injects this token. In production, your web server (Apache or Nginx) injects the Bearer token so your secret key is never exposed to client browsers.

### TMDB Authorization & Write Permissions (Ratings, Prices & Shelf Locations)

By default, TMDB developer API tokens provide read-only access. To allow TropoCine to save your personal ratings, purchasing prices, and physical shelf locations directly into your TMDB list item comments (format: `place: 12, note: 5, price: 14.99`), your token must be authorized with user write access.

TropoCine includes an automated one-step authorization helper:

1. Copy your **API Read Access Token (v4 auth)** from [TMDB Settings > API](https://www.themoviedb.org/settings/api) into your `.env` file (`TMDB_TOKEN="ey..."`).
2. Run the interactive authorization script from the repository root:
   ```bash
   npm run auth:cine
   ```
   _(Or `npm run auth` directly from `apps/tropocine`)._
3. The script automatically opens your browser to the TMDB approval page. Click **Approve**, then press **[Enter]** in your terminal.

The script automatically exchanges the temporary request token for a permanent User Access Token and updates your `.env` file. Your token now has both read and write capabilities with zero manual payload manipulation.

### LED Strips Configuration

- **`VITE_SET_LEDS`**: Set to `"yes"` to enable IoT LED communication.
- **`VITE_LED_TARGET`**: HTTP URL of your microcontroller LED server (e.g., `http://127.0.0.1:8000`).
- **`VITE_LEDS_CREATORS_COLOR`**: RGB color for directors/actors filter layer (default: `0,0,130`).
- **`VITE_LEDS_CATEGORIES_COLOR`**: RGB color for genres filter layer (default: `0,150,0`).
- **`VITE_LEDS_WORK_COLOR`**: RGB color for focused movie modal (default: `255,0,0`).

> 💡 **Hardware Setup & Wiring**:
> To assemble, flash, and connect your physical shelf LED controller, see the [ESP32 LED Controller Firmware Guide](../../firmware/led-controller/README.md) and the [Official Wiring Diagram (SVG)](../../firmware/led-controller/wiring-diagram.svg).

---

## Development

From the repository root:

```bash
# Start TropoCine development server
npm run dev -w apps/tropocine

# Or start directly with the root shortcut:
npm run dev:cine
```

Open `http://localhost:3001` in your browser.

---

## Production Deployment

TropoCine builds as a static Single Page Application in production. API calls to `/api/tmdb/` are proxied through your web server to inject your private TMDB Bearer token on the fly.

### Option 1: Docker (Recommended)

Build and run using Docker Compose or standalone Docker from the repository root:

```bash
# Using Docker Compose
docker compose up tropocine

# Or using standalone Docker
docker build --build-arg APP_NAME=tropocine --build-arg PORT=3001 -t tropocine:prod .
docker run --rm -it -p 3001:3001 -e TMDB_TOKEN="your_personal_token" tropocine:prod
```

### Option 2: Apache Reverse Proxy

1. Enable the required Apache modules:

```bash
sudo a2enmod headers rewrite proxy proxy_http ssl
sudo systemctl restart apache2
```

2. Build the production bundle from the repository root:

```bash
npm run build:cine
```

_(This generates optimized static files in `apps/tropocine/build/`, along with `.htaccess` and `headers.conf`)._

3. Configure your Apache VirtualHost:

```apache
<VirtualHost *:443>
    ServerName cine.yourdomain.com
    DocumentRoot /var/www/tropoatlas/apps/tropocine/build

    SSLProxyEngine On

    # Static files and .htaccess support
    <Directory /var/www/tropoatlas/apps/tropocine/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Secure TMDB API Proxy (Token Injection)
    <Location /api/tmdb/>
        RequestHeader set Authorization "Bearer YOUR_TMDB_READ_ACCESS_TOKEN"
        IncludeOptional /var/www/tropoatlas/apps/tropocine/build/headers.conf
        ProxyPreserveHost Off
        ProxyPass https://api.themoviedb.org/
        ProxyPassReverse https://api.themoviedb.org/
    </Location>

    # TMDB Artwork Image Proxy (CORS bypass for client-side ZIP export)
    <Location /api/tmdb-image/>
        IncludeOptional /var/www/tropoatlas/apps/tropocine/build/headers.conf
        Header set Access-Control-Allow-Origin "*"
        ProxyPreserveHost Off
        ProxyPass https://image.tmdb.org/
        ProxyPassReverse https://image.tmdb.org/
    </Location>

    # (Optional) LED Server Proxy
    <Location /api/leds>
        ProxyPass http://127.0.0.1:8000/leds
        ProxyPassReverse http://127.0.0.1:8000/leds
    </Location>
    <Location /api/ruler>
        ProxyPass http://127.0.0.1:8000/ruler
        ProxyPassReverse http://127.0.0.1:8000/ruler
    </Location>
    <Location /api/ping>
        ProxyPass http://127.0.0.1:8000/ping
        ProxyPassReverse http://127.0.0.1:8000/ping
    </Location>
</VirtualHost>
```

4. Reload Apache:

```bash
sudo systemctl reload apache2
```

---

## Static Presentation Site

The static presentation site for TropoCine is located in `apps/tropocine/docs/` and available online at [https://tropocine.esaracco.fr](https://tropocine.esaracco.fr).

---

## License

TropoCine is part of the [TropoAtlas](../../README.md) project and is released under the GNU GPL v3 License. See [LICENSE](../../LICENSE) for details.
