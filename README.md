_TropoAtlas is the successor to TropoDisc. The [TropoDisc repository](https://github.com/esaracco/tropodisc) has been archived and remains available for historical reference._

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE) [![Discogs API](https://img.shields.io/badge/Powered%20by-Discogs-orange.svg)](https://www.discogs.com/developers/) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

# TropoDisc

<div align="center"><img src="apps/tropodisc/public/icon-180.png" alt="TropoDisc logo" /></div>

## Architecture

TropoAtlas is built on a modern **NPM Monorepo** architecture using **Vite**, **Vitest**, and **Zustand**, and composed of several distinct workspaces:

- `apps/tropodisc`: The main React application. It is a generic and agnostic music collection manager.
- `packages/react`: A library of reusable, generic UI components (`@tropo/react`).
- `packages/core`: Core utilities and state management (`@tropo/core`).
- `packages/leds`: The HTTP client that handles physical LED strips integration (`@tropo/leds`).
- `plugins/*`: Data providers that plug into TropoDisc. Currently includes `@tropo/discogs`.

## Why TropoDisc?

Discogs already provides an excellent way to catalog music collections, but browsing a large physical library can still be frustrating. TropoDisc aims to bridge the gap between your online collection (via Discogs or other future providers) and your shelves.

With TropoDisc you can:
- 🔎 Browse and search your collection quickly
- 🏷️ Add your own metadata through custom fields
- 📍 Store the exact physical location of every album
- 💡 Instantly locate an album using ESP32-controlled LED strips *(optional)*
- 📦 Export & extract full collection backups (metadata & covers) to portable ZIP archives
- 📥 Restore your collection offline from backup archives

## Screenshots

<img width="500" alt="1" src="https://github.com/user-attachments/assets/f74e2c37-86cc-4db1-8281-1e88297f7387" />
<img width="500" alt="2" src="https://github.com/user-attachments/assets/20c90cfa-9fe7-42bb-8ed5-976bdbb3c674" />
<img width="500" alt="3" src="https://github.com/user-attachments/assets/2e3d8115-1944-41cc-8d60-087bc2133736" />
<img width="500" alt="4" src="https://github.com/user-attachments/assets/9d886bd5-dc07-4d00-9261-5bcacb6e159c" />
<img width="500" alt="5" src="https://github.com/user-attachments/assets/1ffd917e-0104-4b0c-a113-fce5c14630f4" />

## Backup & Complete Collection Extraction

TropoDisc includes a complete client-side backup and export system with two operational modes:

- **Quick Export**: Instantly exports all currently cached metadata and album covers into a portable ZIP archive containing a `collection.json` manifest and local artwork in a `covers/` directory.
- **Full Extraction & Enrichment**: When enabled, the application proactively fetches any missing album details (tracklists, release notes, release years) and downloads high-resolution cover artwork from the data provider before packaging the archive.
  - **Provider-Safe Rate Limiting**: Enforces strict per-request limits (default 55 requests/min) across independent parallel queues for API metadata and image proxy downloads.
  - **Automatic Retry Backoff**: Transparently recovers from temporary HTTP 429 rate limit responses with exponential backoff.
  - **Dynamic Time Estimation & Real-time Progress**: Displays accurate remaining countdown and live progress throughout the extraction process.
  - **Offline Import & Restoration**: Easily restore or migrate your collection on another device by importing the ZIP backup without needing an internet connection.

## Requirements

- A Discogs account
- Node.js 18+ (or your minimum supported version)
- NPM (Workspaces supported)

## Quick Start (Development)

Clone the repository and install the dependencies for the entire monorepo:

```bash
git clone https://github.com/esaracco/tropoatlas.git
cd tropoatlas
npm install
```

Copy the `.env` sample to the React app directory:

```bash
cp apps/tropodisc/.env.sample apps/tropodisc/.env
```

The `apps/tropodisc/.env` file configures the application and its active plugins. 
By default, the active provider is Discogs:
- `VITE_DATA_PROVIDER="discogs"`

For the Discogs plugin, required variables are:
- `VITE_DISCOGS_USER` — your Discogs username
- `DISCOGS_TOKEN` — your personal Discogs API token (Notice the absence of the `VITE_` prefix to prevent browser exposure).

You can generate your personal token here: https://www.discogs.com/developers#page:authentication

Start the development servers (React Frontend + LED Backend concurrently):

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

## Production Deployment (Apache)

TropoDisc is designed to be highly secure in production. The React frontend is purely static, and API calls are proxied through your web server (like Apache) to inject the secret Discogs token on the fly.

1. Enable the required Apache modules:
```bash
sudo a2enmod headers rewrite proxy proxy_http ssl
sudo systemctl restart apache2
```

2. Build the production application from the root folder:
```bash
npm run build
```
*(This builds all workspaces, generates static files in `apps/tropodisc/build`, and automatically creates `.htaccess` and `headers.conf` with SPA routing, cache headers, and the dynamic User-Agent).*

3. Configure Apache as a reverse proxy to serve the files and securely inject your token:

```apache
<VirtualHost *:443>
    ServerName disques.yourdomain.com
    DocumentRoot /var/www/tropoatlas/apps/tropodisc/build

    SSLProxyEngine On

    # Static files and .htaccess support
    <Directory /var/www/tropoatlas/apps/tropodisc/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Secure Discogs API Proxy (Token Injection)
    <Location /api/discogs/>
        RequestHeader set Authorization "Discogs token=YOUR_SECRET_TOKEN"
        IncludeOptional /var/www/tropoatlas/apps/tropodisc/build/headers.conf
        ProxyPreserveHost Off
        ProxyPass https://api.discogs.com/
        ProxyPassReverse https://api.discogs.com/
    </Location>

    # Discogs Artwork Image Proxy (CORS bypass for client-side ZIP export)
    <Location /api/discogs-image/>
        IncludeOptional /var/www/tropoatlas/apps/tropodisc/build/headers.conf
        Header set Access-Control-Allow-Origin "*"
        ProxyPreserveHost Off
        ProxyPass https://i.discogs.com/
        ProxyPassReverse https://i.discogs.com/
    </Location>

    # (Optional) LED Server Proxy
    <Location /api>
        ProxyPass http://127.0.0.1:10000
        ProxyPassReverse http://127.0.0.1:10000
    </Location>
</VirtualHost>
```

## Using Custom Fields (Discogs Plugin)

When using the Discogs plugin, TropoDisc can map to three optional custom fields in your Discogs collection:

### `place`
*Textarea (1 line)* - Stores the physical location of an album in your collection.

### `price`
*Textarea (1 line)* - Stores the purchase price of the album.

### `styles`
*Textarea (1 line)* - Stores your own style tags, separated by commas.

Update your `apps/tropodisc/.env` file with the corresponding field identifiers (e.g. `VITE_DISCOGS_FIELD_PLACE`).

## Docker

TropoDisc provides a modern, optimized, multi-stage Docker image using Nginx to securely serve the application and proxy Discogs API calls without exposing your token to the browser.

Build the Docker image from the root directory:

```bash
docker build -t tropodisc:prod .
```

Run the container by injecting your secret Discogs token via environment variables:

```bash
docker run --rm -it -p 3000:3000 -e DISCOGS_TOKEN="your_personal_token" tropodisc:prod
```

Then open `http://localhost:3000` in your browser.

*Note: The Nginx container acts exactly like the Apache deployment, securely proxying `/api/discogs` to Discogs with your token.*

## Contributing

Contributions, bug reports and feature requests are welcome.

## License

TropoAtlas is released under the GNU GPL v3 License. See the [LICENSE](LICENSE) file for details.
