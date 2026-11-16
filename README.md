<p align="center">
  <img src="icons/icon128.png" alt="Brave Mini by MS" width="112" />
</p>

<h1 align="center">Brave Mini by MS</h1>

<p align="center">
  <strong>Browse without ads, popups, or forced redirects — Brave-style shields for Chrome, Edge, Brave, Opera & Vivaldi.</strong>
</p>

<p align="center">
  <a href="https://github.com/Mohiuddin0035/brave-mini-by-mss/releases/tag/v3.0.6">
    <img src="https://img.shields.io/badge/Download-v3.0.6%20ZIP-FB542B?style=for-the-badge&logo=github" alt="Download v3.0.6" />
  </a>
  <img src="https://img.shields.io/badge/Manifest-V3-FF7A00?style=for-the-badge" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local-10B981?style=for-the-badge" alt="100% Local" />
  <img src="https://img.shields.io/badge/Browsers-All%20Chromium-18181B?style=for-the-badge" alt="Chromium Browsers" />
</p>

<p align="center">
  <a href="#-what-it-does">Features</a> •
  <a href="#-install-in-30-seconds">Install in 30 Seconds</a> •
  <a href="#-dashboard-controls">Controls</a> •
  <a href="#-under-the-hood-for-developers">For Developers</a>
</p>

---

> **Why Brave Mini?** Most ad blockers miss streaming popups, forced redirect tabs, and anti-adblock walls. **Brave Mini** combines fast network blocking, smart popup protection, YouTube ad skipping, and link cleaning into one lightweight extension — with **zero data collection**.

---

## ✨ What It Does

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🛡️ Blocks Ads & Trackers</h3>
      Stops banner ads, push-notification spam, and <strong>217+ major ad & tracking networks</strong> before they even load — making pages faster and cleaner.
    </td>
    <td width="50%" valign="top">
      <h3>▶️ YouTube Ad Blocker & Auto-Skip</h3>
      Hides YouTube ad banners and automatically skips or speeds past video ads so you can watch uninterrupted.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🚫 Smart Popup & Redirect Tab Guard</h3>
      Intelligently distinguishes intentional button clicks (e.g. <em>"Continue to Destination"</em>, <em>"Download"</em>) from background click-traps — kills rogue popunders while letting legitimate download tabs open.
    </td>
    <td width="50%" valign="top">
      <h3>🔓 Bypasses Anti-Adblock Walls</h3>
      Prevents websites from locking content or pausing video players when an ad blocker is detected.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🔗 Strips Tracking Links</h3>
      Automatically removes hidden tracking tags (<code>fbclid</code>, <code>gclid</code>, <code>utm_*</code>, <code>igshid</code>, and more) whenever you open a URL.
    </td>
    <td width="50%" valign="top">
      <h3>📊 Brave-Style Control Panel</h3>
      Pause shields on any website in one click, customize protection modes, and track live + lifetime blocked counts right from the toolbar.
    </td>
  </tr>
</table>

---

## ⚡ Built for Everyday Browsing

| 🔒 100% Private | ⚙️ Zero Config | 🧠 Smart & Safe | 🌐 Works Everywhere |
| :--- | :--- | :--- | :--- |
| Runs completely offline inside your browser — no accounts, no analytics, no telemetry. | Install once and you're protected immediately across every site. | Blocks rogue ad tabs without breaking legitimate sign-in popups or download links. | Supports Chrome, Edge, Brave, Opera, Vivaldi, and all Chromium browsers. |

---

## 🚀 Install in 30 Seconds

### Option 1: Download ZIP (Recommended)

1. **Download the latest release:** 👉 [**`Brave-Mini-by-MS-v3.0.6.zip`**](https://github.com/Mohiuddin0035/brave-mini-by-mss/releases/latest/download/Brave-Mini-by-MS-v3.0.6.zip) (or open the [**Releases page**](https://github.com/Mohiuddin0035/brave-mini-by-mss/releases)).
2. **Extract (unzip)** the file to a permanent folder (e.g., `C:\Extensions\Brave-Mini-by-MS`).
   > ⚠️ **Keep this folder!** Your browser loads the extension directly from here, so don't delete it after installing.
3. Open your browser's Extensions page:
   - **Chrome:** `chrome://extensions`
   - **Edge:** `edge://extensions`
   - **Brave:** `brave://extensions`
   - **Opera / Vivaldi:** `opera://extensions` or `vivaldi://extensions`
4. Turn **ON** **Developer mode** (top-right corner).
5. Click **Load unpacked** and select the extracted folder (the one containing `manifest.json`).
6. Click the Extensions puzzle icon in your toolbar and **Pin** **Brave Mini by MS** for quick access.

<details>
<summary><strong>Option 2: Clone from Source (Git)</strong></summary>

```bash
git clone https://github.com/Mohiuddin0035/brave-mini-by-mss.git
```

Then follow steps **3–6** above and select the cloned folder when clicking **Load unpacked**.

</details>

---

## 🔧 Dashboard Controls

Click the **Brave Mini** icon in your toolbar anytime to control your shields:

| Control | What It Does |
| :--- | :--- |
| **Per-Site Shield Switch** | Pause or resume protection for the current website with one click. |
| **Global Shield Engine** | Master switch for ad, tracker, and YouTube protection across all sites. |
| **Aggressive Ad & Redirect Block** | Extra protection against streaming popunders, click-traps, and YouTube ads. |
| **Auto-Close Redirect Tabs** | Smart Tab Guard toggle: independently pause auto-closing of popup tabs if needed without disabling any ad blocking. |
| **Clean Tracking URLs** | Automatically strips tracking parameters (`fbclid`, `gclid`, `utm_*`, etc.) from links. |
| **Live & Total Stats** | Shows items blocked on the current tab plus your persistent lifetime total. |

---

## 🧩 Under the Hood (For Developers)

<details>
<summary><strong>Click to expand technical architecture & project structure</strong></summary>

- **Network Filtering (MV3 `declarativeNetRequest`):**
  - `rules.json` — `217` rules blocking major ad networks, exchanges, push-notification SDKs, and analytics endpoints, plus safe redirects of anti-adblock bait scripts (`adsbygoogle.js`, `gpt.js`, `show_ads.js`) to `bait-stub.js`.
  - `rules_redirects.json` — `119` rules targeting popunder networks, affiliate redirectors, and third-party `<a ping>` beacons.
  - `rules_privacy.json` — strips `20` common URL tracking parameters (`fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `mc_cid`, `mc_eid`, `yclid`, `utm_*`, `igshid`, `_hsenc`, `_hsmi`, `mkt_tok`, `vero_id`) on `main_frame` navigation.
- **Active JS Shields & Bypasses:**
  - `shields.js` — neutralizes popunder SDKs, gesture-less `window.open` popups, detached `a.click()` traps, `<meta http-equiv="refresh">` ad redirects, and transparent full-screen click overlays, while preserving OAuth/login flows and valid user clicks.
  - `background.js` — manages DNR rule sync, dynamic content script registration, per-tab/lifetime counters, and Smart Tab Guard (accurately terminates rogue ad tabs while shielding user-initiated destination/download tabs, with an independent toggle).
  - `bypass.js` — anti-adblock overlay & media-player pause bypass engine.
  - `cosmetic.js` — cosmetic ad element hiding, YouTube ad skipping/fast-forwarding, telemetry bridge, and user-intent click detector (distinguishes intentional button/action clicks from background popunder traps).

```text
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker: DNR sync, script lifecycle & rogue tab guard
├── bypass.js              # Anti-adblock & media player bypass engine
├── shields.js             # Popunder, redirect & click-trap shield
├── cosmetic.js            # Cosmetic ad hiding & YouTube ad skipper
├── bait-stub.js           # Safe local stub for redirected ad bait scripts
├── rules.json             # 217 network ad & tracker rules
├── rules_redirects.json   # 119 popunder & redirect blocking rules
├── rules_privacy.json     # URL tracking query parameter cleaner
├── popup.html             # Brave-style popup dashboard UI
├── popup.js               # Popup state & live stats controller
└── icons/                 # Active & paused extension icons (16/32/48/128px)
```

</details>

---

<p align="center">
  Made by <strong>MS (<a href="https://github.com/Mohiuddin0035">Mohiuddin0035</a>)</strong>
</p>
