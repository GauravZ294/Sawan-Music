<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Sawan Music

Run and deploy the Sawan Music app locally.

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

### Mobile background listening

Imported audio files use the native media player on Android and iOS when **Dolby Sound → Background Listening** is enabled (the default). This avoids routing those files through Web Audio, which mobile browsers can suspend. Sound effects are bypassed in this mobile mode; disabling it restores audio processing. Playback and lock-screen controls follow actual audio events, and an explicit pause stays paused when returning to the app. Supported browsers receive playback audio-session and media-position information.

YouTube-backed catalog songs are still embedded videos. Their background playback is controlled by YouTube and the mobile browser; the app cannot guarantee it or turn metadata-only FreqBlog results into audio streams. A background pause is reported without repeatedly forcing playback. Reliable background playback for the catalog requires licensed direct audio URLs, which can use the same native player as imported files. See [YouTube’s background-player restriction](https://developers.google.com/youtube/terms/developer-policies) and [Chrome’s Media Session guide](https://developer.chrome.com/blog/media-session). Real device testing is required for screen locking, calls, and operating-system power restrictions.

The existing sample library is retained alongside an imported catalog of 212 verified official YouTube recordings, including Gujarati, Hindi, English, Punjabi, Tamil, Telugu, Malayalam, Kannada, Sanskrit, multilingual tracks, and film themes. Search `Bollywood`, `Hollywood`, or `South` in your library to find these groups, or search a language, title, artist, or album. The imported catalog is in `src/data/youtubeCatalog.json`.

### Movie soundtracks

The catalog includes 127 newly added movie songs and themes from official label, studio, and publisher-provided artist uploads. Search a movie name on Home, or open **Library → Albums** to browse its soundtrack. Hindi versions are included for the classic films and several South Indian films, with Telugu originals for Pushpa and Tamil/English tracks for Coolie. Soundtrack and film-video runtimes can differ; alternate language recordings and the original sad reprise are labeled separately.

| Movie / album | Recordings |
| --- | ---: |
| Dhurandhar | 11 |
| Dhurandhar The Revenge | 15 |
| Baahubali: The Beginning | 8 |
| Baahubali 2: The Conclusion | 5 |
| Pushpa: The Rise | 10 |
| Pushpa 2: The Rule | 6 |
| KGF: Chapter 1 | 6 |
| KGF: Chapter 2 | 5 |
| RRR | 7 |
| Housefull | 5 |
| War | 2 |
| War 2 | 8 |
| Coolie | 8 |
| Vivah | 10 |
| Hum Saath-Saath Hain | 7 |
| Hum Aapke Hain Koun..! | 15 |

These counts include the previously available Aakhri Ishq from Dhurandhar The Revenge. Owner API refreshes preserve movie/album grouping.

### Garba and dandiya

Open **Garba & Dandiya** in the sidebar, or **Garba** on mobile. The collection has 56 channel-verified recordings and album-length sets, spanning Gujarati and Hindi releases from 2016 through 2026. New featured selections include Ramo Re, Gori Tame Manda Lidha Mohi Raj, Maru Mann Mohi Gayu, Nagar Nandji Na Laal, Garbe Ghume Gori, and Charar Charar Maru Chakdol Chale. The selection includes Falguni Pathak, Geeta Rabari, Kinjal Dave, Kirtidan Gadhvi, Aditya Gadhvi, Umesh Barot, Praful Dave, traditional folk singers, and Hindi film tracks. Filter by language or by Garba, Dandiya, Titoda, Dodhiya, Mandli, and Kathiyawadi. These style and regional tags overlap. Search also supports common spellings such as `titodo`, `dodhiyu`, `mandali`, and `kathiawadi`.

The collection includes original artist and label uploads, traditional raas and Kathiyawadi folk collections, nonstop garba sets, and Bollywood festival songs. Some entries are long-form mixes with multiple songs and timestamps in their YouTube descriptions. Dodhiya tags identify recordings used by credited choreographers for that dance pattern; the source manifest retains the choreography references. Playback uses the original YouTube recording and the app's music controls.

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
