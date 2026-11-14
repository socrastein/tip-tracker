# tip-tracker
Web app I made for my wife and her co-workers to keep track of their tips at work

(The commit history looks like it all came out of nowhere because I was working with my wife's tip history in a private repository while building the app and didn't want that data publically visible. Once I got her history loaded into localStorage on her phone and confirmed everything was working,I was able to remove the private data and push to this new public repository.)


## Celebration GIFs (optional)

When a big tip is logged, some celebrations can show a random family-safe GIF (a dancing cat, a party dance) fetched from GIPHY. It is off unless you give the app a GIPHY API key; with no key the app makes no GIF requests at all and the celebrations simply run without one.

- **Get a key:** create a free account at https://developers.giphy.com/dashboard/ and click "Create an API Key" (choose the API option, not the SDK). New keys are "beta" keys, limited to 100 calls per hour, which is plenty here: the app makes one search when it opens and one after each celebration that used a GIF. Give the key its own name for this app.
- **Local dev:** put `VITE_GIF_API_KEY=your_key` in a file named `.env.local` in the project folder (`.env*` files are git-ignored), then run `npm run dev`.
- **Production build:** the key is read at build time, so build with it set: `VITE_GIF_API_KEY=your_key npm run build`. Vite writes the key into the built files in `docs/`, which are public. GIPHY's docs say nothing about keeping a key secret and design the Search API to be called from the browser with the key, so this is expected, but treat the key as public: use a key made only for this app, and if it is abused, delete it in the dashboard and make another.
- **GIPHY's rules** (developers.giphy.com/docs/api): "Powered By GIPHY" must be shown wherever a GIF is (the celebration does this), only rating "g" is requested, URLs are used exactly as GIPHY returns them, and nothing from GIPHY is stored: the next GIF is held in memory for one use and never written to storage.
- **Which GIFs:** the search phrases are the list in `src/scripts/GifPhrases.ts`.
- **Preview without a key:** on the dev server, the preview panel's "sample GIF" button swaps in a drawn stand-in image.

## Private celebration pack (optional)

Songs and pictures for the big-tip celebrations are not in this repository. The owner creates, previews and edits them in the tip console, and a celebration reaches the phone only after he publishes it there. The phone asks the home server for its published celebrations (the same hourly check that backs up the tips), downloads what is new or changed (each file's size and SHA-256 are checked against the server's list before it is kept), and removes any that were unpublished or deleted. A celebration is stored whole or not at all, so the phone never plays half of one. Once downloaded they work with no network, and they are kept outside the tip backup. The server's routes, size limits and caps are in the home server's README (`pythonServer`, "Tip Tracker celebration pack"). The menu shows a "Pack: N celebrations, ..." line with the last result. On the dev server, the preview panel's "load sample pack" button loads three made-up celebrations so pack celebrations can be previewed.

### The master switch (celebrations start dark)

Celebrations are a surprise, so a phone starts dark: no celebration on any tip (the five built-ins included), no "Celebration Setup" menu link (and its address goes Home), no "Pack:" status line, no GIF requests, no audio unlocking or decoding. The owner turns them on in the tip console; the home server then says `live: true` in its pack manifest, and the first time the phone reads that it remembers it on the device (so celebrations also work away from home). If the server later says `live: false` the phone goes dark again at that check-in. While dark the pack sync still runs quietly and stores published celebrations (it never decodes them), so they are ready the moment he goes live. The dev server counts as live. The switch is `src/scripts/CelebrationsLive.ts`; every place that could show or play a celebration asks it first (`BigTipCelebrator.ts`, `NavBarMenu.vue`, the `/celebration-setup` route guard, and the start-up wiring in `CelebrationsLifecycle.ts`).

A celebration has an id, a name, an optional sound with a start time and a clip length (at most 15 seconds, the constant `MAX_PACK_CLIP_SECONDS`), and an optional picture. A sound alone gets a random pack picture (or the GIF, or just the falling bills); a picture alone gets a built-in celebration's sound.

### Files the tip console copies

The console previews celebrations with the same code the phone plays them with. These files are copied verbatim into the console (never edited there); change them here first:

- `src/scripts/CelebrationClip.ts` (cut a sound to its clip, play a clip celebration)
- `src/scripts/CelebrationState.ts`, `CelebrationParticles.ts`, `CelebrationSounds.ts`, `CustomCelebrationAudio.ts`, `CelebrationRotation.ts` and `BigTipRule.ts` (what the overlay and the clip player import)
- `src/components/CelebrationOverlay.vue` (it is `position: fixed`; the console puts it inside a frame with `transform: translateZ(0)`, which makes a fixed child fill the frame instead of the window)

## How the Phone Reaches the Home Server

The app is served over HTTPS (GitHub Pages) and the home server speaks plain HTTP on the LAN (`http://192.168.0.2:5000`). A page on HTTPS normally may not call plain HTTP ("mixed content"). Chrome makes an exception for a request to a private IP address written as a literal, and since Chrome 142 asks the user once for the "local network access" permission; after that the phone's backups and the celebration sync go through. The evidence that it works is in the server itself: its journal shows the phone's POSTs (each preceded by an OPTIONS preflight, which the server answers with the Private Network Access headers) and the archive folder holds a long series of backups that only a page loaded from the deployed app could have made.

Safari on iOS has no such exemption: it blocks the request, so on an iPhone the backup and the pack sync would silently fail (the menu's "Last saved" and "Pack" lines would show it). This works because the owner's wife uses Chrome on Android; if that ever changes, the server needs HTTPS with a certificate the phone trusts.
