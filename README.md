# CricketTix — BAN vs WI Ticket Generator

## Intuition
<!-- Describe your first thoughts on how to solve this problem. -->
One page, no backend. Pick a match, enter a name, get a unique ticket code. Keep the last 5 on this device.

## Approach
<!-- Describe your approach to solving the problem. -->
Plain HTML + CSS + JavaScript in three flat files. No libraries, no build step.

Core features and how they work:

- **Form** — Name input + match dropdown. Submit checks both fields; errors show inline and the first invalid field gets focus.
- **Ticket code** — `crypto.getRandomValues` builds a 6-character alphanumeric string, formatted as `CTX-XXXXXX`.
- **Recent tickets** — Saved in `localStorage` under `crickettix.recent` (max 5, oldest dropped). Reload restores them.
- **Per-ticket actions** — Copy the code to clipboard; remove a single ticket.
- **Theme toggle** — Flips `data-theme` on `<html>`. Choice saved to `localStorage` as `crickettix.theme`.
- **Toasts** — Quick confirmation for issued / copied / cleared actions.

## User Guide:
- how to use it
  1. Open `index.html` in a browser.
  2. Type your name (3–40 characters, letters and spaces only).
  3. Pick a match: T20I — Mirpur, ODI — Chattogram, or Test — Sylhet.
  4. Click **Generate ticket**. A card with a unique code appears.
  5. Use **Copy** on the card, or pick a recent ticket to copy or remove it.
  6. Toggle **Dark / Light** in the top-right.
  7. **Clear all** wipes saved tickets; **Clear** resets the form.
- what it should do
  - Issue a unique `CTX-XXXXXX` ticket code on every valid submit.
  - Block invalid input with inline errors.
  - Keep the last 5 tickets in `localStorage` and restore them on reload.
  - Let you copy a code or remove a saved ticket.
  - Remember your light/dark choice.
  - Run fully client-side — no backend, no libraries.
