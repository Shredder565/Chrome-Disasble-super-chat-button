# No Super Chat

A tiny Chrome / Brave extension (Manifest V3) that hides the Super Chat button in YouTube live chat.

## Install

1. Clone or download this repository.
2. Open `chrome://extensions` (or `brave://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Reload any open YouTube tabs.

## How it works

- `hide.css` hides YouTube's Super Chat / product-picker button in the live chat input bar. It also runs inside the live chat iframe.
- `hide.js` watches for any button in the chat input bar whose label mentions "Super Chat" and hides it, as a fallback for when YouTube renames its elements.

Chat messages and the Super Thanks button under regular videos are left alone.
