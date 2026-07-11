// Custom "tags" widget for Decap CMS.
//
// Replaces the default string-list widget for tags. It fixes two things:
//   1. Multi-word tags (spaces) work — you type a tag and press Enter/comma.
//   2. Tags already used across the site are shown as clickable chips, so you
//      can reuse an existing tag with one click instead of retyping it (and
//      accidentally creating a near-duplicate). New tags are still free-form.
//
// The universe of existing tags is written to /admin/tags.json at build time
// (see build.py). If that file is missing the widget still works — you just
// don't get suggestions.
//
// Globals `h` (createElement), `createClass`, and `CMS` are provided by
// decap-cms.js, which loads before this script.

(function () {
  // Shared across widget instances so we only fetch the suggestion list once.
  var ALL_TAGS = null;
  var ALL_TAGS_PROMISE = null;

  function loadAllTags() {
    if (ALL_TAGS_PROMISE) return ALL_TAGS_PROMISE;
    ALL_TAGS_PROMISE = fetch('/admin/tags.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (tags) {
        ALL_TAGS = Array.isArray(tags) ? tags : [];
        return ALL_TAGS;
      })
      .catch(function () { ALL_TAGS = []; return ALL_TAGS; });
    return ALL_TAGS_PROMISE;
  }

  function toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.slice();
    if (typeof value.toJS === 'function') return value.toJS();
    return [];
  }

  var TagsControl = createClass({
    getInitialState: function () {
      return { input: '', suggestions: ALL_TAGS || [] };
    },

    componentDidMount: function () {
      var self = this;
      loadAllTags().then(function (tags) {
        if (self._unmounted) return;
        self.setState({ suggestions: tags });
      });
    },

    componentWillUnmount: function () {
      this._unmounted = true;
    },

    value: function () {
      return toArray(this.props.value);
    },

    addTag: function (raw) {
      var tag = (raw || '').trim();
      if (!tag) return;
      var current = this.value();
      // Case-insensitive dedupe so "Robotics" and "robotics" don't both stick.
      var exists = current.some(function (t) {
        return t.toLowerCase() === tag.toLowerCase();
      });
      if (!exists) this.props.onChange(current.concat([tag]));
      this.setState({ input: '' });
    },

    removeTag: function (tag) {
      var next = this.value().filter(function (t) { return t !== tag; });
      this.props.onChange(next);
    },

    handleKeyDown: function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this.addTag(this.state.input);
      } else if (e.key === 'Backspace' && this.state.input === '') {
        var current = this.value();
        if (current.length) this.removeTag(current[current.length - 1]);
      }
    },

    handleChange: function (e) {
      this.setState({ input: e.target.value });
    },

    render: function () {
      var self = this;
      var selected = this.value();
      var selectedLower = selected.map(function (t) { return t.toLowerCase(); });

      // Suggestions = used tags not already selected on this entry.
      var suggestions = (this.state.suggestions || []).filter(function (t) {
        return selectedLower.indexOf(t.toLowerCase()) === -1;
      });

      var chip = function (label, onClick, removable) {
        return h('span', {
          key: (removable ? 'sel-' : 'sug-') + label,
          onClick: onClick,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35em',
            padding: '0.2em 0.6em',
            margin: '0 0.4em 0.4em 0',
            borderRadius: '999px',
            fontSize: '0.85em',
            cursor: 'pointer',
            userSelect: 'none',
            border: '1px solid ' + (removable ? '#3a69ee' : '#c4cdd5'),
            background: removable ? '#3a69ee' : '#fff',
            color: removable ? '#fff' : '#5b6772',
          },
        },
          label,
          removable ? h('span', { style: { fontWeight: 700, lineHeight: 1 } }, '×') : null
        );
      };

      return h('div', { className: this.props.classNameWrapper },
        // Selected tags + text input
        h('div', {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '0.4em 0.5em 0.05em',
            border: '1px solid #dfe1e6',
            borderRadius: '5px',
            background: '#fff',
          },
        },
          selected.map(function (tag) {
            return chip(tag, function () { self.removeTag(tag); }, true);
          }),
          h('input', {
            type: 'text',
            value: this.state.input,
            onChange: this.handleChange,
            onKeyDown: this.handleKeyDown,
            onBlur: function () { self.addTag(self.state.input); },
            placeholder: selected.length ? '' : 'Type a tag and press Enter…',
            style: {
              flex: '1 0 8em',
              minWidth: '8em',
              border: 'none',
              outline: 'none',
              padding: '0.25em 0',
              marginBottom: '0.4em',
              fontSize: '0.95em',
              background: 'transparent',
            },
          })
        ),

        // Existing / already-used tags to click
        suggestions.length
          ? h('div', { style: { marginTop: '0.6em' } },
              h('div', {
                style: { fontSize: '0.75em', color: '#7b8794', marginBottom: '0.35em' },
              }, 'Already used — click to add:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap' } },
                suggestions.map(function (tag) {
                  return chip(tag, function () { self.addTag(tag); }, false);
                })
              )
            )
          : null
      );
    },
  });

  var TagsPreview = createClass({
    render: function () {
      var tags = toArray(this.props.value);
      if (!tags.length) return null;
      return h('div', { className: 'entry-tags' },
        tags.map(function (tag, i) {
          return h('span', { className: 'tag', key: i }, tag);
        })
      );
    },
  });

  CMS.registerWidget('tags', TagsControl, TagsPreview);
})();
