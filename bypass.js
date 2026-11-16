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

  // 6. Defeat Bait Element Offset / Client Dimensions Checks
  // Returns positive dimensions ONLY for collapsed bait ad elements
  // NEVER touches real video elements, iframe, or controls!
  const BAIT_ELEMENT_REGEX = /\b(pub_300|pub_728|text-ad|ad-unit|ad-zone|ad-slot|adsbygoogle|ad-placement)\b/i;

  function isAdBaitElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO' || el.tagName === 'IFRAME') return false;
    if (el.closest && el.closest('.jw-controls, .vjs-control-bar, .plyr__controls, [class*="control"], [class*="player"]')) {
      return false;
    }
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

  // 7. Surgical AdBlock Warning Dialog Remover & Video Controls Protector
  // Eliminates ONLY the cancer cell (the specific warning modal card)
  // NEVER hides parent containers, NEVER touches player controls!
  const ADBLOCK_OVERLAY_TEXT_REGEX = /ad\s*blocker\s*detected|disable\s*your\s*ad\s*blocker|please\s*disable\s*ad\s*blocker|turn\s*off\s*your\s*ad\s*blocker|adblock\s*detected|blocker\s*detected/i;

  function removeAdBlockOverlay() {
    // 1. Remove StreamTape overlay if present
    const stOverlay = document.querySelector('.sp-adblock-overlay');
    if (stOverlay) {
      try { stOverlay.remove(); } catch (e) {}
    }

    // 2. Surgical removal of AdBlock dialogs
    const candidates = document.querySelectorAll(
      'div, section, aside, [role="dialog"], [role="alertdialog"], .modal, .overlay, .backdrop'
    );

    for (const el of candidates) {
      if (!el || !el.innerText) continue;
      // Do NOT touch anything containing media!
      if (el.querySelector('video, audio, iframe')) continue;

      if (ADBLOCK_OVERLAY_TEXT_REGEX.test(el.innerText)) {
        let targetModal = el;
        const dialogAncestor = el.closest(
          '[role="dialog"], [role="alertdialog"], .modal, .overlay, .backdrop, [class*="adblock"], [id*="adblock"]'
        );
        if (
          dialogAncestor &&
          !dialogAncestor.querySelector('video, audio, iframe') &&
          dialogAncestor !== document.body &&
          dialogAncestor !== document.documentElement
        ) {
          targetModal = dialogAncestor;
        }

        // Try clicking recheck / reload button if present
        const recheckBtn = targetModal.querySelector('button, a, .btn, [role="button"]');
        if (recheckBtn && /recheck|disabled|continue|i've disabled/i.test(recheckBtn.innerText || '')) {
          try { recheckBtn.click(); } catch (err) {}
        }

        // Surgically remove or hide ONLY this specific dialog card
        try {
          targetModal.remove();
        } catch (err) {
          targetModal.style.setProperty('display', 'none', 'important');
          targetModal.style.setProperty('visibility', 'hidden', 'important');
          targetModal.style.setProperty('pointer-events', 'none', 'important');
          targetModal.style.setProperty('opacity', '0', 'important');
        }

        if (document.body) {
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('position');
        }
        if (document.documentElement) {
          document.documentElement.style.removeProperty('overflow');
        }
      }
    }

    // 3. Ensure all Video Player Controls are visible and interactive
    const controls = document.querySelectorAll(
      '.jw-controls, .vjs-control-bar, .plyr__controls, [class*="control-bar"], [class*="controls-bar"], [class*="player-controls"], .cf-controls-panel, .controls'
    );
    for (const ctrl of controls) {
      if (ctrl.style.display === 'none') {
        ctrl.style.removeProperty('display');
      }
      if (ctrl.style.visibility === 'hidden') {
        ctrl.style.removeProperty('visibility');
      }
      if (ctrl.style.pointerEvents === 'none') {
        ctrl.style.removeProperty('pointer-events');
      }
      if (ctrl.style.opacity === '0') {
        ctrl.style.removeProperty('opacity');
      }
    }
  }

  // Run immediately and observe DOM changes
  removeAdBlockOverlay();
  const observer = new MutationObserver(removeAdBlockOverlay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', removeAdBlockOverlay);
  window.addEventListener('load', removeAdBlockOverlay);
})();
