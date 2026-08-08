#include <WiFi.h>
#include <WebServer.h>
#include <FastLED.h>
#include <ArduinoJson.h>

/* ===================== CONFIG ===================== */

#define LED_TYPE WS2812B
#define COLOR_ORDER GRB

#define LED_PIN1 2
#define LED_PIN2 3

#define NUM_LEDS 200
#define NUM_STRIPS 2

#define WIFI_SSID "********"
#define WIFI_PASSWORD "********"

#define LED_WATCHDOG_TIMEOUT_MS (5 * 60 * 1000UL)

/* ===================== LEDS ===================== */

CRGB leds[NUM_STRIPS][NUM_LEDS];
CRGB targetLeds[NUM_STRIPS][NUM_LEDS];
bool blinkMask[NUM_STRIPS][NUM_LEDS];

void clearAllLeds(bool show = false) {
  memset(blinkMask, 0, sizeof(blinkMask));
  memset((void*)targetLeds, 0, sizeof(targetLeds));
  FastLED.clear(show);
}

/* ===================== LED WATCHDOG ===================== */

uint32_t ledWatchdogLastKick = 0;

void ledWatchdogKick() {
  ledWatchdogLastKick = millis();
}

void ledWatchdogClear() {
  ledWatchdogLastKick = 0;
}

void ledWatchdogCheck() {
  if (!ledWatchdogLastKick) return;

  if ((uint32_t)(millis() - ledWatchdogLastKick) >= LED_WATCHDOG_TIMEOUT_MS) {
    clearAllLeds(true);
    ledWatchdogClear();
  }
}

/* ===================== WEB SERVER ===================== */

WebServer server(80);

/* ===================== UTILS ===================== */

bool parseColor(const String& s, uint8_t& r, uint8_t& g, uint8_t& b) {
  int ri, gi, bi;
  if (sscanf(s.c_str(), "%d,%d,%d", &ri, &gi, &bi) != 3) return false;
  r = constrain(ri, 0, 255);
  g = constrain(gi, 0, 255);
  b = constrain(bi, 0, 255);
  return true;
}

/* ===================== LED LOGIC ===================== */

void runAnimation() {
  for (int pass = 0; pass < 2; pass++) {
    for (int strip = 0; strip < NUM_STRIPS; strip++) {
      int s = pass ? (NUM_STRIPS - 1) - strip : strip;
      for (int i = 0; i < NUM_LEDS; i++) {
        if (i % 5 == 0) {
          FastLED.clear();
          leds[s][pass ? (NUM_LEDS - 1 - i) : i] = CRGB::DarkOrange;
          FastLED.show();
          yield();
        }
      }
    }
  }
  clearAllLeds(true);
  ledWatchdogClear();
}

void applyLeds(const char* ledsArg, const char* colorArg, bool noreset, bool blink, float intensity) {
  uint8_t r, g, b;

  if (!parseColor(String(colorArg), r, g, b) || (r == 0 && g == 0 && b == 0)) {
    clearAllLeds(true);
    return;
  }

  intensity = constrain(intensity, 0.0f, 1.0f);
  r = (uint8_t)(r * intensity);
  g = (uint8_t)(g * intensity);
  b = (uint8_t)(b * intensity);

  if (!noreset) {
    clearAllLeds(false);
  }

  // strtok_r() modifies its input, so make a temporary copy.
  size_t len = strlen(ledsArg);
  char buf[len + 1];
  strcpy(buf, ledsArg);

  char* save;
  char* tok = strtok_r(buf, ",", &save);

  while (tok) {
    int pos = atoi(tok);

    if (pos >= 1 && pos <= NUM_STRIPS * NUM_LEDS) {
      pos--;

      int stripIdx = pos / NUM_LEDS;
      int ledIdx = pos % NUM_LEDS;

      targetLeds[stripIdx][ledIdx].setRGB(r, g, b);
      blinkMask[stripIdx][ledIdx] = blink;
      leds[stripIdx][ledIdx].setRGB(r, g, b);
    }

    tok = strtok_r(NULL, ",", &save);
  }
}

/* ===================== HTTP HANDLERS ===================== */

void onServerEventLeds() {
  JsonDocument doc;

  ledWatchdogClear();

  DeserializationError error = deserializeJson(doc, server.arg("data"));

  if (error || !doc.is<JsonArray>()) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON array\"}");
    return;
  }

  JsonArray arr = doc.as<JsonArray>();

  if (arr.size() == 0) {
    clearAllLeds(true);
  } else {
    for (JsonObject item : arr) {
      const char* ledsArg = item["leds"];
      const char* colorArg = item["color"];

      if (!ledsArg || !colorArg) {
        server.send(400, "application/json", "{\"error\":\"leds and color are required\"}");
        return;
      }

      bool noreset = item["noreset"] == 1;
      bool blink = item["blink"] == 1;
      float intensity = item["intensity"] | 1.0f;

      applyLeds(ledsArg, colorArg, noreset, blink, intensity);
    }
  }

  FastLED.show();
  ledWatchdogKick();

  server.send(200);
}

void onServerEventRuler() {
  ledWatchdogClear();
  if (server.hasArg("reset") && server.arg("reset") == "1") {
    clearAllLeds(true);
  } else {
    clearAllLeds(false);
    for (uint8_t strip = 0; strip < NUM_STRIPS; strip++) {
      for (int i = 1; i <= NUM_LEDS; i++) {
        if (i % 10 == 0)
          leds[strip][i - 1] = CRGB::Blue;
        else if (i % 5 == 0)
          leds[strip][i - 1] = CRGB::White;
      }
    }
    FastLED.show();
  }
  server.send(200);
}

/* ===================== SETUP / LOOP ===================== */

void setup() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }

  FastLED.addLeds<LED_TYPE, LED_PIN1, COLOR_ORDER>(leds[0], NUM_LEDS);
  FastLED.addLeds<LED_TYPE, LED_PIN2, COLOR_ORDER>(leds[1], NUM_LEDS);

  FastLED.setBrightness(50);

  server.on("/leds", HTTP_POST, onServerEventLeds);
  server.on("/ruler", HTTP_GET, onServerEventRuler);
  server.begin();

  runAnimation();
}

void loop() {
  server.handleClient();
  ledWatchdogCheck();

  static uint32_t lastBlinkTime = 0;
  static bool blinkIsOn = true;

  if (millis() - lastBlinkTime > 500) {
    lastBlinkTime = millis();
    blinkIsOn = !blinkIsOn;

    bool needsUpdate = false;
    for (int s = 0; s < NUM_STRIPS; s++) {
      for (int i = 0; i < NUM_LEDS; i++) {
        if (blinkMask[s][i]) {
          needsUpdate = true;
          if (blinkIsOn) {
            leds[s][i] = targetLeds[s][i];
          } else {
            leds[s][i] = CRGB::Black;
          }
        }
      }
    }
    if (needsUpdate) FastLED.show();
  }
}
