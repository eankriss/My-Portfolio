'use strict';

/**
 * Renders the home page from content/content.json and content/blog.json.
 *
 * Everything editable through the admin dashboard (/admin/) lives in those JSON
 * files; this script turns them into the same markup the page used to hardcode,
 * so the existing CSS applies unchanged. Shared helpers live in common.js.
 */



/**
 * section renderers
 */

const renderHero = function (hero, socials) {
  setHTML("[data-hero-banner]", `
    <img src="${esc(assetPath(hero.image))}" width="640" height="840" alt="${esc(hero.name)}" class="img-cover">
  `);

  setText("[data-hero-role]", hero.role_prefix);
  setText("[data-hero-title]", hero.name);

  setHTML("[data-social-buttons]", socials.map(social => `
    <a href="${esc(social.url)}" target="_blank" class="social-icon" aria-label="${esc(social.label)}">
      <ion-icon name="${esc(social.icon)}"></ion-icon>
    </a>
  `).join(""));

  setHTML("[data-hero-contact]", `
    <li>
      <a href="mailto:${esc(hero.email)}" class="list-link">
        <span class="span">${esc(hero.email)}</span>
        <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>
      </a>
    </li>

    <li>
      <a href="tel:${esc(hero.phone)}" class="list-link">
        <span class="span">${esc(hero.phone)}</span>
        <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>
      </a>
    </li>

    <a href="${esc(assetPath(hero.cv_file))}" target="_blank" class="btn download-cv">${esc(hero.cv_label || "Download CV")}</a>
  `);
}

const renderBlog = function (blog) {
  const section = document.querySelector("[data-blog-section]");
  if (!section) return;

  const posts = publishedPosts(blog);

  // Nothing published yet — keep the section (and its nav link) out of the page.
  if (!posts.length) {
    section.remove();
    document.querySelectorAll("[data-blog-nav]").forEach(link => link.remove());
    return;
  }

  setText("[data-blog-subtitle]", (blog && blog.subtitle) || "Blogs");
  setText("[data-blog-title]", (blog && blog.title) || "Latest Posts");

  setHTML("[data-blog-list]", posts.slice(0, 3).map(post => blogCardHTML(post)).join(""));

}



/**
 * typing animation (typed.js is loaded in the page head)
 */

const startTyping = function (words) {
  if (typeof Typed === "undefined" || !words || !words.length) return;

  new Typed("#auto-typed", {
    strings: words,
    typeSpeed: 150,
    backSpeed: 150,
    loop: true,
    cursorChar: '',
  });
}



/**
 * boot
 */

Promise.all([loadJSON(CONTENT_URL), loadJSON(BLOG_URL)])
  .then(([content, blog]) => {
    content = content || {};
    const socials = content.socials || [];

    renderHero(content.hero || {}, socials);
    renderProjects(content.projects || {});
    renderSkills(content.skills || {});
    renderExperience(content.experience || {});
    renderExperiencePage(content.experience || {});
    renderCertificates(content.certificates || {});
    if (Object.keys(content).length) hideEmptySections(content);
    renderBlog(blog);
    renderContact(content.contact || {});
    renderFooter(content.footer || {}, socials);

    startTyping((content.hero || {}).typed_words);

    // home.js adds the interactive layer once everything is on the page
    document.dispatchEvent(new CustomEvent("content:rendered", { detail: { content } }));
  });
