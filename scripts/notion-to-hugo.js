const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const CONTENT_DIR = path.resolve(__dirname, '..', 'content', 'blog');
// Marker written into frontmatter so we can distinguish Notion-synced files
// from hand-written posts and only delete the former when they go unpublished.
const NOTION_ID_KEY = 'notion_id';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoDate(str) {
  return str ? new Date(str).toISOString() : new Date().toISOString();
}

function buildFrontmatter(props) {
  const lines = ['---'];
  lines.push(`title: ${JSON.stringify(props.title)}`);
  lines.push(`date: "${props.date}"`);
  lines.push(`lastmod: "${props.lastmod}"`);
  if (props.description) lines.push(`description: ${JSON.stringify(props.description)}`);
  if (props.tags.length)       lines.push(`tags: [${props.tags.map(t => JSON.stringify(t)).join(', ')}]`);
  if (props.categories.length) lines.push(`categories: [${props.categories.map(c => JSON.stringify(c)).join(', ')}]`);
  lines.push(`draft: false`);
  lines.push(`type: "post"`);
  lines.push(`${NOTION_ID_KEY}: "${props.pageId}"`);
  lines.push('---');
  return lines.join('\n') + '\n\n';
}

async function getPublishedPages() {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: { property: 'Published', checkbox: { equals: true } },
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function richText(arr) {
  return Array.isArray(arr) ? arr.map(t => t.plain_text).join('') : '';
}

function extractProps(page) {
  const p = page.properties;

  // Title — find the title-type property regardless of its column name
  const titleProp = Object.values(p).find(v => v.type === 'title');
  const title = titleProp ? richText(titleProp.title) : 'Untitled';

  // Slug — explicit Slug property takes priority, falls back to slugified title
  const slugProp = p['Slug'];
  const slug =
    slugProp?.rich_text?.length ? richText(slugProp.rich_text) : slugify(title);

  // Date — explicit Date property, then Created, then page created_time
  const dateProp = p['Date'] ?? p['Created'];
  const date = dateProp?.date?.start
    ? isoDate(dateProp.date.start)
    : isoDate(page.created_time);

  const lastmod = isoDate(page.last_edited_time);

  // Optional metadata
  const descProp = p['Description'] ?? p['Summary'];
  const description = descProp?.rich_text ? richText(descProp.rich_text) : '';

  const tagsProp = p['Tags'];
  const tags = tagsProp?.multi_select ? tagsProp.multi_select.map(t => t.name) : [];

  const catProp = p['Categories'] ?? p['Category'];
  const categories = catProp?.multi_select
    ? catProp.multi_select.map(c => c.name)
    : catProp?.select?.name
    ? [catProp.select.name]
    : [];

  return { title, slug, date, lastmod, description, tags, categories, pageId: page.id };
}

// Returns the notion_id value from a file's frontmatter, or null if absent.
function readNotionId(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^notion_id:\s*"?([^"\n]+)"?/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.NOTION_TOKEN)       throw new Error('NOTION_TOKEN is not set');
  if (!process.env.NOTION_DATABASE_ID) throw new Error('NOTION_DATABASE_ID is not set');

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const pages = await getPublishedPages();
  console.log(`Found ${pages.length} published page(s) in Notion.`);

  const syncedPageIds = new Set();

  for (const page of pages) {
    const props = extractProps(page);
    console.log(`Syncing: "${props.title}" → ${props.slug}.md`);

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const mdResult = n2m.toMarkdownString(mdBlocks);
    // notion-to-md v3 returns { parent: string }, v2 returns a string directly
    const body = typeof mdResult === 'object' && mdResult !== null
      ? mdResult.parent
      : mdResult;

    const filePath = path.join(CONTENT_DIR, `${props.slug}.md`);
    fs.writeFileSync(filePath, buildFrontmatter(props) + body, 'utf8');
    syncedPageIds.add(page.id);
  }

  // Delete files that were previously synced from Notion but are no longer published.
  // We identify Notion-synced files by the presence of the notion_id frontmatter key,
  // so hand-written posts without that key are never touched.
  const existing = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  for (const filename of existing) {
    const filePath = path.join(CONTENT_DIR, filename);
    const notionId = readNotionId(filePath);
    if (notionId && !syncedPageIds.has(notionId)) {
      console.log(`Removing unpublished: ${filename}`);
      fs.unlinkSync(filePath);
    }
  }

  console.log('Sync complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
