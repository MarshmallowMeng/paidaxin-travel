# 派大欣 AI 助手 · Cloudflare Worker 代理

火山引擎 Ark 不允许浏览器直连(CORS 预检失败 / Authorization 被丢弃 → 你看到的 404 假错)。
这个 Worker 把前端请求加上正确的 `Authorization` 头之后转发给 Ark,顺便给响应加上 CORS 头。

API key 只存在 Cloudflare 后台的环境变量里,前端代码里再也不会出现 key。

---

## 部署步骤(5 步,全在 Cloudflare 网页上做,不需要本地装 wrangler)

### 1. 注册并登录 Cloudflare

打开 <https://dash.cloudflare.com>,注册或登录。免费套餐每天 10 万次请求,够用。

### 2. 创建 Worker

左侧菜单 **Workers & Pages → Create application → Create Worker**。

- 起个名字,例如 `paidaxin-ai` —— 这会决定你的域名 `https://paidaxin-ai.<your-subdomain>.workers.dev`
- 点 **Deploy**(先空 Worker 部署一次,拿到域名)

### 3. 粘贴脚本

回到 Worker 详情页,点右上角 **Edit code**,把整个 `worker.js` 的内容粘进去覆盖默认代码,
然后 **Save and deploy**。

### 4. 配置环境变量

Worker 详情页 → **Settings → Variables → Environment Variables → Add variable**:

| 变量名 | 值 | 类型 |
| --- | --- | --- |
| `ARK_API_KEY` | `7aab4c02-96e2-4e4c-a075-3c29d09dfa61` | Secret(点 Encrypt) |
| `ALLOW_ORIGIN` | `https://marshmallowmeng.github.io` | Plain text |

> 如果还没确定最终域名,`ALLOW_ORIGIN` 可以先填 `*` 调通后再收紧。
> `ARK_API_KEY` 一定要点 Encrypt(变成 Secret),否则之后在控制台还能看到。

设完点 **Save and deploy**。

### 5. 拿到域名,更新前端

在 Worker 详情页顶部能看到完整域名,例如:
```
https://paidaxin-ai.your-subdomain.workers.dev
```

把它告诉我,或者自己改 `assistant.js` 顶部:

```js
const PROXY_ENDPOINT = "https://paidaxin-ai.your-subdomain.workers.dev/chat";
```

---

## 自测

打开 Worker 域名 + `/chat` 用 curl 试一下:

```bash
curl -X POST https://paidaxin-ai.<your-subdomain>.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-0-lite-260215",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Hello!"}
    ]
  }'
```

正常会返回和直连 Ark 一样的 JSON。

---

## 安全说明

Worker 已加了几层最小防护:

- 只接受 `POST /chat`,其他路径 / 方法直接 404
- 只放行白名单模型(目前只允许 `doubao-seed-2-0-lite-260215`)
- 单次请求 messages 总字符数限制 8000,防止被人刷 token
- `ALLOW_ORIGIN` 限定来源(发布后请改成实际站点域名)

如果以后想换模型,在 worker.js 的 `ALLOWED_MODELS` 集合里加一条再 deploy 即可。
