'use strict';

/**
 * Interactive grids for projects.html and certifications.html:
 *
 *   - filter chips (project tags / certificate years) with animated shuffling
 *   - cards with their caption always visible, revealed one by one on scroll
 *   - a lightbox preview with prev / next, keyboard and swipe support
 *
 * The page's <ul data-gallery="projects|certificates"> says which list to use.
 * Helpers come from common.js.
 */

(function () {

  const grid = document.querySelector("[data-gallery]");
  if (!grid) return;

  const KIND = grid.dataset.gallery;
  const IS_PROJECTS = KIND === "projects";
  const filtersBox = document.querySelector("[data-gallery-filters]");
  const countBox = document.querySelector("[data-gallery-count]");
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** "#portfolio" / "#certificates" are placeholders, not real links. */
  const realURL = url => url && !String(url).startsWith("#") ? url : "";

  /** "WordPress | CMS| Elementor" (possibly several strings) -> ["WordPress", "CMS", "Elementor"] */
  const splitTags = tags => (tags || [])
    .flatMap(tag => String(tag).split("|"))
    .map(tag => tag.trim())
    .filter(Boolean);

  /** "WORDPRESS" -> "WordPress" when another project spells it that way. */
  const tagKey = tag => tag.toUpperCase();

  let items = [];
  let active = "all";



  /**
   * data
   */

  const buildItems = function (content) {
    if (IS_PROJECTS) {
      return ((content.projects || {}).items || []).map(item => ({
        title: item.title,
        image: assetPath(item.image),
        url: realURL(item.url),
        tags: splitTags(item.tags),
      })).map(item => Object.assign(item, { keys: item.tags.map(tagKey) }));
    }

    return ((content.certificates || {}).items || [])
      .map(item => ({
        title: item.title,
        image: assetPath(item.image),
        url: realURL(item.url),
        date: item.date,
        year: String(item.date || "").slice(0, 4),
      }))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .map(item => Object.assign(item, { keys: item.year ? [item.year] : [] }));
  }

  /** Filter chips: project tags used by 2+ projects (most used first), or every year. */
  const buildFilters = function () {
    const counts = new Map();
    const labels = new Map();

    items.forEach(item => {
      (IS_PROJECTS ? item.tags : [item.year]).filter(Boolean).forEach(tag => {
        const key = IS_PROJECTS ? tagKey(tag) : tag;
        counts.set(key, (counts.get(key) || 0) + 1);
        // prefer a mixed-case spelling ("WordPress") over an all-caps one
        if (!labels.has(key) || tag !== tag.toUpperCase()) labels.set(key, tag);
      });
    });

    let keys = Array.from(counts.keys());
    keys = IS_PROJECTS
      ? keys.filter(key => counts.get(key) > 1).sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b))
      : keys.sort((a, b) => b.localeCompare(a));

    return [{ key: "all", label: "All", count: items.length }]
      .concat(keys.map(key => ({ key, label: labels.get(key), count: counts.get(key) })));
  }



  /**
   * render
   */

  const cardHTML = function (item, index) {
    const meta = IS_PROJECTS
      ? `<ul class="g-tags">${item.tags.map(tag => `<li class="g-tag">${esc(tag)}</li>`).join("")}</ul>`
      : `<time class="g-date" datetime="${esc(item.date)}">
           <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>${esc(formatDate(item.date))}
         </time>`;

    const link = item.url
      ? `<a href="${esc(item.url)}" target="_blank" rel="noopener" class="g-link">
           <span>${IS_PROJECTS ? projectLinkLabel(item.url).replace("Visit site", "Visit Site") : "Verify"}</span>
           <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
         </a>`
      : "";

    return `
      <li class="g-item" data-index="${index}">
        <article class="g-card${IS_PROJECTS ? "" : " g-card-cert"}" data-tilt>

          <button class="g-media" aria-label="Preview ${esc(item.title)}" data-open="${index}">
            <img src="${esc(item.image)}" width="1080" height="720" loading="lazy" alt="${esc(item.title)}" class="img-cover">
            <span class="g-zoom" aria-hidden="true"><ion-icon name="expand-outline"></ion-icon></span>
          </button>

          <div class="g-body">
            ${IS_PROJECTS ? "" : `<span class="g-ribbon" aria-hidden="true"><ion-icon name="ribbon-outline"></ion-icon></span>`}
            ${IS_PROJECTS ? "" : meta}
            <h2 class="h3 g-title">${esc(item.title)}</h2>
            ${IS_PROJECTS ? meta : ""}
            ${link}
          </div>

        </article>
      </li>
    `;
  }

  const render = function () {
    if (!items.length) {
      grid.innerHTML = `<li class="page-empty"><p class="section-text">Nothing to show yet — check back soon.</p></li>`;
      return;
    }

    // the most used chips up front; the rest wait behind a "+ more" toggle
    const MAX_CHIPS = 9; // "All" + 8
    const filters = buildFilters();

    filtersBox.innerHTML = filters.map((filter, i) => `
      <button class="filter-chip${filter.key === active ? " active" : ""}" aria-pressed="${filter.key === active}"
        data-filter="${esc(filter.key)}"${i >= MAX_CHIPS ? " data-extra-chip hidden" : ""}>
        ${esc(filter.label)} <span class="filter-chip-count">${filter.count}</span>
      </button>
    `).join("") + (filters.length > MAX_CHIPS
      ? `<button class="filter-chip filter-chip-more" aria-expanded="false" data-more-chips>+ ${filters.length - MAX_CHIPS} more</button>`
      : "");

    grid.innerHTML = items.map(cardHTML).join("");
    updateCount();
    revealOnScroll();
    enableTilt();
  }

  const visibleItems = () => Array.from(grid.querySelectorAll(".g-item:not([hidden])"));

  const updateCount = function () {
    const shown = visibleItems().length;
    const noun = IS_PROJECTS ? "project" : "certificate";
    countBox.textContent = `Showing ${shown} of ${items.length} ${noun}${items.length === 1 ? "" : "s"}`;
  }



  /**
   * filtering — fade the leaving cards out, then fade the new set in, staggered
   */

  let filterTimer;

  const applyFilter = function (key) {
    active = key;

    filtersBox.querySelectorAll("[data-filter]").forEach(chip => {
      const on = chip.dataset.filter === key;
      chip.classList.toggle("active", on);
      chip.setAttribute("aria-pressed", on);
    });

    const cards = Array.from(grid.children);
    const matches = card => key === "all" || items[card.dataset.index].keys.includes(key);

    clearTimeout(filterTimer);
    cards.forEach(card => card.classList.add("is-leaving"));

    filterTimer = setTimeout(() => {
      let order = 0;
      cards.forEach(card => {
        const show = matches(card);
        card.hidden = !show;
        card.classList.remove("is-leaving");
        if (show) {
          card.style.transitionDelay = reduced ? "0ms" : `${Math.min(order++, 12) * 40}ms`;
          card.classList.add("is-visible");
        }
      });
      updateCount();
    }, reduced ? 0 : 220);
  }

  filtersBox && filtersBox.addEventListener("click", event => {
    const more = event.target.closest("[data-more-chips]");
    if (more) {
      const open = more.getAttribute("aria-expanded") !== "true";
      more.setAttribute("aria-expanded", open);
      filtersBox.querySelectorAll("[data-extra-chip]").forEach(chip => { chip.hidden = !open; });
      more.textContent = open ? "Show less" : `+ ${filtersBox.querySelectorAll("[data-extra-chip]").length} more`;
      return;
    }

    const chip = event.target.closest("[data-filter]");
    if (chip && chip.dataset.filter !== active) applyFilter(chip.dataset.filter);
  });



  /**
   * scroll reveal, one card after another
   */

  const revealOnScroll = function () {
    const cards = Array.from(grid.children);

    if (reduced || !("IntersectionObserver" in window)) {
      cards.forEach(card => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, i) => {
        entry.target.style.transitionDelay = `${i * 80}ms`;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    cards.forEach(card => observer.observe(card));
  }



  /**
   * gentle 3D tilt that follows the pointer (mouse only)
   */

  const enableTilt = function () {
    if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    grid.querySelectorAll("[data-tilt]").forEach(card => {
      const max = IS_PROJECTS ? 4 : 7;

      card.addEventListener("pointermove", event => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }



  /**
   * preview — steps through the cards currently shown by the filter
   */

  const entryFor = item => ({
    image: item.image,
    title: item.title,
    meta: IS_PROJECTS ? item.tags.join(" · ") : formatDate(item.date),
    url: item.url,
    linkLabel: IS_PROJECTS ? projectLinkLabel(item.url) : "Verify certificate",
  });

  grid.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open]");
    if (!trigger) return;

    const shown = visibleItems().map(card => items[card.dataset.index]);
    const start = shown.indexOf(items[trigger.dataset.open]);
    Lightbox.open(shown.map(entryFor), Math.max(0, start), trigger);
  });



  /**
   * boot
   */

  loadJSON(CONTENT_URL).then(content => {
    items = buildItems(content || {});
    render();
  });

})();
