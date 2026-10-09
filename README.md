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
3. Set `YOUTUBE_API_KEY` in `.env.local` to enable live, paginated YouTube music search. Enable YouTube Data API v3 for the Google Cloud project that owns this key. For Vercel, add `YOUTUBE_API_KEY` under the project’s Environment Variables and redeploy.
4. Run the app:
   `npm run dev`
