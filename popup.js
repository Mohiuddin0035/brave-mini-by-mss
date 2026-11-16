document.addEventListener('DOMContentLoaded', () => {
  const logoImg = document.getElementById('logoImg');
  const siteCard = document.getElementById('siteCard');
  const siteHost = document.getElementById('siteHost');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const siteSwitch = document.getElementById('siteSwitch');

  const adsTabCount = document.getElementById('adsTabCount');
  const adsTotalCount = document.getElementById('adsTotalCount');
  const redirTabCount = document.getElementById('redirTabCount');
  const redirTotalCount = document.getElementById('redirTotalCount');

  const globalSwitch = document.getElementById('globalSwitch');
  const aggressiveSwitch = document.getElementById('aggressiveSwitch');
  const tabGuardSwitch = document.getElementById('tabGuardSwitch');
  const cleanUrlsSwitch = document.getElementById('cleanUrlsSwitch');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  let activeTab = null;
  let currentHostname = '';

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function renderState(state) {
    globalSwitch.checked = Boolean(state.enabled);
    aggressiveSwitch.checked = Boolean(state.aggressiveMode);
    tabGuardSwitch.checked = Boolean(state.autoCloseRedirectTabs !== false);
    cleanUrlsSwitch.checked = Boolean(state.cleanUrls);

    aggressiveSwitch.disabled = !state.enabled;
    tabGuardSwitch.disabled = !state.enabled;
    cleanUrlsSwitch.disabled = !state.enabled;

    const hasHost = Boolean(state.currentHost);
    currentHostname = state.currentHost || '';

    const effectiveActive = state.enabled && (!hasHost || state.siteEnabled);

    if (hasHost) {
      siteHost.textContent = currentHostname;
      siteSwitch.disabled = !state.enabled;
      siteSwitch.checked = Boolean(state.siteEnabled);
    } else {
      siteHost.textContent = 'Browser Page';
      siteSwitch.disabled = true;
      siteSwitch.checked = state.enabled;
    }

    if (effectiveActive) {
      siteCard.classList.add('active');
      statusDot.classList.add('active');
      statusText.textContent = hasHost ? 'Shields UP on this site' : 'Global Shields Active';
      statusText.style.color = '#d4d4d8';
      logoImg.src = 'icons/icon48.png';
    } else {
      siteCard.classList.remove('active');
      statusDot.classList.remove('active');
      statusText.textContent = !state.enabled
        ? 'Global Shields Paused'
        : 'Shields DOWN on this site';
      statusText.style.color = '#71717a';
      logoImg.src = 'icons/icon48-off.png';
    }

    const tStats = state.tabStats || { ads: 0, redirects: 0 };
    const gStats = state.stats || { adsBlocked: 0, redirectsBlocked: 0 };

    adsTabCount.textContent = formatNumber(tStats.ads);
    redirTabCount.textContent = formatNumber(tStats.redirects);
    adsTotalCount.textContent = formatNumber(gStats.adsBlocked);
    redirTotalCount.textContent = formatNumber(gStats.redirectsBlocked);
  }

  function reloadActiveTabDelayed() {
    if (!activeTab || activeTab.id == null) return;
    if (!activeTab.url || !activeTab.url.startsWith('http')) return;
    setTimeout(() => {
      chrome.tabs.reload(activeTab.id).catch(() => {});
    }, 180);
  }

  function refreshPopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      activeTab = tabs && tabs[0] ? tabs[0] : null;
      const tabId = activeTab ? activeTab.id : -1;
      const url = activeTab ? activeTab.url || '' : '';

      chrome.runtime.sendMessage(
        { type: 'BM_GET_TAB_STATE', tabId, url },
        (resp) => {
          if (chrome.runtime.lastError || !resp) {
            chrome.storage.local.get(
              {
                enabled: true,
                aggressiveMode: true,
                autoCloseRedirectTabs: true,
                cleanUrls: true,
                stats: { adsBlocked: 0, redirectsBlocked: 0 }
              },
              (data) => {
                const s = (data && typeof data === 'object') ? data : {
                  enabled: true,
                  aggressiveMode: true,
                  autoCloseRedirectTabs: true,
                  cleanUrls: true,
                  stats: { adsBlocked: 0, redirectsBlocked: 0 }
                };
                renderState({ ...s, tabStats: { ads: 0, redirects: 0 }, currentHost: '', siteEnabled: true });
              }
            );
            return;
          }
          renderState(resp);
        }
      );
    });
  }

  refreshPopup();

  // Per-site Shields toggle
  siteSwitch.addEventListener('change', () => {
    if (!currentHostname) return;
    chrome.runtime.sendMessage(
      { type: 'BM_TOGGLE_SITE', host: currentHostname },
      () => {
        if (chrome.runtime.lastError) void chrome.runtime.lastError;
        refreshPopup();
        reloadActiveTabDelayed();
      }
    );
  });

  // Global Master Shield toggle
  globalSwitch.addEventListener('change', () => {
    const enabled = globalSwitch.checked;
    chrome.storage.local.set({ enabled }, () => {
      refreshPopup();
      reloadActiveTabDelayed();
    });
  });

  // Aggressive Ad & Redirect toggle
  aggressiveSwitch.addEventListener('change', () => {
    const aggressiveMode = aggressiveSwitch.checked;
    chrome.storage.local.set({ aggressiveMode }, () => {
      refreshPopup();
      reloadActiveTabDelayed();
    });
  });

  // Auto-Close Redirect Tabs (Smart Tab Guard) toggle
  tabGuardSwitch.addEventListener('change', () => {
    const autoCloseRedirectTabs = tabGuardSwitch.checked;
    chrome.storage.local.set({ autoCloseRedirectTabs }, () => {
      refreshPopup();
    });
  });

  // Clean Tracking URLs toggle
  cleanUrlsSwitch.addEventListener('change', () => {
    const cleanUrls = cleanUrlsSwitch.checked;
    chrome.storage.local.set({ cleanUrls }, () => {
      refreshPopup();
    });
  });

  // Live update total stats if blocked while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.stats && changes.stats.newValue) {
      const s = changes.stats.newValue;
      adsTotalCount.textContent = formatNumber(s.adsBlocked);
      redirTotalCount.textContent = formatNumber(s.redirectsBlocked);
    }
  });

  // Reset stats
  resetStatsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'BM_RESET_STATS' }, () => {
      if (chrome.runtime.lastError) void chrome.runtime.lastError;
      refreshPopup();
    });
  });
});
