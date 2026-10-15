// Builds the site from recipes.json and the recipe pages in pages/:
//   - index.html (search + category tiles)
//   - one page per category (e.g. desserts.html)
//   - recipes.js (data used by the search box)
//   - the "← Category" link and "Needs work" note at the top of each recipe page
// Usage: node build.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const pagesDir = path.join(root, 'pages');
const config = JSON.parse(fs.readFileSync(path.join(root, 'recipes.json'), 'utf8'));

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const textOf = html => unesc(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const sortKey = s => s.replace(/^\W+/, '');
const byTitle = (a, b) => sortKey(a.title).localeCompare(sortKey(b.title), 'en', { sensitivity: 'base' });
const plural = n => `${n} recipe${n === 1 ? '' : 's'}`;

// ---- check recipes.json against pages/ ----
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5));
const catOf = new Map();
const problems = [];
for (const cat of config.categories) {
  for (const slug of cat.recipes) {
    if (catOf.has(slug)) problems.push(`"${slug}" is listed in more than one category`);
    else if (!files.includes(slug)) problems.push(`"${slug}" is in recipes.json but pages/${slug}.html doesn't exist`);
    catOf.set(slug, cat);
  }
}
for (const slug of files) if (!catOf.has(slug)) problems.push(`pages/${slug}.html isn't in any category in recipes.json`);
for (const slug of Object.keys(config.needsWork)) if (!catOf.has(slug)) problems.push(`needsWork entry "${slug}" isn't a listed recipe`);
if (problems.length) {
  console.error('Fix these in recipes.json first:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ---- read each recipe page and update its header ----
const recipes = [];
for (const [slug, cat] of catOf) {
  const file = path.join(pagesDir, slug + '.html');
  const html = fs.readFileSync(file, 'utf8');
  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/);
  if (!h1) { console.error(`pages/${slug}.html has no <h1>`); process.exit(1); }
  const title = config.labels[slug] || textOf(h1[1]);
  const ingSection = (html.split('<h3>Ingredients</h3>')[1] || '').split('<h3>Directions</h3>')[0];
  const ingredients = [...ingSection.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => textOf(m[1]));
  const note = config.needsWork[slug];

  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const lines = html.split(/\r?\n/).filter(l => !/class="(crumb|needs-work)"/.test(l));
  lines.splice(lines.findIndex(l => l.includes('<body>')) + 1, 0,
    `    <nav class="crumb"><a href="../${cat.slug}.html">← ${esc(cat.name)}</a></nav>`);
  if (note) {
    lines.splice(lines.findIndex(l => l.includes('</h1>')) + 1, 0,
      `    <p class="needs-work"><strong>Needs work:</strong> ${esc(note)}</p>`);
  }
  const updated = lines.join(nl);
  if (updated !== html) fs.writeFileSync(file, updated);

  recipes.push({ slug, title, category: cat.slug, needsWork: Boolean(note), ingredients });
}
recipes.sort(byTitle);

// ---- shared page shell ----
const page = ({ title, category, body }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="mystyle.css">
    <title>${esc(title)}</title>
    <script src="recipes.js" defer></script>
    <script src="site.js" defer></script>
</head>
<body${category ? ` data-category="${category}"` : ''}>
    <main>
${body}
    </main>
</body>
</html>
`;

const searchBox = placeholder => `        <div class="search">
            <label for="search" class="visually-hidden">${esc(placeholder)}</label>
            <input id="search" type="search" placeholder="${esc(placeholder)}" autocomplete="off">
        </div>
        <ul id="results" class="recipe-list" hidden></ul>`;

const recipeItem = r => `            <li><a href="pages/${r.slug}.html">${esc(r.title)}</a>${r.needsWork ? '<span class="tag">Needs work</span>' : ''}</li>`;

// ---- index.html ----
const tiles = config.categories.map(cat => `            <a class="tile" href="${cat.slug}.html">
                <span class="tile-icon" aria-hidden="true">${cat.icon}</span>
                <span class="tile-name">${esc(cat.name)}</span>
                <span class="tile-count">${plural(cat.recipes.length)}</span>
            </a>`).join('\n');

fs.writeFileSync(path.join(root, 'index.html'), page({
  title: 'Christensen Family Recipes',
  body: `        <header class="site-header">
            <h1>Christensen Family Recipes</h1>
            <p class="subtitle">${plural(recipes.length)}</p>
        </header>
${searchBox('Search recipes or ingredients…')}
        <nav class="tiles" aria-label="Categories" data-hide-on-search>
${tiles}
        </nav>`,
}));

// ---- category pages ----
for (const cat of config.categories) {
  const list = recipes.filter(r => r.category === cat.slug);
  fs.writeFileSync(path.join(root, cat.slug + '.html'), page({
    title: `${cat.name} – Christensen Family Recipes`,
    category: cat.slug,
    body: `        <nav class="crumb"><a href="index.html">← All recipes</a></nav>
        <header class="site-header">
            <h1><span aria-hidden="true">${cat.icon}</span> ${esc(cat.name)}</h1>
            <p class="subtitle">${plural(list.length)}</p>
        </header>
${searchBox(`Search ${cat.name.toLowerCase()}…`)}
        <ul class="recipe-list" data-hide-on-search>
${list.map(recipeItem).join('\n')}
        </ul>`,
  }));
}

// ---- recipes.js (search data) ----
const categories = Object.fromEntries(config.categories.map(c => [c.slug, c.name]));
fs.writeFileSync(path.join(root, 'recipes.js'),
  '// Generated by build.js — do not edit by hand.\n' +
  `window.CATEGORIES = ${JSON.stringify(categories)};\n` +
  'window.RECIPES = [\n' + recipes.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n];\n');

console.log(`Built ${recipes.length} recipes in ${config.categories.length} categories ` +
  `(${Object.keys(config.needsWork).length} need work).`);
