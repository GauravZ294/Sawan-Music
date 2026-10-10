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
3. To expand the site's song catalog, configure `YOUTUBE_API_KEY` in `.env.local` and follow the catalog import instructions below. Visitors do not need a key and do not search YouTube.
4. Run the app:
   `npm run dev`

## Site song catalog

Visitors search the songs already included in Sawan using the main search bar. Playback uses the visible official YouTube player with the video's original audio. Saving a song stores a reference and metadata, not audio or video files.

The existing sample library is retained. No new YouTube songs have been imported until a successful catalog sync. `src/data/youtubeCatalog.json` starts empty.

### Import songs as the site owner

1. Enable [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) in your Google Cloud project and create an API key restricted to that API.
2. Put `YOUTUBE_API_KEY=your_key` in `.env.local`. This file is ignored by Git. Never use a `VITE_` prefix or put the key in frontend code.
3. Edit `catalog.config.json`: choose discovery queries and `pagesPerQuery` (1–5). Each page requests up to 50 videos; duplicates, unavailable videos, and videos that cannot be embedded are excluded. The default covers nine music queries. Results are bounded by API quota; this cannot fetch all of YouTube.
4. Run `npm run catalog:sync`. Imports run sequentially and preserve the old catalog if any request fails. Existing imported videos are rechecked for availability and refreshed. No public import endpoint exists.
5. Run `npm run build` and deploy the updated project to publish the catalog. The catalog is bundled, so visitor searches work on static hosting too, with no YouTube search API requests or quota usage per search.

Run the import and redeploy at least every 30 days to refresh imported metadata. Imported snapshots older than 30 days are excluded at app startup. Existing demo songs are not proof of current availability or licensing.

Set `license` to `creativeCommon` in `catalog.config.json` to restrict imports to videos labeled Creative Commons by YouTube. The default `any` also permits standard-license videos for embedded playback. Neither filter verifies ownership or guarantees freedom from copyright claims. Do not download, extract, or rehost YouTube audio; separate rights may be needed for reuse outside the player. Review [YouTube's developer policies](https://developers.google.com/youtube/terms/developer-policies) before publishing. Playback pauses when the tab is hidden, and YouTube controls and restrictions remain in place.

Validation: `npm test`, `npm run lint`, and `npm run build`.
