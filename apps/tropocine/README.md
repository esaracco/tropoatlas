# TropoCine

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](../../LICENSE) [![TMDB API](https://img.shields.io/badge/Powered%20by-TMDB-01b4e4.svg)](https://developer.themoviedb.org/) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoCine is a free software film collection manager within the [TropoAtlas](../../README.md) ecosystem. Synchronize your movie lists from The Movie Database (TMDB), explore directors and cast members, customize your metadata, and navigate your film library.**

<div align="center"><img src="public/icon-180.png" alt="TropoCine logo" /></div>

---

## Features

- 🔎 **Instant Search & Multi-criteria Filter**: Browse and filter your film collection in real-time by title, people (directors and actors), genres, release year, rating, or date added.
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
- 🎨 **Multi-Theme Support**: Dark, Light, Orange, Blue, Purple, and Green themes with instant zero-flicker hydration.

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

| Variable             | Description                                                                    | Default       |
| :------------------- | :----------------------------------------------------------------------------- | :------------ |
| `VITE_APP_NAME`      | Application identifier (do not change)                                         | `"tropocine"` |
| `VITE_DATA_PROVIDER` | Active data provider plugin                                                    | `"tmdb"`      |
| `VITE_TMDB_LIST_ID`  | Your TMDB list ID or URL slug (e.g. `8691537` or `8691537-ma-liste`)           | _(Required)_  |
| `TMDB_TOKEN`         | Your TMDB API Read Access Token _(No `VITE_` prefix to prevent browser leaks)_ | _(Required)_  |
| `VITE_SET_LEDS`      | Enable hardware LED integration                                                | `"no"`        |

> **Security Note**: `TMDB_TOKEN` does not have a `VITE_` prefix. During local development, the Vite dev server securely proxies requests to `/api/tmdb/` and injects this token. In production, your web server (Apache or Nginx) injects the Bearer token so your secret key is never exposed to client browsers.

---

## Development

From the repository root:

```bash
# Start TropoCine development server
npm run dev -w apps/tropocine

# Or using the root shortcut:
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
npm run build -w apps/tropocine
```

_(This generates optimized static files in `apps/tropocine/build/`, along with `.htaccess` and `headers.conf`)._

3. Configure your Apache VirtualHost:

```apache
<VirtualHost *:443>
    ServerName cine.yourdomain.com
    DocumentRoot /var/www/tropoatlas/apps/tropocine/build

    SSLProxyEngine On

    # Static files and SPA routing (.htaccess)
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

    # TMDB Image Proxy (CORS bypass for client-side ZIP export)
    <Location /api/tmdb-image/>
        IncludeOptional /var/www/tropoatlas/apps/tropocine/build/headers.conf
        Header set Access-Control-Allow-Origin "*"
        ProxyPreserveHost Off
        ProxyPass https://image.tmdb.org/
        ProxyPassReverse https://image.tmdb.org/
    </Location>
</VirtualHost>
```

4. Reload Apache:

```bash
sudo systemctl reload apache2
```

---

## Static Presentation Site

The static presentation site for TropoCine is located in `apps/tropocine/docs/` (bilingual English/French with zero external dependencies) and can be hosted independently or served via Apache.

---

## License

TropoCine is part of the [TropoAtlas](../../README.md) project and is released under the GNU GPL v3 License. See [LICENSE](../../LICENSE) for details.
