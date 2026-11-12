<p align="center">
  <img src="icons/icon128.png" alt="Brave Mini by MS" width="110" />
</p>

<h1 align="center">Brave Mini by MS</h1>

<p align="center">
  <strong>Brave-style Aggressive Ad Blocker, Redirect & Popunder Shield, URL Tracker Cleaner, and Anti-Adblock Bypass for All Chromium Browsers</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-FB542B?style=for-the-badge" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Version-3.0.1-FF7A00?style=for-the-badge" alt="Version 3.0.1" />
  <img src="https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera%20%7C%20Vivaldi-18181b?style=for-the-badge" alt="Chromium Browsers" />
</p>

---

## Features

- **Aggressive Network Ad & Tracker Blocking (MV3 `declarativeNetRequest`)**
  - Blocks `217+` major ad networks, ad exchanges, push-notification spam SDKs, and third-party tracking/analytics endpoints (`rules.json`).
  - Redirects static anti-adblock bait scripts (`adsbygoogle.js`, `gpt.js`, `show_ads.js`) to a safe local stub (`bait-stub.js`) so websites don't trigger adblock walls.
- **Popunder & Forced Redirect Shield**
  - Network-level blocking (`119+` rules in `rules_redirects.json`) for streaming popunder networks, affiliate redirectors, and third-party `<a ping>` tracking.
  - Smart JS Shield (`shields.js`) neutralizes popunder SDKs, `about:blank` / gesture-less `window.open` popups, detached `a.click()` traps, `<meta http-equiv="refresh">` ad redirects, and full-screen transparent click-traps—while keeping legitimate play buttons, download links, and OAuth logins working.
  - Background Tab Guard (`background.js`) automatically closes rogue ad/popunder tabs and multi-hop redirect chains, returning focus to your active tab.
- **YouTube Ad Blocker & Auto-Skipper**
  - Automatically hides YouTube ad banners/slots and skips or fast-forwards video ads.
- **URL Tracking Parameter Cleaner**
  - Strips `fbclid`, `gclid`, `dclid`, `msclkid`, `mc_eid`, `yclid`, `igshid`, and `utm_*` tracking parameters on navigation (`rules_privacy.json`).
- **Built-in Anti-Adblock & Sync-Player Bypass**
  - Preserves full compatibility for sites using anti-adblock overlays and media-pause traps (`bypass.js`).
- **Brave-Style Popup Dashboard**
  - **Per-Site Shields UP/DOWN** toggle for one-click site exceptions.
  - **Persistent Lifetime Stats** for Ads & Trackers and Redirects & Popups blocked (plus per-tab counts).
  - Independent toggles for **Global Shield Engine**, **Aggressive Ad & Redirect Block**, and **Clean Tracking URLs**.

---

## Installation & Usage

### Option 1: Install from GitHub Releases (Recommended)

1. Go to the [**Releases**](../../releases) page of this repository.
2. Download the latest **`Brave-Mini-by-MS-v3.0.1.zip`** asset.
3. Extract (unzip) the downloaded file to a permanent folder on your computer (for example, `C:\Extensions\Brave-Mini-by-MS`).
   > **Note:** Do not delete the extracted folder after loading it, as the browser reads the extension directly from this folder.
4. Open your Chromium-based browser's Extensions page:
   - **Google Chrome:** `chrome://extensions`
   - **Microsoft Edge:** `edge://extensions`
   - **Brave Browser:** `brave://extensions`
   - **Opera / Vivaldi:** `opera://extensions` or `vivaldi://extensions`
5. Turn **ON** **Developer mode** (top-right toggle).
6. Click **Load unpacked** and select the extracted folder (the folder containing `manifest.json`).
7. Click the puzzle/extensions icon in your browser toolbar and **Pin** **Brave Mini by MS** for quick access.

### Option 2: Clone from Source

```bash
git clone https://github.com/Mohiuddin0035/brave-mini-by-mss.git
```

Then follow steps **4–7** above and select the cloned folder in **Load unpacked**.

---

## How to Use

- **Automatic Protection:** Once installed, all shields are active by default across every website.
- **Per-Site Toggle:** Click the **Brave Mini** icon in the toolbar and flip the top switch to pause or resume protection for the current website only.
- **Aggressive Mode & URL Cleaner:** Toggle **Aggressive Ad & Redirect Block** or **Clean Tracking URLs** anytime from the popup without disabling the main shield.
- **View Blocked Stats:** The toolbar badge shows items blocked on the current tab, while the popup displays your persistent total blocked count.

---

## Project Structure

```text
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker: DNR sync, script lifecycle & rogue popup killer
├── bypass.js              # Anti-adblock & media player bypass engine
├── shields.js             # Aggressive JS popunder, redirect & YouTube ad shield
├── cosmetic.js            # Cosmetic ad hiding & telemetry bridge
├── bait-stub.js           # Safe local stub for redirected ad bait scripts
├── rules.json             # Network ad & tracker blocking rules
├── rules_redirects.json   # Popunder, redirect & streaming ad blocking rules
├── rules_privacy.json     # Tracking query parameter removal rules
├── popup.html             # Extension popup UI
├── popup.js               # Popup controller & live stats
└── icons/                 # Active & paused extension icons (16/32/48/128px)
```

---

## Author

Created by **MS ([Mohiuddin0035](https://github.com/Mohiuddin0035))**

