# Christensen Family Recipe Collection

Compilation of all the recipes we like/use fairly often.

## Adding or changing a recipe

1. Copy any page in `pages/` (e.g. `pages/baked_salmon.html`) and fill in the title, an
   `<h3>Ingredients</h3>` list (`<ul>`), an `<h3>Directions</h3>` list (`<ol>`), and any notes as `<p>` at the end.
2. Add the file name (without `.html`) to a category in `recipes.json`.
   If it's missing something, add it to `needsWork` with a short note; remove it from there once it's fixed.
3. Run `node build.js`.

`build.js` regenerates `index.html`, the category pages, and `recipes.js` (search data), and adds the
back link / "needs work" note at the top of each recipe page, so don't edit those parts by hand.