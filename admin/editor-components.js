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
  // A GFM table (rendered by the markdown 'extra' extension) edited entirely
  // through form fields — no hand-written pipes required:
  //   • Column headers  – a list; the number of headers defines the column count.
  //   • Rows            – a list of rows, each row a list of cell strings.
  //
  // Crucially this ROUND-TRIPS existing content: `fromBlock` parses every real
  // cell out of the markdown, so opening a post with a table shows the actual
  // data (not an empty "Header" scaffold), and saving re-emits it unchanged.
  // Rows are normalised to the header count on write (short rows pad with empty
  // cells, long rows truncate), so adding/removing a column is a one-field edit.
  function tableSplitCells(line) {
    // Split "| a | b |" into trimmed cells, honouring escaped \| pipes.
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    var cells = [];
    var buf = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '\\' && s.charAt(i + 1) === '|') { buf += '|'; i++; continue; }
      if (ch === '|') { cells.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    cells.push(buf.trim());
    return cells;
  }
  function tablePlain(v) { return v && typeof v.toJS === 'function' ? v.toJS() : v; }
  function tableEscCell(v) {
    return String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
  }
  function tableEscHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  CMS.registerEditorComponent({
    id: 'table',
    label: 'Table',
    fields: [
      {
        name: 'headers',
        label: 'Column headers',
        widget: 'list',
        field: { name: 'header', label: 'Header', widget: 'string' },
        default: ['Column 1', 'Column 2'],
        hint: 'One entry per column. Adding/removing a header adds/removes a column.',
      },
      {
        name: 'rows',
        label: 'Rows',
        label_singular: 'Row',
        widget: 'list',
        default: [],
        fields: [
          {
            name: 'cells',
            label: 'Cells (one per column)',
            widget: 'list',
            field: { name: 'cell', label: 'Cell', widget: 'string' },
          },
        ],
      },
    ],
    // Match a markdown table block so existing tables re-open in this editor.
    pattern: /^(\|.*\|\n\|[ :|-]+\|\n(?:\|.*\|\n?)*)$/,
    fromBlock: function (match) {
      var lines = (match[1] || '').trim().split('\n').filter(function (l) { return l.trim(); });
      var headers = lines.length ? tableSplitCells(lines[0]) : [];
      // lines[1] is the |---|---| separator; body rows start at index 2.
      var rows = lines.slice(2).map(function (l) { return { cells: tableSplitCells(l) }; });
      return { headers: headers, rows: rows };
    },
    toBlock: function (data) {
      var d = tablePlain(data) || {};
      var headers = toArray(d.headers).map(String);
      if (!headers.length) headers = ['Column 1'];
      var ncol = headers.length;
      var line = function (arr) {
        var out = [];
        for (var i = 0; i < ncol; i++) out.push(' ' + tableEscCell(arr[i] != null ? arr[i] : '') + ' ');
        return '|' + out.join('|') + '|';
      };
      var sep = '|' + new Array(ncol).fill(' --- ').join('|') + '|';
      var body = toArray(d.rows).map(function (r) {
        return line(toArray((tablePlain(r) || {}).cells));
      });
      return [line(headers), sep].concat(body).join('\n');
    },
    toPreview: function (data) {
      var d = tablePlain(data) || {};
      var headers = toArray(d.headers);
      var ncol = headers.length || 1;
      var cellStyle = 'border:1px solid #d0d0d0;padding:4px 8px;text-align:left';
      var th = '';
      for (var c = 0; c < ncol; c++) {
        th += '<th style="' + cellStyle + ';background:#f5f5f5">' + tableEscHtml(headers[c]) + '</th>';
      }
      var trs = toArray(d.rows).map(function (r) {
        var cells = toArray((tablePlain(r) || {}).cells);
        var tds = '';
        for (var i = 0; i < ncol; i++) {
          tds += '<td style="' + cellStyle + '">' + tableEscHtml(cells[i] != null ? cells[i] : '') + '</td>';
        }
        return '<tr>' + tds + '</tr>';
      }).join('');
      return (
        '<table style="border-collapse:collapse;margin:1rem 0">' +
        '<thead><tr>' + th + '</tr></thead><tbody>' + trs + '</tbody></table>'
      );
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
