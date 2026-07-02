# tapdot Tools

Eight privacy-first web tools hosted at **tools.tapdot.org**. Every tool runs entirely
in the browser — no server, no accounts, nothing sent anywhere (see [privacy.html](privacy.html)).

Built as static HTML/CSS/JS, deployed free via GitHub Pages under a custom subdomain.

## Tools

**Study** — `/study/`
- CiteMaker `/study/cite/` — APA / MLA / Chicago / Harvard citations
- FlashForge `/study/flashcards/` — flashcards + spaced repetition (localStorage)
- GradeCalc `/study/grades/` — GPA, weighted grade, final exam calculators
- BiasCheck `/study/bias/` — media bias analysis via on-device AI (Gemini Nano) + fallback

**Write** — `/write/`
- ReadScore `/write/readscore/` — Flesch-Kincaid, passive voice, reading time
- WordCount Pro `/write/wordcount/` — live word/char counts + keyword density
- LoremCraft `/write/lorem/` — placeholder text in 10 styles
- ThreadCraft `/write/thread/` — split long text into a numbered tweet thread

## Structure

```
CNAME                 tools.tapdot.org
index.html            root hub
privacy.html          shared privacy policy
404.html              branded not-found page
shared/shared.css     design system
shared/shared.js      dark mode + utilities
assets/               tapdot-icon.png
study/  write/        tool folders (index.html + <tool>.js + <tool>.css each)
```

## Local preview

Because tools reference `/shared/…` and `/assets/…` with absolute paths, open the site
through a local server (not `file://`):

```bash
python -m http.server 8080
# then visit http://localhost:8080/
```

## Deploy (GitHub Pages)

This is a **separate repo** from the main `tapdot` site — GitHub Pages allows one custom
domain per repo, and `tapdot.org` already belongs to that repo.

1. Create a public repo `tapdot-tools` (do not add a README).
2. Push this folder:
   ```bash
   git init && git add . && git commit -m "Initial commit — study and write tools"
   git branch -M main
   git remote add origin https://github.com/<username>/tapdot-tools.git
   git push -u origin main
   ```
3. Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`.
4. The `CNAME` file already sets `tools.tapdot.org`. In Settings → Pages, confirm the
   custom domain, wait for DNS, then tick **Enforce HTTPS**.
5. GoDaddy DNS: add a `CNAME` record — Name `tools`, Value `<username>.github.io`.
   (If GoDaddy refuses a subdomain CNAME, use four A records: 185.199.108–111.153.)

## Before launch

- Replace `YOUR_CLOUDFLARE_TOKEN` in every HTML file with the token from your
  Cloudflare Web Analytics dashboard (added a site for `tools.tapdot.org`).
- BiasCheck's full analysis needs Chrome with on-device AI (Gemini Nano) enabled;
  it falls back to basic word analysis everywhere else.
