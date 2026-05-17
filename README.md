# usfkhoury.com — Personal Blog

Personal blog at **[usfkhoury.com](https://usfkhoury.com)** documenting Lebanese home-cooking and baking. Posts are written in [Notion](https://notion.so) and automatically published to the site.

---

## Architecture

```
Notion (write here)
    │
    │  GitHub Action runs every hour
    ▼
scripts/notion-to-hugo.js   ← fetches published pages, writes Markdown files
    │
    │  commits to main branch
    ▼
content/blog/*.md           ← Hugo source files
    │
    │  workflow calls Netlify deploy hook, runs `hugo --gc --minify`
    ▼
usfkhoury.com               ← live site
```

| Layer | Tool | Config file |
|---|---|---|
| Content authoring | Notion | your Notion workspace |
| Sync pipeline | Node.js script + GitHub Actions | `scripts/`, `.github/workflows/notion-sync.yml` |
| Static site generator | Hugo 0.161.1 + Stack theme | `config.toml`, `netlify.toml` |
| Hosting | Netlify | `netlify.toml` |

---

## Folder structure

```
blog/
├── .github/workflows/
│   └── notion-sync.yml     GitHub Action: runs sync every hour
├── archetypes/
│   └── default.md          Template for new hand-written posts (hugo new)
├── assets/
│   └── icons/              Custom SVG icons used in the sidebar social links
├── content/
│   ├── blog/               All published blog posts (Markdown)
│   └── page/
│       └── search/         Search page (must not be deleted)
├── scripts/
│   ├── notion-to-hugo.js   Sync script
│   ├── package.json        Node dependencies
│   └── .gitignore          Excludes node_modules/
├── static/
│   └── images/main/
│       └── logo.jpg        Avatar image shown in the sidebar
├── themes/
│   └── hugo-theme-stack/   Theme (git submodule — do not edit directly)
├── .gitattributes          Forces LF line endings for shell scripts and .notion-databases
├── .notion-databases       Source-of-truth list of Notion database IDs (one per line)
├── config.toml             All Hugo and theme settings
└── netlify.toml            Netlify build configuration
```

---

## How to publish a post

1. Open Notion and navigate to the database you want to write in (e.g. **Sweets**, **Bread**, **Salty**).
2. Create a new page and write your content.
3. Fill in the page properties:
   - **Published** — leave it **unchecked** while you are still drafting.
   - **Categories** — pick the category (e.g. `Yawmiyet Khebbez`).
   - **Tags** — optional; the database name is added automatically as a tag.
   - **Date** — when the post was created (optional; defaults to the page creation date).
   - **Slug** — optional; the URL-friendly filename (e.g. `chocolate-cake`). If left blank, it is generated from the title.
4. When the post is ready, check the **Published** checkbox.
5. The site updates automatically within the hour. To publish immediately, trigger a [manual sync](#triggering-a-manual-sync).

---

## How to unpublish a post

1. Open the page in Notion.
2. Uncheck the **Published** checkbox.
3. The next sync run (or a manual sync) will delete the Markdown file and the post will disappear from the site.

> Hand-written posts in `content/blog/` that do **not** have a `notion_id:` field in their frontmatter are never touched by the sync script.

---

## How to add a new content category (e.g. Woodworking)

1. In Notion, create a new database (e.g. **Woodworking**) with the same property columns as the existing ones: **Published** (checkbox), **Categories** (multi-select), **Tags** (multi-select), **Date** (date), **Slug** (text).
2. Find the new database's ID — open it in a browser; the ID is the 32-character string in the URL (the part after the last `/` and before any `?`).
3. Add the ID to `.notion-databases` at the repo root (one ID per line, lines starting with `#` are ignored):
   ```
   existing-db-id-1
   existing-db-id-2
   new-woodworking-db-id
   ```
4. Commit and push the file — the workflow reads it automatically on every run, no secret update required.
5. Trigger a [manual sync](#triggering-a-manual-sync) to confirm it works. Pages from the new database will be tagged **Woodworking** automatically.

---

## Managing database IDs

The file `.notion-databases` (repo root) lists every Notion database that the sync pipeline reads from, one ID per line. Lines starting with `#` are treated as comments.

To add, remove, or reorder IDs: edit the file and push. The GitHub Actions workflow parses it at the start of every sync run.

---

## Triggering a manual sync

1. Go to your GitHub repository.
2. Click **Actions** → **Sync Notion to Hugo**.
3. Click **Run workflow** → **Run workflow**.

The sync runs and, if anything changed, commits to `main` and calls the Netlify deploy hook to trigger a rebuild.

---

## Running the sync locally (for testing)

```bash
cd scripts
npm install

export NOTION_TOKEN="secret_…"
export NOTION_DATABASE_ID="$(grep -v '^\s*#' ../.notion-databases | grep -v '^\s*$' | tr -d '\r' | tr '\n' ',' | sed 's/,$//')"

node notion-to-hugo.js
```

This writes Markdown files into `content/blog/`. Run `hugo server` from the repo root to preview the result.

---

## Environment variables and GitHub Secrets

| Secret name | Where to get it | Notes |
|---|---|---|
| `NOTION_TOKEN` | Notion → Settings → Connections → Develop or manage integrations → create an integration → copy the **Internal Integration Secret** | The integration must be added to each database you want to sync (open the database in Notion → ··· → Connect to → your integration) |
| `NETLIFY_DEPLOY_HOOK` | Netlify → Site → Site configuration → Build & deploy → Build hooks → Add build hook | The workflow calls this URL at the end of every sync that produces changes |

Set these secrets at **GitHub → repository → Settings → Secrets and variables → Actions**.

---

## Troubleshooting

### The sync ran but my post didn't appear

- Make sure the **Published** checkbox is checked in Notion.
- Make sure the Notion integration has access to the database: open the database → **···** (top right) → **Connect to** → select your integration.
- Check the **Actions** tab in GitHub for error output from the sync job.

### A post appeared without tags

- The database name is injected as a tag automatically. Confirm the database has a name (not "Untitled").
- Per-page tags come from the **Tags** multi-select property on the Notion page.

### A post disappeared from the home page

- Check that the post's Markdown file in `content/blog/` does **not** have `type: "post"` in its frontmatter — that field conflicts with the Stack theme's home-page filter.
- Check that `config.toml` has `mainSections = ["blog"]` (not changed).

### The Hugo build fails on Netlify

- Check the Netlify deploy log. Common causes:
  - A shortcode that no longer exists (e.g. `{{< mermaid >}}` — use a fenced ` ```mermaid ``` ` code block instead).
  - A malformed Markdown file written by the sync script — check the GitHub Actions log for which page failed.

### Notion API rate limit errors

The sync script retries automatically (up to 5 attempts with exponential back-off). If you see repeated 429 errors in the Actions log, your workspace may be hitting Notion's API limits — the hourly schedule means this is unlikely in practice.

### Math formulas don't render on the site

Two settings in `config.toml` must both be present:

- `math = true` under `[params.article]` — loads KaTeX on article pages.
- `["$", "$"]` in `[markup.goldmark.extensions.passthrough.delimiters]` inline list — tells Hugo's Markdown parser to leave `$...$` content untouched so KaTeX can render it.

If either is missing, formulas will appear as raw LaTeX text or garbled Markdown. Supported syntax in Notion:

| Style | Notion input | Example |
|---|---|---|
| Inline | `$...$` | `$E = mc^2$` |
| Block | `$$...$$` on its own line | `$$\frac{a}{b}$$` |

---

### The search page is broken

The file `content/page/search/index.md` must exist and must contain:
```yaml
outputs:
  - html
  - json
```
Do not delete or modify this file.
