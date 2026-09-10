# TropoAtlas

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE) [![Website](https://img.shields.io/badge/website-tropoatlas.esaracco.fr-indigo.svg)](https://tropoatlas.esaracco.fr) [![Made with React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoAtlas is a suite of free software applications designed to organize, enrich, and physically locate media collections (music, movies, books) on your shelves using connected IoT LED strips.**

> _Visit the official presentation portal: [tropoatlas.esaracco.fr](https://tropoatlas.esaracco.fr)_
>
> _Note: TropoAudio (the album collection application in TropoAtlas) is the direct successor to the original [TropoDisc repository](https://github.com/esaracco/tropodisc), which has been archived and remains available for historical reference._

<div align="center"><img src="docs/icon-180.png" alt="TropoAtlas logo" /></div>

---

## Applications Suite

TropoAtlas provides dedicated, tailored collection managers for different physical and digital media:

| Application | Focus / Formats | Documentation |
| :--- | :--- | :--- |
| 🎵 **[TropoAudio](apps/tropoaudio)** | Discogs sync, Vinyl records, CDs | [apps/tropoaudio/README.md](apps/tropoaudio/README.md) · [Website](https://tropoaudio.esaracco.fr) |
| 🎬 **[TropoCine](apps/tropocine)** | TMDB list sync, DVDs, Blu-rays | [apps/tropocine/README.md](apps/tropocine/README.md) · [Website](https://tropocine.esaracco.fr) |
| 📚 **[TropoBiblio](apps/tropobiblio)** | Inventaire.io sync, Books, Comics | [apps/tropobiblio/README.md](apps/tropobiblio/README.md) · [Website](https://tropobiblio.esaracco.fr) |

---

## Monorepo Architecture

TropoAtlas is built on an **NPM Monorepo** architecture separating presentation applications, domain logic, UI tokens, hardware drivers, and provider plugins:

```text
tropoatlas/
├── apps/
│   ├── tropoaudio/          # React frontend for album collections
│   ├── tropocine/           # React frontend for film collections
│   └── tropobiblio/         # React frontend for book collections
├── packages/
│   ├── core/                # Core domain, storage abstraction, backup/export, Zustand state (@tropo/core)
│   ├── react/               # Shared React components, modal dialogs, design tokens (@tropo/react)
│   └── leds/                # Standalone HTTP client for ESP32 LED strip controllers (@tropo/leds)
├── plugins/
│   ├── audio/
│   │   └── discogs/         # Discogs API data provider plugin (@tropo/discogs)
│   ├── biblio/
│   │   └── inventaire/      # Inventaire.io API data provider plugin (@tropo/inventaire)
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

# Or for TropoBiblio:
cp apps/tropobiblio/.env.sample apps/tropobiblio/.env
```

3. Start the development server:

```bash
# For TropoAudio:
npm run dev:audio

# Or for TropoCine:
npm run dev:cine

# Or for TropoBiblio:
npm run dev:biblio
```

Open `http://localhost:3000` (TropoAudio), `http://localhost:3001` (TropoCine), or `http://localhost:3002` (TropoBiblio) in your browser.

---

## Production Deployment

All TropoAtlas frontends build into purely static web bundles. API calls and tokens are proxied securely through web servers (Apache or Nginx) without exposing secret credentials to client browsers.

- **Docker Compose**: Run applications concurrently or individually from repository root:
  ```bash
  # Run all applications (TropoAudio on :3000, TropoCine on :3001, TropoBiblio on :3002)
  docker compose up

  # Or run a single application
  docker compose up tropoaudio
  docker compose up tropocine
  docker compose up tropobiblio
  ```
- **Docker (Standalone)**: Build and run individual containers with build arguments:
  ```bash
  # TropoAudio (port 3000)
  docker build --build-arg APP_NAME=tropoaudio --build-arg PORT=3000 -t tropoaudio:prod .
  docker run --rm -it -p 3000:3000 -e DISCOGS_TOKEN="your_personal_token" tropoaudio:prod

  # TropoCine (port 3001)
  docker build --build-arg APP_NAME=tropocine --build-arg PORT=3001 -t tropocine:prod .
  docker run --rm -it -p 3001:3001 -e TMDB_TOKEN="your_personal_token" tropocine:prod

  # TropoBiblio (port 3002)
  docker build --build-arg APP_NAME=tropobiblio --build-arg PORT=3002 -t tropobiblio:prod .
  docker run --rm -it -p 3002:3002 tropobiblio:prod
  ```
- **Apache / Reverse Proxy**: Complete production configurations and proxy setup guides are detailed in each app's documentation (e.g. [apps/tropoaudio/README.md](apps/tropoaudio/README.md), [apps/tropocine/README.md](apps/tropocine/README.md), and [apps/tropobiblio/README.md](apps/tropobiblio/README.md)).


---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or pull request on GitHub.

---

## License

TropoAtlas is released under the [GNU GPL v3](LICENSE) License.
