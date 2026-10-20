const DEFAULTS = { mode: 'block', cap: 100, spent: {} };

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function render(s) {
  document.querySelector(`input[name="mode"][value="${s.mode}"]`).checked = true;
  document.getElementById('cap').value = s.cap;
  document.getElementById('capRow').style.opacity = s.mode === 'limit' ? 1 : 0.4;
  const spent = Number(s.spent[todayKey()] || 0);
  document.getElementById('spent').textContent = spent.toFixed(2);
  const rem = document.getElementById('remaining');
  if (s.mode === 'limit') {
    const left = Math.max(0, s.cap - spent);
    rem.textContent = left > 0 ? `$${left.toFixed(2)} left today` : 'Limit reached - button hidden until tomorrow';
  } else {
    rem.textContent = 'Button is always hidden';
  }
}

chrome.storage.local.get(DEFAULTS, (s) => {
  render({ ...DEFAULTS, ...s });

  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => chrome.storage.local.set({ mode: r.value }))
  );

  document.getElementById('cap').addEventListener('change', (e) => {
    const cap = Math.max(1, Math.floor(Number(e.target.value) || 1));
    chrome.storage.local.set({ cap });
  });

  document.getElementById('reset').addEventListener('click', () => {
    chrome.storage.local.get({ spent: {} }, ({ spent }) => {
      const next = { ...spent };
      delete next[todayKey()];
      chrome.storage.local.set({ spent: next });
    });
  });
});

chrome.storage.onChanged.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (s) => render({ ...DEFAULTS, ...s }));
});
