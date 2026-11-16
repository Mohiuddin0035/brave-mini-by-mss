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
        cmd: { push: function (fn) { try { if (typeof fn === 'function') fn(); } catch (e) {} } },
        apiReady: true,
        pubadsReady: true,
        pubads: () => noopPubads,
        defineSlot: () => ({ addService: () => ({ setTargeting: () => ({}) }) }),
        display: noopFn,
        enableServices: noopFn
      };
    }
  } catch (e) {}

  // Lock ad blocker status variables so detector scripts cannot mark them blocked
  function lockAdProp(prop, val) {
    try {
      Object.defineProperty(window, prop, {
        get: () => val,
        set: () => {},
        configurable: true
      });
    } catch (e) {
      window[prop] = val;
    }
  }

  lockAdProp('canRunAds', true);
  lockAdProp('isAdBlockActive', false);
  lockAdProp('adBlockDetected', false);
  lockAdProp('hasAdblock', false);
  lockAdProp('adsBlocked', false);
  lockAdProp('adblock', false);
  lockAdProp('abp', false);
  lockAdProp('uAdBlock', false);
  lockAdProp('google_ad_status', 1);
  lockAdProp('adblocker', false);
  lockAdProp('isAdblock', false);
  lockAdProp('adblockerDetected', false);
  lockAdProp('hasAdBlocker', false);
  lockAdProp('adblock_enabled', false);
  lockAdProp('adBlockerOn', false);
  lockAdProp('adBlocked', false);
  lockAdProp('ad_blocker', false);

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

  // 3. Intercept Bait Fetch Requests (Safe & Targeted)
  // Strictly matches known anti-adblock test scripts, NEVER media or streaming chunks
  const BAIT_URL_REGEX = /(^|\/)(adsbygoogle\.js|show_ads\.js|gpt\.js|ad_status|sodar|pagead|doubleclick|googlesyndication|googleadservices)(\.|\/|$|\?)|(\/(?:ads?|advert)\.(?:js|json))($|\?)/i;
  const MEDIA_EXT_REGEX = /\.(m3u8|ts|m4s|mp4|webm|key|vtt|srt)($|\?)/i;

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const rawUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    const url = String(rawUrl);

    if (url && !MEDIA_EXT_REGEX.test(url) && BAIT_URL_REGEX.test(url)) {
      if (url.includes('generate_204')) {
        return new Response(null, { status: 204 });
      }

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
    if (this.__bmUrl && !MEDIA_EXT_REGEX.test(this.__bmUrl) && BAIT_URL_REGEX.test(this.__bmUrl)) {
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
          if (typeof this.onreadystatechange === 'function') {
            try { this.onreadystatechange(new Event('readystatechange')); } catch (e) {}
          }
          this.dispatchEvent(new Event('readystatechange'));
          if (typeof this.onload === 'function') {
            try { this.onload(new Event('load')); } catch (e) {}
          }
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        } catch (e) {}
      }, 5);
      return;
    }
    return origXhrSend.apply(this, arguments);
  };

  // 5. Defeat DOM Bait Element Detection
  // When detector scripts create collapsed bait containers to test if adblock hides them,
  // we spoof dimensions AND getComputedStyle so the check passes 100%!
  const BAIT_ELEMENT_REGEX = /\b(ads?|adsbox|afs_ads|ad-banner|banner-ad|advert|advertisement|pub_300|pub_728|text-ad|ad-unit|ad_unit|ad-zone|adzone|ad-slot|adslot|adsbygoogle|ad-placement|ad-holder|ad-wrapper|ad-shield|ad_status|adblock-detector|adblock-test)\b/i;

  function isAdBaitElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'IFRAME' || tag === 'CANVAS' || tag === 'SVG' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TRACK' || tag === 'SOURCE') {
      return false;
    }
    // Never touch elements containing real media
    if (el.querySelector('video, audio, iframe')) return false;
    // Never touch player control bars, player layers, or state icons
    if (el.closest && el.closest('.artplayer-app, .art-video-player, [class*="player"], .jw-controls, .vjs-control-bar, .plyr__controls, .art-controls, .art-state, .art-icon-state, .art-state-play, [class*="controls-bar"], [class*="control-bar"]')) {
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

  // Spoof getComputedStyle so style.display === 'none' checks PASS on bait elements
  const origGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = origGetComputedStyle.apply(this, arguments);
    if (elt && isAdBaitElement(elt)) {
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'display') return 'block';
          if (prop === 'visibility') return 'visible';
          if (prop === 'opacity') return '1';
          if (prop === 'height') return '100px';
          if (prop === 'width') return '300px';
          if (prop === 'getPropertyValue') {
            return function (p) {
              if (p === 'display') return 'block';
              if (p === 'visibility') return 'visible';
              if (p === 'opacity') return '1';
              if (p === 'height') return '100px';
              if (p === 'width') return '300px';
              return target.getPropertyValue(p);
            };
          }
          const val = target[prop];
          return typeof val === 'function' ? val.bind(target) : val;
        }
      });
    }
    return style;
  };

  // 6. Surgical AdBlock Warning Dialog Neutralizer (Fallback)
  // If a warning modal appears, remove ONLY that specific modal dialog card
  // Never hides player elements or touches video controls!
  const ADBLOCK_OVERLAY_TEXT_REGEX = /ad\s*blocker\s*detected|disable\s*your\s*ad\s*blocker|please\s*disable\s*ad\s*blocker|turn\s*off\s*your\s*ad\s*blocker|adblock\s*detected|blocker\s*detected/i;

  let overlayCleanupTimer = null;
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
        // If there is a "Recheck" or "I've disabled it" button, click it first!
        const recheckBtn = el.querySelector('button, a, .btn, [role="button"]');
        if (recheckBtn && /recheck|disabled|continue|i've disabled/i.test(recheckBtn.innerText || '')) {
          try { recheckBtn.click(); } catch (err) {}
        }

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
  }

  function scheduleOverlayCleanup() {
    if (overlayCleanupTimer) return;
    overlayCleanupTimer = setTimeout(() => {
      overlayCleanupTimer = null;
      removeAdBlockOverlay();
    }, 250);
  }

  removeAdBlockOverlay();
  const observer = new MutationObserver(scheduleOverlayCleanup);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', removeAdBlockOverlay);
  window.addEventListener('load', removeAdBlockOverlay);

  // 7. Universal Stream Player Playback Engine
  // Guarantees reliable play/pause interaction on Artplayer, Video.js, JW Player, and embed streams
  let userIntendedPause = false;
  let lastUserPlayTime = 0;

  // Protect against rogue ad-scripts calling video.pause() immediately after user clicks play
  const origVideoPause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function () {
    if (!userIntendedPause && (Date.now() - lastUserPlayTime < 3000)) {
      return;
    }
    return origVideoPause.apply(this, arguments);
  };

  const PLAY_TRIGGER_SELECTOR = [
    '.art-state',
    '.art-icon-state',
    '.art-mask',
    '.art-video',
    '.art-control-playAndPause',
    '.vjs-big-play-button',
    '.vjs-play-control',
    '.vjs-tech',
    '.jw-display-icon-container',
    '.jw-icon-playback',
    '.jw-video',
    '.plyr__control--overlaid',
    'button[data-plyr="play"]',
    '.sp-root',
    '.sp-chrome',
    '[class*="play-button"]',
    '[class*="play-btn"]',
    '[class*="play_btn"]',
    '[class*="player-play"]',
    '[class*="art-state"]',
    '[aria-label*="Play" i]',
    '[title*="Play" i]'
  ].join(', ');

  document.addEventListener('click', (e) => {
    const isVideo = e.target.tagName === 'VIDEO';
    const trigger = e.target.closest ? e.target.closest(PLAY_TRIGGER_SELECTOR) : null;
    const playerContainer = e.target.closest
      ? e.target.closest('.artplayer-app, .art-video-player, .player-container, #player, [class*="player"], .jwplayer, .video-js, .sp-root')
      : null;

    if (!isVideo && !trigger && !playerContainer) return;

    // Do not interfere with seek bar, volume, settings, or subtitles widgets
    const isControlWidget = e.target.closest && e.target.closest(
      '.art-control-progress, .art-control-volume, .art-control-setting, .art-control-subtitle, .art-control-fullscreen, .vjs-progress-control, .vjs-volume-panel, .jw-slider, input, select'
    );
    if (isControlWidget) return;

    // Find the associated video element
    const video = isVideo
      ? e.target
      : (playerContainer ? playerContainer.querySelector('video') : document.querySelector('video'));

    if (!video) return;

    // Check if the user deliberately clicked a pause control button
    const isPauseBtn = e.target.closest && e.target.closest(
      '.art-icon-pause, [aria-label*="Pause" i], [title*="Pause" i], .vjs-playing .vjs-play-control'
    );

    if (isPauseBtn) {
      userIntendedPause = true;
      video.pause();
      const stateIcon = (playerContainer || document).querySelector('.art-state, .vjs-big-play-button, .jw-display-icon-container');
      if (stateIcon) {
        stateIcon.style.removeProperty('display');
      }
      return;
    }

    // If the video is paused, trigger play!
    if (video.paused) {
      userIntendedPause = false;
      lastUserPlayTime = Date.now();

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // If browser autoplay policy blocked with audio, retry unmuted
          video.muted = false;
          video.play().catch(() => {});
        });
      }

      // Hide the big center play icon immediately for instant visual feedback
      const stateIcon = (playerContainer || document).querySelector('.art-state, .vjs-big-play-button, .jw-display-icon-container');
      if (stateIcon) {
        stateIcon.style.display = 'none';
      }
    } else if (isVideo || (trigger && trigger.classList.contains('art-mask'))) {
      // Direct click on playing video toggles pause
      userIntendedPause = true;
      video.pause();
      const stateIcon = (playerContainer || document).querySelector('.art-state, .vjs-big-play-button, .jw-display-icon-container');
      if (stateIcon) {
        stateIcon.style.removeProperty('display');
      }
    }
  }, true);
})();
