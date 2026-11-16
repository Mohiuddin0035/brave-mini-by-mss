// Brave Mini by MS - Safe Anti-Adblock Bait Stub
(function () {
  'use strict';
  try {
    if (!window.adsbygoogle || !window.adsbygoogle.loaded) {
      window.adsbygoogle = { loaded: true, push: function () {} };
    }
    if (!window.googletag) {
      var noopSlot = {
        addService: function () { return noopSlot; },
        setTargeting: function () { return noopSlot; },
        defineSizeMapping: function () { return noopSlot; },
        setCollapseEmptyDiv: function () { return noopSlot; }
      };
      var noopPubads = {
        addEventListener: function () {},
        removeEventListener: function () {},
        enableSingleRequest: function () {},
        collapseEmptyDivs: function () {},
        setTargeting: function () { return noopPubads; },
        refresh: function () {},
        getSlots: function () { return []; }
      };
      window.googletag = {
        cmd: { push: function (fn) { try { if (typeof fn === 'function') fn(); } catch (e) {} } },
        apiReady: true,
        pubadsReady: true,
        pubads: function () { return noopPubads; },
        defineSlot: function () { return noopSlot; },
        defineOutOfPageSlot: function () { return noopSlot; },
        enableServices: function () {},
        display: function () {}
      };
    }

    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.adBlockDetected = false;
    window.adsBlocked = false;
    window.hasAdblock = false;
    window.adblock = false;
    window.uAdBlock = false;
    window.abp = false;
    window.google_ad_status = 1;

    var noopDetector = {
      onDetected: function () { return this; },
      onNotDetected: function (fn) { if (typeof fn === 'function') setTimeout(fn, 10); return this; },
      on: function (d, fn) { if (!d && typeof fn === 'function') setTimeout(fn, 10); return this; },
      check: function () { return false; },
      setOption: function () { return this; },
      clearEvent: function () { return this; }
    };
    if (typeof window.blockAdBlock === 'undefined') window.blockAdBlock = noopDetector;
    if (typeof window.fuckAdBlock === 'undefined') window.fuckAdBlock = noopDetector;
    if (typeof window.sniffAdBlock === 'undefined') window.sniffAdBlock = noopDetector;
    if (typeof window.BlockAdBlock === 'undefined') window.BlockAdBlock = function () { return noopDetector; };
    if (typeof window.FuckAdBlock === 'undefined') window.FuckAdBlock = function () { return noopDetector; };
  } catch (e) {}
})();
