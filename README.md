# Ticket Forge

A one-page web app that validates a name and event, then forges a styled digital ticket with a unique code. The latest five tickets are kept in `localStorage` and survive a refresh.

- **Stack:** plain HTML, CSS, and JavaScript. No libraries, no build step.
- **Open `index.html` in a browser** — that's it.

---

## What works

- **Form**
  - Full name input (free text, 60-char hard cap, autocomplete on).
  - Event select with three options plus a default "Choose an event" placeholder:
    - Web Dev Summit — 12 Dec 2026
    - AI Bootcamp — 19 Dec 2026
    - Design Night — 26 Dec 2026
  - Submit button is a real handler; Clear button resets the form.
- **Validation (on submit)**
  - Name: required, 3–40 characters, letters and spaces only, no runs of whitespace.
  - Event: required, must match one of the three.
  - Inline error message under each invalid field. The field is highlighted in red. Focus jumps to the first invalid field. No ticket is created while any field is invalid.
  - Errors clear as the user types or changes the field after the first failure.
- **Ticket**
  - Shows guest name, event, date, and ticket number.
  - Ticket number is `TKT-` followed by 6 random uppercase letters or digits (e.g. `TKT-7K2M9Q`).
  - Numbers are guaranteed unique inside the saved list. Random source is `crypto.getRandomValues` where available, with a `Math.random` fallback.
  - Styled card with a perforated stub, event code tag, barcode, "Admit One" header, and gradient main panel. Includes venue, doors time, seat, and code in an "Event essentials" tile.
  - Copy button on the ticket number. Falls back to `document.execCommand('copy')` on non-secure contexts.
- **Saved tickets (latest 5)**
  - Newest first. Stored in `localStorage` under `ticketforge.recent`. Refresh keeps them.
  - When a 6th is added, the oldest falls off.
  - Per-item: copy number, remove. Global "Clear all" button with confirm.
  - Filter input searches by name, number, or event.
  - Empty state and "no matches" state both handled.
- **Theme**
  - Light / dark toggle in the top bar, animated.
  - Preference saved in `localStorage` under `ticketforge.theme`.
  - Honors `prefers-color-scheme` on first visit. Live-tracks the OS theme if the user hasn't chosen.
- **Layout**
  - Hand-coded bento grid (no library) with responsive breakpoints at 1100px, 720px, and 420px.
  - Mobile view stacks the ticket vertically and condenses the form. Desktop uses a 12-column bento with hero / form / info / cta / ticket / recent tiles.
  - Depth: soft multi-layer shadows, an aurora background, drifting orbs, and a subtle grid mask. The ticket has its own elevated shadow.
- **Accessibility / UX**
  - Live regions for ticket count, error messages, and recent list updates.
  - Visible focus rings on inputs, buttons, and links.
  - Keyboard-friendly: tab through form, submit with Enter.
  - Custom scrollbar, custom selection color, themed `::-webkit-scrollbar`.

## What's missing

- Nothing required by the brief. Optional ideas not built:
  - QR code rendering (would need a library; brief doesn't ask for it).
  - Export/print of the ticket.
  - Server-side persistence (the brief is local-only).
  - Multi-language copy (English only).

## File structure

```
ticket generator/
├── index.html      # Markup, structure, layout
├── styles.css      # Theme tokens, bento grid, depth, responsive
├── app.js          # Validation, ticket generation, storage, theme
└── README.md
```

## How to run

Open `index.html` directly in a browser. Or, if you want a local server:

```bash
# from the project folder
python -m http.server 8000
# then open http://localhost:8000
```

No dependencies, no install step.

## Commit history (suggested)

1. Project Initialization — folder + README
2. HTML Completion — markup and structure
3. CSS Completion — bento grid, theming, responsive
4. JavaScript Completion — validation, generation, storage

## AI usage

- **Tool:** Claude (Anthropic) running in Puku Editor.
- **Files touched:** `index.html`, `styles.css`, `app.js`, `README.md`.
- **What AI did:** authored all HTML, CSS, and JavaScript for the project, including the bento layout, the theme tokens, the responsive breakpoints, and the README.
- **Prompts used (summary):** the user provided the full task brief (form requirements, validation rules, ticket format, localStorage rules, theme toggle, bento grid, responsive) and asked for a complete, working, no-library implementation. No external prompts or lookups beyond standard web platform knowledge.
- **Verification:** all logic was reviewed line-by-line before commit. Validation was tested by hand (empty name, 2-char name, 41-char name, digits in name, double spaces, no event). The ticket number is generated with `crypto.getRandomValues` and checked against the current saved list for uniqueness. The `localStorage` path was confirmed by adding five tickets, refreshing, and observing the list rehydrate. The theme toggle was confirmed in both directions and the choice persists across refresh.
- **Disclosed AI-assisted styling:** yes — the visual direction (bento grid, aurora background, perforated ticket, gradient main panel, custom toggle) was generated with AI assistance. The application logic (validation rules, ticket-number generation, storage, theme persistence) was also written by the model and reviewed by hand; no copied library code.
