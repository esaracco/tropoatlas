# TropoAtlas

[![GPL License](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE) [![Made with React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE.svg)](https://vitejs.dev/)

**TropoAtlas is a free software monorepo ecosystem designed to organize, enrich, and physically locate media collections (music, movies, books) on your shelves using connected IoT LED strips.**

> _Note: TropoMusic (the music collection application within this ecosystem) is the direct successor to the original [TropoDisc repository](https://github.com/esaracco/tropodisc), which has been archived and remains available for historical reference._

<div align="center"><img src="apps/tropomusic/public/icon-180.png" alt="TropoAtlas logo" /></div>

---

## Applications Suite

TropoAtlas provides dedicated, tailored collection managers for different physical and digital media:

| Application | Status | Focus / Formats | Documentation |
| :--- | :--- | :--- | :--- |
| 🎵 **[TropoMusic](apps/tropomusic)** | **Active** | Vinyl records, CDs, Cassettes, Discogs sync, audio library LED locator | [apps/tropomusic/README.md](apps/tropomusic/README.md) · [Website](https://tropomusic.esaracco.fr) |
| 🎬 **TropoFilm** (`apps/tropofilm`) | *Planned* | DVDs, Blu-Rays, 4K UHD discs, TV series, movie shelves LED locator | — |
| 📚 **TropoBook** (`apps/tropobook`) | *Planned* | Books, comics, mangas, home library shelves LED locator | — |

---

## Monorepo Architecture

TropoAtlas is built on an **NPM Monorepo** architecture separating presentation applications, domain logic, UI tokens, hardware drivers, and provider plugins:

```text
tropoatlas/
├── apps/
│   └── tropomusic/          # React frontend for music collections
├── packages/
│   ├── core/                # Core domain, storage abstraction, backup/export, Zustand state (@tropo/core)
│   ├── react/               # Shared React components, modal dialogs, design tokens (@tropo/react)
│   └── leds/                # Standalone HTTP client for ESP32 LED strip controllers (@tropo/leds)
├── plugins/
│   └── discogs/             # Discogs API data provider plugin (@tropo/discogs)
└── firmware/
    └── led-controller/      # ESP32-S3 Mini firmware for WS2812B addressable LED shelves
```

---

## TropoMusic Screenshots

<img width="500" alt="1" src="https://github.com/user-attachments/assets/4e72ed74-d19e-4c26-9747-c1493bd2922f" />
<img width="500" alt="2" src="https://github.com/user-attachments/assets/9cd1bbe9-da27-42a2-b0be-f8187db370ea" />
<img width="500" alt="3" src="https://github.com/user-attachments/assets/8f6ef975-7895-4317-aa44-f66397b7d29f" />
<img width="500" alt="4" src="https://github.com/user-attachments/assets/804d0a05-7b21-459a-a8c5-ca349fb6b7b1" />
<img width="500" alt="5" src="https://github.com/user-attachments/assets/45e2bc97-e3ed-4d43-833f-5647a01668a5" />


---

## Quick Start (Development)

1. Clone the repository and install dependencies for all monorepo workspaces:

```bash
git clone https://github.com/esaracco/tropoatlas.git
cd tropoatlas
npm install
```

2. Configure your application environment (example for TropoMusic):

```bash
cp apps/tropomusic/.env.sample apps/tropomusic/.env
```

3. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Production Deployment

All TropoAtlas frontends build into purely static web bundles. API calls and tokens are proxied securely through web servers (Apache or Nginx) without exposing secret credentials to client browsers.

- **Docker**: Build and run pre-packaged Nginx containers directly from root:
  ```bash
  docker build -t tropomusic:prod .
  docker run --rm -it -p 3000:3000 -e DISCOGS_TOKEN="your_personal_token" tropomusic:prod
  ```
- **Apache / Reverse Proxy**: Complete production configurations and proxy setup guides are detailed in each app's documentation (e.g. [apps/tropomusic/README.md](apps/tropomusic/README.md)).

---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or pull request on GitHub.

---

## License

TropoAtlas is released under the [GNU GPL v3](LICENSE) License.
