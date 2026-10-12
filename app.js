/* =========================================================
   TICKET FORGE — app.js
   Form validation, ticket generation, localStorage, theme
   ========================================================= */

(() => {
  'use strict';

  // ---------- Constants ----------
  const STORAGE_KEY = 'crickettix.recent';
  const THEME_KEY = 'crickettix.theme';
  const MAX_TICKETS = 5;
  const NAME_MIN = 3;
  const NAME_MAX = 40;
  // Letters and spaces only — no digits, punctuation, accents, emojis
  const NAME_REGEX = /^[A-Za-z ]+$/;
  const TICKET_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // Stadium map for the match essentials tile
  const VENUES = {
    'T20I': 'Sher-e-Bangla Stadium, Mirpur',
    'ODI': 'Zahur Ahmed Chowdhury Stadium, Chattogram',
    'Test': 'Sylhet International Cricket Stadium'
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const form = $('#ticketForm');
  const nameInput = $('#fullName');
  const eventSelect = $('#eventSelect');
  const nameWrap = nameInput.closest('.input-wrap');
  const eventWrap = eventSelect.closest('.input-wrap');
  const errName = $('#err-name');
  const errEvent = $('#err-event');
  const submitBtn = $('#submitBtn');
  const resetBtn = $('#resetBtn');
  const clearAllBtn = $('#clearAllBtn');
  const copyBtn = $('#copyBtn');
  const copyLabel = $('#copyLabel');

  const ticketSection = $('#ticketSection');
  const tName = $('#ticketName');
  const tEventMeta = $('#ticketEventMeta');
  const tDateMeta = $('#ticketDateMeta');
  const tIssued = $('#ticketIssued');
  const tNo = $('#ticketNo');
  const tNoStub = $('#ticketNoStub');
  const tEvent = $('#ticketEvent');
  const tDate = $('#ticketDate');
  const tTag = $('#ticketTag');
  const tVenue = $('#ticketVenue');
  const tFormat = $('#ticketFormat');

  const recentList = $('#recentList');
  const emptyState = $('#emptyState');
  const ticketCount = $('#ticketCount');
  const searchInput = $('#searchInput');

  const themeToggle = $('#themeToggle');
  const toggleLabel = themeToggle.querySelector('.toggle-label');
  const toast = $('#toast');

  // ---------- State ----------
  let recent = loadRecent();

  // ---------- Storage ----------
  function loadRecent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(t => t && typeof t.no === 'string' && typeof t.name === 'string' && typeof t.event === 'string' && typeof t.date === 'string')
        .slice(0, MAX_TICKETS);
    } catch (_) {
      return [];
    }
  }
  function saveRecent() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (_) {
      // Quota or privacy mode — fail silently but keep memory state
    }
  }

  // ---------- Validation ----------
  function validateName(raw) {
    const v = (raw || '').trim();
    if (v.length === 0) return 'Please enter your full name.';
    if (v.length < NAME_MIN) return `Name is too short — at least ${NAME_MIN} characters.`;
    if (v.length > NAME_MAX) return `Name is too long — ${NAME_MAX} characters max.`;
    if (!NAME_REGEX.test(v)) return 'Letters and spaces only — no numbers or symbols.';
    // No excessive whitespace runs
    if (/\s{2,}/.test(v)) return 'Please use single spaces between words.';
    return '';
  }

  function validateEvent(raw) {
    if (!raw) return 'Please pick a match.';
    const allowed = [
      'T20I|14 Dec 2026|Mirpur',
      'ODI|18 Dec 2026|Chattogram',
      'Test|22 Dec 2026|Sylhet'
    ];
    if (!allowed.includes(raw)) return 'That match is not on the list.';
    return '';
  }

  function setFieldError(wrap, errEl, msg) {
    if (msg) {
      wrap.classList.add('is-error');
      errEl.textContent = msg;
      errEl.classList.add('show');
    } else {
      wrap.classList.remove('is-error');
      errEl.textContent = '';
      errEl.classList.remove('show');
    }
  }

  // Live (on-blur) validation gives early feedback; on submit, full check
  function validateAll({ silent = false } = {}) {
    const nameMsg = validateName(nameInput.value);
    const eventMsg = validateEvent(eventSelect.value);
    if (!silent) {
      setFieldError(nameWrap, errName, nameMsg);
      setFieldError(eventWrap, errEvent, eventMsg);
    }
    return { nameMsg, eventMsg, ok: !nameMsg && !eventMsg };
  }

  // Clear a field's error as the user types / changes
  nameInput.addEventListener('input', () => {
    if (nameWrap.classList.contains('is-error')) {
      const msg = validateName(nameInput.value);
      setFieldError(nameWrap, errName, msg);
    }
  });
  eventSelect.addEventListener('change', () => {
    if (eventWrap.classList.contains('is-error')) {
      const msg = validateEvent(eventSelect.value);
      setFieldError(eventWrap, errEvent, msg);
    }
  });

  // ---------- Ticket number ----------
  function randomCode(len) {
    // crypto is available in modern browsers and on https/localhost
    const buf = new Uint32Array(len);
    if (window.crypto && window.crypto.getRandomValues) {
      crypto.getRandomValues(buf);
    } else {
      for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
    }
    let out = '';
    for (let i = 0; i < len; i++) {
      out += TICKET_CHARS[buf[i] % TICKET_CHARS.length];
    }
    return out;
  }

  function uniqueTicketNumber() {
    const used = new Set(recent.map(t => t.no));
    // Reasonable bound to avoid runaway loops
    for (let i = 0; i < 200; i++) {
      const no = 'CTX-' + randomCode(6);
      if (!used.has(no)) return no;
    }
    // Fallback: timestamp-derived tail
    return 'CTX-' + (Date.now().toString(36).toUpperCase().padStart(6, '0').slice(-6));
  }

  // ---------- Render ----------
  function formatTime(ts) {
    const d = new Date(ts);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  function eventTag(format) {
    if (format === 'T20I') return 'T20';
    if (format === 'ODI') return 'ODI';
    if (format === 'Test') return 'TEST';
    return 'GA';
  }

  function renderTicket(t) {
    tName.textContent = t.name;
    tEventMeta.textContent = t.event;
    tDateMeta.textContent = t.date;
    tIssued.textContent = formatTime(t.issuedAt);
    tNo.textContent = t.no;
    tNoStub.textContent = t.no;
    tEvent.textContent = t.event;
    tDate.textContent = t.date;
    tTag.textContent = eventTag(t.format);
    tVenue.textContent = VENUES[t.format] || '—';
    tFormat.textContent = t.format;
  }

  function renderRecent() {
    const q = (searchInput.value || '').trim().toLowerCase();
    recentList.innerHTML = '';
    const items = recent
      .map((t, i) => ({ t, i }))
      .filter(({ t }) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.no.toLowerCase().includes(q) ||
        t.event.toLowerCase().includes(q)
      );

    if (items.length === 0) {
      emptyState.hidden = false;
      if (q && recent.length > 0) {
        emptyState.querySelector('h4').textContent = 'No matches';
        emptyState.querySelector('p').textContent = `Nothing in your recent tickets matches “${q}”.`;
      } else {
        emptyState.querySelector('h4').textContent = 'No match tickets yet';
        emptyState.querySelector('p').textContent = 'Issue your first ticket to see it appear here.';
      }
    } else {
      emptyState.hidden = true;
      for (const { t, i } of items) {
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.style.animationDelay = (i * 40) + 'ms';
        li.innerHTML = `
          <span class="recent-no">${escapeHTML(t.no)}</span>
          <div class="recent-info">
            <div class="recent-name">${escapeHTML(t.name)}</div>
            <div class="recent-meta">
              <span>${escapeHTML(t.event)}</span>
              <span class="sep">•</span>
              <span>${escapeHTML(t.date)}</span>
              <span class="sep">•</span>
              <span>${formatTime(t.issuedAt)}</span>
            </div>
          </div>
          <div class="recent-actions">
            <button class="icon-btn" type="button" data-action="copy" data-no="${escapeAttr(t.no)}" aria-label="Copy ${escapeAttr(t.no)}">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>
              </svg>
            </button>
            <button class="icon-btn danger" type="button" data-action="remove" data-no="${escapeAttr(t.no)}" aria-label="Remove ${escapeAttr(t.no)}">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        `;
        recentList.appendChild(li);
      }
    }
    ticketCount.textContent = `${recent.length} / ${MAX_TICKETS} saved`;
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHTML(s); }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(message) {
    toast.innerHTML = `<span class="tick">✓</span><span>${escapeHTML(message)}</span>`;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ---------- Submit ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { nameMsg, eventMsg, ok } = validateAll();
    if (!ok) {
      // Focus the first invalid field
      if (nameMsg) nameInput.focus();
      else if (eventMsg) eventSelect.focus();
      return;
    }

    const [format, date, city] = eventSelect.value.split('|');
    const ticket = {
      no: uniqueTicketNumber(),
      name: nameInput.value.trim(),
      format: format,
      event: format + ' — ' + city,
      date: date,
      city: city,
      issuedAt: Date.now()
    };

    // Newest first; cap at MAX_TICKETS
    recent = [ticket, ...recent].slice(0, MAX_TICKETS);
    saveRecent();

    renderTicket(ticket);
    renderRecent();
    showToast(`Ticket ${ticket.no} issued`);

    // Reveal ticket section if hidden
    if (ticketSection.hidden) {
      ticketSection.hidden = false;
    }
    // Smooth scroll into view
    setTimeout(() => {
      ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    // Clear form for the next entry
    form.reset();
    setFieldError(nameWrap, errName, '');
    setFieldError(eventWrap, errEvent, '');
  });

  // ---------- Reset / Clear ----------
  resetBtn.addEventListener('click', () => {
    form.reset();
    setFieldError(nameWrap, errName, '');
    setFieldError(eventWrap, errEvent, '');
    nameInput.focus();
  });

  clearAllBtn.addEventListener('click', () => {
    if (recent.length === 0) {
      showToast('Nothing to clear');
      return;
    }
    if (!confirm('Remove all saved tickets? This cannot be undone.')) return;
    recent = [];
    saveRecent();
    renderRecent();
    showToast('Saved tickets cleared');
  });

  // ---------- Recent actions ----------
  recentList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const no = btn.getAttribute('data-no');
    if (btn.dataset.action === 'copy') {
      await copyToClipboard(no);
      showToast(`Copied ${no}`);
    } else if (btn.dataset.action === 'remove') {
      recent = recent.filter(t => t.no !== no);
      saveRecent();
      renderRecent();
      showToast(`Removed ${no}`);
    }
  });

  // ---------- Copy ----------
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    return ok;
  }

  copyBtn.addEventListener('click', async () => {
    const no = tNo.textContent;
    if (!no || no === 'CTX-——') return;
    const ok = await copyToClipboard(no);
    if (ok) {
      copyBtn.classList.add('copied');
      copyLabel.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyLabel.textContent = 'Copy';
      }, 1400);
    }
  });

  // ---------- Search ----------
  searchInput.addEventListener('input', () => renderRecent());

  // ---------- Theme ----------
  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    const pressed = next === 'light';
    themeToggle.setAttribute('aria-pressed', String(pressed));
    themeToggle.setAttribute('aria-label', pressed ? 'Switch to dark mode' : 'Switch to light mode');
    toggleLabel.textContent = pressed
      ? toggleLabel.dataset.labelLight
      : toggleLabel.dataset.labelDark;
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  }

  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  // Keep toggle in sync with system theme if user hasn't set a preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      let saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
      if (saved === 'light' || saved === 'dark') return; // user override
      applyTheme(e.matches ? 'light' : 'dark');
    });
  }

  // ---------- Init ----------
  function init() {
    initTheme();
    renderRecent();
    // Make sure the form is in a clean state on load
    setFieldError(nameWrap, errName, '');
    setFieldError(eventWrap, errEvent, '');
  }
  init();
})();
