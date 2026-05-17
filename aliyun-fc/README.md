# 派大欣 AI 助手 · 阿里云函数计算 FC 3.0 部署

国内访问稳定 + 不需要域名 + 免费额度够用。整个流程都在阿里云控制台网页上完成。

---

## 0. 你需要的

- 阿里云账号(已实名)
- 火山引擎 Ark API Key:`7aab4c02-96e2-4e4c-a075-3c29d09dfa61`

---

## 1. 开通函数计算 FC

打开 <https://fcnext.console.aliyun.com>,如果是第一次进会让你开通(免费,只对调用次数和时长计费,有月度免费额度)。

地域选 **华北 2(北京)** 或 **华东 1(杭州)**,这俩离火山引擎北京机房近,延迟最低。

---

## 2. 创建函数

左侧 **函数** → **创建函数**:

| 字段 | 值 |
| --- | --- |
| 创建方式 | 从零开始创建 |
| 函数名称 | `paidaxin-ai`(随便起) |
| 运行环境 | **Node.js 20**(Node.js 18 也行) |
| 代码上传方式 | 使用示例代码 |
| 请求处理程序类型 | **处理 HTTP 请求**(关键!不是事件请求) |
| 实例规格 | 0.35 核 512MB 即可 |
| 请求处理程序 | `index.handler`(默认) |
| 公网访问 | **开启**(关键,不开外网访问不到) |
| 鉴权方式 | **无需鉴权 / Anonymous**(我们自己在代码里限制) |

点 **创建**。

---

## 3. 粘贴代码

进入函数详情 → **函数代码** 标签页 → 你会看到一个在线 IDE,默认有 `index.js`。

把 `aliyun-fc/index.js` 整个内容粘进去,覆盖默认代码。

点 **部署代码**(右上角)。

---

## 4. 配置环境变量

函数详情 → **配置** → **环境变量** → **修改**:

| Key | Value |
| --- | --- |
| `ARK_API_KEY` | `7aab4c02-96e2-4e4c-a075-3c29d09dfa61` |
| `ALLOW_ORIGIN` | `https://marshmallowmeng.github.io`(调试期可填 `*`) |

点 **确定** 保存。

---

## 5. 拿到访问地址

回到函数详情 → **配置** → **触发器** 标签页,默认会有一个 HTTP 触发器,
**公网访问地址** 长这样:

```
https://paidaxin-ai-xxxxxx.cn-beijing.fcapp.run
```

把这个 URL 加上 `/chat` 就是前端要打的地址,例如:
```
https://paidaxin-ai-xxxxxx.cn-beijing.fcapp.run/chat
```

---

## 6. curl 自测

```bash
curl -X POST https://paidaxin-ai-xxxxxx.cn-beijing.fcapp.run/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-0-lite-260215",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Hello!"}
    ]
  }'
```

应该返回和直连 Ark 一样的 JSON。

---

## 7. 把地址告诉我

返回的 `https://...fcapp.run/chat` 这个 URL 发给我,我把 `assistant.js` 里的
`PROXY_ENDPOINT` 改成它,前端就能跑了。

---

## 安全机制(已内置)

- 只接受 `POST /chat`,其他路径 / 方法直接 404
- 只放行白名单模型(`doubao-seed-2-0-lite-260215`)
- messages 长度上限 40 条、总字符上限 8000,防被刷 token
- `ALLOW_ORIGIN` 限定来源(发布后请改成实际站点域名)

如果需要换/加模型,改 `index.js` 里的 `ALLOWED_MODELS` 集合后重新部署即可。

---

## 费用说明(参考)

阿里云 FC 每月免费额度:
- 100 万次调用
- 40 万 vCPU·秒 + 51.2 万 GB·秒

你这个旅游站做演示远远用不掉,基本等于免费。火山引擎 Ark 那边按 token 计费,
另算。
