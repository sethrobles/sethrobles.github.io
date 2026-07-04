// Decap CMS Preview Customisation
// Runs after decap-cms.js loads; uses globals: h, createClass, CMS.

// ── Site styles ──────────────────────────────────────────────────────────────
CMS.registerPreviewStyle('/static/css/base.css');
CMS.registerPreviewStyle(
  'body { background: var(--bg-primary, #fff); color: var(--text-primary, #0f172a); }',
  { raw: true }
);

// ── MathJax helpers (run inside the preview iframe) ──────────────────────────
function loadMathJax() {
  if (window.MathJax) return;
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
    },
  };
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
  s.async = true;
  document.head.appendChild(s);
}

function typesetMathJax() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// ── Preview component ─────────────────────────────────────────────────────────
var PostPreview = createClass({
  componentDidMount: function () {
    loadMathJax();
  },

  componentDidUpdate: function () {
    typesetMathJax();
  },

  render: function () {
    var entry     = this.props.entry;
    var widgetFor = this.props.widgetFor;
    var getAsset  = this.props.getAsset;

    var title   = entry.getIn(['data', 'title'],   '');
    var summary = entry.getIn(['data', 'summary'], '');
    var tagsRaw = entry.getIn(['data', 'tags']);
    var tags    = tagsRaw ? tagsRaw.toJS() : [];
    var body    = widgetFor('body');

    // Hero image — works for both already-uploaded paths and fresh blob uploads
    var heroField = entry.getIn(['data', 'hero']);
    var heroSrc   = heroField ? getAsset(heroField).toString() : null;

    return h('article', { className: 'entry-detail' },
      h('div', { className: 'container' },

        h('header', { className: 'entry-header entry-header-centered' },
          h('h1', { className: 'entry-title' }, title),

          tags.length > 0
            ? h('div', { className: 'entry-tags' },
                tags.map(function (tag, i) {
                  return h('span', { className: 'tag', key: i }, tag);
                })
              )
            : null,

          summary
            ? h('p', {
                style: {
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  marginTop: '0.5rem',
                  maxWidth: '60ch',
                }
              }, summary)
            : null,

          heroSrc
            ? h('div', { className: 'entry-hero' },
                h('img', {
                  src: heroSrc,
                  alt: title,
                  className: 'entry-hero-image',
                  style: { maxWidth: '100%', marginTop: '1rem' },
                })
              )
            : null
        ),

        h('div', { className: 'entry-content' },
          h('div', { className: 'content-main' },
            h('div', { className: 'markdown-content' }, body)
          )
        )
      )
    );
  },
});

CMS.registerPreviewTemplate('blogs',     PostPreview);
CMS.registerPreviewTemplate('projects',  PostPreview);
CMS.registerPreviewTemplate('buildlogs', PostPreview);
