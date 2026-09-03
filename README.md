# TropoAtlas

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoAtlas is a free software monorepo ecosystem designed to organize, enrich, and physically locate media collections (music, movies, books) on your shelves using connected IoT LED strips.**

> _Note: TropoAudio (the album collection application within this ecosystem) is the direct successor to the original [TropoDisc repository](https://github.com/esaracco/tropodisc), which has been archived and remains available for historical reference._

---

## Applications Suite

TropoAtlas provides dedicated, tailored collection managers for different physical and digital media:

| Application | Status | Focus / Formats | Documentation |
| :--- | :--- | :--- | :--- |
| 🎵 **[TropoAudio](apps/tropoaudio)** | **Active** | Vinyl records, CDs, Cassettes, Discogs sync, audio library LED locator | [apps/tropoaudio/README.md](apps/tropoaudio/README.md) · [Website](https://tropoaudio.esaracco.fr) |
| 🎬 **[TropoCine](apps/tropocine)** | **Active** | Movies, series, TMDB list sync, directors & actors exploration | [apps/tropocine/README.md](apps/tropocine/README.md) · [Website](https://tropocine.esaracco.fr) |
| 📚 **TropoBiblio** (`apps/tropobiblio`) | *Planned* | Books, comics, mangas, home library shelves LED locator | — |

---

## Monorepo Architecture

TropoAtlas is built on an **NPM Monorepo** architecture separating presentation applications, domain logic, UI tokens, hardware drivers, and provider plugins:

```text
tropoatlas/
├── apps/
│   ├── tropoaudio/          # React frontend for album collections
│   └── tropocine/           # React frontend for film collections
├── packages/
│   ├── core/                # Core domain, storage abstraction, backup/export, Zustand state (@tropo/core)
│   ├── react/               # Shared React components, modal dialogs, design tokens (@tropo/react)
│   └── leds/                # Standalone HTTP client for ESP32 LED strip controllers (@tropo/leds)
├── plugins/
│   ├── audio/
│   │   └── discogs/         # Discogs API data provider plugin (@tropo/discogs)
│   └── cine/
│       └── tmdb/            # TMDB API data provider plugin (@tropo/tmdb)
└── firmware/
    └── led-controller/      # ESP32-S3 Mini firmware for WS2812B addressable LED shelves
```

---

## Quick Start (Development)

1. Clone the repository and install dependencies for all monorepo workspaces:

```bash
git clone https://github.com/esaracco/tropoatlas.git
cd tropoatlas
npm install
```

2. Configure your application environment:

```bash
# For TropoAudio:
cp apps/tropoaudio/.env.sample apps/tropoaudio/.env

# Or for TropoCine:
cp apps/tropocine/.env.sample apps/tropocine/.env
```

3. Start the development server:

```bash
# For TropoAudio:
npm run dev:audio

# Or for TropoCine:
npm run dev:cine
```

Open `http://localhost:3000` (TropoAudio) or `http://localhost:3001` (TropoCine) in your browser.

---

## Production Deployment

All TropoAtlas frontends build into purely static web bundles. API calls and tokens are proxied securely through web servers (Apache or Nginx) without exposing secret credentials to client browsers.

- **Docker Compose**: Run applications concurrently or individually from repository root:
  ```bash
  # Run both applications (TropoAudio on :3000, TropoCine on :3001)
  docker compose up

  # Or run a single application
  docker compose up tropoaudio
  docker compose up tropocine
  ```
- **Docker (Standalone)**: Build and run individual containers with build arguments:
  ```bash
  # TropoAudio (port 3000)
  docker build --build-arg APP_NAME=tropoaudio --build-arg PORT=3000 -t tropoaudio:prod .
  docker run --rm -it -p 3000:3000 -e DISCOGS_TOKEN="your_personal_token" tropoaudio:prod

  # TropoCine (port 3001)
  docker build --build-arg APP_NAME=tropocine --build-arg PORT=3001 -t tropocine:prod .
  docker run --rm -it -p 3001:3001 -e TMDB_TOKEN="your_personal_token" tropocine:prod
  ```
- **Apache / Reverse Proxy**: Complete production configurations and proxy setup guides are detailed in each app's documentation (e.g. [apps/tropoaudio/README.md](apps/tropoaudio/README.md) and [apps/tropocine/README.md](apps/tropocine/README.md)).


---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or pull request on GitHub.

---

## License

TropoAtlas is released under the [GNU GPL v3](LICENSE) License.
