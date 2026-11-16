// Brave Mini by MS - Anti-Adblock Overlay & Stream Player Bypass Engine (MAIN world)
(function () {
  'use strict';
  if (window.__braveMiniBypassLoaded) return;
  window.__braveMiniBypassLoaded = true;

  // 1. Exclude proprietary DRM / media web apps (Spotify, Netflix, YouTube, Apple, etc.)
  const host = (location.hostname || '').toLowerCase();
  if (/(^|\.)(spotify|scdn|spotifycdn|netflix|disneyplus|primevideo|hulu|apple|deezer|tidal|soundcloud|youtube)\.(com|co|net)$/i.test(host)) {
    return;
  }

  let adblockDetectedBySite = false;
  let userClickedPause = false;

  // 2. Global Ad Flags & Stubs
  const noopFn = function () {};
  const noopPubads = {
    addEventListener: () => noopPubads,
    clear: noopFn,
    clearCategoryExclusions: noopFn,
    clearTag: noopFn,
    collapseEmptyDivs: noopFn,
    disableInitialLoad: noopFn,
    display: noopFn,
    enableAsyncRendering: noopFn,
    enableLazyLoad: noopFn,
    enableSingleRequest: noopFn,
    enableSyncRendering: noopFn,
    enableVideoAds: noopFn,
    get: () => null,
    getAttributeKeys: () => [],
    getTargeting: () => [],
    getTargetingKeys: () => [],
    refresh: noopFn,
    set: () => noopPubads,
    setCategoryExclusion: () => noopPubads,
    setCentering: noopFn,
    setCookieOptions: () => noopPubads,
    setPrivacySettings: () => noopPubads,
    setPublisherProvidedId: () => noopPubads,
    setRequestNonPersonalizedAds: () => noopPubads,
    setSafeFrameConfig: () => noopPubads,
    setTagForChildDirectedTreatment: () => noopPubads,
    setTagForUnderAgeOfConsent: () => noopPubads,
    setTargeting: () => noopPubads,
    updateCorrelator: noopFn
  };

  try {
    if (typeof window.adsbygoogle === 'undefined') {
      window.adsbygoogle = { loaded: true, push: function () {} };
    } else {
      window.adsbygoogle.loaded = true;
    }
    if (typeof window.googletag === 'undefined') {
      window.googletag = {
        cmd: [],
        apiReady: true,
        pubadsReady: true,
        pubads: () => noopPubads,
        defineSlot: () => ({ addService: () => ({ setTargeting: () => ({}) }) }),
        display: noopFn,
        enableServices: noopFn
      };
    }
  } catch (e) {}

  // Lock ad blocker status variables so detector scripts cannot set them to true/false
  try {
    Object.defineProperty(window, 'canRunAds', { get: () => true, set: () => {}, configurable: true });
    Object.defineProperty(window, 'isAdBlockActive', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'adBlockDetected', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'hasAdblock', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'adsBlocked', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'abp', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'uAdBlock', { get: () => false, set: () => {}, configurable: true });
    Object.defineProperty(window, 'google_ad_status', { get: () => 1, set: () => {}, configurable: true });
  } catch (e) {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.adBlockDetected = false;
    window.hasAdblock = false;
    window.adsBlocked = false;
    window.abp = false;
    window.uAdBlock = false;
    window.google_ad_status = 1;
  }

  const noopDetector = {
    onDetected: function () { return this; },
    onNotDetected: function (fn) {
      if (typeof fn === 'function') {
        try { setTimeout(fn, 10); } catch (e) {}
      }
      return this;
    },
    on: function (detected, fn) {
      if (!detected && typeof fn === 'function') {
        try { setTimeout(fn, 10); } catch (e) {}
      }
      return this;
    },
    check: function () { return false; },
    setOption: function () { return this; },
    clearEvent: function () { return this; }
  };

  try {
    if (typeof window.blockAdBlock === 'undefined') window.blockAdBlock = noopDetector;
    if (typeof window.fuckAdBlock === 'undefined') window.fuckAdBlock = noopDetector;
    if (typeof window.sniffAdBlock === 'undefined') window.sniffAdBlock = noopDetector;
    if (typeof window.BlockAdBlock === 'undefined') window.BlockAdBlock = function () { return noopDetector; };
    if (typeof window.FuckAdBlock === 'undefined') window.FuckAdBlock = function () { return noopDetector; };
  } catch (e) {}

  // 3. Intercept Bait Fetch Requests
  // Matches ad networks and bait paths that anti-adblock scripts fetch to test for blocking
  const BAIT_URL_REGEX = /(^|\/)(adsbygoogle\.js|show_ads\.js|gpt\.js|ad_status|sodar|pagead|doubleclick|googlesyndication|googleadservices|adservice)(\.|\/|$|\?)|(\/ads?\.(js|php|html|json))|(\/pagead\/)/i;

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const rawUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    const url = String(rawUrl);

    if (url && BAIT_URL_REGEX.test(url)) {
      if (url.includes('generate_204')) {
        return new Response(null, { status: 204 });
      }

      // If the request specifically expects JSON (or headers contain application/json)
      const opts = args[1] || {};
      const acceptHeader = (opts.headers && (opts.headers.Accept || opts.headers.accept || opts.headers['content-type'])) || '';
      const isJson = /json|ad_status/i.test(url) || /application\/json/i.test(String(acceptHeader));

      if (isJson) {
        return new Response(JSON.stringify({
          status: 'success',
          ad_status: 'active',
          canRunAds: true,
          adblock: false,
          blocked: false,
          success: true,
          ads: []
        }), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const dummyScript = 'window.adsbygoogle={loaded:true,push:function(){}};window.canRunAds=true;window.isAdBlockActive=false;window.adBlockDetected=false;/*bait-ok*/';
      return new Response(dummyScript, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    return origFetch.apply(this, args);
  };

  // 4. Intercept Bait XMLHttpRequest
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bmUrl = String(url || '');
    return origXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this.__bmUrl && BAIT_URL_REGEX.test(this.__bmUrl)) {
      setTimeout(() => {
        try {
          Object.defineProperty(this, 'status', { value: 200, writable: true });
          Object.defineProperty(this, 'readyState', { value: 4, writable: true });
          const isJson = /json|ad_status/i.test(this.__bmUrl);
          const respText = isJson
            ? JSON.stringify({ status: 'success', canRunAds: true, adblock: false })
            : 'window.adsbygoogle={loaded:true};window.canRunAds=true;';
          Object.defineProperty(this, 'responseText', { value: respText, writable: true });
          Object.defineProperty(this, 'response', { value: respText, writable: true });
          this.dispatchEvent(new Event('readystatechange'));
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        } catch (e) {}
      }, 5);
      return;
    }
    return origXhrSend.apply(this, arguments);
  };

  // 5. Intercept Bait Script & Image Elements
  function isBaitScriptSrc(src) {
    if (!src) return false;
    return BAIT_URL_REGEX.test(src) || /(^|\/)(ads?\.js|pagead\.js|show_ads\.js|adsbygoogle\.js|gpt\.js|ad_status)($|\?)/i.test(src);
  }

  const origImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (origImageSrc && origImageSrc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      set(val) {
        if (typeof val === 'string' && BAIT_URL_REGEX.test(val)) {
          setTimeout(() => {
            try {
              if (typeof this.onload === 'function') this.onload(new Event('load'));
              this.dispatchEvent(new Event('load'));
            } catch (e) {}
          }, 5);
        }
        return origImageSrc.set.call(this, val);
      },
      get() {
        return origImageSrc.get.call(this);
      }
    });
  }

  const origAppend = Element.prototype.appendChild;
  Element.prototype.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && node.src && isBaitScriptSrc(node.src)) {
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

  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (node && node.tagName === 'SCRIPT' && node.src && isBaitScriptSrc(node.src)) {
      setTimeout(() => {
        try {
          if (typeof node.onload === 'function') node.onload(new Event('load'));
          node.dispatchEvent(new Event('load'));
        } catch (e) {}
      }, 5);
      return node;
    }
    return origInsertBefore.call(this, node, ref);
  };

  // 6. Defeat Bait Element Offset / Client Dimensions & ComputedStyle Checks
  // Sites test if element with ad-related class or id gets collapsed (0 height or display: none)
  const BAIT_ELEMENT_REGEX = /\b(ad|ads|banner|sponsor|advert|pub_300|text-ad|ad-unit|ad-zone|ad-slot|adsbygoogle|ad-placement)\b/i;

  function isAdBaitElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const cls = String(el.className || '');
    const id = String(el.id || '');
    return BAIT_ELEMENT_REGEX.test(cls) || BAIT_ELEMENT_REGEX.test(id);
  }

  const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const origClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
  const origClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');

  if (origOffsetHeight && origOffsetHeight.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get() {
        const real = origOffsetHeight.get.call(this);
        if (real === 0 && isAdBaitElement(this)) return 100;
        return real;
      }
    });
  }

  if (origOffsetWidth && origOffsetWidth.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      get() {
        const real = origOffsetWidth.get.call(this);
        if (real === 0 && isAdBaitElement(this)) return 300;
        return real;
      }
    });
  }

  if (origClientHeight && origClientHeight.get) {
    Object.defineProperty(Element.prototype, 'clientHeight', {
      get() {
        const real = origClientHeight.get.call(this);
        if (real === 0 && isAdBaitElement(this)) return 100;
        return real;
      }
    });
  }

  if (origClientWidth && origClientWidth.get) {
    Object.defineProperty(Element.prototype, 'clientWidth', {
      get() {
        const real = origClientWidth.get.call(this);
        if (real === 0 && isAdBaitElement(this)) return 300;
        return real;
      }
    });
  }

  const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const rect = origGetBoundingClientRect.apply(this, arguments);
    if (rect.height === 0 && rect.width === 0 && isAdBaitElement(this)) {
      return new DOMRect(rect.x, rect.y, 300, 100);
    }
    return rect;
  };

  const origGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (el, pseudo) {
    const cs = origGetComputedStyle.apply(window, arguments);
    if (isAdBaitElement(el)) {
      return new Proxy(cs, {
        get(target, prop) {
          if (prop === 'display') return 'block';
          if (prop === 'visibility') return 'visible';
          if (prop === 'opacity') return '1';
          const val = target[prop];
          return typeof val === 'function' ? val.bind(target) : val;
        }
      });
    }
    return cs;
  };

  // 7. Active Adblock Overlay Killer & Streaming Player Unlocker
  // Detects and eliminates overlays like "Ad Blocker Detected", "Please disable your ad blocker", etc.
  const ADBLOCK_OVERLAY_TEXT_REGEX = /ad\s*blocker\s*detected|disable\s*your\s*ad\s*blocker|please\s*disable\s*ad\s*blocker|turn\s*off\s*your\s*ad\s*blocker|adblock\s*detected|blocker\s*detected/i;

  function scanAndUnlock(root) {
    if (!root) return;
    const candidates = root.querySelectorAll('div, section, aside, [role="dialog"], [role="alertdialog"], .modal, .overlay, .backdrop');
    for (const el of candidates) {
      if (!el || !el.innerText) continue;
      if (ADBLOCK_OVERLAY_TEXT_REGEX.test(el.innerText)) {
        let modalContainer = el;
        while (
          modalContainer.parentElement &&
          modalContainer.parentElement !== document.body &&
          modalContainer.parentElement !== document.documentElement &&
          (modalContainer.parentElement.offsetWidth <= el.offsetWidth * 1.5)
        ) {
          modalContainer = modalContainer.parentElement;
        }

        const recheckBtn = modalContainer.querySelector('button, a, .btn, [role="button"]');
        if (recheckBtn && /recheck|disabled|continue|i've disabled/i.test(recheckBtn.innerText || '')) {
          try { recheckBtn.click(); } catch (err) {}
        }

        modalContainer.style.setProperty('display', 'none', 'important');
        modalContainer.style.setProperty('visibility', 'hidden', 'important');
        modalContainer.style.setProperty('pointer-events', 'none', 'important');
        modalContainer.style.setProperty('opacity', '0', 'important');
        adblockDetectedBySite = true;

        if (document.body) document.body.style.removeProperty('overflow');
        if (document.documentElement) document.documentElement.style.removeProperty('overflow');
      }
    }
  }

  function unlockStreamingPlayer() {
    // 1. Remove StreamTape overlay if present
    const stOverlay = document.querySelector('.sp-adblock-overlay');
    if (stOverlay) {
      adblockDetectedBySite = true;
      stOverlay.remove();
    }

    // 2. Scan main document for AdBlock modal dialogs / overlays (like CineFreak, embed players, etc.)
    scanAndUnlock(document);

    // 3. Unhide any hidden video / iframe players
    const videos = document.querySelectorAll('video, iframe[src*="stream"], iframe[src*="embed"], iframe[src*="player"], .player-container, #player, [class*="player"]');
    for (const v of videos) {
      try {
        const cs = window.getComputedStyle(v);
        if (cs.display === 'none') {
          v.style.setProperty('display', 'block', 'important');
        }
        if (cs.visibility === 'hidden') {
          v.style.setProperty('visibility', 'visible', 'important');
        }
        if (v.tagName === 'VIDEO' && v.paused && !userClickedPause) {
          v.play().catch(() => {});
        }
      } catch (err) {}
    }
  }

  // 8. Stream Player Click & Pause Protection
  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest ? e.target.closest('.sp-root, .sp-chrome, .player, #player, .vjs-play-control, .jw-display-icon-container, video') : null;
    if (!target) return;

    const video = document.querySelector('video');
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
    if (adblockDetectedBySite && !userClickedPause && this.tagName === 'VIDEO') {
      return;
    }
    return origPause.apply(this, arguments);
  };

  // Run immediately and observe DOM changes
  unlockStreamingPlayer();
  const observer = new MutationObserver(unlockStreamingPlayer);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', unlockStreamingPlayer);
  window.addEventListener('load', unlockStreamingPlayer);
})();
