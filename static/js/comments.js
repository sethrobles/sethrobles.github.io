/**
 * Comment form behaviour.
 *
 * The thread itself is static HTML from the build — this file only exists so a
 * reader can *post*. Three jobs:
 *
 *   1. Load Turnstile lazily, on first interaction with the form, so a reader
 *      who never comments makes no third-party request at all.
 *   2. Submit as JSON to the Worker and report what happened.
 *   3. Move the form under a comment when replying, so the reply target is
 *      obvious without a second form.
 */
(function () {
  'use strict';

  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var turnstileLoading = null;

  function loadTurnstile() {
    if (turnstileLoading) return turnstileLoading;
    turnstileLoading = new Promise(function (resolve, reject) {
      if (window.turnstile) return resolve(window.turnstile);
      var script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.onload = function () {
        // The API object appears a tick after onload in some browsers.
        var tries = 0;
        (function wait() {
          if (window.turnstile) return resolve(window.turnstile);
          if (++tries > 100) return reject(new Error('Turnstile did not initialise'));
          setTimeout(wait, 50);
        })();
      };
      script.onerror = function () { reject(new Error('Turnstile failed to load')); };
      document.head.appendChild(script);
    });
    return turnstileLoading;
  }

  function setupForm(form) {
    var endpoint = form.dataset.endpoint.replace(/\/+$/, '');
    var sitekey = form.dataset.sitekey;
    var status = form.querySelector('.comment-status');
    var submit = form.querySelector('.comment-submit');
    var parentInput = form.querySelector('input[name="parent_id"]');
    var replyBanner = form.querySelector('.comment-replying-to');
    var replyName = form.querySelector('.comment-replying-name');
    var widgetHost = form.querySelector('.comment-turnstile');
    var loadedAt = Date.now();

    var widgetId = null;
    var tokenResolvers = [];
    var currentToken = null;

    function say(message, kind) {
      status.textContent = message;
      status.className = 'comment-status' + (kind ? ' comment-status--' + kind : '');
    }

    function handToken(token) {
      currentToken = token;
      tokenResolvers.splice(0).forEach(function (resolve) { resolve(token); });
    }

    /** Resolves with a fresh Turnstile token, rendering the widget if needed. */
    function getToken() {
      if (currentToken) return Promise.resolve(currentToken);
      return loadTurnstile().then(function (turnstile) {
        if (widgetId === null) {
          widgetId = turnstile.render(widgetHost, {
            sitekey: sitekey,
            // Stay invisible unless Cloudflare actually wants an interaction.
            appearance: 'interaction-only',
            callback: handToken,
            'expired-callback': function () {
              // Tokens are good for a few minutes. If one lapses while someone
              // is still writing, quietly get another rather than failing at
              // submit time.
              currentToken = null;
              if (widgetId !== null) turnstile.reset(widgetId);
            },
            'error-callback': function () {
              currentToken = null;
              say('The spam check could not run. Reload the page and try again.', 'error');
            },
          });
        }
        return new Promise(function (resolve, reject) {
          if (currentToken) return resolve(currentToken);
          tokenResolvers.push(resolve);
          setTimeout(function () {
            if (!currentToken) reject(new Error('The spam check timed out.'));
          }, 30000);
        });
      });
    }

    // Warm the challenge up as soon as someone starts writing, so it is almost
    // always ready by the time they press the button.
    var warmed = false;
    form.addEventListener('focusin', function () {
      if (warmed) return;
      warmed = true;
      getToken().catch(function () { /* reported at submit */ });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submit.disabled) return;

      var name = form.elements.name.value.trim();
      var body = form.elements.body.value.trim();
      if (!name) return say('A name is required.', 'error');
      if (!body) return say('Write something first.', 'error');

      submit.disabled = true;
      say('Checking…');

      getToken()
        .then(function (token) {
          say('Sending…');
          return fetch(endpoint + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entry_type: form.dataset.entryType,
              slug: form.dataset.slug,
              name: name,
              email: form.elements.email.value.trim(),
              body: body,
              parent_id: parentInput.value || null,
              url_confirm: form.elements.url_confirm.value,
              dwell_ms: Date.now() - loadedAt,
              turnstile_token: token,
            }),
          });
        })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            throw new Error(result.data.message || 'Something went wrong. Try again in a moment.');
          }
          form.reset();
          clearReply();
          say('Thanks — your comment is waiting for review and will appear once approved.', 'success');
          // The token was spent on that submission; a second comment needs a new one.
          currentToken = null;
          if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
        })
        .catch(function (err) {
          say(err.message || 'Something went wrong. Try again in a moment.', 'error');
        })
        .then(function () {
          submit.disabled = false;
        });
    });

    /* ── Replying ────────────────────────────────────────────────────────── */

    function clearReply() {
      parentInput.value = '';
      replyBanner.hidden = true;
      var anchor = document.getElementById('comment-form-anchor');
      if (anchor && anchor.parentNode) anchor.parentNode.replaceChild(form, anchor);
    }

    form.querySelector('.comment-cancel-reply').addEventListener('click', clearReply);

    document.addEventListener('click', function (event) {
      var button = event.target.closest('.comment-reply-btn');
      if (!button) return;

      // Leave a placeholder so cancelling puts the form back where it started
      // rather than stranding it inside whichever thread was replied to last.
      if (!document.getElementById('comment-form-anchor')) {
        var anchor = document.createElement('div');
        anchor.id = 'comment-form-anchor';
        form.parentNode.insertBefore(anchor, form);
      }

      var target = document.getElementById('comment-' + button.dataset.replyTo);
      if (target) target.appendChild(form);
      parentInput.value = button.dataset.replyTo;
      replyName.textContent = button.dataset.replyName;
      replyBanner.hidden = false;
      form.elements.body.focus();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.comment-form'), setupForm);
  });
})();
