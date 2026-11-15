// Brave Mini by MS - Background Service Worker

const ICON_ON = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
};

const ICON_OFF = {
  16: 'icons/icon16-off.png',
  32: 'icons/icon32-off.png',
  48: 'icons/icon48-off.png',
  128: 'icons/icon128-off.png'
};

const EXPLICIT_AD_NETWORK_REGEX = /popads\.net|popcash\.net|propellerads\.com|propellerclick\.com|propu\.sh|dolohen\.com|onclkds\.com|monetag\.com|alwingulla\.com|auredirect\.com|adsterra\.com|highperformanceformat\.com|profitablecpmrate\.com|topcreativeformat\.com|effectivegatecpm\.com|highcpmgate\.com|hilltopads\.net|exoclick\.com|exosrv\.com|realsrv\.com|clickadu\.com|adcash\.com|acscdn\.com|ad-maven\.com|admaven\.com|trafficjunky\.net|juicyads\.com|trafficstars\.com|richads\.com|galaksion\.com|rollerads\.com|evadav\.com|clickaine\.com|zeropark\.com|bidvertiser\.com|tsyndicate\.com|magsrv\.com|pemsrv\.com|wpadmngr\.com|onclickalgo\.com|onclickmax\.com|onclickmega\.com|onclickprediction\.com|onclickperformance\.com|toponclick\.com|dexpredict\.com|nextoptim\.com|notifpush\.com|pushame\.com|pushance\.com|twinrdsrv\.com|adskeeper\.|bidgear\.com|adspyglass\.com|popundertotal\.com|popmyads\.com|plugrush\.com|voluumtrk\.com|bemobtrk\.com|redtrack\.io|rtmark\.net|gloyah\.net|pubfuture\.com|pubadx\.one|betterbannerscloud\.com|doublepimp\.com|adclick\.g\.doubleclick\.net|doubleclick\.net\/pcs\/click|googleadservices\.com\/pagead\/aclk|\/afu\.php|\/apu\.php/i;

const SUSPICIOUS_POPUP_TLD_RE = /\.(autos|cfd|icu|rest|monster|cyou|sbs|hair|makeup|quest|boats|yachts|homes|mom|bond|skin|lol)(\/|$|\?)/i;

const SAFE_AUTH_RE = /accounts\.google\.com|github\.com\/login|login\.microsoftonline\.com|appleid\.apple\.com|auth0\.com|facebook\.com\/(v[\d.]+\/)?dialog\/oauth|discord\.com\/oauth2|twitter\.com\/i\/oauth2|x\.com\/i\/oauth2|paypal\.com|checkout\.stripe\.com/i;

const DEFAULT_SETTINGS = {
  enabled: true,
  aggressiveMode: true,
  autoCloseRedirectTabs: true,
  cleanUrls: true,
  disabledSites: [],
  stats: { adsBlocked: 0, redirectsBlocked: 0 }
};

let currentSettings = {
  enabled: true,
  aggressiveMode: true,
  autoCloseRedirectTabs: true,
  cleanUrls: true,
  disabledSites: [],
  stats: { adsBlocked: 0, redirectsBlocked: 0 }
};

let initDone = false;
let initPromise = null;

const tabStats = new Map();               // tabId -> { ads: number, redirects: number }
const recentPopupTabs = new Map();        // tabId -> { openerTabId, openerHost, openerRoot, createdAt, domains: Set, isIntentional: boolean, clickInfo: object }
const recentIntentionalClicks = new Map(); // tabId -> { timestamp, text, href, tagName, hasKeyword }
const lastSafeUrlByTab = new Map();       // tabId -> url

let statsSaveTimer = null;
function scheduleStatsSave() {
  if (statsSaveTimer) return;
  statsSaveTimer = setTimeout(() => {
    statsSaveTimer = null;
    chrome.storage.local.set({ stats: currentSettings.stats }).catch(() => {});
  }, 200);
}

function getHostname(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.hostname.toLowerCase();
  } catch (e) {
    return '';
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

function isSiteDisabled(hostname) {
  if (!hostname) return false;
  return currentSettings.disabledSites.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );
}

function formatBadgeCount(n) {
  if (!n || n <= 0) return '';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

async function updateTabVisuals(tabId, url) {
  if (!tabId || tabId < 0) return;
  const hostname = getHostname(url);
  const active = currentSettings.enabled && !isSiteDisabled(hostname);

  await chrome.action.setIcon({ tabId, path: active ? ICON_ON : ICON_OFF }).catch(() => {});

  if (!active) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#52525b' }).catch(() => {});
    await chrome.action.setBadgeText({ tabId, text: 'OFF' }).catch(() => {});
  } else {
    const counts = tabStats.get(tabId) || { ads: 0, redirects: 0 };
    const total = counts.ads + counts.redirects;
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FB542B' }).catch(() => {});
    await chrome.action.setBadgeText({ tabId, text: formatBadgeCount(total) }).catch(() => {});
  }
}

async function recordBlock(tabId, kind) {
  await ensureInit();
  if (kind === 'redirect') {
    currentSettings.stats.redirectsBlocked = (currentSettings.stats.redirectsBlocked || 0) + 1;
  } else {
    currentSettings.stats.adsBlocked = (currentSettings.stats.adsBlocked || 0) + 1;
  }
  scheduleStatsSave();

  if (typeof tabId === 'number' && tabId >= 0) {
    const cur = tabStats.get(tabId) || { ads: 0, redirects: 0 };
    if (kind === 'redirect') cur.redirects += 1;
    else cur.ads += 1;
    tabStats.set(tabId, cur);

    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab) {
      updateTabVisuals(tabId, tab.url || '');
    }
  }
}

async function updateBypassAndShieldScripts() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts().catch(() => []);
    const existingIds = new Set(existing.map((s) => s.id));

    if (!currentSettings.enabled) {
      if (existing.length > 0) {
        await chrome.scripting.unregisterContentScripts({
          ids: existing.map((s) => s.id)
        }).catch(() => {});
      }
      return;
    }

    const excludeMatches = [];
    for (const rawHost of currentSettings.disabledSites) {
      const host = String(rawHost).replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
      if (host && host.includes('.')) {
        excludeMatches.push(`*://${host}/*`);
        excludeMatches.push(`*://*.${host}/*`);
      }
    }

    const commonOpts = {
      matches: ['<all_urls>'],
      runAt: 'document_start',
      allFrames: true,
      ...(excludeMatches.length ? { excludeMatches } : {})
    };

    const desired = [
      { id: 'bm-bypass-main', js: ['bypass.js'], world: 'MAIN', ...commonOpts },
      { id: 'bm-shields-main', js: ['shields.js'], world: 'MAIN', ...commonOpts },
      { id: 'bm-cosmetic-iso', js: ['cosmetic.js'], world: 'ISOLATED', ...commonOpts }
    ];

    const toUpdate = desired.filter((s) => existingIds.has(s.id));
    const toRegister = desired.filter((s) => !existingIds.has(s.id));

    if (toUpdate.length > 0) {
      await chrome.scripting.updateContentScripts(toUpdate);
    }
    if (toRegister.length > 0) {
      try {
        await chrome.scripting.registerContentScripts(toRegister);
      } catch (regErr) {
        if (String(regErr && regErr.message).includes('Duplicate script ID')) {
          await chrome.scripting.updateContentScripts(toRegister).catch(() => {});
        } else {
          throw regErr;
        }
      }
    }
  } catch (err) {
    console.error('Content script sync error:', err);
  }
}

async function updateNetRequestRules() {
  try {
    const enableRulesetIds = [];
    const disableRulesetIds = [];

    if (currentSettings.enabled) {
      enableRulesetIds.push('ads_and_trackers');
      if (currentSettings.aggressiveMode) enableRulesetIds.push('aggressive_redirects');
      else disableRulesetIds.push('aggressive_redirects');

      if (currentSettings.cleanUrls) enableRulesetIds.push('privacy_params');
      else disableRulesetIds.push('privacy_params');
    } else {
      disableRulesetIds.push('ads_and_trackers', 'aggressive_redirects', 'privacy_params');
    }

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds,
      disableRulesetIds
    });

    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);
    const addRules = [];

    if (currentSettings.enabled) {
      currentSettings.disabledSites.forEach((rawHost, idx) => {
        const host = String(rawHost).replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
        if (host && host.includes('.')) {
          addRules.push({
            id: 10000 + idx,
            priority: 100,
            action: { type: 'allowAllRequests' },
            condition: {
              requestDomains: [host],
              resourceTypes: ['main_frame', 'sub_frame']
            }
          });
        }
      });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (err) {
    console.error('DNR sync error:', err);
  }
}

let syncChain = Promise.resolve();
function syncAll() {
  syncChain = syncChain
    .then(async () => {
      await chrome.action.setIcon({ path: currentSettings.enabled ? ICON_ON : ICON_OFF }).catch(() => {});
      await Promise.all([updateBypassAndShieldScripts(), updateNetRequestRules()]);

      const tabs = await chrome.tabs.query({}).catch(() => []);
      for (const tab of tabs) {
        if (tab.id != null) {
          updateTabVisuals(tab.id, tab.url || '');
        }
      }
    })
    .catch((err) => {
      console.error('SyncAll error:', err);
    });
  return syncChain;
}

function ensureInit() {
  if (initDone) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
      currentSettings = {
        enabled: Boolean(data.enabled),
        aggressiveMode: Boolean(data.aggressiveMode),
        autoCloseRedirectTabs: data.autoCloseRedirectTabs !== false,
        cleanUrls: Boolean(data.cleanUrls),
        disabledSites: Array.isArray(data.disabledSites) ? data.disabledSites : [],
        stats: data.stats && typeof data.stats === 'object'
          ? {
              adsBlocked: Number(data.stats.adsBlocked) || 0,
              redirectsBlocked: Number(data.stats.redirectsBlocked) || 0
            }
          : { adsBlocked: 0, redirectsBlocked: 0 }
      };
      initDone = true;
      resolve();
    });
  });

  return initPromise;
}

ensureInit().then(() => syncAll());

chrome.runtime.onInstalled.addListener(() => {
  ensureInit().then(() => {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (existing) => {
      const missing = {};
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        if (existing[k] === undefined) missing[k] = v;
      }
      if (Object.keys(missing).length > 0) {
        chrome.storage.local.set(missing);
      }
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureInit().then(() => syncAll());
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  let needSync = false;
  if (changes.enabled) {
    currentSettings.enabled = Boolean(changes.enabled.newValue);
    needSync = true;
  }
  if (changes.aggressiveMode) {
    currentSettings.aggressiveMode = Boolean(changes.aggressiveMode.newValue);
    needSync = true;
  }
  if (changes.autoCloseRedirectTabs) {
    currentSettings.autoCloseRedirectTabs = changes.autoCloseRedirectTabs.newValue !== false;
  }
  if (changes.cleanUrls) {
    currentSettings.cleanUrls = Boolean(changes.cleanUrls.newValue);
    needSync = true;
  }
  if (changes.disabledSites) {
    currentSettings.disabledSites = Array.isArray(changes.disabledSites.newValue)
      ? changes.disabledSites.newValue
      : [];
    needSync = true;
  }
  if (needSync) syncAll();
});

// Track DNR matched rules
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if (!info || !info.rule) return;
    if (info.rule.rulesetId === 'privacy_params') return;
    const kind = info.rule.rulesetId === 'aggressive_redirects' ? 'redirect' : 'ad';
    recordBlock(info.request ? info.request.tabId : -1, kind);
  });
}

// Surgical Popup & Ad-Redirect Killer (Kills rogue ad tabs while protecting user-intended clicks)
function killPopupTab(tabId, popupInfo) {
  recentPopupTabs.delete(tabId);
  chrome.tabs.remove(tabId).catch(() => {});
  if (popupInfo && popupInfo.openerTabId != null) {
    chrome.tabs.update(popupInfo.openerTabId, { active: true }).catch(() => {});
    recordBlock(popupInfo.openerTabId, 'redirect');
  } else {
    recordBlock(-1, 'redirect');
  }
}

async function inspectChildTab(tabId, url) {
  await ensureInit();
  // If master shields are OFF or Auto-Close Redirect Tabs is toggled OFF, NEVER close any tab!
  if (!currentSettings.enabled || !currentSettings.autoCloseRedirectTabs) return;
  if (!url || !url.startsWith('http')) return;

  const popupInfo = recentPopupTabs.get(tabId);
  if (!popupInfo || Date.now() - popupInfo.createdAt > 7500) return;

  if (isSiteDisabled(popupInfo.openerHost)) return;
  if (SAFE_AUTH_RE.test(url)) return;

  const host = getHostname(url);
  const root = getRootDomain(host);
  if (root) popupInfo.domains.add(root);

  // 1. If tab was opened from an INTENTIONAL user action (e.g. clicking "Continue to Destination", "Download", etc.):
  if (popupInfo.isIntentional) {
    // Only kill if the URL explicitly targets an unmistakable known ad/popunder network
    if (EXPLICIT_AD_NETWORK_REGEX.test(url)) {
      killPopupTab(tabId, popupInfo);
      return;
    }

    // If it navigates to a valid external destination domain, allow it and release from monitoring
    // so subsequent redirects (e.g. file storage gateways, mirrors, CDNs) are never blocked or killed
    if (host && host !== popupInfo.openerHost && !EXPLICIT_AD_NETWORK_REGEX.test(url)) {
      recentPopupTabs.delete(tabId);
    }
    return;
  }

  // 2. Tab was NOT opened by an intentional button click (e.g. random page click, hidden overlay, or script popunder):
  if (EXPLICIT_AD_NETWORK_REGEX.test(url) || (root !== popupInfo.openerRoot && SUSPICIOUS_POPUP_TLD_RE.test(url))) {
    killPopupTab(tabId, popupInfo);
    return;
  }

  // 3. Multi-hop ad-rotator chains (>= 3 unrelated external domains in < 6s) for non-intentional popups
  if (currentSettings.aggressiveMode) {
    const externalDomains = Array.from(popupInfo.domains).filter((d) => d && d !== popupInfo.openerRoot);
    if (externalDomains.length >= 3) {
      killPopupTab(tabId, popupInfo);
    }
  }
}

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id != null && tab.openerTabId != null) {
    const opener = await chrome.tabs.get(tab.openerTabId).catch(() => null);
    if (!opener) return;
    const openerHost = getHostname(opener.url || '');
    if (!openerHost) return;

    // Check if opener tab had an intentional button or link click recently (< 4.5 seconds)
    const clickInfo = recentIntentionalClicks.get(tab.openerTabId);
    const isIntentional = Boolean(clickInfo && (Date.now() - clickInfo.timestamp < 4500));

    recentPopupTabs.set(tab.id, {
      openerTabId: tab.openerTabId,
      openerHost,
      openerRoot: getRootDomain(openerHost),
      createdAt: Date.now(),
      domains: new Set(),
      isIntentional,
      clickInfo: isIntentional ? clickInfo : null
    });
    setTimeout(() => recentPopupTabs.delete(tab.id), 8000);

    const initialUrl = tab.pendingUrl || tab.url || '';
    if (initialUrl) inspectChildTab(tab.id, initialUrl);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  const url = details.url || '';

  if (recentPopupTabs.has(details.tabId)) {
    inspectChildTab(details.tabId, url);
    return;
  }

  ensureInit().then(() => {
    if (currentSettings.enabled && currentSettings.aggressiveMode && currentSettings.autoCloseRedirectTabs && url.startsWith('http')) {
      const host = getHostname(url);
      if (!isSiteDisabled(host) && EXPLICIT_AD_NETWORK_REGEX.test(url)) {
        const prevSafe = lastSafeUrlByTab.get(details.tabId);
        if (prevSafe && getRootDomain(getHostname(prevSafe)) !== getRootDomain(host)) {
          chrome.tabs.update(details.tabId, { url: prevSafe }).catch(() => {});
          recordBlock(details.tabId, 'redirect');
          return;
        }
      }
      if (host && !EXPLICIT_AD_NETWORK_REGEX.test(url)) {
        lastSafeUrlByTab.set(details.tabId, url);
      }
    }
  });

  tabStats.set(details.tabId, { ads: 0, redirects: 0 });
  updateTabVisuals(details.tabId, url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    inspectChildTab(tabId, changeInfo.url);
    updateTabVisuals(tabId, changeInfo.url);
  } else if (changeInfo.status === 'complete' && tab && tab.url) {
    updateTabVisuals(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
  recentPopupTabs.delete(tabId);
  recentIntentionalClicks.delete(tabId);
  lastSafeUrlByTab.delete(tabId);
});

// Popup & Content Script Messaging
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'BM_INTENTIONAL_CLICK') {
    const openerTabId = sender && sender.tab ? sender.tab.id : -1;
    if (openerTabId >= 0) {
      const info = {
        timestamp: Date.now(),
        ...(msg.info || {})
      };
      recentIntentionalClicks.set(openerTabId, info);
      setTimeout(() => recentIntentionalClicks.delete(openerTabId), 5000);

      // Backfill any child tab that was created moments ago by this opener
      for (const [childId, pInfo] of recentPopupTabs.entries()) {
        if (pInfo.openerTabId === openerTabId && (Date.now() - pInfo.createdAt < 3500)) {
          pInfo.isIntentional = true;
          pInfo.clickInfo = info;
        }
      }
    }
    return;
  }

  if (msg.type === 'BM_BLOCKED') {
    const tabId = sender && sender.tab ? sender.tab.id : -1;
    recordBlock(tabId, msg.kind === 'redirect' ? 'redirect' : 'ad');
    return;
  }

  if (msg.type === 'BM_GET_TAB_STATE') {
    ensureInit().then(() => {
      const tabId = msg.tabId;
      const hostname = getHostname(msg.url || '');
      const counts = tabStats.get(tabId) || { ads: 0, redirects: 0 };
      sendResponse({
        enabled: currentSettings.enabled,
        aggressiveMode: currentSettings.aggressiveMode,
        autoCloseRedirectTabs: currentSettings.autoCloseRedirectTabs,
        cleanUrls: currentSettings.cleanUrls,
        disabledSites: currentSettings.disabledSites,
        stats: currentSettings.stats,
        tabStats: counts,
        currentHost: hostname,
        siteEnabled: hostname ? !isSiteDisabled(hostname) : true
      });
    });
    return true;
  }

  if (msg.type === 'BM_TOGGLE_SITE') {
    ensureInit().then(() => {
      const host = String(msg.host || '').toLowerCase();
      if (!host) {
        sendResponse({ ok: false });
        return;
      }
      const exists = currentSettings.disabledSites.includes(host);
      const nextList = exists
        ? currentSettings.disabledSites.filter((h) => h !== host)
        : [...currentSettings.disabledSites, host];

      currentSettings.disabledSites = nextList;
      chrome.storage.local.set({ disabledSites: nextList }, () => {
        syncAll().then(() => sendResponse({ ok: true, siteEnabled: exists }));
      });
    });
    return true;
  }

  if (msg.type === 'BM_RESET_STATS') {
    ensureInit().then(() => {
      currentSettings.stats = { adsBlocked: 0, redirectsBlocked: 0 };
      tabStats.clear();
      chrome.storage.local.set({ stats: currentSettings.stats }, () => {
        syncAll().then(() => sendResponse({ ok: true }));
      });
    });
    return true;
  }
});
