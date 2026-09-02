# TropoMusic

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](../../LICENSE) [![Discogs API](https://img.shields.io/badge/Powered%20by-Discogs-orange.svg)](https://www.discogs.com/developers/) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoMusic is a free software music collection manager within the [TropoAtlas](../../README.md) ecosystem. Synchronize your albums (Discogs), customize your metadata, and instantly locate your vinyl records and CDs on your shelves using connected LED strips.**

_TropoMusic is the direct successor to the original [TropoDisc repository](https://github.com/esaracco/tropodisc), which has been archived and remains available for historical reference._

<div align="center"><img src="public/icon-180.png" alt="TropoMusic logo" /></div>

---

## Features

- 🔎 **Instant Search & Multi-criteria Filter**: Browse and filter your collection in real-time by artist, style/category, media format, year, rating, or physical shelf location.
- 🏷️ **Custom Metadata**: Enrich album entries with custom fields: exact shelf position, purchase price, and custom styles.
- 💡 **Physical LED Shelf Locator**: Select an album, styles, or artists, and the corresponding slots on your shelf light up instantly via connected LED strips.
- 📦 **Backup & Complete Collection Export**:
  - **Quick Export**: Exports all cached metadata and album covers into a portable ZIP archive.
  - **Full Extraction & Enrichment**: Proactively fetches missing album details and high-resolution cover artwork.
- 📥 **Offline Import & Restore**: Restore or migrate your collection on another device by importing the ZIP backup without needing an internet connection.
- 🎨 **Multi-Theme Support**: Dark, Light, Orange, Blue, Purple, and Green themes with instant zero-flicker hydration.

---

## Screenshots

<img width="500" alt="1" src="https://github.com/user-attachments/assets/4e72ed74-d19e-4c26-9747-c1493bd2922f" />
<img width="500" alt="2" src="https://github.com/user-attachments/assets/9cd1bbe9-da27-42a2-b0be-f8187db370ea" />
<img width="500" alt="3" src="https://github.com/user-attachments/assets/8f6ef975-7895-4317-aa44-f66397b7d29f" />
<img width="500" alt="4" src="https://github.com/user-attachments/assets/804d0a05-7b21-459a-a8c5-ca349fb6b7b1" />
<img width="500" alt="5" src="https://github.com/user-attachments/assets/45e2bc97-e3ed-4d43-833f-5647a01668a5" />

---

## Requirements

- A Discogs account (or compatible future data provider)
- Node.js 18+
- NPM (Workspaces supported)

---

## Configuration

Copy the sample environment file into your application directory:

```bash
cp .env.sample .env
```

### Core Environment Variables

| Variable                       | Description                                                                       | Default        |
| :----------------------------- | :-------------------------------------------------------------------------------- | :------------- |
| `VITE_APP_NAME`                | Application identifier (do not change)                                            | `"tropomusic"` |
| `VITE_DATA_PROVIDER`           | Active data provider plugin                                                       | `"discogs"`    |
| `VITE_CURRENCY`                | Currency symbol displayed for prices                                              | `€`            |
| `VITE_DISCOGS_USER`            | Your Discogs username                                                             | _(Required)_   |
| `DISCOGS_TOKEN`                | Your Discogs personal API token _(No `VITE_` prefix to prevent browser exposure)_ | _(Required)_   |
| `VITE_DISCOGS_FORMATS`         | Media formats to include (e.g. `vinyl`, `cd`, `all`)                              | `all`          |
| `VITE_DISCOGS_FIELDS_REQUIRED` | Only show items that have at least one custom field (`yes`/`no`)                  | `no`           |

### Custom Fields Mapping (Discogs)

TropoMusic can map to three optional custom fields defined in your Discogs collection:

- **`VITE_DISCOGS_FIELD_PLACE`**: Name of the field storing the physical shelf location (numeric value if LEDs are enabled).
- **`VITE_DISCOGS_FIELD_PRICE`**: Name of the field storing the purchase price.
- **`VITE_DISCOGS_FIELD_STYLES`**: Name of the field storing custom style tags (comma-separated).

### LED Strips Configuration

- **`VITE_SET_LEDS`**: Set to `"yes"` to enable IoT LED communication.
- **`VITE_AUDIOLIBRARY_URL`**: HTTP URL of your microcontroller LED controller (e.g., `http://192.168.1.113`).
- **`VITE_LEDS_ARTISTS_COLOR`**: RGB color for artists filter layer (default: `0,0,130`).
- **`VITE_LEDS_STYLES_COLOR`**: RGB color for styles filter layer (default: `0,150,0`).
- **`VITE_LEDS_ALBUM_COLOR`**: RGB color for focused album modal (default: `255,0,0`).

---

## Development

From the repository root:

```bash
# Start development server
npm run dev -w apps/tropomusic

# Or start directly with the root shortcut:
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Production Deployment

TropoMusic is purely static in production: API requests are securely proxied through your web server (Apache or Nginx) to inject your secret Discogs token on the fly without exposing it to the browser.

### Option 1: Docker (Recommended)

Build and run the production container from the repository root:

```bash
# Build the Docker image
docker build -t tropomusic:prod .

# Run the container
docker run --rm -it -p 3000:3000 -e DISCOGS_TOKEN="your_personal_token" tropomusic:prod
```

### Option 2: Apache Reverse Proxy

1. Enable required modules:

```bash
sudo a2enmod headers rewrite proxy proxy_http ssl
sudo systemctl restart apache2
```

2. Build the production bundle:

```bash
npm run build
```

_(Generates static assets in `apps/tropomusic/build`, along with `.htaccess` and `headers.conf`)._

3. Configure Apache VirtualHost:

```apache
<VirtualHost *:443>
    ServerName disques.yourdomain.com
    DocumentRoot /var/www/tropoatlas/apps/tropomusic/build

    SSLProxyEngine On

    # Static files and .htaccess support
    <Directory /var/www/tropoatlas/apps/tropomusic/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Secure Discogs API Proxy (Token Injection)
    <Location /api/discogs/>
        RequestHeader set Authorization "Discogs token=YOUR_SECRET_TOKEN"
        IncludeOptional /var/www/tropoatlas/apps/tropomusic/build/headers.conf
        ProxyPreserveHost Off
        ProxyPass https://api.discogs.com/
        ProxyPassReverse https://api.discogs.com/
    </Location>

    # Discogs Artwork Image Proxy (CORS bypass for client-side ZIP export)
    <Location /api/discogs-image/>
        IncludeOptional /var/www/tropoatlas/apps/tropomusic/build/headers.conf
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

4. Reload Apache:

```bash
sudo systemctl reload apache2
```

---

## Static Presentation Site

The static presentation site for TropoMusic is located in `apps/tropomusic/docs/` and available online at [https://tropomusic.esaracco.fr](https://tropomusic.esaracco.fr).

---

## License

TropoMusic is part of the [TropoAtlas](../../README.md) project and is released under the GNU GPL v3 License. See [LICENSE](../../LICENSE) for details.
