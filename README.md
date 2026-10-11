<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/912b46d1-7535-49b0-9ed4-c0769a3b8fba

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. The bundled catalog already includes new Gujarati, Hindi, and English songs. Follow the import instructions below to refresh or expand it. Visitors do not need an API key.
4. Run the app:
   `npm run dev`

## Site song catalog

### Your library

Choose **Library** in the top navigation, immediately before the profile controls, or use **Library** in the mobile navigation. The responsive library page collects playlists, liked songs, downloads, artists, and albums, with search and playback controls. Create playlists, import audio, scan downloads, and organize your music from this page. The sidebar contains the main app sections.

AI Mood and AI Lyrics currently open responsive **Coming soon** pages. Their original components are preserved, with the active app imports and wiring commented out while unavailable. Existing saved mood filters and normal song lyrics still work.

### FreqBlog music discovery

Open **Song Catalog** in the sidebar or **Explore** on mobile to search the live FreqBlog catalog, browse genres, list an artist's songs, or view country charts. Browse and artist lists support pagination. Searches run on submission, and the page shows the key's plan and remaining monthly requests.

Configure `FREQBLOG_API_KEY` in the ignored `.env.local` file for local development, or as a server environment variable on your hosting provider. Requests pass through `/api/freqblog/*`; the key and private account details stay on the server. Restart `npm run dev` after changing the server key.

FreqBlog returns song information, not recordings. Results matching a playable song already in Sawan have **Play in Sawan**; other results have **Find on YouTube**. Browsing keeps existing playback running, and provider metadata is held only for the current page. The free tier has a 1,000-request monthly quota; full-catalog downloads require the provider's Enterprise export license. See the [API documentation](https://api.freqblog.com/docs), [service description](https://freqblog.com/about.html), and [terms](https://freqblog.com/terms.html).

Visitors search the songs already included in Sawan using the main search bar. YouTube-backed tracks play their original audio through a playback controller with no visible video panel or popup. Use the bottom music bar for play, pause, seeking, volume, and track changes. Saving a song stores a reference and metadata, not audio or video files.

The existing sample library is retained alongside 79 additional official YouTube recordings: 28 Gujarati, 24 Hindi, 15 English, and 12 South Indian songs (3 each in Tamil, Telugu, Malayalam, and Kannada). Search `Bollywood`, `Hollywood`, or `South` in your library to find these groups, or search a language, title, artist, or album. The imported catalog is in `src/data/youtubeCatalog.json`.

### Garba and dandiya

Open **Garba & Dandiya** in the sidebar, or **Garba** on mobile. The collection has 32 verified recordings and nonstop sets: 22 Gujarati and 10 Hindi. Filter by language or by Garba, Dandiya, Titoda, Dodhiya, and Mandli. These style categories overlap; a Titoda recording can also be listed under Dandiya. Search supports aliases such as `titodo`, `dodhiyu`, and `mandali`, plus Gujarati style names.

The collection includes original artist/label uploads, traditional raas albums, nonstop garba sets, and Bollywood festival songs. Dodhiya tags identify recordings used by credited choreographers for that dance pattern; the source manifest retains the choreography references. Playback uses the original recording and the app's music controls.

### Refresh the selected official songs

Run `npm run catalog:import` to refresh the verified links in `catalog.sources.json`. This does not need an API key. The importer reads public YouTube metadata, checks the expected official channel, and confirms music-video availability, embed permission, and availability in India. It saves titles, language tags, artwork, publication dates, and durations. Any failure preserves the previous catalog.

To add selected songs, put their verified video ID, title, artist, official channel name, and language in `catalog.sources.json`, then run the importer. Optional `market` values are `bollywood`, `hollywood` (English-language music), and `south`. The default YouTube category is `Music`; verified official songs filed under `Entertainment` must explicitly declare `youtubeCategory: "Entertainment"`. Refresh the browser for local development, or build and deploy to update the public site. The links remain subject to YouTube availability and playback restrictions.

### Import songs as the site owner

1. Enable [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) in your Google Cloud project and create an API key restricted to that API.
2. Put `YOUTUBE_API_KEY=your_key` in `.env.local`. This file is ignored by Git. Never use a `VITE_` prefix or put the key in frontend code.
3. Edit `catalog.config.json`: choose discovery queries and `pagesPerQuery` (1–5). Each page requests up to 50 videos; duplicates, unavailable videos, and videos that cannot be embedded are excluded. The default includes new Gujarati, Hindi, and English songs alongside other Indian languages. Results are bounded by API quota; this cannot fetch all of YouTube.
4. Run `npm run catalog:sync`. Imports run sequentially and preserve the old catalog if any request fails. Existing imported videos are rechecked for availability and refreshed. No public import endpoint exists.
5. Run `npm run build` and deploy the updated project to publish the catalog. The catalog is bundled, so visitor searches work on static hosting too, with no YouTube search API requests or quota usage per search.

Run the import and redeploy at least every 30 days to refresh imported metadata. Imported snapshots older than 30 days are excluded at app startup. Existing demo songs are not proof of current availability or licensing.

Set `license` to `creativeCommon` in `catalog.config.json` to restrict API imports to videos labeled Creative Commons by YouTube. The default `any` also permits standard-license videos for embedded playback. Neither filter verifies ownership or guarantees freedom from copyright claims. Do not download, extract, or rehost YouTube audio; separate rights may be needed for reuse outside the player. Review [YouTube's developer policies](https://developers.google.com/youtube/terms/developer-policies) before publishing. If playback is blocked, the app displays an error; press Play in the music bar to retry.

Validation: `npm test`, `npm run lint`, and `npm run build`.
