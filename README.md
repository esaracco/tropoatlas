[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE) [![Discogs API](https://img.shields.io/badge/Powered%20by-Discogs-orange.svg)](https://www.discogs.com/developers/) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

# TropoDisc

![TropoDisc logo](apps/tropodisc/public/icon-180.png)

_Organize your collection, enrich it with your own metadata, and optionally locate albums instantly using LED strips._

**TropoDisc** is an open-source [Discogs](https://www.discogs.com) collection manager.

## Architecture

TropoAtlas is built on a modern **NPM Monorepo** architecture using **Vite**, **Vitest**, and **Zustand**, and composed of several distinct workspaces:

- `apps/tropodisc`: The main React application.
- `packages/react`: A library of reusable, generic UI components (`@tropo/react`).
- `packages/leds`: The Node.js server that handles physical LED strips and audio library integration (`@tropo/leds`).
- `plugins/discogs`: An agnostic Discogs API wrapper (`@tropo/discogs`).

## Why TropoDisc?

Discogs already provides an excellent way to catalog music collections, but browsing a large physical library can still be frustrating. TropoDisc aims to bridge the gap between your online Discogs collection and your shelves.

With TropoDisc you can:
- 🔎 Browse and search your collection quickly
- 🏷️ Add your own metadata through Discogs custom fields
- 📍 Store the exact physical location of every album
- 💡 Instantly locate an album using ESP32-controlled LED strips *(optional)*
- ❤️ Keep complete ownership of your collection data through Discogs

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

The `apps/tropodisc/.env` file contains several configuration options. For security, **TropoDisc keeps your Discogs token server-side** so it's never leaked to the browser.
Required variables:
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

1. Build the production application from the root folder:
```bash
npm run build
```
*(This builds all workspaces and creates static files in `apps/tropodisc/build`)*

2. Configure Apache as a reverse proxy to serve the files and securely inject your token:

```apache
<VirtualHost *:443>
    ServerName disques.yourdomain.com
    DocumentRoot /var/www/tropoatlas/apps/tropodisc/build

    SSLProxyEngine On

    # Single Page Application routing fallback
    <Directory /var/www/tropoatlas/apps/tropodisc/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        FallbackResource /index.html
        Require all granted
    </Directory>

    # Secure Discogs API Proxy (Token Injection)
    <Location /api/discogs>
        RequestHeader set Authorization "Discogs token=YOUR_SECRET_TOKEN"
        RequestHeader set User-Agent "TropoDisc"
        ProxyPreserveHost Off
        ProxyPass https://api.discogs.com
        ProxyPassReverse https://api.discogs.com
    </Location>

    # (Optional) LED Server Proxy
    <Location /api>
        ProxyPass http://127.0.0.1:10000
        ProxyPassReverse http://127.0.0.1:10000
    </Location>
</VirtualHost>
```

## Using Discogs Custom Fields

TropoDisc can take advantage of three optional custom fields in your Discogs collection:

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
