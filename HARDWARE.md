# PillPal Hardware Integration Guide

## Overview

The PillPal backend exposes a REST API that any microcontroller or SBC (ESP32, Arduino, Raspberry Pi) can call to:

- **Fetch the current schedule** — know when to dispense next
- **Report dispense events** — confirm a pill was dropped
- **Update device status** — battery, compartment levels, connectivity
- **Receive commands** — server pushes dispense triggers via polling or MQTT

---

## API Quick Reference

Base URL: `http://<your-server-ip>:5000/api`

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

Get a token by calling `POST /api/auth/login` once from the device and storing it in flash/EEPROM.

---

### Hardware Setup

```
ESP32 DevKit
├── GPIO 12 → Servo motor (Compartment 1 actuator)
├── GPIO 13 → Servo motor (Compartment 2 actuator)
├── GPIO 14 → Servo motor (Compartment 3 actuator)
├── GPIO 26 → Piezo buzzer (local alarm)
├── GPIO 27 → LED strip (WS2812B) — status ring
├── GPIO 34 → IR sensor (pill presence detection)
└── GPIO 35 → Battery voltage divider (ADC)
```

### Arduino Sketch (ESP32)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <time.h>

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* SERVER        = "http://192.168.1.100:5000"; // your PC's local IP
const char* EMAIL         = "your@email.com";
const char* PASSWORD      = "yourpassword";

String jwtToken = "";

// NTP for accurate time
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET = 19800; // UTC+5:30 for India — adjust as needed
const int   DST_OFFSET = 0;

Servo servos[7];
const int SERVO_PINS[] = {12, 13, 14, 15, 16, 17, 18};
const int BUZZER_PIN   = 26;
const int IR_PIN       = 34;

// ─── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Attach servos
  for (int i = 0; i < 7; i++) {
    servos[i].attach(SERVO_PINS[i]);
    servos[i].write(0); // closed position
  }

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_PIN, INPUT);

  connectWiFi();
  configTime(GMT_OFFSET, DST_OFFSET, NTP_SERVER);
  delay(2000); // let NTP sync

  login();
  reportDeviceStatus();
}

// ─── MAIN LOOP ───────────────────────────────────────────────────────────────
unsigned long lastCheck = 0;
unsigned long lastStatusReport = 0;

void loop() {
  unsigned long now = millis();

  // Check schedules every 30 seconds
  if (now - lastCheck > 30000) {
    lastCheck = now;
    checkAndDispense();
  }

  // Report status every 5 minutes
  if (now - lastStatusReport > 300000) {
    lastStatusReport = now;
    reportDeviceStatus();
  }

  delay(1000);
}

// ─── WIFI ────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
}

// ─── LOGIN & GET JWT ─────────────────────────────────────────────────────────
void login() {
  HTTPClient http;
  http.begin(String(SERVER) + "/api/auth/login");
  http.addHeader("Content-Type", "application/json");

  String body = "{\"email\":\"" + String(EMAIL) + "\",\"password\":\"" + String(PASSWORD) + "\"}";
  int code = http.POST(body);

  if (code == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    jwtToken = doc["token"].as<String>();
    Serial.println("✅ Logged in, token acquired");
  } else {
    Serial.println("❌ Login failed: " + String(code));
  }
  http.end();
}

// ─── CHECK SCHEDULE & AUTO-DISPENSE ──────────────────────────────────────────
void checkAndDispense() {
  // Get current HH:MM
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  char timeStr[6];
  strftime(timeStr, 6, "%H:%M", &timeinfo);
  int todayDow = timeinfo.tm_wday == 0 ? 7 : timeinfo.tm_wday; // 1=Mon..7=Sun

  // Fetch active schedules
  HTTPClient http;
  http.begin(String(SERVER) + "/api/schedules");
  http.addHeader("Authorization", "Bearer " + jwtToken);
  int code = http.GET();

  if (code != 200) { http.end(); return; }

  DynamicJsonDocument doc(4096);
  deserializeJson(doc, http.getString());
  http.end();

  for (JsonObject s : doc.as<JsonArray>()) {
    if (!s["active"]) continue;

    // Check if this schedule fires right now
    String schedTime = s["time"].as<String>();
    if (schedTime != String(timeStr)) continue;

    // Check day of week
    String days = s["days_of_week"].as<String>();
    if (days.indexOf(String(todayDow)) == -1) continue;

    int compartment = s["compartment"].as<int>();
    int doseCount   = s["dose_count"].as<int>();
    int medId       = s["medication_id"].as<int>();
    int schedId     = s["id"].as<int>();

    Serial.println("💊 Dispensing " + s["medication_name"].as<String>());

    // Actuate the servo to open and close
    dispensePills(compartment, doseCount);

    // Beep the buzzer
    buzzAlarm();

    // Report dispense to server
    reportDispense(medId, schedId);
  }
}

// ─── SERVO ACTUATION ─────────────────────────────────────────────────────────
void dispensePills(int compartment, int count) {
  int idx = compartment - 1;
  if (idx < 0 || idx >= 7) return;

  for (int i = 0; i < count; i++) {
    servos[idx].write(90);  // open
    delay(800);
    servos[idx].write(0);   // close
    delay(400);

    // Wait for IR sensor to confirm pill dispensed
    int timeout = 0;
    while (digitalRead(IR_PIN) == HIGH && timeout < 2000) {
      delay(10); timeout += 10;
    }
    Serial.println(timeout < 2000 ? "✅ Pill detected" : "⚠️ Pill not detected");
  }
}

// ─── BUZZER ──────────────────────────────────────────────────────────────────
void buzzAlarm() {
  // 3 ascending beeps: E5 (659Hz), G5 (784Hz), A5 (880Hz)
  int freqs[] = {659, 784, 880};
  for (int rep = 0; rep < 3; rep++) {
    for (int f : freqs) {
      tone(BUZZER_PIN, f, 180);
      delay(260);
    }
    delay(400);
  }
  noTone(BUZZER_PIN);
}

// ─── REPORT DISPENSE TO SERVER ───────────────────────────────────────────────
void reportDispense(int medId, int schedId) {
  // The backend scheduler already auto-logs — this is a CONFIRMATION from hardware
  // Use PATCH to mark a log if needed, or POST a device_status update
  HTTPClient http;
  http.begin(String(SERVER) + "/api/device");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + jwtToken);
  
  String body = "{\"connected\":1,\"battery_level\":" + String(getBatteryLevel()) + "}";
  http.PUT(body);
  http.end();
}

// ─── REPORT DEVICE STATUS ────────────────────────────────────────────────────
void reportDeviceStatus() {
  if (jwtToken == "") return;
  HTTPClient http;
  http.begin(String(SERVER) + "/api/device");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + jwtToken);

  String body = "{\"connected\":1,\"battery_level\":" + String(getBatteryLevel()) + 
    ",\"compartment_status\":{\"1\":\"ok\",\"2\":\"ok\",\"3\":\"ok\"}}";
  
  int code = http.PUT(body);
  Serial.println("📡 Status reported: " + String(code));
  http.end();
}

// ─── BATTERY LEVEL ───────────────────────────────────────────────────────────
int getBatteryLevel() {
  // GPIO35 reads 0-4095 (ADC), map to 0-100%
  // Adjust divisor based on your voltage divider ratio
  int raw = analogRead(35);
  return constrain(map(raw, 1500, 3000, 0, 100), 0, 100);
}
```

---

## Wiring Diagram

```
                    ┌─────────────────────────┐
                    │         ESP32            │
                    │                          │
  ┌─────────────┐  │  GPIO12 ──────────────── │── SG90 Servo (Compartment 1)
  │  3.7V LiPo  │  │  GPIO13 ──────────────── │── SG90 Servo (Compartment 2)
  │  Battery    │──│  GPIO14 ──────────────── │── SG90 Servo (Compartment 3)
  └─────────────┘  │                          │
                    │  GPIO26 ──────────────── │── Piezo Buzzer (+ 100Ω)
                    │  GPIO27 ──────────────── │── WS2812B LED Ring (DIN)
                    │  GPIO34 ──────────────── │── IR Sensor (OUT)
                    │  GPIO35 ──[ 100kΩ ]───── │── Battery (+) via divider
                    └─────────────────────────┘
```

---

## Getting Your Server IP for Hardware

If you're running the backend on your PC on a local network:

```bash
# Windows
ipconfig
# look for "IPv4 Address" under your WiFi adapter e.g. 192.168.1.100

# Mac/Linux
ifconfig | grep "inet "
```

Then in your Arduino/Python code, set:
```
const char* SERVER = "http://192.168.1.100:5000";
```

> For remote/internet access, deploy the backend to a VPS (Railway, Render, etc.) and use its public URL.

---

## Parts List (estimated)

| Component | Purpose | ~Cost |
|-----------|---------|-------|
| ESP32 DevKit v1 | Main controller | ₹400 |
| SG90 Micro Servos × 7 | Compartment actuators | ₹700 |
| Piezo buzzer (active) | Local alarm | ₹30 |
| WS2812B LED ring | Status indicator | ₹120 |
| IR obstacle sensor | Pill detection | ₹40 |
| 3.7V 18650 LiPo + TP4056 | Battery power | ₹200 |
| AMS1117 3.3V regulator | Logic power | ₹20 |
| **Total** | | **~₹1,510** |
