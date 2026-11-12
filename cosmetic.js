// Brave Mini by MS - Cosmetic Ad Filter & Telemetry Bridge (ISOLATED world)
(function () {
  'use strict';

  const COSMETIC_CSS = `
    ins.adsbygoogle,
    [id^="google_ads_iframe"],
    [id^="div-gpt-ad"],
    iframe[id^="google_ads_"],
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication.com"],
    iframe[src*="adsterra"],
    iframe[src*="highperformanceformat"],
    iframe[src*="profitablecpmrate"],
    iframe[src*="topcreativeformat"],
    iframe[src*="effectivegatecpm"],
    iframe[src*="highcpmgate"],
    iframe[src*="exoclick"],
    iframe[src*="propellerads"],
    iframe[src*="popads"],
    iframe[src*="trafficjunky"],
    iframe[src*="juicyads"],
    iframe[src*="adcash"],
    iframe[src*="clickadu"],
    [id^="taboola-"],
    .OUTBRAIN,
    .ob-widget,
    [id^="M"][id*="ScriptRoot"],
    .fc-ab-root,
    ytd-ad-slot-renderer,
    ytd-banner-promo-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-companion-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-display-ad-renderer,
    #player-ads,
    #masthead-ad,
    .ytp-ad-overlay-container,
    .ytp-ad-action-interstitial {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      pointer-events: none !important;
    }
  `;

  function injectCosmeticCSS() {
    if (document.getElementById('brave-mini-cosmetic')) return;
    const parent = document.head || document.documentElement;
    if (!parent) return;
    const style = document.createElement('style');
    style.id = 'brave-mini-cosmetic';
    style.textContent = COSMETIC_CSS;
    parent.appendChild(style);
  }

  function applyAggressiveFlag(val) {
    if (document.documentElement) {
      document.documentElement.dataset.bmAggressive = val ? '1' : '0';
    }
  }

  // Sync settings from storage
  try {
    chrome.storage.local.get({ aggressiveMode: true }, (data) => {
      applyAggressiveFlag(data.aggressiveMode);
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.aggressiveMode) {
        applyAggressiveFlag(changes.aggressiveMode.newValue);
      }
    });
  } catch (e) {}

  injectCosmeticCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCosmeticCSS, { once: true });
  }

  // Bridge blocked telemetry from MAIN world shields.js to background.js
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__bmShieldBlocked !== true) return;
    try {
      chrome.runtime.sendMessage({
        type: 'BM_BLOCKED',
        kind: data.kind === 'redirect' ? 'redirect' : 'ad',
        url: data.url || ''
      }).catch(() => {});
    } catch (e) {}
  });
})();

