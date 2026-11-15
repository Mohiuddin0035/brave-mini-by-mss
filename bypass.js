// Brave Mini by MS - Anti-Adblock Overlay & Stream Player Bypass (MAIN world)
(function () {
  'use strict';

  // Never run bypass on media/streaming web apps like Spotify, Netflix, YouTube, etc.
  const host = (location.hostname || '').toLowerCase();
  if (/(^|\.)(spotify|scdn|spotifycdn|netflix|disneyplus|primevideo|hulu|apple|deezer|tidal|soundcloud|youtube)\.(com|co|net)$/i.test(host)) {
    return;
  }

  // Safe stubs only if not already defined
  if (typeof window.adsbygoogle === 'undefined') {
    window.adsbygoogle = { loaded: true, push: function () {} };
  }
  if (typeof window.googletag === 'undefined') {
    window.googletag = { cmd: [], apiReady: true, pubads: () => ({}) };
  }
  window.canRunAds = true;
  window.isAdBlockActive = false;

  // Intercept fetch ONLY for explicit bait ad scripts, never generic filenames, load.js, or generate_204
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    if (/(^|\/)(adsbygoogle\.js|show_ads\.js|gpt\.js)($|\?)|securepubads\.g\.doubleclick\.net/i.test(url)) {
      const dummyBody = 'window.adsbygoogle={loaded:true,push:function(){}};window.canRunAds=true;';
      return new Response(dummyBody, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    return origFetch.apply(this, args);
  };

  // Dispatch synthetic onload ONLY for explicit bait script tags
  const origAppend = Element.prototype.appendChild;
  Element.prototype.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && node.src && /(^|\/)(adsbygoogle\.js|show_ads\.js|gpt\.js)($|\?)/i.test(node.src)) {
      setTimeout(() => {
        try {
          if (typeof node.onload === 'function') node.onload(new Event('load'));
          node.dispatchEvent(new Event('load'));
        } catch (e) {}
      }, 5);
      return node;
    }
    return origAppend.call(this, node);
  };

  // Safe dummy dimensions only for explicit ad slots with word boundaries
  const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  if (origOffsetHeight && origOffsetHeight.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get() {
        if (this.className && typeof this.className === 'string' && /\b(adsbygoogle|ad-placement|ad-banner|sponsor-banner)\b/i.test(this.className)) {
          return 100;
        }
        return origOffsetHeight.get.call(this);
      }
    });
  }
  if (origOffsetWidth && origOffsetWidth.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      get() {
        if (this.className && typeof this.className === 'string' && /\b(adsbygoogle|ad-placement|ad-banner|sponsor-banner)\b/i.test(this.className)) {
          return 300;
        }
        return origOffsetWidth.get.call(this);
      }
    });
  }

  // StreamTape / embed player anti-pause bypass (strictly scoped to .sp-root / .sp-chrome)
  let userClickedPause = false;

  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest ? e.target.closest('.sp-root, .sp-chrome') : null;
    if (!target) return;

    const video = document.querySelector('.sp-root video, .sp-chrome video');
    if (!video) return;

    if (video.paused) {
      userClickedPause = false;
      video.play().catch(() => {});
    } else {
      userClickedPause = true;
    }
  }, true);

  const origPause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function () {
    if (this.closest && this.closest('.sp-root, .sp-chrome')) {
      if (!userClickedPause) {
        return;
      }
    }
    return origPause.apply(this, arguments);
  };

  const unlockPlayer = () => {
    const overlay = document.querySelector('.sp-adblock-overlay');
    if (overlay) {
      overlay.remove();
    }
  };

  if (document.querySelector('.sp-root, .sp-chrome, .sp-adblock-overlay')) {
    const observer = new MutationObserver(unlockPlayer);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    unlockPlayer();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('.sp-root, .sp-chrome, .sp-adblock-overlay')) {
        const observer = new MutationObserver(unlockPlayer);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        unlockPlayer();
      }
    }, { once: true });
  }
})();
