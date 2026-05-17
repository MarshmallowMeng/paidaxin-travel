/* 派大欣环游记 — AI 助手悬浮窗
 * 右下角机器人按钮,点击弹出对话框,后端为火山引擎 Ark Doubao。
 * ⚠️ API key 直接写在前端会被任何访问者抓走,生产请改为后端代理 + env。
 */
(() => {
  const ARK_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const ARK_KEY = "7aab4c02-96e2-4e4c-a075-3c29d09dfa61";
  const MODEL = "doubao-seed-2-0-lite-260215";
  const SYSTEM_PROMPT =
    "你是派大欣环游记的 AI 旅行助手,擅长俄罗斯(莫斯科 / 圣彼得堡 / 摩尔曼斯克 / 海参崴)旅行问题。回答简洁友善,使用简体中文,关键信息带价格 / 时间 / 地址等具体数字时尽量准确,不确定时直接说不确定。";

  // ---------- DOM 注入 ----------
  const root = document.createElement("div");
  root.className = "ai-assistant";
  root.innerHTML = `
    <button type="button" class="ai-fab" aria-label="AI 助手" title="AI 助手">
      <span class="ai-fab-emoji" aria-hidden="true">🤖</span>
    </button>
    <div class="ai-modal" role="dialog" aria-modal="true" aria-label="AI 助手对话框" hidden>
      <div class="ai-modal-mask"></div>
      <div class="ai-panel">
        <header class="ai-panel-head">
          <div class="ai-panel-title">
            <span class="ai-panel-emoji" aria-hidden="true">🤖</span>
            <span>派大欣 AI · 旅行助手</span>
          </div>
          <button type="button" class="ai-panel-close" aria-label="关闭">×</button>
        </header>
        <div class="ai-msgs" aria-live="polite"></div>
        <form class="ai-input-row" autocomplete="off">
          <textarea
            class="ai-input"
            rows="1"
            placeholder="问点什么…例如:谢肉节都吃什么?"
            aria-label="输入问题"
          ></textarea>
          <button type="submit" class="ai-send" aria-label="发送">发送</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector(".ai-fab");
  const modal = root.querySelector(".ai-modal");
  const mask = root.querySelector(".ai-modal-mask");
  const closeBtn = root.querySelector(".ai-panel-close");
  const msgsBox = root.querySelector(".ai-msgs");
  const form = root.querySelector(".ai-input-row");
  const input = root.querySelector(".ai-input");
  const sendBtn = root.querySelector(".ai-send");

  // ---------- 状态 ----------
  const history = [{ role: "system", content: SYSTEM_PROMPT }];
  let pending = false;

  // ---------- 工具 ----------
  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function appendMsg(role, text, opts = {}) {
    const el = document.createElement("div");
    el.className = `ai-msg ai-msg--${role}`;
    el.innerHTML = `
      <div class="ai-msg-bubble">${
        opts.html ? text : escapeHTML(text).replace(/\n/g, "<br>")
      }</div>
    `;
    msgsBox.appendChild(el);
    msgsBox.scrollTop = msgsBox.scrollHeight;
    return el;
  }

  function setPending(v) {
    pending = v;
    sendBtn.disabled = v;
    input.disabled = v;
    sendBtn.textContent = v ? "…" : "发送";
  }

  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  // ---------- 弹窗开关 ----------
  function openModal() {
    modal.hidden = false;
    document.body.classList.add("ai-modal-open");
    setTimeout(() => input.focus(), 120);
    if (msgsBox.childElementCount === 0) {
      appendMsg(
        "assistant",
        "你好👋 我是派大欣 AI。可以问我景点、签证、Sapsan 高铁、谢肉节、极光团这些。问吧~"
      );
    }
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("ai-modal-open");
  }

  fab.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  mask.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // ---------- 输入处理 ----------
  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pending) return;
    const text = input.value.trim();
    if (!text) return;

    appendMsg("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    autoResize();
    setPending(true);

    const loadingEl = appendMsg("assistant", "<span class=\"ai-typing\"><i></i><i></i><i></i></span>", { html: true });

    try {
      const reply = await callArk(history);
      loadingEl.querySelector(".ai-msg-bubble").innerHTML = escapeHTML(reply).replace(/\n/g, "<br>");
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      loadingEl.querySelector(".ai-msg-bubble").innerHTML =
        `<span class="ai-error">出错了:${escapeHTML(err.message || String(err))}</span>`;
      // 出错时不写入 history,允许用户重试
    } finally {
      setPending(false);
      msgsBox.scrollTop = msgsBox.scrollHeight;
      input.focus();
    }
  });

  // ---------- 调用 Ark ----------
  async function callArk(messages) {
    const resp = await fetch(ARK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
      }),
    });
    if (!resp.ok) {
      let detail = "";
      try {
        const j = await resp.json();
        detail = j.error?.message || JSON.stringify(j);
      } catch (_) {
        detail = await resp.text().catch(() => "");
      }
      throw new Error(`HTTP ${resp.status} ${detail}`.trim());
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("响应缺少 content 字段");
    return content;
  }
})();
