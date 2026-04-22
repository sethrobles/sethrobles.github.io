/**
 * Cloudflare Worker – Decap CMS GitHub OAuth Proxy
 *
 * Deploy this script once to Cloudflare Workers, then set two secrets:
 *   wrangler secret put GITHUB_CLIENT_ID
 *   wrangler secret put GITHUB_CLIENT_SECRET
 *
 * Then update admin/config.yml:
 *   base_url: https://<your-worker-name>.<your-subdomain>.workers.dev
 *
 * Full setup instructions are at the bottom of this file.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      return handleAuth(url, env);
    }

    if (url.pathname === '/callback') {
      return handleCallback(url, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

function handleAuth(url, env) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: 'public_repo',
    redirect_uri: `${url.origin}/callback`,
  });
  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
    302
  );
}

async function handleCallback(url, env) {
  const code = url.searchParams.get('code');

  if (!code) {
    return errorPage('Missing code parameter from GitHub.');
  }

  let tokenData;
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    tokenData = await res.json();
  } catch (err) {
    return errorPage('Failed to reach GitHub: ' + err.message);
  }

  if (tokenData.error || !tokenData.access_token) {
    return errorPage(tokenData.error_description || tokenData.error || 'Unknown error');
  }

  return successPage(tokenData.access_token);
}

function successPage(token) {
  // Decap CMS expects: 'authorization:github:success:{"token":"...","provider":"github"}'
  const payload = JSON.stringify({ token, provider: 'github' });
  return new Response(postMessageHtml('success', payload), {
    headers: { 'Content-Type': 'text/html' },
  });
}

function errorPage(message) {
  const payload = JSON.stringify({ message });
  return new Response(postMessageHtml('error', payload), {
    headers: { 'Content-Type': 'text/html' },
  });
}

function postMessageHtml(status, payloadJson) {
  // payloadJson is already a JSON string; embed it safely as a JS string literal.
  const escaped = payloadJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head><title>Authenticating...</title></head>
<body>
<p>Authenticating with GitHub, please wait...</p>
<script>
  (function () {
    var payload = 'authorization:github:${status}:${escaped}';
    function send(e) {
      window.opener.postMessage(payload, e.origin);
    }
    window.addEventListener('message', send, false);
    // Signal to Decap that we are ready
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body>
</html>`;
}

/*
 * ─── Setup Instructions ────────────────────────────────────────────────────────
 *
 * 1. CREATE A GITHUB OAUTH APP
 *    • Go to: https://github.com/settings/developers → "OAuth Apps" → "New OAuth App"
 *    • Application name: "Seth Robles CMS" (anything)
 *    • Homepage URL: https://sethrobles.github.io
 *    • Authorization callback URL: https://<worker-name>.<subdomain>.workers.dev/callback
 *      (Fill in after deploying the Worker below; you can update this in GitHub settings later.)
 *    • Click "Register application", then generate a client secret.
 *    • Copy the Client ID and Client Secret.
 *
 * 2. DEPLOY THE WORKER
 *    a) Install Wrangler (Cloudflare's CLI) if you haven't:
 *         npm install -g wrangler
 *    b) Log in:
 *         wrangler login
 *    c) Create a new Worker project:
 *         mkdir decap-oauth && cd decap-oauth
 *         wrangler init --no-bundle   (accept defaults, choose "Fetch handler" type)
 *    d) Replace the generated src/index.js content with the contents of this file.
 *    e) Set your secrets (you will be prompted to paste each value):
 *         wrangler secret put GITHUB_CLIENT_ID
 *         wrangler secret put GITHUB_CLIENT_SECRET
 *    f) Deploy:
 *         wrangler deploy
 *    g) Note the Worker URL printed (e.g. https://decap-oauth.yourname.workers.dev).
 *
 * 3. UPDATE GITHUB OAUTH APP CALLBACK URL
 *    • Return to your OAuth App settings on GitHub.
 *    • Set "Authorization callback URL" to: https://<worker-url>/callback
 *
 * 4. UPDATE admin/config.yml
 *    • Replace the placeholder base_url with your Worker URL:
 *        base_url: https://decap-oauth.yourname.workers.dev
 *    • Commit and push — the build will deploy the updated admin to GitHub Pages.
 *
 * 5. TEST
 *    • Visit https://sethrobles.github.io/admin
 *    • Click "Login with GitHub" — a popup will appear, you authorize, and land in the CMS.
 * ──────────────────────────────────────────────────────────────────────────────
 */
