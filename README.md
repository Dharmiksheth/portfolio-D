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

## After the first deploy

The site uses `https://dharmiksheth.vercel.app/` as a placeholder URL. Replace it
with your real Vercel URL or custom domain in:

- `index.html` (canonical, `og:url`, `og:image`, JSON-LD `url`)
- `robots.txt`
- `sitemap.xml`

Then submit `sitemap.xml` in Google Search Console.

## Structure

```
index.html        page content
css/site.css      styles (colour tokens at the top)
js/site.js        menu, scroll animations, video reel, cursor
assets/           favicon and social share image
```
