# No Super Chat

A tiny Chrome / Brave extension (Manifest V3) that hides the Super Chat button in YouTube live chat, or caps how much you can Super Chat per day.

## Modes

Click the extension icon to choose:

- **Always hide the button** - the Super Chat button is never shown.
- **Daily spending limit** (default) - the button stays until today's Super Chats reach the cap ($100 by default, editable), then it's hidden until the next day. The popup shows today's total.

In limit mode, a purchase is counted when you press "Buy and send" in the Super Chat dialog, using the amount shown there.

### Set for 100 days

The **Set for 100 days** button locks in whichever mode is selected for 100 days: either no Super Chats at all, or a $100-per-day limit. While locked, the mode and cap can't be changed and the daily total can't be reset. There is no way to end the lock early from inside the extension.

Note: an extension can't stop itself from being removed. If you want that too, Chrome and Brave only support it through an enterprise `ExtensionInstallForcelist` policy configured at the operating-system level.

## Install

1. Clone or download this repository.
2. Open `chrome://extensions` (or `brave://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Reload any open YouTube tabs.

## How it works

- `hide.js` reads your settings, decides whether the button should be hidden right now, and sets a `data-nosc-hide` attribute on the page. In limit mode it also watches for purchase clicks in the Super Chat dialog and records the amount. It runs inside the live chat iframe too.
- `hide.css` hides YouTube's Super Chat / product-picker button while that attribute is set, with a label-based fallback for when YouTube renames its elements.
- `popup.html` / `popup.js` are the settings popup.

Chat messages and the Super Thanks button under regular videos are left alone.
