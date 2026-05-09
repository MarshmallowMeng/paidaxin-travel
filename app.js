(() => {
  const active = document.body && document.body.dataset ? document.body.dataset.active : "";
  if (!active) return;

  document.querySelectorAll("[data-nav]").forEach((el) => {
    const key = el.getAttribute("data-nav");
    if (key === active) el.classList.add("is-active");
    else el.classList.remove("is-active");
  });
})();

