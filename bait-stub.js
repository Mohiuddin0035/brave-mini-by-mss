// Brave Mini by MS - Safe Anti-Adblock Bait Stub
(function () {
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
  } catch (e) {}
})();

