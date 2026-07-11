// Custom Decap CMS editor components ("blocks").
//
// Each of these adds a button to the markdown editor's insert (+) menu, so an
// editor can drop rich blocks anywhere in the body — no hand-written markdown or
// HTML. The `toBlock` output is plain markdown/HTML that build.py already knows
// how to render (see parse_markdown), and `toPreview` mirrors it inside the CMS
// preview pane.
//
// Globals `CMS` (and h / createClass) come from decap-cms.js, loaded first.
(function () {
  // Editor-component list values arrive as plain arrays, but be defensive about
  // Immutable collections just in case.
  function toArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v.toJS === 'function') return v.toJS();
    return [];
  }

  // ── Carousel ────────────────────────────────────────────────────────────────
  // Insert as many carousels as you like, anywhere in the body. Serializes to the
  // [carousel] shortcode that build.py's process_carousel_shortcodes() renders.
  CMS.registerEditorComponent({
    id: 'carousel',
    label: 'Carousel',
    fields: [
      {
        name: 'images',
        label: 'Images',
        widget: 'list',
        field: { name: 'image', label: 'Image', widget: 'image' },
      },
    ],
    pattern: /^\[carousel\]\n([\s\S]*?)\n\[\/carousel\]$/,
    fromBlock: function (match) {
      var srcs = (match[1] || '')
        .split('\n')
        .map(function (line) {
          var m = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
          return m ? m[1] : null;
        })
        .filter(Boolean);
      return { images: srcs };
    },
    toBlock: function (data) {
      var srcs = toArray(data.images);
      var body = srcs
        .map(function (src) { return '![](' + src + ')'; })
        .join('\n');
      return '[carousel]\n' + body + '\n[/carousel]';
    },
    toPreview: function (data) {
      var srcs = toArray(data.images);
      return (
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        srcs
          .map(function (src) {
            return '<img src="' + src + '" style="max-width:120px;border-radius:4px">';
          })
          .join('') +
        '</div>'
      );
    },
  });

  // ── Centered block ────────────────────────────────────────────────────────────
  // Wraps content in a centered container. md_in_html (enabled in build.py) means
  // the inner markdown is still rendered.
  CMS.registerEditorComponent({
    id: 'centered',
    label: 'Centered',
    fields: [{ name: 'content', label: 'Content', widget: 'text' }],
    pattern: /^<div class="text-center" markdown="1">\n([\s\S]*?)\n<\/div>$/,
    fromBlock: function (match) {
      return { content: match[1] };
    },
    toBlock: function (data) {
      return '<div class="text-center" markdown="1">\n' + (data.content || '') + '\n</div>';
    },
    toPreview: function (data) {
      return '<div style="text-align:center">' + (data.content || '') + '</div>';
    },
  });

  // ── Callout / Note ────────────────────────────────────────────────────────────
  CMS.registerEditorComponent({
    id: 'callout',
    label: 'Callout / Note',
    fields: [
      {
        name: 'type',
        label: 'Type',
        widget: 'select',
        options: ['note', 'tip', 'warning', 'danger'],
        default: 'note',
      },
      { name: 'content', label: 'Content', widget: 'text' },
    ],
    pattern: /^<div class="callout callout-(\w+)" markdown="1">\n([\s\S]*?)\n<\/div>$/,
    fromBlock: function (match) {
      return { type: match[1], content: match[2] };
    },
    toBlock: function (data) {
      return (
        '<div class="callout callout-' + (data.type || 'note') + '" markdown="1">\n' +
        (data.content || '') +
        '\n</div>'
      );
    },
    toPreview: function (data) {
      return (
        '<div class="callout callout-' + (data.type || 'note') + '">' +
        (data.content || '') +
        '</div>'
      );
    },
  });

  // ── Image with caption ────────────────────────────────────────────────────────
  // The <img> is emitted with its absolute uploads path; build.py's
  // upgrade_body_images() upgrades it to an optimized <picture> automatically.
  CMS.registerEditorComponent({
    id: 'figure',
    label: 'Image + Caption',
    fields: [
      { name: 'src', label: 'Image', widget: 'image' },
      { name: 'alt', label: 'Alt text', widget: 'string', required: false },
      { name: 'caption', label: 'Caption', widget: 'string', required: false },
    ],
    pattern: /^<figure>\n<img src="([^"]*)" alt="([^"]*)">\n<figcaption>([\s\S]*?)<\/figcaption>\n<\/figure>$/,
    fromBlock: function (match) {
      return { src: match[1], alt: match[2], caption: match[3] };
    },
    toBlock: function (data) {
      return (
        '<figure>\n<img src="' + (data.src || '') + '" alt="' + (data.alt || '') + '">\n' +
        '<figcaption>' + (data.caption || '') + '</figcaption>\n</figure>'
      );
    },
    toPreview: function (data) {
      return (
        '<figure style="text-align:center">' +
        '<img src="' + (data.src || '') + '" alt="' + (data.alt || '') + '" style="max-width:100%">' +
        '<figcaption style="font-size:0.9em;opacity:0.75">' + (data.caption || '') + '</figcaption>' +
        '</figure>'
      );
    },
  });

  // ── Table ─────────────────────────────────────────────────────────────────────
  // Inserts a GFM table scaffold (rendered by the markdown 'extra' extension).
  // Editors fill in the cells directly; add/remove rows by editing the block.
  CMS.registerEditorComponent({
    id: 'table',
    label: 'Table',
    fields: [
      { name: 'columns', label: 'Columns', widget: 'number', default: 3, min: 1, max: 8, value_type: 'int' },
      { name: 'rows', label: 'Body rows', widget: 'number', default: 2, min: 1, max: 30, value_type: 'int' },
    ],
    // Match a markdown table block so it round-trips (editing just re-opens the form).
    pattern: /^(\|.*\|\n\|[ :|-]+\|\n(?:\|.*\|\n?)*)$/,
    fromBlock: function (match) {
      var lines = match[1].trim().split('\n');
      var cols = (lines[0].match(/\|/g) || []).length - 1;
      return { columns: cols > 0 ? cols : 3, rows: Math.max(lines.length - 2, 1) };
    },
    toBlock: function (data) {
      var cols = Math.max(parseInt(data.columns, 10) || 3, 1);
      var rows = Math.max(parseInt(data.rows, 10) || 2, 1);
      var cell = function (label) {
        var out = [];
        for (var c = 0; c < cols; c++) out.push(' ' + (label || '') + ' ');
        return '|' + out.join('|') + '|';
      };
      var header = cell('Header');
      var sep = '|' + Array(cols).fill(' --- ').join('|') + '|';
      var body = [];
      for (var r = 0; r < rows; r++) body.push(cell(''));
      return [header, sep].concat(body).join('\n');
    },
    toPreview: function (data) {
      var cols = Math.max(parseInt(data.columns, 10) || 3, 1);
      var rows = Math.max(parseInt(data.rows, 10) || 2, 1);
      var th = '';
      for (var c = 0; c < cols; c++) th += '<th>Header</th>';
      var trs = '';
      for (var r = 0; r < rows; r++) {
        var tds = '';
        for (var c2 = 0; c2 < cols; c2++) tds += '<td>&nbsp;</td>';
        trs += '<tr>' + tds + '</tr>';
      }
      return '<table><thead><tr>' + th + '</tr></thead><tbody>' + trs + '</tbody></table>';
    },
  });

  // ── Math (LaTeX) ──────────────────────────────────────────────────────────────
  // Emits a $$ display-math $$ block. build.py shields it from markdown, and
  // MathJax (already loaded site-wide + in this preview) typesets it.
  CMS.registerEditorComponent({
    id: 'math',
    label: 'Math (LaTeX)',
    fields: [
      {
        name: 'tex',
        label: 'LaTeX',
        widget: 'text',
        hint: 'e.g.  E = mc^2   or   \\frac{a}{b}',
      },
    ],
    pattern: /^\$\$\n([\s\S]*?)\n\$\$$/,
    fromBlock: function (match) {
      return { tex: match[1] };
    },
    toBlock: function (data) {
      return '$$\n' + (data.tex || '') + '\n$$';
    },
    toPreview: function (data) {
      // Wrapped in \[ \] so MathJax in the preview iframe renders it.
      return '<div class="math-block">\\[' + (data.tex || '') + '\\]</div>';
    },
  });
})();
