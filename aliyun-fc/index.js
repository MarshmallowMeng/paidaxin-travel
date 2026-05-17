/**
 * 派大欣 AI 助手 — 阿里云函数计算 FC 3.0 代理
 *
 * 把火山引擎 Ark 的请求加上 Authorization 头并转发,顺便给响应加 CORS 头。
 * Key 放在函数的环境变量里,不会出现在前端。
 *
 * 适用平台:阿里云函数计算 FC 3.0,运行时 Node.js 18 / 20
 * Handler:index.handler
 *
 * 环境变量(在函数详情 → 配置 → 环境变量 处设置):
 *   ARK_API_KEY  — 火山引擎 Ark 的 API Key
 *   ALLOW_ORIGIN — 允许跨域的前端站点,如 https://marshmallowmeng.github.io
 *                  调试期可暂填 *
 */

const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const ALLOWED_MODELS = new Set(["doubao-seed-2-0-lite-260215"]);

exports.handler = async (request, response, context) => {
  const origin = process.env.ALLOW_ORIGIN || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  // CORS 预检
  if (request.method === "OPTIONS") {
    response.setStatusCode(204);
    setHeaders(response, corsHeaders);
    response.send("");
    return;
  }

  // 读取路径,只接受 POST /chat
  const path = request.path || "/";
  if (request.method !== "POST" || path !== "/chat") {
    return reply(response, 404, { error: "Not Found" }, corsHeaders);
  }

  if (!process.env.ARK_API_KEY) {
    return reply(
      response,
      500,
      { error: "ARK_API_KEY not configured" },
      corsHeaders
    );
  }

  // 读 body
  let body;
  try {
    const raw = await readBody(request);
    body = JSON.parse(raw.toString("utf8"));
  } catch (_) {
    return reply(response, 400, { error: "Invalid JSON body" }, corsHeaders);
  }

  if (!ALLOWED_MODELS.has(body.model)) {
    return reply(
      response,
      400,
      { error: `Model not allowed: ${body.model}` },
      corsHeaders
    );
  }

  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > 40
  ) {
    return reply(
      response,
      400,
      { error: "Invalid messages length" },
      corsHeaders
    );
  }
  const totalChars = body.messages.reduce(
    (n, m) => n + (typeof m.content === "string" ? m.content.length : 0),
    0
  );
  if (totalChars > 8000) {
    return reply(response, 400, { error: "Messages too long" }, corsHeaders);
  }

  // 转发到 Ark — Node 18+ 自带 fetch
  let arkResp;
  try {
    arkResp = await fetch(ARK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return reply(
      response,
      502,
      { error: "Upstream fetch failed: " + (e.message || e) },
      corsHeaders
    );
  }

  const text = await arkResp.text();
  response.setStatusCode(arkResp.status);
  setHeaders(response, {
    ...corsHeaders,
    "Content-Type":
      arkResp.headers.get("content-type") || "application/json",
  });
  response.send(text);
};

// ---------- 工具 ----------

function reply(response, status, obj, headers) {
  response.setStatusCode(status);
  setHeaders(response, {
    ...headers,
    "Content-Type": "application/json",
  });
  response.send(JSON.stringify(obj));
}

function setHeaders(response, headers) {
  for (const [k, v] of Object.entries(headers)) {
    response.setHeader(k, v);
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (c) => chunks.push(c));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}
