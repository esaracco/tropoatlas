# TropoAtlas LED Controller

Firmware for the **ESP32-S3 Mini** used by **TropoAtlas** to control addressable LED strips.

Once flashed, the board connects to your Wi-Fi network and exposes a simple HTTP API on port **80**. The TropoAudio web application (in TropoAtlas) uses this API to illuminate the LEDs corresponding to the physical location of an album in your collection.

---

## Features

- ESP32-S3 Mini compatible
- HTTP REST API
- Control one or more LEDs
- RGB color support
- Optional incremental updates without resetting previous LEDs
- Designed for TropoAtlas, but can be used independently

---

## Requirements

### Hardware

- ESP32-S3 Mini
- WS2812B (or compatible) LED strips

### Arduino IDE

Install the following packages before compiling:

#### Boards

- ESP32 by Espressif

#### Libraries

- FastLED
- WiFi
- WebServer

---

## Configuration

Before uploading the firmware, configure your Wi-Fi credentials:

```cpp
const char* ssid = "...";
const char* password = "...";
```

Compile and upload the project to your ESP32.

Once started, the board will listen for HTTP requests on port **80**.

---

# HTTP API

## Turn on LEDs

```
POST /leds
```

### Payload

The endpoint expects a form parameter named `data` containing a **JSON array** of LED command objects. If the array is empty (`[]`), all LEDs are turned off.

#### JSON Object Properties

| Property    | Required | Description                                                    |
| ----------- | -------- | -------------------------------------------------------------- |
| `leds`      | ✅       | Comma-separated list of LED indices (e.g., `"1,30,500"`).      |
| `color`     | ✅       | RGB color as `"R,G,B"` (0–255).                                |
| `intensity` | No       | Float (0.0 to 1.0) to dynamically scale the brightness.        |
| `blink`     | No       | `true` to apply a blinking animation (toggles every 500ms).    |
| `noreset`   | No       | `true` to preserve the current LEDs before applying the new ones. |

### Example

Send a `POST` request (e.g., `application/x-www-form-urlencoded`) with the `data` parameter:

```
data=[{"leds":"1,30,500","color":"50,25,200","intensity":0.4,"blink":true}]
```

Turns on LEDs **1**, **30** and **500** using the RGB color `(50,25,200)` scaled down to 40% brightness, and applies a blinking animation.

To clear all LEDs, send an empty array:

```
data=[]
```

---

## Reset LEDs

```
GET /ruler
```

### Parameters

| Parameter | Required | Description                 |
| --------- | -------- | --------------------------- |
| `reset`   | No       | If set, turns all LEDs off. |

### Example

```
GET /ruler?reset=1
```

---

## Example workflow

```
TropoAudio
      │
      │ HTTP
      ▼
ESP32-S3 Mini
      │
      ▼
WS2812 LED strips
      │
      ▼
Highlighted album location
```

---

## License

This firmware is part of the **TropoAtlas** project and is distributed under the GNU GPL v3 License.
