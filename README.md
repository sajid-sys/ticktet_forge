# CricketTix — BAN vs WI Ticket Generator

A single-page web app that mints match tickets for the Bangladesh vs West Indies series. Pick a match, type a name, and a unique `CTX-XXXXXX` code is ready in seconds. Built with HTML, CSS, and vanilla JavaScript — no libraries, no build step, no backend.

## Features

- One-screen bento layout: hero, stat tiles, form, ticket card, recent tickets.
- Live form validation: name length and characters, match selection, code uniqueness.
- Cryptographic 6-character codes via `crypto.getRandomValues`, formatted as `CTX-XXXXXX`.
- Recent tickets persisted in `localStorage` (capped at 5, key `crickettix.recent`).
- Copy-to-clipboard for any code, individual delete, and bulk clear.
- Light and dark themes with a remembered preference (key `crickettix.theme`).
- Hover and focus polish on tiles, ticket card, brand mark, and inputs.
- Fully client-side — no network calls, no dependencies.

## Intuition

A match ticket only needs three things: a supporter's name, a match, and a code that's unique enough to be checked at the gate. The whole experience should fit on one screen and finish in a few seconds. Once those basics work, the rest is polish — remember the last few tickets on this device, let the user copy a code, and respect their light or dark preference.

## Approach

Three flat files do all the work, plus the team assets:

- `index.html` — the bento layout, hero, stat tiles, form, ticket card, recent-tickets list, and theme toggle.
- `styles.css` — design tokens, light and dark themes, hover and focus polish, and the ticket's perforated-stub look.
- `app.js` — validation, ticket-number generation, `localStorage` read and write, clipboard copy, and theme handling.
- `bd-cric.png`, `west-indies.png` — Bangladesh Cricket Board and Cricket West Indies team crests shown in the hero.
- `cricket-game-svgrepo-com.svg` — the brand mark in the header.

Randomness comes from `crypto.getRandomValues`, formatted as `CTX-XXXXXX`. Saved tickets are capped at 5 in `localStorage` under `crickettix.recent`, and the theme choice is kept under `crickettix.theme`.

## User Guide

How to use it:

1. Open `index.html` in any modern browser.
2. Enter your full name — 3 to 40 characters, letters and spaces only.
3. Pick a match: T20I in Mirpur, ODI in Chattogram, or Test in Sylhet.
4. Click **Generate ticket**. A card with a unique code appears.
5. Use **Copy** on the card, or pick a recent ticket to copy or remove it.
6. Toggle **Dark / Light** in the top-right corner.
7. **Clear all** wipes saved tickets; **Clear** resets the form.

What it should do:

- Issue a unique `CTX-XXXXXX` code for every valid submission.
- Reject invalid input with inline errors and focus the first offender.
- Keep the last five tickets in `localStorage` and restore them on reload.
- Let you copy a code or remove a saved ticket.
- Remember your light or dark choice.
- Run fully on the client — no network calls, no dependencies.
