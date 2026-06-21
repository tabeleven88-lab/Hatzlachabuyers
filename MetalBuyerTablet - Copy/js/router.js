// /js/router.js
import { setState } from "./store.js";

let currentPage = "hero";
let isButtonNavigation = false;

export function initRouter() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const pageId = btn.dataset.page;
      showPage(pageId);
    });
  });

  const observer = new IntersectionObserver(
    entries => {
      if (isButtonNavigation) return;

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActivePage(entry.target.id, true);
        }
      });
    },
    { threshold: 0.55 }
  );

  document.querySelectorAll(".page").forEach(page => {
    observer.observe(page);
  });

  const hash = window.location.hash.replace("#", "");
  if (hash) {
    showPage(hash, false);
  } else {
    setActivePage("hero", false);
  }
}

export function showPage(pageId, updateHash = true) {
  const current = document.getElementById(currentPage);
  const next = document.getElementById(pageId);

  if (!next || pageId === currentPage) return;

  isButtonNavigation = true;

  current?.classList.add("route-leaving");
  next.classList.add("route-entering");

  setTimeout(() => {
    next.scrollIntoView({
      behavior: "instant",
      block: "start"
    });

    setActivePage(pageId, updateHash);

    setTimeout(() => {
      current?.classList.remove("route-leaving");
      next.classList.remove("route-entering");
    }, 80);

    setTimeout(() => {
      isButtonNavigation = false;
    }, 1000);
  }, 450);
}

function setActivePage(pageId, updateHash = false) {
  const next = document.getElementById(pageId);
  if (!next) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  currentPage = pageId;

  if (updateHash) {
    history.replaceState(null, "", `#${pageId}`);
  }
}