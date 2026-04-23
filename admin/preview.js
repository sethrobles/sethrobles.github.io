// Decap CMS Preview Customisation
// Runs after decap-cms.js loads; uses the globals it exposes: h, createClass, CMS.

// ── Inject site styles into the preview iframe ──────────────────────────────
CMS.registerPreviewStyle('/static/css/base.css');

// Small reset so the preview iframe body background matches the site
CMS.registerPreviewStyle(
  'body { background: var(--bg-primary, #fff); color: var(--text-primary, #0f172a); }',
  { raw: true }
);

// ── Shared preview component (used for both blogs and projects) ──────────────
var PostPreview = createClass({
  render: function () {
    var entry    = this.props.entry;
    var widgetFor = this.props.widgetFor;

    var title   = entry.getIn(['data', 'title'],   '');
    var summary = entry.getIn(['data', 'summary'], '');
    var tagsRaw = entry.getIn(['data', 'tags']);
    var tags    = tagsRaw ? tagsRaw.toJS() : [];
    var body    = widgetFor('body');

    return h('article', { className: 'entry-detail' },
      h('div', { className: 'container' },

        // Header
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
            : null
        ),

        // Body content
        h('div', { className: 'entry-content' },
          h('div', { className: 'content-main' },
            h('div', { className: 'markdown-content' }, body)
          )
        )
      )
    );
  }
});

CMS.registerPreviewTemplate('blogs',    PostPreview);
CMS.registerPreviewTemplate('projects', PostPreview);
