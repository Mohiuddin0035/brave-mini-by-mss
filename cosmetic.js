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

  function safeSendMessage(msg) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id || !chrome.runtime.sendMessage) {
        return;
      }
      chrome.runtime.sendMessage(msg, function () {
        var err = chrome.runtime.lastError;
        if (err) {
          return;
        }
      });
    } catch (e) {}
  }

  // Bridge blocked telemetry from MAIN world shields.js to background.js
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__bmShieldBlocked !== true) return;
    safeSendMessage({
      type: 'BM_BLOCKED',
      kind: data.kind === 'redirect' ? 'redirect' : 'ad',
      url: data.url || ''
    });
  });

  // Smart Intentional Click Detector (ISOLATED world)
  // Reliably distinguishes deliberate button/link clicks from random/background ad clicks
  const ACTION_KEYWORDS = /(continue|download|destination|get link|generate link|proceed|verify|next|start|submit|visit|direct|open|play|server|stream|magnet|torrent|mirror|cloud|drive|file|click here|fast download|free download|skip|confirm|checkout|login|sign in|register)/i;

  function findIntentionalTarget(target) {
    if (!target || target.nodeType !== 1) return null;

    const clickable = target.closest(
      'button, a[href], input[type="button"], input[type="submit"], [role="button"], [class*="btn"], [class*="button"], [id*="btn"], [id*="button"]'
    );
    if (!clickable) return null;

    try {
      const cs = window.getComputedStyle(clickable);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') {
        return null;
      }
      const rect = clickable.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return null;
      // Filter out deceptive full-screen overlay traps
      const winW = window.innerWidth || 800;
      const winH = window.innerHeight || 600;
      if (rect.width >= winW * 0.85 && rect.height >= winH * 0.85) {
        return null;
      }
    } catch (e) {}

    const text = (
      clickable.innerText ||
      clickable.textContent ||
      clickable.value ||
      clickable.getAttribute('aria-label') ||
      clickable.title ||
      ''
    ).trim();

    const href = clickable.tagName === 'A' ? (clickable.href || clickable.getAttribute('href') || '') : '';
    const hasKeyword = ACTION_KEYWORDS.test(text) || ACTION_KEYWORDS.test(clickable.className || '') || ACTION_KEYWORDS.test(clickable.id || '');

    return {
      tagName: clickable.tagName,
      text: text.slice(0, 100),
      href: href.slice(0, 500),
      hasKeyword
    };
  }

  let lastSentClickTime = 0;
  function handlePotentialIntentionalClick(e) {
    if (!e.isTrusted) return;
    const now = Date.now();
    if (now - lastSentClickTime < 350) return;

    const info = findIntentionalTarget(e.target);
    if (!info) return;

    lastSentClickTime = now;
    safeSendMessage({
      type: 'BM_INTENTIONAL_CLICK',
      info: {
        tagName: info.tagName,
        text: info.text,
        href: info.href,
        hasKeyword: info.hasKeyword,
        timestamp: now
      }
    });
  }

  document.addEventListener('pointerdown', handlePotentialIntentionalClick, true);
  document.addEventListener('click', handlePotentialIntentionalClick, true);
})();

