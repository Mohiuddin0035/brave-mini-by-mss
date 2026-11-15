// Brave Mini by MS - Smart Aggressive Ad, Popunder & Redirect Shield (MAIN world)
(function () {
  'use strict';
  if (window.__braveMiniShieldsLoaded) return;
  window.__braveMiniShieldsLoaded = true;

  const AD_URL_RE = /popads|popcash|propellerads|propellerclick|propu\.sh|dolohen|onclkds|monetag|alwingulla|auredirect|adsterra|highperformanceformat|profitablecpmrate|topcreativeformat|effectivegatecpm|highcpmgate|hilltopads|exoclick|exosrv|realsrv|clickadu|adcash|acscdn|ad-maven|admaven|trafficjunky|juicyads|trafficstars|richads|galaksion|rollerads|evadav|clickaine|zeropark|bidvertiser|tsyndicate|magsrv|pemsrv|wpadmngr|onclickalgo|onclickmax|onclickmega|onclickprediction|onclickperformance|toponclick|dexpredict|nextoptim|notifpush|pushame|pushance|twinrdsrv|adskeeper|bidgear|doubleclick\.net|googlesyndication|googleadservices\.com\/pagead\/aclk|adclick\.g\.|adspyglass|popundertotal|popmyads|plugrush|voluumtrk|bemobtrk|redtrack\.io|rtmark\.net|gloyah\.net|pubfuture|pubadx|betterbannerscloud|doublepimp|taboola\.com|outbrain\.com|mgid\.com|revcontent\.com|criteo\.|adnxs\.com|rubiconproject|pubmatic|openx\.net|casalemedia|smartadserver|adform\.net|hotjar\.com|clarity\.ms|mc\.yandex\.ru|connect\.facebook\.net\/.*fbevents|facebook\.com\/tr\b|google-analytics\.com|googletagmanager\.com|analytics\.tiktok\.com|scorecardresearch|quantserve|sengtoo|s\.click\.aliexpress|aliexpress\.com\/s\/error|alix\.live|\/afu\.php|\/apu\.php/i;

  const SUSPICIOUS_POPUP_TLD_RE = /\.(autos|cfd|icu|rest|monster|cyou|sbs|hair|makeup|quest|boats|yachts|homes|mom|bond|skin|lol)(\/|$|\?)/i;

  const SAFE_AUTH_RE = /accounts\.google\.com|github\.com\/login|login\.microsoftonline\.com|appleid\.apple\.com|auth0\.com|facebook\.com\/(v[\d.]+\/)?dialog\/oauth|discord\.com\/oauth2|twitter\.com\/i\/oauth2|x\.com\/i\/oauth2|paypal\.com|checkout\.stripe\.com/i;

  // Strictly match unmistakable ad-network popunder SDKs (never generic theme handlers)
  const POPUNDER_SDK_RE = /BetterJsPop|exoNoFollow|popMagic|puShown|propellerads|adsterra|popads|monetag/i;

  const TRACKING_PARAMS = new Set([
    'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid',
    'mc_cid', 'mc_eid', 'yclid', 'utm_source', 'utm_medium',
    'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'igshid',
    '_hsenc', '_hsmi', 'mkt_tok', 'vero_id'
  ]);

  function isAggressive() {
    const docEl = document.documentElement;
    return !docEl || docEl.dataset.bmAggressive !== '0';
  }

  function reportBlocked(kind, url) {
    try {
      window.postMessage({
        __bmShieldBlocked: true,
        kind: kind || 'ad',
        url: url ? String(url).slice(0, 140) : ''
      }, '*');
    } catch (e) {}
  }

  function resolveUrl(raw) {
    try {
      return new URL(String(raw), location.href);
    } catch (e) {
      return null;
    }
  }

  function getRootDomain(host) {
    const parts = (host || '').toLowerCase().split('.').filter(Boolean);
    if (parts.length <= 2) return parts.join('.');
    const lastTwo = parts.slice(-2).join('.');
    if (/^(co|com|org|net|edu|gov)\.[a-z]{2}$/.test(lastTwo) && parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
    return lastTwo;
  }

  function isCrossSite(targetUrl) {
    const parsed = resolveUrl(targetUrl);
    if (!parsed) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return getRootDomain(parsed.hostname) !== getRootDomain(location.hostname);
  }

  function isBadUrl(urlStr) {
    if (!urlStr) return false;
    return AD_URL_RE.test(urlStr) || (isCrossSite(urlStr) && SUSPICIOUS_POPUP_TLD_RE.test(urlStr));
  }

  function cleanHrefParams(href) {
    try {
      const u = new URL(href, location.href);
      let changed = false;
      for (const key of Array.from(u.searchParams.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          u.searchParams.delete(key);
          changed = true;
        }
      }
      return changed ? u.toString() : href;
    } catch (e) {
      return href;
    }
  }

  function createFakeWindow() {
    const fakeLoc = {
      _href: 'about:blank',
      get href() { return this._href; },
      set href(v) { this._href = String(v); },
      assign() {},
      replace() {},
      reload() {},
      toString() { return this._href; }
    };
    const fakeDoc = {
      open() { return this; },
      write() {},
      writeln() {},
      close() {},
      createElement() { return document.createElement('div'); },
      body: document.createElement('body')
    };
    return {
      closed: false,
      opener: window,
      location: fakeLoc,
      document: fakeDoc,
      focus() {},
      blur() {},
      close() { this.closed = true; },
      postMessage() {},
      addEventListener() {},
      removeEventListener() {}
    };
  }

  // 1. Defuse Unmistakable Popunder SDK Listeners
  const origAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (
      isAggressive() &&
      typeof listener === 'function' &&
      (this === window || this === document || this === document.documentElement || this === document.body) &&
      /^(click|mousedown|mouseup|pointerdown|pointerup|touchstart|touchend)$/i.test(type)
    ) {
      try {
        const src = Function.prototype.toString.call(listener);
        if (POPUNDER_SDK_RE.test(src)) {
          reportBlocked('redirect', 'popunder-sdk-listener');
          return;
        }
      } catch (e) {}
    }
    return origAddEventListener.apply(this, arguments);
  };

  function lockPopunderGlobal(name, fallbackVal) {
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get() { return fallbackVal; },
        set() { reportBlocked('ad', 'popunder-global-' + name); }
      });
    } catch (e) {}
  }
  lockPopunderGlobal('PopAds', undefined);
  lockPopunderGlobal('BetterJsPop', undefined);
  lockPopunderGlobal('popMagic', undefined);
  lockPopunderGlobal('puShown', true);

  // 2. Smart window.open Popunder Blocker (Allows legitimate user-triggered navigation!)
  const origWindowOpen = window.open;
  window.open = function (url, target, features) {
    const urlStr = url == null ? '' : String(url).trim();

    if (urlStr && SAFE_AUTH_RE.test(urlStr)) {
      return origWindowOpen.apply(window, arguments);
    }

    if (isBadUrl(urlStr)) {
      reportBlocked('redirect', urlStr);
      return createFakeWindow();
    }

    if (isAggressive()) {
      const userActive = navigator.userActivation ? navigator.userActivation.isActive : false;
      if (!userActive) {
        reportBlocked('redirect', urlStr || 'gestureless-popunder');
        return createFakeWindow();
      }
      if (/^javascript:/i.test(urlStr)) {
        reportBlocked('redirect', urlStr);
        return createFakeWindow();
      }
    }

    return origWindowOpen.apply(window, arguments);
  };

  // 3. Block programmatic a.click() ONLY when ad/redirect or no user gesture
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const href = this.href || this.getAttribute('href') || '';
    const isDownloadOrBlob = this.hasAttribute('download') || /^(blob|data):/i.test(href);
    if (!isDownloadOrBlob && href && !SAFE_AUTH_RE.test(href)) {
      if (isBadUrl(href)) {
        reportBlocked('redirect', href);
        return;
      }
      const userActive = navigator.userActivation ? navigator.userActivation.isActive : false;
      if (isAggressive() && isCrossSite(href) && !userActive) {
        reportBlocked('redirect', href);
        return;
      }
    }
    return origAnchorClick.apply(this, arguments);
  };

  // 4. Block <form target="_blank"> submissions ONLY to ad/popunder URLs
  const origFormSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    const action = this.action || '';
    if (isBadUrl(action)) {
      reportBlocked('redirect', action || 'form-popunder');
      return;
    }
    return origFormSubmit.apply(this, arguments);
  };

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    const action = form.action || '';
    if (isBadUrl(action)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      reportBlocked('redirect', action || 'form-submit-popunder');
    }
  }, true);

  // 5. Block Location.prototype.assign / replace redirects to ad URLs
  try {
    const origAssign = Location.prototype.assign;
    Location.prototype.assign = function (url) {
      if (isBadUrl(String(url || ''))) {
        reportBlocked('redirect', url);
        return;
      }
      return origAssign.apply(this, arguments);
    };
    const origReplace = Location.prototype.replace;
    Location.prototype.replace = function (url) {
      if (isBadUrl(String(url || ''))) {
        reportBlocked('redirect', url);
        return;
      }
      return origReplace.apply(this, arguments);
    };
  } catch (e) {}

  // 6. Surgical Full-Screen Empty Body Ad-Trap Remover (NEVER cancels real clicks!)
  function isFullScreenEmptyBodyTrap(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.parentElement !== document.body && el.parentElement !== document.documentElement) return false;
    if (el.tagName !== 'DIV') return false;
    try {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.pointerEvents === 'none' || cs.display === 'none') return false;
      const z = parseInt(cs.zIndex, 10);
      if (isNaN(z) || z < 99999) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.9 || rect.height < window.innerHeight * 0.9) return false;
      const opacity = parseFloat(cs.opacity);
      const bg = cs.backgroundColor || '';
      if (!(opacity <= 0.05 || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) return false;
      if (el.children.length > 0 || (el.innerText || '').trim().length > 0) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function handleCapturePointer(e) {
    if (isAggressive() && isFullScreenEmptyBodyTrap(e.target)) {
      try { e.target.remove(); } catch (err) {}
      reportBlocked('redirect', 'fullscreen-click-trap');
      return; // Do NOT stopImmediatePropagation so underlying controls still work!
    }

    const targetEl = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (targetEl) {
      if (targetEl.hasAttribute('ping')) {
        targetEl.removeAttribute('ping');
      }
      const rawHref = targetEl.getAttribute('href') || '';
      const fullHref = targetEl.href || rawHref;

      if (rawHref && isBadUrl(fullHref)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        reportBlocked('redirect', fullHref);
        return;
      }

      if (isAggressive() && rawHref && !rawHref.startsWith('#') && !rawHref.startsWith('javascript:')) {
        if (!e.isTrusted && isCrossSite(fullHref) && !SAFE_AUTH_RE.test(fullHref)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          reportBlocked('redirect', fullHref);
          return;
        }

        const cleaned = cleanHrefParams(fullHref);
        if (cleaned !== fullHref) {
          targetEl.href = cleaned;
        }
      }
    }
  }

  document.addEventListener('click', handleCapturePointer, true);
  document.addEventListener('auxclick', handleCapturePointer, true);

  // 7. Block Popunder Script Injections
  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (node && node.tagName === 'SCRIPT' && node.src && isBadUrl(node.src)) {
      reportBlocked('ad', node.src);
      setTimeout(() => {
        try {
          if (typeof node.onload === 'function') node.onload(new Event('load'));
          node.dispatchEvent(new Event('load'));
        } catch (e) {}
      }, 4);
      return node;
    }
    return origInsertBefore.call(this, node, ref);
  };

  const origAppend = Element.prototype.appendChild;
  Element.prototype.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && node.src && isBadUrl(node.src)) {
      reportBlocked('ad', node.src);
      setTimeout(() => {
        try {
          if (typeof node.onload === 'function') node.onload(new Event('load'));
          node.dispatchEvent(new Event('load'));
        } catch (e) {}
      }, 4);
      return node;
    }
    return origAppend.call(this, node);
  };

  try {
    const domObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === 'META' && /^refresh$/i.test(node.getAttribute('http-equiv') || '')) {
            const content = node.getAttribute('content') || '';
            const match = content.match(/url\s*=\s*['"]?([^'">\s]+)/i);
            if (match && match[1] && isBadUrl(match[1])) {
              node.remove();
              reportBlocked('redirect', match[1]);
            }
          }
        }
      }
    });
    if (document.documentElement) {
      domObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) {}

  // 8. Block Tracking Beacons (navigator.sendBeacon)
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      if (url && AD_URL_RE.test(String(url))) {
        reportBlocked('ad', url);
        return true;
      }
      return origBeacon(url, data);
    };
  }

  // 9. Anti-History Hijack
  const origPushState = history.pushState;
  let pushWindowStart = 0;
  let pushCount = 0;
  history.pushState = function (state, title, url) {
    const now = Date.now();
    if (now - pushWindowStart > 1500) {
      pushWindowStart = now;
      pushCount = 0;
    }
    pushCount++;
    const isSameOrigin = !url || resolveUrl(url)?.origin === location.origin;
    if (isAggressive() && !isSameOrigin && pushCount > 25) {
      reportBlocked('redirect', 'history-flood');
      return;
    }
    if (url && isBadUrl(String(url))) {
      reportBlocked('redirect', url);
      return;
    }
    return origPushState.apply(this, arguments);
  };

  // 10. Stub Common Analytics & Anti-Adblock Globals safely
  function defineStub(name, value) {
    try {
      if (typeof window[name] === 'undefined') {
        window[name] = value;
      }
    } catch (e) {}
  }

  defineStub('adBlockDetected', false);
  defineStub('hasAdblock', false);
  defineStub('adsBlocked', false);
  defineStub('ga', function () {});
  defineStub('gtag', function () {});
  defineStub('fbq', function () {});
  defineStub('hj', function () {});
  defineStub('clarity', function () {});
  defineStub('dataLayer', []);

  try {
    const noopDetector = {
      onDetected() { return this; },
      onNotDetected(fn) { try { if (typeof fn === 'function') setTimeout(fn, 10); } catch (e) {} return this; },
      on() { return this; },
      check() { return false; },
      setOption() { return this; }
    };
    if (typeof window.blockAdBlock === 'undefined') window.blockAdBlock = noopDetector;
    if (typeof window.fuckAdBlock === 'undefined') window.fuckAdBlock = noopDetector;
    if (typeof window.sniffAdBlock === 'undefined') window.sniffAdBlock = noopDetector;
  } catch (e) {}

  // 11. YouTube Ad Blocker & Auto-Skipper
  if (/(^|\.)youtube\.com$/i.test(location.hostname)) {
    let lastYtSkip = 0;
    setInterval(() => {
      try {
        const player = document.querySelector('#movie_player');
        if (!player) return;

        const skipBtn = document.querySelector(
          '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-overlay-close-button'
        );
        if (skipBtn) {
          skipBtn.click();
          if (Date.now() - lastYtSkip > 1500) {
            lastYtSkip = Date.now();
            reportBlocked('ad', 'youtube-ad-skip');
          }
        }

        if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
          const video = player.querySelector('video');
          if (video) {
            if (!video.muted) video.muted = true;
            if (isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.1) {
              video.currentTime = video.duration;
            } else {
              video.playbackRate = 16;
            }
            if (Date.now() - lastYtSkip > 1500) {
              lastYtSkip = Date.now();
              reportBlocked('ad', 'youtube-video-ad');
            }
          }
        }
      } catch (e) {}
    }, 250);
  }
})();
