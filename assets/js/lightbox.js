'use strict';

/**
 * A shared image preview, used by the home page sliders and by the projects /
 * certifications grids.
 *
 *   Lightbox.open(entries, index, trigger)
 *
 * entries: [{ image, title, meta, url, linkLabel }] — prev / next step through
 * them. Keyboard (arrows, Esc) and swipe work; focus returns to `trigger`.
 */

const Lightbox = (function () {

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  document.body.insertAdjacentHTML("beforeend", `
    <div class="lightbox" role="dialog" aria-modal="true" aria-label="preview" hidden data-lightbox>
      <div class="lightbox-backdrop" data-lightbox-close></div>

      <figure class="lightbox-frame">
        <div class="lightbox-media">
          <img src="" alt="" class="lightbox-img" data-lightbox-img>
        </div>

        <figcaption class="lightbox-caption">
          <div>
            <p class="lightbox-meta" data-lightbox-meta></p>
            <h2 class="h3 lightbox-title" data-lightbox-title></h2>
          </div>

          <div class="lightbox-actions">
            <span class="lightbox-counter" data-lightbox-counter></span>
            <a href="#" target="_blank" rel="noopener" class="lightbox-link" data-lightbox-link>
              <span></span>
              <ion-icon name="open-outline" aria-hidden="true"></ion-icon>
            </a>
          </div>
        </figcaption>
      </figure>

      <button class="lightbox-btn lightbox-close" aria-label="close preview" data-lightbox-close>
        <ion-icon name="close" aria-hidden="true"></ion-icon>
      </button>
      <button class="lightbox-btn lightbox-prev" aria-label="previous" data-lightbox-prev>
        <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
      </button>
      <button class="lightbox-btn lightbox-next" aria-label="next" data-lightbox-next>
        <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      </button>
    </div>
  `);

  const box = document.querySelector("[data-lightbox]");
  const img = box.querySelector("[data-lightbox-img]");
  const link = box.querySelector("[data-lightbox-link]");
  let entries = [];
  let current = 0;
  let opener = null;

  const show = function (index) {
    const list = entries;
    if (!list.length) return;

    const position = (index + list.length) % list.length;
    const item = list[position];
    current = position;

    img.classList.remove("is-loaded");
    img.onload = () => img.classList.add("is-loaded");
    img.src = item.image;
    img.alt = item.title;

    box.querySelector("[data-lightbox-title]").textContent = item.title;
    box.querySelector("[data-lightbox-meta]").textContent = item.meta || "";
    box.querySelector("[data-lightbox-counter]").textContent = `${position + 1} / ${list.length}`;

    link.hidden = !item.url;
    link.href = item.url || "#";
    link.querySelector("span").textContent = item.linkLabel || "Open";

    const single = list.length < 2;
    box.querySelector("[data-lightbox-prev]").hidden = single;
    box.querySelector("[data-lightbox-next]").hidden = single;
  }

  const open = function (list, index, trigger) {
    entries = list || [];
    opener = trigger;
    show(index || 0);
    box.hidden = false;
    document.body.classList.add("nav-open"); // reuses the nav's scroll lock
    requestAnimationFrame(() => box.classList.add("is-open"));
    box.querySelector("[data-lightbox-close].lightbox-close").focus();
  }

  const close = function () {
    box.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    setTimeout(() => { box.hidden = true; }, reduced ? 0 : 250);
    if (opener) opener.focus();
  }

  box.querySelectorAll("[data-lightbox-close]").forEach(button => button.addEventListener("click", close));
  box.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(current - 1));
  box.querySelector("[data-lightbox-next]").addEventListener("click", () => show(current + 1));

  document.addEventListener("keydown", event => {
    if (box.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });

  // swipe left / right on touch screens
  let touchX = null;
  box.addEventListener("touchstart", event => { touchX = event.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", event => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  return { open, close };

})();
