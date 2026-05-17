/* 派大欣环游记 — 公共脚本
 * 1. 用 JS 注入顶栏 (data-include="topbar") 与底部 Tab (data-include="bottomnav")
 *    所有页面只写一行占位符即可,后续改一处全站同步。
 * 2. 根据 <body data-active="..."> 给底部 Tab 高亮当前页。
 * 3. 集中维护静态资源版本号 ASSET_VER,避免散落手改。
 */
(() => {
  const ASSET_VER = "18";
  const v = (s) => `${s}?v=${ASSET_VER}`;

  const TOPBAR_HTML = `
    <header class="top-bar">
      <div class="brand">
        <img class="brand-avatar" src="${v("assets/opt/logo-192.webp")}" alt="派大欣环游记" width="44" height="44" loading="eager" />
      </div>
      <div class="top-actions">
        <a class="pill" href="index.html">首页</a>
        <a class="pill" href="card.html">名片</a>
        <button type="button" class="icon-btn" aria-label="通知" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>
    </header>
  `;

  const BOTTOMNAV_HTML = `
    <nav class="bottom-nav" aria-label="主导航">
      <div class="bottom-nav-inner">
        <a class="nav-item" href="index.html" data-nav="discover">
          <span class="nav-emoji" aria-hidden="true">🔍</span>
          <span>发现</span>
        </a>
        <a class="nav-item" href="local.html" data-nav="local">
          <span class="nav-emoji" aria-hidden="true">🍴</span>
          <span>本地推荐</span>
        </a>
        <a class="nav-item" href="guide.html" data-nav="guide">
          <span class="nav-emoji" aria-hidden="true">📖</span>
          <span>出行指南</span>
        </a>
        <a class="nav-item" href="me.html" data-nav="me">
          <span class="nav-emoji" aria-hidden="true">👤</span>
          <span>我的</span>
        </a>
      </div>
    </nav>
  `;

  const PARTIALS = {
    topbar: TOPBAR_HTML,
    bottomnav: BOTTOMNAV_HTML,
  };

  // 注入公共片段
  document.querySelectorAll("[data-include]").forEach((slot) => {
    const key = slot.getAttribute("data-include");
    const html = PARTIALS[key];
    if (html) slot.outerHTML = html;
  });

  // 高亮当前 Tab
  const active = document.body && document.body.dataset ? document.body.dataset.active : "";
  if (active) {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      const key = el.getAttribute("data-nav");
      if (key === active) el.classList.add("is-active");
      else el.classList.remove("is-active");
    });
  }
})();
