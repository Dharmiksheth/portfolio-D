# Dharmik Sheth — Portfolio

Personal portfolio site built with plain HTML, CSS and JavaScript. No build step.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. On vercel.com: **Add New → Project → Import** this repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy. Every push to the main branch redeploys automatically.

## Chat assistant

The floating chat button (`js/chat.js`, `css/chat.css`) calls the serverless
function `api/chat.js`, which answers from a knowledge base of this site's content
using Google Gemini. In Vercel → Project → Settings → Environment Variables, set:

- `GEMINI_API_KEY` — required. Never commit it.
- `GEMINI_MODEL` — optional, defaults to `gemini-3.6-flash`.
- `ALLOWED_ORIGINS` — optional, extra domains allowed to use the chat (e.g. a custom domain).

The chat endpoint only answers requests from this site and limits each visitor to
6 messages a minute and 30 an hour.

If the API is unavailable the widget shows a fallback message with the email address;
the rest of the site is unaffected. Visitor messages are not logged or stored.

## Caching (important when you change files)

Browsers keep CSS, JS and files in `assets/` for up to a year, which makes repeat visits fast.

- After editing `css/` or `js/` files, bump the `?v=` number on their links in `index.html` (and in `js/chat.js` for `chat.css`).
- To replace an image or video, give the new file a new name (e.g. `hero-2.webp`) instead of overwriting the old one.

## Agents and AI search

`llms.txt` gives AI assistants a plain-text summary of the site. Keep it in step with `index.html`.

## After the first deploy

The site's address is `https://dharmiksheth.vercel.app/`. If you move to a custom
domain, update it in:

- `index.html` (canonical, `og:url`, `og:image`, JSON-LD `url`)
- `robots.txt`
- `sitemap.xml`

Then submit `sitemap.xml` in Google Search Console.

## Structure

```
index.html        page content
css/site.css      styles (colour tokens at the top)
js/site.js        menu, scroll animations, video reel, cursor
css/chat.css      chat assistant styles
js/chat.js        chat assistant widget
api/chat.js       Vercel function that answers chat questions (Gemini)
assets/           favicon and social share image
```
