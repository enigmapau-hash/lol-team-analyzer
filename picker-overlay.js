(() => {
  const MENU_IDS = ["topMenu", "jungleMenu", "midMenu", "botlineMenu", "supportMenu"];
  const MOBILE_QUERY = "(max-width: 720px)";
  const backdrop = document.createElement("div");
  const observedMenus = [];

  backdrop.className = "picker-backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.style.position = "fixed";
  backdrop.style.inset = "0";
  backdrop.style.zIndex = "9998";
  backdrop.style.background = "rgba(5, 8, 12, 0.62)";
  backdrop.style.backdropFilter = "blur(2px)";
  backdrop.style.webkitBackdropFilter = "blur(2px)";
  backdrop.style.display = "none";
  backdrop.style.pointerEvents = "auto";

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.contains(backdrop)) {
      document.body.appendChild(backdrop);
    }
  });

  function mobileSheetEnabled() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function getMenus() {
    return MENU_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  }

  function clearMobileStyles(menu) {
    menu.classList.remove("is-mobile-sheet");
    menu.style.removeProperty("bottom");
    menu.style.removeProperty("left");
    menu.style.removeProperty("right");
    menu.style.removeProperty("transform");
    menu.style.removeProperty("width");
    menu.style.removeProperty("max-width");
    menu.style.removeProperty("max-height");
    menu.style.removeProperty("border-radius");
  }

  function applyMobileStyles(menu) {
    const viewportWidth = window.innerWidth;
    const sheetWidth = Math.min(560, Math.max(240, viewportWidth - 24));
    menu.classList.add("is-mobile-sheet");
    menu.style.position = "fixed";
    menu.style.left = "50%";
    menu.style.right = "auto";
    menu.style.transform = "translateX(-50%)";
    menu.style.bottom = "12px";
    menu.style.top = "auto";
    menu.style.width = `${sheetWidth}px`;
    menu.style.maxWidth = `${sheetWidth}px`;
    menu.style.maxHeight = "min(60vh, 420px)";
    menu.style.borderRadius = "20px";
    menu.style.zIndex = "9999";
  }

  function syncOverlay() {
    const menus = getMenus();
    const anyOpen = menus.some((menu) => !menu.hidden);
    const mobile = mobileSheetEnabled();

    for (const menu of menus) {
      if (menu.hidden) {
        clearMobileStyles(menu);
        continue;
      }

      if (mobile) {
        applyMobileStyles(menu);
      } else {
        clearMobileStyles(menu);
      }
    }

    backdrop.hidden = !(anyOpen && mobile);
    backdrop.style.display = anyOpen && mobile ? "block" : "none";
    document.body.classList.toggle("picker-open", anyOpen);
  }

  let scheduled = false;
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      syncOverlay();
    });
  }

  function attachObservers() {
    const menus = getMenus();
    if (!menus.length) {
      window.setTimeout(attachObservers, 100);
      return;
    }

    for (const menu of menus) {
      if (observedMenus.includes(menu)) continue;
      observedMenus.push(menu);
      const observer = new MutationObserver(scheduleSync);
      observer.observe(menu, {
        attributes: true,
        attributeFilter: ["hidden", "style", "class"],
      });
    }

    scheduleSync();
  }

  backdrop.addEventListener("pointerdown", scheduleSync);
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("orientationchange", scheduleSync, { passive: true });
  window.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
  document.addEventListener("focusin", scheduleSync, { passive: true });
  document.addEventListener("click", scheduleSync, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachObservers, { once: true });
  } else {
    attachObservers();
  }

  window.__lolTeamAnalyzerPickerOverlay = { syncOverlay, scheduleSync };
})();