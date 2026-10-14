import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

const POLL_ID = "student-future";
const launchEnabled = () => process.env.POLL_LAUNCH_ENABLED === "true";
const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    "x-content-type-options": "nosniff"
};

function reply(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function config() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return { url: url.replace(/\/$/, ""), key };
}

async function supabase(path, options = {}) {
    const settings = config();
    if (!settings) throw new Error("backend_unavailable");
    const response = await fetch(`${settings.url}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: settings.key,
            authorization: `Bearer ${settings.key}`,
            "content-type": "application/json",
            ...options.headers
        }
    });
    if (!response.ok) {
        const details = await response.text();
        console.error("Poll database request failed", response.status, details.slice(0, 300));
        throw new Error("database_error");
    }
    return response;
}

async function pollRow() {
    const response = await supabase(
        `student_polls?id=eq.${POLL_ID}&select=id,status,ends_at,launched_at&limit=1`
    );
    const rows = await response.json();
    return rows[0] || null;
}

function effectiveState(row) {
    if (!row.launched_at || row.status === "not_launched") return "not_launched";
    if (row.status === "open" && row.ends_at && Date.parse(row.ends_at) <= Date.now()) return "closed";
    return row.status;
}

async function getResults() {
    const counts = {};
    for (const choice of ["continue", "close"]) {
        const response = await supabase(
            `student_poll_votes?poll_id=eq.${POLL_ID}&choice=eq.${choice}&select=id`,
            { method: "HEAD", headers: { prefer: "count=exact", range: "0-0" } }
        );
        const range = response.headers.get("content-range") || "";
        counts[choice] = Number(range.split("/")[1]) || 0;
    }
    return { continue: counts.continue, close: counts.close, total: counts.continue + counts.close };
}

async function getStatus() {
    if (!launchEnabled()) return reply({ state: "not_launched" });
    const row = await pollRow();
    if (!row) return reply({ state: "unavailable" }, 503);
    const state = effectiveState(row);
    if (state !== "published") return reply({ state, endsAt: row.ends_at });
    return reply({ state, endsAt: row.ends_at, results: await getResults() });
}

function sameOrigin(request) {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    try {
        return new URL(origin).origin === new URL(request.url).origin;
    } catch {
        return false;
    }
}

async function readBody(request) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > 1024) return null;
    const reader = request.body?.getReader();
    if (!reader) return null;

    try {
        const chunks = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 1024) {
                await reader.cancel();
                return null;
            }
            chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const body = JSON.parse(raw);
        return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
        return null;
    } finally {
        reader.releaseLock();
    }
}

function clientIpHash(request) {
    const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
    const secret = process.env.POLL_RATE_SECRET;
    if (!ip || isIP(ip) === 0 || !secret || secret.length < 32) return null;
    return createHmac("sha256", secret).update(ip).digest("hex");
}

async function submitVote(request) {
    if (!launchEnabled()) return reply({ error: "not_launched" }, 403);
    if (!sameOrigin(request)) return reply({ error: "origin_not_allowed" }, 403);
    const body = await readBody(request);
    if (!body || !/^\w[\w-]{0,39}$/.test(body.pollId || "") || body.pollId !== POLL_ID ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.voterToken || "") ||
        !["continue", "close"].includes(body.choice)) {
        return reply({ error: "invalid_vote" }, 400);
    }
    const ipHash = clientIpHash(request);
    if (!ipHash) return reply({ error: "poll_not_configured" }, 503);
    try {
        const voterHash = createHash("sha256").update(body.voterToken.toLowerCase()).digest("hex");
        const response = await supabase("rpc/submit_student_poll_vote", {
            method: "POST",
            body: JSON.stringify({
                p_poll_id: POLL_ID,
                p_voter_hash: voterHash,
                p_choice: body.choice,
                p_ip_hash: ipHash
            })
        });
        const outcome = await response.json();
        if (outcome === "accepted") return reply({ accepted: true });
        if (outcome === "invalid") return reply({ error: "invalid_vote" }, 400);
        if (outcome === "not_launched") return reply({ error: "not_launched" }, 403);
        if (outcome === "duplicate") return reply({ error: "already_voted" }, 409);
        if (outcome === "closed") return reply({ error: "poll_closed" }, 409);
        if (outcome === "rate_limited") return reply({ error: "rate_limited" }, 429);
        if (outcome === "unavailable") return reply({ error: "poll_unavailable" }, 404);
        return reply({ error: "invalid_vote" }, 400);
    } catch {
        return reply({ error: "poll_temporarily_unavailable" }, 503);
    }
}

function validAdminToken(request) {
    const expected = process.env.POLL_ADMIN_TOKEN;
    const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!expected || expected.length < 32 || !supplied) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    return a.length === b.length && timingSafeEqual(a, b);
}

async function adminAction(request) {
    if (!validAdminToken(request)) return reply({ error: "unauthorized" }, 401);
    const body = await readBody(request);
    const actions = ["launch", "open", "close", "publish", "unpublish"];
    if (!body || !actions.includes(body.action)) return reply({ error: "invalid_action" }, 400);
    if (!launchEnabled()) {
        return reply({ error: "launch_feature_disabled" }, 409);
    }
    try {
        const response = await supabase("rpc/admin_transition_student_poll", {
            method: "POST",
            body: JSON.stringify({ p_action: body.action, p_poll_id: POLL_ID })
        });
        const outcome = await response.json();
        if (outcome === "ok") return reply({ state: ["unpublish", "close"].includes(body.action) ? "closed" : body.action === "publish" ? "published" : "open" });
        if (outcome === "expired") return reply({ error: "poll_end_date_passed" }, 409);
        if (outcome === "unavailable") return reply({ error: "poll_unavailable" }, 404);
        if (outcome === "invalid") return reply({ error: "invalid_action" }, 400);
        if (outcome === "invalid_state") return reply({ error: "invalid_state_transition" }, 409);
        return reply({ error: "poll_temporarily_unavailable" }, 503);
    } catch {
        return reply({ error: "poll_temporarily_unavailable" }, 503);
    }
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname !== "/api/poll") return reply({ error: "not_found" }, 404);
        try {
            if (request.method === "GET") return await getStatus();
            if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
            if (url.searchParams.get("action") === "admin") return await adminAction(request);
            return await submitVote(request);
        } catch {
            return reply({ error: "poll_temporarily_unavailable" }, 503);
        }
    }
};
