# @tropo/leds

An HTTP client wrapper for TropoAtlas to communicate with physical LED strips (such as an ESP32 or Arduino-based audio library backend).
It exposes a simple API to light up LEDs based on numerical identifiers, keeping hardware logic abstracted away from the UI.

## Usage

```javascript
import { LedsClient } from "@tropo/leds"

const client = new LedsClient({ apiBase: "http://esp32.local/leds" })

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
