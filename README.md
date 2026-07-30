# ViaLearn

Hosting Workplace Training Modules

## AI Usage, Ethics & Safety — pre/post-course quiz

A small, ViaVeri-branded web app for the one-day workshop. Participants take the
**same** quiz at the start and end of the day; the pre-course result stays hidden
until the post-course quiz is completed, then their before/after is revealed.

### How it works

- **Static pages** (`index.html`, `pre.html`, `post.html`, `facilitator.html`) + shared
  CSS/JS in `assets/`.
- **Scoring and storage run server-side** in Netlify Functions (`netlify/functions/`)
  so the answer key never reaches the browser and the pre-course score can't be seen early.
- Responses are stored in **Netlify Blobs**, keyed by each participant's private
  **matching code** (last 2 letters of mother's first name + day of birth + last 2 letters
  of first street) — no names collected.

| Route | Purpose |
|-------|---------|
| `/` | Landing page — choose pre or post |
| `/pre` | Pre-course quiz (result locked) |
| `/post` | Post-course quiz (reveals before/after) |
| `/facilitator.html` | Aggregate report (key-protected) |

### Deploy to Netlify

1. Push this repo to GitHub and connect it as a new Netlify site. No build command is
   needed; `netlify.toml` sets `publish = "."` and the functions directory.
2. In **Site settings → Environment variables**, add:
   - `FACILITATOR_KEY` — a secret you choose. The facilitator report refuses to load
     without it, and it's required to view aggregate results.
3. Netlify Blobs is enabled automatically for the site — no extra setup.

That's it. The pre/post pages need no configuration.

### Facilitator report

Visit `/facilitator.html`, enter your `FACILITATOR_KEY`, and you'll see mean pre score,
mean post score, average paired gain, the mean confidence shift per statement, and the
Section 3 feedback summary.

### Local preview

```bash
npm install
npx netlify dev
```

`netlify dev` serves the static pages and the functions together (plain `open index.html`
won't run the serverless functions). Set `FACILITATOR_KEY` in a `.env` file for local use.

### Re-skinning / branding

All brand values (colors, fonts, radius) are CSS variables at the top of
`assets/css/brand.css`. The logo is a text lockup in each page's `<header>` — swap the
`.brand-mark` / `.brand-name` markup for a real logo image when available.
