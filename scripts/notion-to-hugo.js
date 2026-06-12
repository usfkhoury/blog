const {
  Client,
  APIResponseError,
  UnknownHTTPResponseError,
  RequestTimeoutError,
} = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const CONTENT_DIR = path.resolve(__dirname, '..', 'content', 'blog');
// Marker written into frontmatter so we can distinguish Notion-synced files
// from hand-written posts and only delete the former when they go unpublished.
const NOTION_ID_KEY = 'notion_id';
// Polite delay between per-page content fetches (Notion allows ~3 req/s).
const PAGE_FETCH_DELAY_MS = 200;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a Notion API call with exponential-backoff retry logic.
 * Retries on rate-limit (429), server errors (5xx) and request timeouts.
 * 5xx responses with a non-API-shaped body arrive as UnknownHTTPResponseError,
 * not APIResponseError, so both must be matched.
 */
async function withRetry(fn, { retries = 5, baseDelayMs = 1000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isHttpErr =
        err instanceof APIResponseError || err instanceof UnknownHTTPResponseError;
      const isRateLimit = isHttpErr && err.status === 429;
      const isServerErr = isHttpErr && err.status >= 500;
      const isTimeout = err instanceof RequestTimeoutError;
      const isLastAttempt = attempt === retries;

      if ((!isRateLimit && !isServerErr && !isTimeout) || isLastAttempt) throw err;

      // err.headers is a fetch Headers object, so it must be read with .get();
      // bracket access on it always returns undefined.
      const retryAfterRaw =
        typeof err.headers?.get === 'function'
          ? err.headers.get('retry-after')
          : err.headers?.['retry-after'];
      const retryAfterSec = Number(retryAfterRaw);
      const retryAfterMs =
        retryAfterRaw && Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : baseDelayMs * 2 ** attempt;

      console.warn(
        `Notion API error (${err.status ?? err.name}) on attempt ${attempt + 1}/${retries + 1}. ` +
        `Retrying in ${Math.round(retryAfterMs / 1000)}s…`
      );
      await sleep(retryAfterMs);
    }
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoDate(str) {
  let d = str ? new Date(str) : new Date();
  if (Number.isNaN(d.getTime())) {
    console.warn(`  Invalid date "${str}" — falling back to current time.`);
    d = new Date();
  }
  // Hugo's time.RFC3339 parser rejects milliseconds — strip sub-second part.
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Normalises any Notion page ID variant (with or without hyphens) to UUID form.
// Needed because the Notion API returns hyphened UUIDs while notion-to-md renders
// internal link hrefs as plain 32-char hex strings.
function normalizePageId(id) {
  const hex = id.replace(/-/g, '').toLowerCase();
  if (hex.length !== 32) return id;
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/**
 * Resolves Notion-internal hyperlinks to blog post URLs where possible.
 * notion-to-md renders internal page links as [text](/32-char-hex) or
 * [text](https://www.notion.so/…). When the linked page is published and
 * synced, we rewrite the href to /blog/{slug}/. Otherwise we strip the href
 * and keep the link text (safe fallback — same as the old stripNotionLinks).
 */
function resolveNotionLinks(markdown, pageIdToSlug) {
  // Form 1: [text](/32hexchars) or [text](/uuid-with-hyphens)
  const internalPath = /\[([^\]]+)\]\(\/([\da-f-]{32,36})\)/gi;
  // Form 2: [text](https://www.notion.so/...32hexchars...)
  const notionUrl = /\[([^\]]+)\]\(https?:\/\/(?:www\.)?notion\.so\/([^\s)]+)\)/gi;

  return markdown
    .replace(internalPath, (_, text, rawId) => {
      const slug = pageIdToSlug.get(normalizePageId(rawId));
      return slug ? `[${text}](/blog/${slug}/)` : text;
    })
    .replace(notionUrl, (_, text, urlPath) => {
      const m = urlPath.match(/([0-9a-f]{32})(?:\?.*)?$/i);
      if (!m) return text;
      const slug = pageIdToSlug.get(normalizePageId(m[1]));
      return slug ? `[${text}](/blog/${slug}/)` : text;
    });
}

function buildFrontmatter(props) {
  // Every value goes through JSON.stringify: a JSON string is a valid YAML
  // double-quoted scalar, so quotes/newlines in Notion data can't break the
  // frontmatter or inject extra keys.
  const lines = ['---'];
  lines.push(`title: ${JSON.stringify(props.title)}`);
  // Explicit slug prevents Hugo from deriving the URL from the title, which
  // breaks when the title contains characters like '/' that Hugo treats as
  // path separators (e.g. "Ater/Simple Syrup" → /blog/ater/simple-syrup/).
  lines.push(`slug: ${JSON.stringify(props.slug)}`);
  lines.push(`date: ${JSON.stringify(props.date)}`);
  lines.push(`lastmod: ${JSON.stringify(props.lastmod)}`);
  if (props.description) lines.push(`description: ${JSON.stringify(props.description)}`);
  if (props.tags.length)       lines.push(`tags: [${props.tags.map(t => JSON.stringify(t)).join(', ')}]`);
  if (props.categories.length) lines.push(`categories: [${props.categories.map(c => JSON.stringify(c)).join(', ')}]`);
  lines.push(`draft: false`);
  lines.push(`${NOTION_ID_KEY}: ${JSON.stringify(props.pageId)}`);
  lines.push('---');
  return lines.join('\n') + '\n\n';
}

// ─── Notion API wrappers ──────────────────────────────────────────────────────

async function getDatabaseTitle(databaseId) {
  const db = await withRetry(() =>
    notion.databases.retrieve({ database_id: databaseId })
  );
  return Array.isArray(db.title) ? db.title.map(t => t.plain_text).join('') : '';
}

async function getPublishedPages(databaseId) {
  const pages = [];
  let cursor;
  do {
    const res = await withRetry(() =>
      notion.databases.query({
        database_id: databaseId,
        filter: { property: 'Published', checkbox: { equals: true } },
        ...(cursor ? { start_cursor: cursor } : {}),
      })
    );
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ─── Property extraction ──────────────────────────────────────────────────────

function richText(arr) {
  return Array.isArray(arr) ? arr.map(t => t.plain_text).join('') : '';
}

function extractProps(page) {
  const p = page.properties;

  // Title — find the title-type property regardless of its column name
  const titleProp = Object.values(p).find(v => v.type === 'title');
  const title = titleProp ? richText(titleProp.title) : 'Untitled';

  // Slug — explicit Slug property takes priority, falls back to the title.
  // Both pass through slugify: the slug becomes the output filename and a
  // YAML value, so it must stay within [a-z0-9-] (no path separators, no
  // quotes). If slugification yields an empty string (e.g. all non-ASCII
  // input), fall back to the first 8 characters of the page ID so the
  // filename is stable.
  const slugProp = p['Slug'];
  const explicitSlug = slugProp?.rich_text?.length ? richText(slugProp.rich_text) : '';
  const slug = slugify(explicitSlug || title) || page.id.replace(/-/g, '').slice(0, 8);

  // Date — explicit Date property, then Created, then page created_time
  const dateProp = p['Date'] ?? p['Created'];
  const date = dateProp?.date?.start
    ? isoDate(dateProp.date.start)
    : isoDate(page.created_time);

  const lastmod = isoDate(page.last_edited_time);

  // Optional metadata
  const descProp = p['Description'] ?? p['Summary'];
  const description = descProp?.rich_text ? richText(descProp.rich_text) : '';

  // Tags — Notion property named "Tags" (multi-select)
  const tagsProp = p['Tags'];
  const tags = tagsProp?.multi_select ? tagsProp.multi_select.map(t => t.name) : [];

  // Category — "Categories" (multi-select) or "Category" (select)
  const catProp = p['Categories'] ?? p['Category'];
  const categories = catProp?.multi_select
    ? catProp.multi_select.map(c => c.name)
    : catProp?.select?.name
    ? [catProp.select.name]
    : [];

  return { title, slug, date, lastmod, description, tags, categories, pageId: page.id };
}

// ─── File helpers ─────────────────────────────────────────────────────────────

// Returns the notion_id value from a file's frontmatter, or null if absent.
// Only the leading frontmatter block is searched so a "notion_id:" line in a
// hand-written post's body can never be mistaken for the marker.
function readNotionId(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return null;
    const match = fm[1].match(/^notion_id:\s*"?([^"\r\n]+)"?\s*$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// ─── Per-database metadata fetch (Pass 1) ────────────────────────────────────

// Fetches all published page metadata from one database.
// Populates syncedPageIds and returns [{page, props}, ...].
// Content is NOT fetched here — that happens in syncPageContent after the full
// cross-database link map has been built.
async function fetchDatabasePages(databaseId, syncedPageIds) {
  const [pages, dbTitle] = await Promise.all([
    getPublishedPages(databaseId),
    // The title is only used as a tag — don't fail the whole sync over it.
    getDatabaseTitle(databaseId).catch(err => {
      console.warn(
        `Could not fetch title for database ${databaseId} (${err.message}); ` +
        `posts will sync without a database tag.`
      );
      return '';
    }),
  ]);
  console.log(`Found ${pages.length} published page(s) in Notion database "${dbTitle}".`);

  const items = [];
  for (const page of pages) {
    // Mark the page as synced before extraction: the page IS published, so an
    // extraction failure must not let the cleanup pass delete its existing
    // file as "unpublished".
    syncedPageIds.add(page.id);
    try {
      const props = extractProps(page);
      // Inject the database name as a tag so posts are tagged by their source database
      if (dbTitle && !props.tags.includes(dbTitle)) props.tags.push(dbTitle);
      items.push({ page, props });
    } catch (err) {
      console.error(`  Skipping page ${page.id}: failed to extract properties — ${err.message}`);
    }
  }
  return items;
}

// ─── Per-page content sync (Pass 2) ──────────────────────────────────────────

// Fetches and converts the Markdown content for one page, resolves internal
// Notion links using the pre-built map, then writes the final file.
// Returns the filename written, or null if the page had to be skipped.
async function syncPageContent(page, props, pageIdToSlug) {
  console.log(`  Syncing: "${props.title}" → ${props.slug}.md`);

  let body;
  try {
    const mdBlocks = await withRetry(() => n2m.pageToMarkdown(page.id));
    const mdResult = n2m.toMarkdownString(mdBlocks);
    // notion-to-md v3 returns { parent: string }, v2 returns a string directly
    body = typeof mdResult === 'object' && mdResult !== null
      ? mdResult.parent
      : (mdResult ?? '');
    body = resolveNotionLinks(body, pageIdToSlug);
  } catch (err) {
    console.error(`  Skipping page ${page.id}: failed to convert to Markdown — ${err.message}`);
    return null;
  }

  const filename = `${props.slug}.md`;
  fs.writeFileSync(path.join(CONTENT_DIR, filename), buildFrontmatter(props) + body, 'utf8');
  return filename;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.NOTION_TOKEN)       throw new Error('NOTION_TOKEN is not set');
  if (!process.env.NOTION_DATABASE_ID) throw new Error('NOTION_DATABASE_ID is not set');

  // Support a single ID or a comma-separated list of IDs (deduplicated, so a
  // repeated ID in the list can't sync the same database twice).
  const databaseIds = [...new Set(
    process.env.NOTION_DATABASE_ID
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
  )];

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const syncedPageIds = new Set();
  const allItems = [];

  // Pass 1: fetch metadata from all databases and build the link-resolution map.
  // We collect everything before fetching any content so that links between
  // databases (e.g. a Kaak page linking to Maamoul) resolve correctly.
  for (const databaseId of databaseIds) {
    const items = await fetchDatabasePages(databaseId, syncedPageIds);
    allItems.push(...items);
  }

  // Two pages can resolve to the same slug (same title, or duplicated explicit
  // Slug). The second would silently overwrite the first's file, so suffix it
  // with a page-ID prefix instead. Done before building the link map so
  // internal links resolve to the final slugs.
  const usedSlugs = new Set();
  for (const { page, props } of allItems) {
    if (usedSlugs.has(props.slug)) {
      const unique = `${props.slug}-${page.id.replace(/-/g, '').slice(0, 8)}`;
      console.warn(`Slug collision on "${props.slug}" — writing page ${page.id} as "${unique}".`);
      props.slug = unique;
    }
    usedSlugs.add(props.slug);
  }

  const pageIdToSlug = new Map(
    allItems.map(({ page, props }) => [normalizePageId(page.id), props.slug])
  );

  // Pass 2: fetch and write content for every page, resolving internal links.
  // Track which filename each page was written to so the cleanup pass can
  // remove a stale file when a page's slug changed.
  const writtenFilenameByPageId = new Map();
  for (const { page, props } of allItems) {
    const filename = await syncPageContent(page, props, pageIdToSlug);
    if (filename) writtenFilenameByPageId.set(page.id, filename);
    await sleep(PAGE_FETCH_DELAY_MS);
  }

  // Delete files that were previously synced from Notion but are no longer
  // published, plus files left behind under an old slug. We identify
  // Notion-synced files by the notion_id frontmatter key, so hand-written
  // posts without that key are never touched. Pages whose content fetch
  // failed this run keep their existing file (they're in syncedPageIds but
  // have no entry in writtenFilenameByPageId).
  const existing = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  for (const filename of existing) {
    const filePath = path.join(CONTENT_DIR, filename);
    const notionId = readNotionId(filePath);
    if (!notionId) continue;
    if (!syncedPageIds.has(notionId)) {
      console.log(`Removing unpublished: ${filename}`);
      fs.unlinkSync(filePath);
      continue;
    }
    const currentFilename = writtenFilenameByPageId.get(notionId);
    if (currentFilename && currentFilename !== filename) {
      console.log(`Removing stale slug: ${filename} (now ${currentFilename})`);
      fs.unlinkSync(filePath);
    }
  }

  console.log('Sync complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
