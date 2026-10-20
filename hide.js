// No Super Chat - content script.
//
// Two modes (set in the popup):
//   block - always hide the Super Chat button.
//   limit - leave the button alone until today's Super Chat purchases reach
//           the daily cap, then hide it until tomorrow.
//
// Purchases are recorded when the user presses the purchase button
// ("Buy and send") in the Super Chat dialog; the amount shown in that dialog
// is added to today's total. The total can be adjusted or reset in the popup.
(function () {
  const DEFAULTS = { mode: 'limit', cap: 100, spent: {}, lockUntil: 0 };
  const LOCK_CAP = 100;
  const SUPERCHAT_RE = /super\s*(chat|sticker)/i;
  const PURCHASE_RE = /\b(buy|purchase|send)\b/i;
  const AMOUNT_RE = /(?:[$€£¥]|USD|EUR|GBP|CAD|AUD)\s?(\d{1,6}(?:[.,]\d{1,2})?)/g;

  let settings = { ...DEFAULTS };

  function todayKey() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function spentToday() {
    return Number(settings.spent[todayKey()] || 0);
  }

  function isLocked() {
    return Number(settings.lockUntil || 0) > Date.now();
  }

  // While locked, the cap is pinned to $100 regardless of stored settings.
  function effectiveCap() {
    const cap = Number(settings.cap || 0);
    return isLocked() ? Math.min(cap, LOCK_CAP) : cap;
  }

  function shouldHide() {
    if (settings.mode === 'block') return true;
    return spentToday() >= effectiveCap();
  }

  function applyState() {
    const root = document.documentElement;
    if (shouldHide()) root.setAttribute('data-nosc-hide', '');
    else root.removeAttribute('data-nosc-hide');
    updateNotice();
  }

  function updateNotice() {
    const bar = document.querySelector('yt-live-chat-message-input-renderer');
    const existing = document.getElementById('nosc-notice');
    const capped = settings.mode === 'limit' && shouldHide();
    if (!bar || !capped) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      const n = document.createElement('div');
      n.id = 'nosc-notice';
      n.textContent = `Super Chat daily limit reached ($${effectiveCap()}). Resets tomorrow.`;
      bar.appendChild(n);
    }
  }

  // ---- hiding fallback: mark any Super Chat-labelled button in the input bar
  function sweep(root) {
    const nodes = root.querySelectorAll
      ? root.querySelectorAll(
          'yt-live-chat-message-input-renderer button, ' +
          'yt-live-chat-message-input-renderer yt-icon-button, ' +
          'yt-live-chat-message-input-renderer [role="button"], ' +
          'yt-live-chat-message-input-renderer tp-yt-paper-tooltip'
        )
      : [];
    nodes.forEach((el) => {
      const label =
        (el.getAttribute('aria-label') || '') + ' ' +
        (el.getAttribute('title') || '') + ' ' +
        (el.textContent || '');
      if (SUPERCHAT_RE.test(label)) {
        const target = el.closest('yt-icon-button, #product-picker') || el;
        target.setAttribute('data-no-superchat', '');
      }
    });
  }

  // ---- purchase tracking (limit mode)
  function parseAmount(container) {
    if (!container) return 0;
    // Prefer an element that looks like the amount display.
    const preferred = container.querySelector(
      '#amount, [id*="amount" i], [class*="amount" i], [id*="price" i], [class*="price" i]'
    );
    const texts = [];
    if (preferred) texts.push(preferred.textContent || '');
    texts.push(container.textContent || '');
    for (const t of texts) {
      const matches = [...t.matchAll(AMOUNT_RE)].map((m) =>
        parseFloat(m[1].replace(',', '.'))
      ).filter((n) => !isNaN(n) && n > 0);
      if (matches.length) {
        // When several figures are visible (min/max labels etc.) the selected
        // amount is usually the first one in the amount display; otherwise take
        // the largest to stay on the safe side of the cap.
        return preferred && t === texts[0] ? matches[0] : Math.max(...matches);
      }
    }
    return 0;
  }

  function onClick(ev) {
    if (settings.mode !== 'limit') return;
    const btn = ev.target.closest && ev.target.closest(
      'button, yt-button-renderer, yt-button-shape, tp-yt-paper-button, [role="button"]'
    );
    if (!btn) return;
    const label =
      (btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '');
    if (!PURCHASE_RE.test(label)) return;

    const dialog = btn.closest(
      'yt-live-chat-paid-message-input-renderer, ' +
      'yt-live-chat-paid-sticker-input-renderer, ' +
      'yt-live-chat-product-picker-renderer, ' +
      'yt-live-chat-purchase-message-input-renderer, ' +
      'ytd-live-chat-paid-message-input-renderer, ' +
      'tp-yt-paper-dialog, ytd-popup-container, [id*="product-picker" i]'
    );
    if (!dialog) return;
    if (!SUPERCHAT_RE.test(dialog.textContent || '') && !/\$|€|£|¥/.test(dialog.textContent || '')) return;

    const amount = parseAmount(dialog);
    if (!amount) return;

    const key = todayKey();
    const spent = { ...settings.spent };
    // Keep only the last few days so storage never grows.
    for (const k of Object.keys(spent)) if (k < key && Object.keys(spent).length > 7) delete spent[k];
    spent[key] = Math.round(((spent[key] || 0) + amount) * 100) / 100;
    chrome.storage.local.set({ spent });
  }

  // ---- wiring
  function start() {
    applyState();
    sweep(document);
    document.addEventListener('click', onClick, true);

    const obs = new MutationObserver((muts) => {
      let changed = false;
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) { sweep(n); changed = true; }
        }
        if (m.type === 'attributes') sweep(m.target.parentNode || document);
      }
      if (changed) updateNotice();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title'],
    });

    // Re-check at midnight so the button comes back without a reload.
    setInterval(applyState, 60 * 1000);
  }

  chrome.storage.local.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
    applyState();
  });
})();
