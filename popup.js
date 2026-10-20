const DEFAULTS = { mode: 'limit', cap: 100, spent: {}, lockUntil: 0 };
const LOCK_DAYS = 100;
const LOCK_CAP = 100;

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isLocked(s) {
  return Number(s.lockUntil || 0) > Date.now();
}

function render(s) {
  const locked = isLocked(s);
  document.body.classList.toggle('locked', locked);

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

  const lockBtn = document.getElementById('lock');
  lockBtn.disabled = locked;
  document.getElementById('lockHelp').style.display = locked ? 'none' : '';
  if (locked) {
    const daysLeft = Math.ceil((s.lockUntil - Date.now()) / 86400000);
    document.getElementById('lockMode').textContent =
      s.mode === 'limit' ? `$${s.cap}/day Super Chat limit` : 'no Super Chats';
    document.getElementById('lockDays').textContent =
      `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining (until ${new Date(s.lockUntil).toLocaleDateString()}).`;
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

  document.getElementById('lock').addEventListener('click', () => {
    chrome.storage.local.get(DEFAULTS, (cur) => {
      if (isLocked(cur)) return;
      const what = cur.mode === 'limit'
        ? `a $${LOCK_CAP} per day Super Chat limit`
        : 'no Super Chats at all';
      const ok = confirm(
        `Lock in ${what} for ${LOCK_DAYS} days?\n\n` +
        `You will not be able to change the mode, change the cap, or reset the daily total until the lock expires.`
      );
      if (!ok) return;
      const lockUntil = Date.now() + LOCK_DAYS * 86400000;
      const update = { lockUntil };
      if (cur.mode === 'limit') update.cap = LOCK_CAP;
      chrome.storage.local.set(update);
    });
  });
});

chrome.storage.onChanged.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (s) => render({ ...DEFAULTS, ...s }));
});
