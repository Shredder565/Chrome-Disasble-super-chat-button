// Fallback: YouTube changes element names often, so also hide any button
// in the live-chat input bar whose label or tooltip mentions Super Chat.
(function () {
  const RE = /super\s*chat/i;

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
        (el.getAttribute('aria-label') || '') +
        ' ' +
        (el.getAttribute('title') || '') +
        ' ' +
        (el.textContent || '');
      if (RE.test(label)) {
        // Hide the button itself, or its yt-icon-button wrapper if present.
        const target = el.closest('yt-icon-button, #product-picker') || el;
        target.setAttribute('data-no-superchat', '');
      }
    });
  }

  const start = () => {
    sweep(document);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) sweep(n);
        }
        if (m.type === 'attributes') sweep(m.target.parentNode || document);
      }
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
