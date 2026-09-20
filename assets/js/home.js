'use strict';

/**
 * The home page's interactive layer. Runs once render.js has put the content
 * on the page (the "content:rendered" event):
 *
 *   - sections, headings and cards fade up as they scroll into view
 *   - the hero photo tilts with the mouse
 *   - slider cards open the shared Lightbox instead of leaving the page
 *
 * The experience mini-timeline and the skill counters are drawn by common.js.
 */

(function () {

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;



  /**
   * scroll reveal — a group's children appear one after another when the group
   * scrolls in (so cards sitting off to the side in a slider appear too)
   */

  const reveal = function () {
    const groups = [];
    const single = elem => groups.push([elem, [elem]]);
    const children = elem => elem && groups.push([elem, Array.from(elem.children)]);

    document.querySelectorAll("main .section:not(.hero) :is(.section-subtitle, .section-title, .section-text)").forEach(single);
    children(document.querySelector("[data-projects-list]"));
    children(document.querySelector("[data-certificates-list]"));
    children(document.querySelector("[data-skills-list]"));
    children(document.querySelector("[data-blog-list]"));
    children(document.querySelector("[data-contact-list]"));
    document.querySelectorAll(".contact-form").forEach(single);

    groups.forEach(([, items]) => items.forEach(item => item.classList.add("reveal")));

    if (reduced || !("IntersectionObserver" in window)) {
      groups.forEach(([, items]) => items.forEach(item => item.classList.add("is-revealed")));
      return;
    }

    const byTarget = new Map(groups);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        byTarget.get(entry.target).forEach((item, i) => {
          item.style.transitionDelay = `${Math.min(i, 8) * 90}ms`;
          item.classList.add("is-revealed");
        });
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    byTarget.forEach((items, target) => observer.observe(target));
  }



  /**
   * hero — a gentle tilt on the photo
   */

  const heroTilt = function () {
    const hero = document.querySelector(".hero");
    const banner = document.querySelector("[data-hero-banner]");
    if (!hero || !banner || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    hero.addEventListener("pointermove", event => {
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      banner.style.transform = `perspective(1000px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
    });

    hero.addEventListener("pointerleave", () => { banner.style.transform = ""; });
  }



  /**
   * slider cards open a preview; ctrl / cmd / middle click still opens the link
   */

  const realURL = url => url && !String(url).startsWith("#") ? url : "";

  const sliderPreview = function (selector, entries) {
    const list = document.querySelector(selector);
    if (!list || !entries.length) return;

    list.addEventListener("click", event => {
      const card = event.target.closest(".card-content");
      if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

      event.preventDefault();
      const index = Array.from(list.children).indexOf(card.closest("li"));
      Lightbox.open(entries, Math.max(0, index), card);
    });
  }

  const previews = function (content) {
    sliderPreview("[data-projects-list]", ((content.projects || {}).items || []).map(item => ({
      image: assetPath(item.image),
      title: item.title,
      meta: (item.tags || []).flatMap(tag => String(tag).split("|")).map(tag => tag.trim()).filter(Boolean).join(" · "),
      url: realURL(item.url),
      linkLabel: projectLinkLabel(item.url),
    })));

    sliderPreview("[data-certificates-list]", ((content.certificates || {}).items || []).map(item => ({
      image: assetPath(item.image),
      title: item.title,
      meta: formatDate(item.date),
      url: realURL(item.url),
      linkLabel: "Verify certificate",
    })));
  }



  document.addEventListener("content:rendered", event => {
    const content = event.detail.content || {};
    heroTilt();
    previews(content);
    reveal();
  });

})();
