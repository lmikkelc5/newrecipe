// Search box and "Surprise me" button for the home page and category pages.
// Data comes from recipes.js.
(function () {
  const surprise = document.getElementById('surprise');
  if (surprise && window.RECIPES) {
    const finished = RECIPES.filter(r => !r.needsWork);
    surprise.hidden = false;
    surprise.addEventListener('click', () => {
      const r = finished[Math.floor(Math.random() * finished.length)];
      location.href = 'pages/' + r.slug + '.html';
    });
  }

  const input = document.getElementById('search');
  const results = document.getElementById('results');
  if (!input || !results || !window.RECIPES) return;

  const category = document.body.dataset.category;
  const pool = category ? RECIPES.filter(r => r.category === category) : RECIPES;
  const hideWhileSearching = document.querySelectorAll('[data-hide-on-search]');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const index = pool.map(r => ({ r, title: norm(r.title), ings: r.ingredients.map(norm) }));

  function item(r, hit) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = 'pages/' + r.slug + '.html';
    a.textContent = r.title;
    li.append(a);
    if (r.needsWork) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'Needs work';
      li.append(tag);
    }
    const meta = [];
    if (!category) meta.push(CATEGORIES[r.category]);
    if (hit) meta.push('Has: ' + hit);
    if (meta.length) {
      const span = document.createElement('span');
      span.className = 'meta';
      span.textContent = meta.join(' · ');
      li.append(span);
    }
    return li;
  }

  function update() {
    const q = norm(input.value.trim());
    hideWhileSearching.forEach(el => { el.hidden = Boolean(q); });
    results.hidden = !q;
    results.replaceChildren();
    if (!q) return;

    const words = q.split(/\s+/);
    const titleHits = [];
    const ingredientHits = [];
    for (const { r, title, ings } of index) {
      if (words.every(w => title.includes(w))) { titleHits.push(item(r)); continue; }
      if (!words.every(w => title.includes(w) || ings.some(i => i.includes(w)))) continue;
      const hitIndex = ings.findIndex(i => words.some(w => !title.includes(w) && i.includes(w)));
      ingredientHits.push(item(r, r.ingredients[hitIndex]));
    }

    const found = titleHits.concat(ingredientHits);
    if (found.length) {
      results.append(...found);
    } else {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = `No recipes match “${input.value.trim()}”.`;
      results.append(li);
    }
  }

  // Allow links like index.html?q=zucchini
  const fromUrl = new URLSearchParams(location.search).get('q');
  if (fromUrl) input.value = fromUrl;

  input.addEventListener('input', update);
  update();
})();
