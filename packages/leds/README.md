# @tropo/leds

An HTTP client wrapper for TropoAtlas to communicate with physical LED strips (such as an ESP32-based shelf LED controller backend).
It exposes a simple API to light up LEDs based on numerical identifiers, keeping hardware logic abstracted away from the UI.

## Configuration & Environment Variables

When LEDs are enabled (`VITE_SET_LEDS=yes`) in an application, the following environment variables are consumed or validated:

- `VITE_LED_TARGET`: Target URL of the ESP32 LED controller (e.g. `http://192.168.1.1`), proxied through Vite or the production reverse proxy.
- `VITE_LEDS_CREATORS_COLOR`: RGB color for creators/artists filter layer (e.g. `0,0,130`).
- `VITE_LEDS_CATEGORIES_COLOR`: RGB color for categories/styles/genres filter layer (e.g. `0,150,0`).
- `VITE_LEDS_WORK_COLOR`: RGB color for the active item modal highlight (e.g. `255,0,0`).

## Usage

```javascript
import { LedsClient } from "@tropo/leds"

const client = new LedsClient({ apiBase: "/api" })

// Light up LEDs 1 and 30 in red, and LED 500 in blue
client.setLeds([
  {
    place: [1, 30],
    color: "255,0,0",
    intensity: 1.0,
  },
  {
    place: 500,
    color: "0,0,255",
    noreset: true,
  },
])

// Clear all LEDs
client.setLeds()
```
