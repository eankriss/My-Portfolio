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

const renderProjects = function (projects) {
  setText("[data-projects-subtitle]", projects.subtitle);
  setText("[data-projects-title]", projects.title);

  setHTML("[data-projects-list]", (projects.items || []).map(item => `
    <li class="scrollbar-item">
      <div class="card">

        <figure class="card-banner img-holder" style="--width: 1080; --height: 720;">
          <img src="${esc(assetPath(item.image))}" width="1080" height="675" loading="lazy"
            alt="${esc(item.title)}" class="img-cover">
        </figure>

        <a href="${esc(item.url)}" target="_blank" class="card-content">

          <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>

          <h3 class="h3 card-title">${esc(item.title)}</h3>

          ${(item.tags || []).map(tag => `<p class="card-text">${esc(tag)}</p>`).join("")}

        </a>

      </div>
    </li>
  `).join(""));
}

const renderSkills = function (skills) {
  const section = document.querySelector("[data-skills-section]");
  if (section && skills.background) {
    section.style.backgroundImage = `url('${assetPath(skills.background)}')`;
  }

  setText("[data-skills-subtitle]", skills.subtitle);
  setText("[data-skills-title]", skills.title);

  setHTML("[data-skills-list]", (skills.items || []).map(item => {
    const level = Number(item.level) || 0;

    return `
      <li class="skills-item">
        <div class="wrapper">
          <h3 class="skill-title">${esc(item.name)}</h3>

          <data class="skill-value" value="${level}%">${level}%</data>
        </div>

        <div class="progress-box">
          <div class="progress" style="width: ${level}%"></div>
        </div>
      </li>
    `;
  }).join(""));
}

const renderExperience = function (experience) {
  setText("[data-experience-subtitle]", experience.subtitle);
  setText("[data-experience-title]", experience.title);

  setHTML("[data-experience-list]", (experience.items || []).map(item => `
    <li class="timeline-item">

      <h3 class="item-period">${esc(item.period)}</h3>

      <p class="item-title">${esc(item.role)}</p>

      <p class="item-address">${esc(item.address)}</p>

    </li>
  `).join(""));
}

const renderCertificates = function (certificates) {
  setText("[data-certificates-subtitle]", certificates.subtitle);
  setText("[data-certificates-title]", certificates.title);

  setHTML("[data-certificates-list]", (certificates.items || []).map(item => `
    <li class="scrollbar-item">
      <div class="card news-card">

        <figure class="card-banner img-holder" style="--width: 1080; --height: 720;">
          <img src="${esc(assetPath(item.image))}" width="1080" height="720" loading="lazy"
            alt="${esc(item.title)}" class="img-cover">
        </figure>

        <a href="${esc(item.url)}" target="_blank" class="card-content">

          <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>

          <time class="card-text" datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time>

          <h3 class="h3 card-title">${esc(item.title)}</h3>

        </a>

      </div>
    </li>
  `).join(""));
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

  setHTML("[data-blog-list]", posts.slice(0, 3).map(blogCardHTML).join(""));

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
    renderCertificates(content.certificates || {});
    if (Object.keys(content).length) hideEmptySections(content);
    renderBlog(blog);
    renderContact(content.contact || {});
    renderFooter(content.footer || {}, socials);

    startTyping((content.hero || {}).typed_words);
  });
