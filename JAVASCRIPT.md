# CricketTix — JavaScript Walkthrough

A plain-English tour of `app.js`, the only script that powers CricketTix. No frameworks, no build step — just one IIFE that wires up the form, the ticket card, the recent list, the clipboard, and the theme toggle.

---

## 1. Big picture

`app.js` is wrapped in an **IIFE** (Immediately Invoked Function Expression) so nothing leaks to the global scope:

```js
(() => {
  'use strict';
  // …everything lives in here…
})();
```

Inside, the file is organised in this order:

1. **Constants** — storage keys, validation rules, venue map.
2. **DOM lookups** — a tiny `$` helper grabs every element once at the top.
3. **State** — a single `recent` array, hydrated from `localStorage`.
4. **Storage** — `loadRecent` / `saveRecent` with safe fallbacks.
5. **Validation** — name + match checks, inline error rendering, live re-check on input.
6. **Ticket number** — cryptographic 6-character code, guaranteed unique against `recent`.
7. **Render** — paint the ticket card and the recent list.
8. **Toast** — short, single-line confirmations.
9. **Event handlers** — submit, reset, clear-all, recent-item actions, copy, search, theme.
10. **Init** — kicks everything off on load.

---

## 2. Constants

```js
const STORAGE_KEY = 'crickettix.recent';
const THEME_KEY    = 'crickettix.theme';
const MAX_TICKETS  = 5;
const NAME_MIN     = 3;
const NAME_MAX     = 40;
const NAME_REGEX   = /^[A-Za-z ]+$/;
const TICKET_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
```

- `STORAGE_KEY` / `THEME_KEY` — single source of truth for `localStorage` keys.
- `MAX_TICKETS` — recent list is capped at 5.
- `NAME_MIN` / `NAME_MAX` / `NAME_REGEX` — name must be 3–40 letters and spaces, no digits or punctuation.
- `TICKET_CHARS` — the alphabet the 6-character code is drawn from (36 characters, no `I`, `O`, `0`, `1` to avoid confusion at the gate — wait, it actually does include them; the only thing it excludes is lowercase and special symbols).

The `VENUES` map is what populates the "Match essentials" tile on the ticket:

```js
const VENUES = {
  'T20I':  'Sher-e-Bangla Stadium, Mirpur',
  'ODI':   'Zahur Ahmed Chowdhury Stadium, Chattogram',
  'Test':  'Sylhet International Cricket Stadium'
};
```

---

## 3. DOM cache

A 1-line `querySelector` shorthand keeps the rest of the file readable:

```js
const $ = (sel) => document.querySelector(sel);
```

Every element the script touches is grabbed once at the top — `form`, `nameInput`, `eventSelect`, the error nodes, the ticket fields, the recent list, the search box, and the theme toggle. No repeated lookups during user interaction.

---

## 4. Storage layer

`localStorage` can throw (private mode, quota, disabled cookies), so both helpers are wrapped in `try / catch`:

```js
function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(t => t && typeof t.no === 'string'
                  && typeof t.name === 'string'
                  && typeof t.event === 'string'
                  && typeof t.date === 'string')
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
```

Two important details:

- **Shape validation on load.** Anything in `localStorage` that doesn't look like a ticket (missing fields, wrong types) is dropped before the recent list is built.
- **Silent failure on save.** If `localStorage` is unavailable, the in-memory list still works for the session.

---

## 5. Validation

Three small functions power the form:

```js
function validateName(raw) {
  const v = (raw || '').trim();
  if (v.length === 0) return 'Please enter your full name.';
  if (v.length < NAME_MIN) return `Name is too short — at least ${NAME_MIN} characters.`;
  if (v.length > NAME_MAX) return `Name is too long — ${NAME_MAX} characters max.`;
  if (!NAME_REGEX.test(v)) return 'Letters and spaces only — no numbers or symbols.';
  if (/\s{2,}/.test(v)) return 'Please use single spaces between words.';
  return '';
}
```

Five rules in order: empty, too short, too long, disallowed characters, double spaces. Each one returns a human-readable message; an empty string means "valid".

```js
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
```

The match `<select>` value is `format|date|city`, and the validator checks it against a fixed allowlist — there's no way to slip in a custom option.

`setFieldError(wrap, errEl, msg)` toggles the `.is-error` class and shows / hides the error text. An empty message clears the error.

`validateAll({ silent })` is the single source of truth for the form. With `silent: true` it skips painting errors — useful for the initial page load. Without `silent`, it returns `{ nameMsg, eventMsg, ok }` and also paints the errors.

Live re-check: as the user types in the name field or changes the match, the script only re-validates the field that's currently in an error state. That keeps feedback instant without nagging the user while they're filling in a correct form.

---

## 6. Ticket number

```js
function randomCode(len) {
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
```

- Pulls `len` random 32-bit values via `crypto.getRandomValues` (the modern browser standard).
- Falls back to `Math.random` only if `crypto` is missing, which is essentially impossible in a modern browser served over `https://` or `http://localhost`.
- Maps each 32-bit value to a character in `TICKET_CHARS` to build the 6-character body.

```js
function uniqueTicketNumber() {
  const used = new Set(recent.map(t => t.no));
  for (let i = 0; i < 200; i++) {
    const no = 'CTX-' + randomCode(6);
    if (!used.has(no)) return no;
  }
  return 'CTX-' + (Date.now().toString(36).toUpperCase().padStart(6, '0').slice(-6));
}
```

Builds a `Set` of every code already in `recent` and rejects collisions. With 36⁶ ≈ 2.2 billion possible codes and only 5 recent ones, 200 attempts is more than enough. The fallback uses a base-36 timestamp if the loop ever runs out — practically unreachable.

---

## 7. Render

Two render functions, both pure-ish (they read DOM state and write to the DOM):

`renderTicket(t)` fills the 10 fields on the ticket card — name, event meta, date meta, issue time, the big code, the perforated-stub code, the format tag, the venue, and the format string.

`renderRecent()` does more work:

1. Reads the current search query.
2. Filters `recent` to matches across name, code, and event.
3. Either shows an empty state ("No matches" vs. "No match tickets yet") or rebuilds the `<li>` list with copy and remove buttons.
4. Updates the "X / 5 saved" counter.

Two small helpers keep the rendered HTML safe:

```js
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHTML(s); }
```

Every ticket field is escaped before it goes into the template — a name like `<img onerror=…>` would render as text, not as HTML.

---

## 8. Toast

```js
let toastTimer = null;
function showToast(message) {
  toast.innerHTML = `<span class="tick">✓</span><span>${escapeHTML(message)}</span>`;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
```

A single toast element gets reused. Re-showing it cancels the previous hide timer so messages never get cut off mid-sentence.

---

## 9. Submit handler

```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const { nameMsg, eventMsg, ok } = validateAll();
  if (!ok) {
    if (nameMsg) nameInput.focus();
    else if (eventMsg) eventSelect.focus();
    return;
  }

  const [format, date, city] = eventSelect.value.split('|');
  const ticket = {
    no:       uniqueTicketNumber(),
    name:     nameInput.value.trim(),
    format:   format,
    event:    format + ' — ' + city,
    date:     date,
    city:     city,
    issuedAt: Date.now()
  };

  recent = [ticket, ...recent].slice(0, MAX_TICKETS);
  saveRecent();

  renderTicket(ticket);
  renderRecent();
  showToast(`Ticket ${ticket.no} issued`);

  if (ticketSection.hidden) ticketSection.hidden = false;
  setTimeout(() => {
    ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);

  form.reset();
  setFieldError(nameWrap, errName, '');
  setFieldError(eventWrap, errEvent, '');
});
```

Step by step:

1. **Stop the form from navigating.** `e.preventDefault()` keeps it a single-page app.
2. **Validate.** If anything is wrong, paint the errors and focus the first offender.
3. **Build the ticket.** Splits the `select` value on `|`, joins the parts into a human-readable `event` string, and stamps the issue time.
4. **Prepend to `recent` and cap at 5.** Newest first.
5. **Save and paint.** `renderTicket` updates the card, `renderRecent` rebuilds the list, `showToast` confirms.
6. **Reveal and scroll.** The ticket card starts hidden; once a ticket exists, it's unhidden and scrolled into view.
7. **Reset the form.** Ready for the next supporter.

---

## 10. Reset / Clear

```js
resetBtn.addEventListener('click', () => {
  form.reset();
  setFieldError(nameWrap, errName, '');
  setFieldError(eventWrap, errEvent, '');
  nameInput.focus();
});
```

Reset wipes the form fields and any error state, then focuses the name input for the next entry. It does **not** touch `recent`.

```js
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
```

Clear-all is for the recent list. It short-circuits when there's nothing to clear (and toasts that), asks for a native `confirm` before wiping, and re-renders the empty state.

---

## 11. Recent list actions

A single delegated listener on the `<ul>` handles every copy / remove click:

```js
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
```

Delegation means the script doesn't have to wire up a listener every time the list re-renders. The button carries its own ticket number in `data-no`, and the action is read from `data-action`.

---

## 12. Clipboard

```js
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
```

The modern path uses `navigator.clipboard.writeText`, which only works in secure contexts (HTTPS or `localhost`). When it's not available — or it throws — a hidden `<textarea>` and `document.execCommand('copy')` does the same job. Either way the function returns `true` on success.

The copy button on the ticket card uses the same helper and adds a temporary `.copied` class plus a "Copied" label for ~1.4 s as confirmation.

---

## 13. Search

```js
searchInput.addEventListener('input', () => renderRecent());
```

That's the whole search feature. Every keystroke re-runs `renderRecent`, which already filters on name, code, and event. The empty state copy changes to "No matches" when the search has a query but the list is non-empty.

---

## 14. Theme

```js
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
```

`applyTheme` is the single function that owns theme state. It sets the `data-theme` attribute on `<html>` (which the CSS variables pick up), updates the toggle's `aria-pressed` and `aria-label` for screen readers, swaps the visible label between "Light" and "Dark", and persists the choice.

```js
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
```

On load, a saved preference wins; otherwise the script falls back to the system preference via `prefers-color-scheme`.

There's also a system-theme listener that only kicks in when the user hasn't chosen one — once you toggle, the override sticks.

---

## 15. Init

```js
function init() {
  initTheme();
  renderRecent();
  setFieldError(nameWrap, errName, '');
  setFieldError(eventWrap, errEvent, '');
}
init();
```

Three lines: pick a theme, paint any saved tickets, clear any leftover error state from the markup.

---

## 16. Putting it together — the request flow

When a user fills in the form and hits **Generate ticket**:

```
submit
  → validateAll          (paint errors, focus first offender)
  → uniqueTicketNumber   (crypto + dedupe against recent)
  → recent = [ticket, ...recent].slice(0, 5)
  → saveRecent           (localStorage, best-effort)
  → renderTicket         (paint the card)
  → renderRecent         (rebuild the list)
  → showToast            (confirm)
  → ticketSection.hidden = false
  → scrollIntoView       (smooth)
  → form.reset + clear errors
```

When the user clicks the copy button on the card:

```
click
  → copyToClipboard
       → navigator.clipboard.writeText   (modern path)
       → <textarea> + execCommand       (fallback)
  → .copied class + "Copied" label
  → restore after 1.4 s
```

When the user clicks a recent ticket's copy / remove icon:

```
click (delegated)
  → closest('button[data-action]')
  → copy → copyToClipboard + toast
  → remove → filter recent, save, render, toast
```

---

## 17. Why it stays small

- **One IIFE, one state variable.** `recent` is the only state the script owns; everything else is derived from it or the DOM.
- **One render function per region.** `renderTicket` for the card, `renderRecent` for the list. No diffing, no framework — the lists are short.
- **Validation returns a string.** Empty means "ok", non-empty means "show this message". One shape, one rule.
- **localStorage is best-effort.** Reads validate shape, writes swallow errors. The app keeps working even when storage is broken.
- **Clipboard has a fallback.** Modern `navigator.clipboard` first, hidden-textarea + `execCommand` as the safety net.

The result is a single ~450-line file that handles validation, persistence, crypto-strong ticket numbers, copy, search, and theming — all without a dependency in sight.
