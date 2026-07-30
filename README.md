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
- Responses are stored in **Netlify Blobs**, keyed by a short **quiz code** (e.g.
  `VL-7XK4`) — no names collected. The pre-course quiz generates the code automatically
  and saves it in the participant's browser, so the post-course quiz pre-fills it; the
  field stays editable for anyone switching device. Nothing is issued or validated in
  advance, so there is no setup step before a workshop.
- A link may carry a code (`https://site/?code=VL-7XK4`) if you'd rather assign them
  yourself, but this is optional.

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

Visit `/facilitator.html` and enter your `FACILITATOR_KEY` to load the report: mean pre
score, mean post score, average paired gain, the mean confidence shift per statement, and
the Section 3 feedback summary. The key gates the report only — participants never need
it, and the quiz works whether or not it is set.

### Local preview

```bash
npm install
npx netlify dev
```

`netlify dev` serves the static pages and the functions together (plain `open index.html`
won't run the serverless functions). Set `FACILITATOR_KEY` in a `.env` file for local use.

### Branding

All brand values are CSS variables at the top of `assets/css/brand.css`, matched to
viaveri.co: violet/purple palette, purple gradient header, blue→cyan gradient display
headings, mint-green for positive deltas. The header is a text-only lockup by design —
no logo mark.
