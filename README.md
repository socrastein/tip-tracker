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
