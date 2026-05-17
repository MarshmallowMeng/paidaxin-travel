/**
 * 派大欣 AI 助手 — Cloudflare Worker 代理
 *
 * 部署后会得到一个 https://<name>.<your-subdomain>.workers.dev 域名
 * 前端 assistant.js 把 ARK_ENDPOINT 指到这个域名 + /chat 即可
 *
 * 环境变量(在 Cloudflare 控制台 → Workers → Settings → Variables 设置):
 *   ARK_API_KEY  — 火山引擎 Ark 的 API Key
 *   ALLOW_ORIGIN — 允许跨域的源,例如 https://marshmallowmeng.github.io
 *                  也可以填 *  让所有域可访问(只在调试期使用)
 */

const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 路由:只接受 POST /chat
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/chat") {
      return json({ error: "Not Found" }, 404, corsHeaders);
    }

    if (!env.ARK_API_KEY) {
      return json({ error: "ARK_API_KEY not configured" }, 500, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    // 简单白名单:只允许调用我们指定的模型,防止滥用 key
    const ALLOWED_MODELS = new Set([
      "doubao-seed-2-0-lite-260215",
    ]);
    if (!ALLOWED_MODELS.has(body.model)) {
      return json(
        { error: `Model not allowed: ${body.model}` },
        400,
        corsHeaders
      );
    }

    // 简单输入长度限制,防止被刷 token
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > 40
    ) {
      return json({ error: "Invalid messages length" }, 400, corsHeaders);
    }
    const totalChars = body.messages.reduce(
      (n, m) => n + (typeof m.content === "string" ? m.content.length : 0),
      0
    );
    if (totalChars > 8000) {
      return json({ error: "Messages too long" }, 400, corsHeaders);
    }

    // 转发到 Ark
    const resp = await fetch(ARK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ARK_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          resp.headers.get("Content-Type") || "application/json",
      },
    });
  },
};

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extra,
    },
  });
}
