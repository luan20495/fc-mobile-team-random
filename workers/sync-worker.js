/**
 * Cloudflare Worker — proxy đọc/ghi data/state.json qua GitHub API.
 * Secrets: GITHUB_TOKEN, WRITE_KEY
 */

const ALLOWED_ORIGINS = [
  "https://luan20495.github.io",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
];

const MAX_BODY_BYTES = 1024 * 1024;

const EMPTY_STATE = () => ({
  version: 2,
  updatedAt: new Date().toISOString(),
  players: [],
  tournament: { cycles: [], activeCycleId: null },
  teamsCache: null,
  shuffleHistory: [],
  randomCup: { activeCupId: null, cups: [], playerStats: {} },
});

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const extra = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const allowed = [...ALLOWED_ORIGINS, ...extra];
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key",
    "Vary": "Origin",
  };
}

function jsonResponse(request, env, data, status = 200) {
  const cors = corsHeaders(request, env);
  const headers = { "Content-Type": "application/json", ...(cors || {}) };
  return new Response(JSON.stringify(data), { status, headers });
}

function deny(request, env, status = 403) {
  const cors = corsHeaders(request, env);
  return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
    status,
    headers: { "Content-Type": "application/json", ...(cors || {}) },
  });
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeGitHubContent(base64) {
  const bin = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function validateState(state) {
  if (!state || typeof state !== "object") return "invalid_state";
  if (typeof state.version !== "number" || state.version < 2) return "invalid_state";
  if (!Array.isArray(state.players)) return "invalid_state";
  if (!state.tournament || typeof state.tournament !== "object") return "invalid_state";
  if (!state.randomCup || typeof state.randomCup !== "object") return "invalid_state";
  if (!Array.isArray(state.shuffleHistory)) return "invalid_state";
  return null;
}

function checkWriteKey(request, env) {
  const key = request.headers.get("X-Sync-Key");
  if (!env.WRITE_KEY || key !== env.WRITE_KEY) {
    return false;
  }
  return true;
}

async function fetchRemoteState(env) {
  const owner = env.GITHUB_OWNER || "luan20495";
  const repo = env.GITHUB_REPO || "fc-mobile-team-random";
  const branch = env.GITHUB_BRANCH || "main";
  const filePath = "data/state.json";
  const token = env.GITHUB_TOKEN;
  const ghHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "fc-mobile-sync-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let sha = null;
  let serverState = null;
  let serverUpdatedAt = null;

  if (token) {
    const metaRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: { ...ghHeaders, Authorization: `Bearer ${token}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      sha = meta.sha;
      try {
        serverState = JSON.parse(decodeGitHubContent(meta.content));
        serverUpdatedAt = serverState.updatedAt || null;
      } catch {}
    } else if (metaRes.status !== 404) {
      throw new Error("github_meta_failed");
    }
  }

  if (!serverState) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?t=${Date.now()}`;
    const rawRes = await fetch(rawUrl, { cf: { cacheTtl: 0 } });
    if (rawRes.ok) {
      serverState = await rawRes.json();
      serverUpdatedAt = serverState.updatedAt || null;
    }
  }

  return { sha, serverState, serverUpdatedAt, owner, repo, branch, filePath, ghHeaders, token };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") {
      const cors = corsHeaders(request, env);
      if (!cors) return deny(request, env, 403);
      return new Response(null, { headers: cors });
    }

    if (path !== "/state" && path !== "/") {
      return jsonResponse(request, env, { ok: false, error: "not_found" }, 404);
    }

    if (request.method === "GET") {
      const cors = corsHeaders(request, env);
      if (!cors) return deny(request, env, 403);

      try {
        const { serverState } = await fetchRemoteState(env);
        const payload = serverState || EMPTY_STATE();
        return new Response(JSON.stringify(payload), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      } catch {
        return jsonResponse(request, env, { ok: false, error: "read_failed" }, 502);
      }
    }

    if (request.method === "POST") {
      const cors = corsHeaders(request, env);
      if (!cors) return deny(request, env, 403);

      if (!checkWriteKey(request, env)) {
        return jsonResponse(request, env, { ok: false, error: "unauthorized" }, 401);
      }

      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return jsonResponse(request, env, { ok: false, error: "payload_too_large" }, 400);
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return jsonResponse(request, env, { ok: false, error: "invalid_json" }, 400);
      }

      const state = body.state;
      const validationError = validateState(state);
      if (validationError) {
        return jsonResponse(request, env, { ok: false, error: validationError }, 400);
      }

      const token = env.GITHUB_TOKEN;
      if (!token) {
        return jsonResponse(request, env, { ok: false, error: "server_misconfigured" }, 500);
      }

      try {
        const remote = await fetchRemoteState(env);
        const { sha, serverState, serverUpdatedAt } = remote;

        if (body.baseUpdatedAt && serverUpdatedAt && body.baseUpdatedAt !== serverUpdatedAt) {
          return jsonResponse(request, env, {
            ok: false,
            error: "conflict",
            serverUpdatedAt,
            serverState,
          }, 409);
        }

        state.updatedAt = body.updatedAt || state.updatedAt || new Date().toISOString();
        const json = JSON.stringify(state, null, 2);
        const clientId = body.clientId || "unknown";

        const putRes = await fetch(
          `https://api.github.com/repos/${remote.owner}/${remote.repo}/contents/${remote.filePath}`,
          {
            method: "PUT",
            headers: {
              ...remote.ghHeaders,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `sync: shared state (${String(clientId).slice(0, 8)})`,
              content: toBase64Utf8(json),
              branch: remote.branch,
              ...(sha ? { sha } : {}),
            }),
          }
        );

        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          return jsonResponse(request, env, {
            ok: false,
            error: err.message || "github_write_failed",
          }, 502);
        }

        const result = await putRes.json();
        return jsonResponse(request, env, {
          ok: true,
          updatedAt: state.updatedAt,
          sha: result.content?.sha || null,
        });
      } catch {
        return jsonResponse(request, env, { ok: false, error: "write_failed" }, 502);
      }
    }

    return jsonResponse(request, env, { ok: false, error: "method_not_allowed" }, 405);
  },
};
