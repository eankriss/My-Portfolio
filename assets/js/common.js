'use strict';

/**
 * Helpers shared by every page (index.html, blog.html, post.html).
 *
 * Loaded before render.js / blog.js, so the names below are available to them.
 */

const CONTENT_URL = './content/content.json';
const BLOG_URL = './content/blog.json';

/** Escape a value for safe interpolation into HTML. */
const esc = function (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalise an asset path for the page.
 *
 * The CMS stores uploads as absolute paths ("/assets/images/uploads/x.png"),
 * but the site is served from a sub-path on GitHub Pages, so those are made
 * relative. External URLs are left alone.
 */
const assetPath = function (value) {
  const path = String(value || '');
  if (!path || /^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;

  return path.replace(/^\/+/, './');
}

/** "2024-10-02" -> "October 02, 2024" */
const formatDate = function (iso) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!parts) return String(iso || '');

  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return `${months[Number(parts[2]) - 1]} ${parts[3]}, ${parts[1]}`;
}

const setHTML = function (selector, html) {
  const elem = document.querySelector(selector);
  if (elem) elem.innerHTML = html;
}

const setText = function (selector, text) {
  const elem = document.querySelector(selector);
  if (elem) elem.textContent = text;
}

/**
 * Fetch a JSON file. "no-cache" still asks the server every time (so admin
 * edits show up straight away) but reuses the browser's copy when it hasn't
 * changed, which keeps moving between pages quick. Missing files resolve to null.
 */
const loadJSON = function (url) {
  return fetch(url, { cache: "no-cache" })
    .then(response => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    })
    .catch(error => {
      console.error(`Could not load ${url}:`, error);
      return null;
    });
}



/**
 * blog helpers
 */

/** A post's slug, falling back to a slugified title. */
const postSlug = function (post) {
  if (post.slug) return String(post.slug).trim();

  return String(post.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Published posts only, newest first. */
const publishedPosts = function (blog) {
  return ((blog && blog.posts) || [])
    .filter(post => post.published !== false && post.title)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/** "5 min read" — at ~200 words a minute. */
const readingTime = function (post) {
  const words = String(post.body || "").replace(/[#>*_`\[\]()!-]/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/** Card markup for one post — used by the home page and the archive. */
const blogCardHTML = function (post, featured) {
  const href = `./post.html?slug=${encodeURIComponent(postSlug(post))}`;
  const cover = post.cover
    ? `<img src="${esc(assetPath(post.cover))}" width="1080" height="720" loading="lazy" alt="" class="img-cover">`
    : `<span class="post-card-placeholder" aria-hidden="true"><ion-icon name="newspaper-outline"></ion-icon></span>`;
  const tags = (post.tags || []).slice(0, 3);

  return `
    <li class="blog-item${featured ? " is-featured" : ""}">
      <article class="post-card">

        <figure class="post-card-banner">${cover}</figure>

        <div class="post-card-body">
          <p class="post-card-meta">
            <time datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>
            <span aria-hidden="true">·</span>
            <span>${readingTime(post)}</span>
          </p>

          <h3 class="h3 post-card-title">
            <a href="${href}" class="post-card-link">${esc(post.title)}</a>
          </h3>

          ${post.excerpt ? `<p class="post-card-excerpt">${esc(post.excerpt)}</p>` : ""}

          ${tags.length ? `<ul class="post-card-tags">${tags.map(tag => `<li class="post-card-tag">${esc(tag)}</li>`).join("")}</ul>` : ""}

          <span class="post-card-more" aria-hidden="true">
            Read more <ion-icon name="arrow-forward"></ion-icon>
          </span>
        </div>

      </article>
    </li>
  `;
}



/**
 * hide a section that has nothing to show, plus every nav link to it
 * (the links point at the section's own page, e.g. "./projects.html")
 */

const hideSection = function (id, page) {
  const section = document.getElementById(id);
  if (section) section.remove();

  document.querySelectorAll("[data-nav-link]").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (href === `#${id}` || href.endsWith(`index.html#${id}`) || (page && href.endsWith(page))) {
      (link.closest("li") || link).remove();
    }
  });
}

/** Sections (and their pages' nav links) that disappear when their list is emptied in the admin. */
const hideEmptySections = function (content) {
  const sections = [
    ["portfolio", content.projects, "projects.html"],
    ["skills", content.skills, "skills.html"],
    ["work-experience", content.experience, "experience.html"],
    ["certificates", content.certificates, "certifications.html"],
  ];

  sections.forEach(([id, data, page]) => {
    if (!data || !(data.items || []).length) hideSection(id, page);
  });
}



/**
 * "Visit site" for a live website, "View More" for a link to files — Google
 * Drive / Docs, Figma, GitHub repos, Dropbox, OneDrive. GitHub Pages
 * (*.github.io) is a live site, so it keeps "Visit site".
 */

const FILE_HOSTS = /(^|\.)(drive\.google\.com|docs\.google\.com|figma\.com|github\.com|gitlab\.com|bitbucket\.org|dropbox\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com)$/i;

const projectLinkLabel = function (url) {
  try {
    return FILE_HOSTS.test(new URL(url, location.href).hostname) ? "View More" : "Visit site";
  } catch (error) {
    return "Visit site";
  }
}



/**
 * section renderers — used by the home page and by each section's own page
 */

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

/**
 * skill logos — an uploaded logo wins; otherwise a built-in one is looked up
 * by name, and a letter badge stands in when neither exists (or fails to load)
 */

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/';

const SKILL_LOGOS = {
  'wordpress': DEVICON + 'wordpress/wordpress-plain.svg',
  'html': DEVICON + 'html5/html5-original.svg',
  'css': DEVICON + 'css3/css3-original.svg',
  'php': DEVICON + 'php/php-original.svg',
  'mysql': DEVICON + 'mysql/mysql-original.svg',
  'javascript': DEVICON + 'javascript/javascript-original.svg',
  'typescript': DEVICON + 'typescript/typescript-original.svg',
  'elementor': 'https://cdn.simpleicons.org/elementor/92003B',
  'vb.net': DEVICON + 'visualbasic/visualbasic-original.svg',
  'visual basic': DEVICON + 'visualbasic/visualbasic-original.svg',
  'java': DEVICON + 'java/java-original.svg',
  'c++': DEVICON + 'cplusplus/cplusplus-original.svg',
  'c#': DEVICON + 'csharp/csharp-original.svg',
  'python': DEVICON + 'python/python-original.svg',
  'figma': DEVICON + 'figma/figma-original.svg',
  'react': DEVICON + 'react/react-original.svg',
  'node': DEVICON + 'nodejs/nodejs-original.svg',
  'laravel': DEVICON + 'laravel/laravel-original.svg',
  'bootstrap': DEVICON + 'bootstrap/bootstrap-original.svg',
  'tailwind': DEVICON + 'tailwindcss/tailwindcss-original.svg',
  'git': DEVICON + 'git/git-original.svg',
  'shopify': 'https://cdn.simpleicons.org/shopify/7AB55C',
  'photoshop': DEVICON + 'photoshop/photoshop-original.svg',
};

/** "UI/UX (Figma)" -> the figma logo, "HTML & CSS" -> the html logo, … */
const skillLogoURL = function (item) {
  if (item.logo) return assetPath(item.logo);

  const name = String(item.name || '').toLowerCase();
  const words = name.split(/[^a-z0-9.+#]+/).filter(Boolean);

  if (SKILL_LOGOS[name.trim()]) return SKILL_LOGOS[name.trim()];
  const word = words.find(w => SKILL_LOGOS[w]);
  return word ? SKILL_LOGOS[word] : '';
}

const skillLogoHTML = function (item, className) {
  const initial = esc(String(item.name || '?').trim().charAt(0).toUpperCase());
  const url = skillLogoURL(item);
  const badge = `<span class="${className} skill-logo-letter" aria-hidden="true">${initial}</span>`;
  if (!url) return badge;

  // a broken logo swaps itself for the letter badge
  return `<img src="${esc(url)}" alt="" width="40" height="40" loading="lazy" class="${className}"
    onerror="this.outerHTML = this.nextElementSibling.innerHTML"><template>${badge}</template>`;
}



/**
 * count-up animation — any [data-count-to] inside `root` counts from 0 the
 * first time it scrolls into view, setting --progress (0–100) as it goes so
 * bars and rings fill in step with the number
 */

const animateCounters = function (root) {
  const counters = Array.from((root || document).querySelectorAll("[data-count-to]"));
  if (!counters.length) return;

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURATION = 1400;

  const run = function (elem) {
    const target = Number(elem.dataset.countTo) || 0;
    const suffix = elem.dataset.countSuffix || "";
    const meter = elem.closest("[data-meter]") || elem;
    const set = function (value) {
      elem.textContent = Math.round(value) + suffix;
      meter.style.setProperty("--progress", value);
    };

    if (reduced) { set(target); return; }

    const start = performance.now();
    const step = function (now) {
      const t = Math.min((now - start) / DURATION, 1);
      set(target * (1 - Math.pow(1 - t, 3))); // ease-out
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) { counters.forEach(run); return; }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.4 });

  counters.forEach(function (elem) { observer.observe(elem); });
}

const renderSkills = function (skills) {
  const section = document.querySelector("[data-skills-section]");
  if (section && skills.background) {
    section.style.backgroundImage = `url('${assetPath(skills.background)}')`;
  }

  setText("[data-skills-subtitle]", skills.subtitle);
  setText("[data-skills-title]", skills.title);

  const list = document.querySelector("[data-skills-list]");
  if (!list) return;

  list.innerHTML = (skills.items || []).map(item => {
    const level = Math.max(0, Math.min(100, Number(item.level) || 0));

    return `
      <li class="skills-item" data-meter>
        <div class="wrapper">
          <h3 class="skill-title">
            ${skillLogoHTML(item, "skill-logo")}
            <span>${esc(item.name)}</span>
          </h3>

          <data class="skill-value" value="${level}" data-count-to="${level}" data-count-suffix="%">0%</data>
        </div>

        <div class="progress-box">
          <div class="progress"></div>
        </div>
      </li>
    `;
  }).join("");

  animateCounters(list);
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



/**
 * experience timeline — the full one on experience.html and a compact one
 * (.xp-mini) on the home page: newest first, a line that fills as you scroll, cards that reveal on the way
 * down, durations worked out from the period, and optional highlights that
 * open on click
 */

const MONTHS = ["january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"];

/** "March, 2024" / "January 02, 2025" / "Present" -> Date (or null) */
const parseMonth = function (text) {
  const value = String(text || "").toLowerCase();
  if (/present|now|current/.test(value)) return new Date();

  const year = /(\d{4})/.exec(value);
  const month = MONTHS.findIndex(name => value.includes(name.slice(0, 3)));
  if (!year || month < 0) return null;
  return new Date(Number(year[1]), month, 1);
}

/** "March, 2024 - June, 2024" -> { start, end, current, label: "3 mos" } */
const parsePeriod = function (period) {
  const [from, to] = String(period || "").split(/\s[-–—]\s|\sto\s/i);
  const start = parseMonth(from);
  const end = parseMonth(to);
  const current = /present|now|current/i.test(to || "");
  if (!start || !end) return { start, current, label: "" };

  const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + (current ? 1 : 0));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const label = [years && `${years} yr${years > 1 ? "s" : ""}`, rest && `${rest} mo${rest > 1 ? "s" : ""}`]
    .filter(Boolean).join(" ");

  return { start, current, label };
}

const renderExperiencePage = function (experience) {
  const timeline = document.querySelector("[data-xp-timeline]");
  if (!timeline) return;

  const items = (experience.items || [])
    .map(item => Object.assign({}, item, parsePeriod(item.period)))
    .sort((a, b) => (b.start || 0) - (a.start || 0));

  if (!items.length) {
    timeline.insertAdjacentHTML("beforeend", `<li class="page-empty"><p class="section-text">No work experience to show yet — check back soon.</p></li>`);
    return;
  }

  timeline.insertAdjacentHTML("beforeend", items.map((item, index) => {
    const highlights = String(item.description || "").split(/\n+/).map(line => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    const id = `xp-details-${index}`;

    return `
      <li class="xp-item${item.current ? " is-current" : ""}" data-xp-item>
        <span class="xp-dot" aria-hidden="true"></span>

        <article class="xp-card">
          <div class="xp-meta">
            <time class="xp-period">${esc(item.period)}</time>
            ${item.current ? `<span class="xp-badge">Current</span>` : ""}
            ${item.label ? `<span class="xp-duration">${esc(item.label)}</span>` : ""}
          </div>

          <h2 class="h3 xp-role">${esc(item.role)}</h2>

          <p class="xp-company">
            <ion-icon name="business-outline" aria-hidden="true"></ion-icon>
            <span>${esc(item.address)}</span>
          </p>

          ${highlights.length ? `
            <button class="xp-toggle" aria-expanded="false" aria-controls="${id}" data-xp-toggle>
              <span>What I did</span>
              <ion-icon name="chevron-down" aria-hidden="true"></ion-icon>
            </button>

            <div class="xp-details" id="${id}" hidden>
              <ul class="xp-highlights">${highlights.map(line => `<li>${esc(line)}</li>`).join("")}</ul>
            </div>
          ` : ""}
        </article>
      </li>
    `;
  }).join(""));

  // open / close a card's highlights
  timeline.querySelectorAll("[data-xp-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", open);
      document.getElementById(button.getAttribute("aria-controls")).hidden = !open;
    });
  });

  // reveal each entry as it scrolls in
  const entries = timeline.querySelectorAll("[data-xp-item]");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(list => {
      list.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    entries.forEach(entry => observer.observe(entry));
  } else {
    entries.forEach(entry => entry.classList.add("is-visible"));
  }

  // fill the line down to the middle of the screen
  const fill = timeline.querySelector("[data-xp-fill]");
  const updateFill = () => {
    const box = timeline.getBoundingClientRect();
    const progress = (window.innerHeight * 0.6 - box.top) / box.height;
    fill.style.transform = `scaleY(${Math.max(0, Math.min(1, progress))})`;
  };
  window.addEventListener("scroll", updateFill, { passive: true });
  window.addEventListener("resize", updateFill);
  updateFill();
}

/**
 * contact section — home page and single post page
 */

const renderContact = function (contact) {
  setText("[data-contact-subtitle]", contact.subtitle);
  setText("[data-contact-title]", contact.title);
  setText("[data-contact-text]", contact.text);

  setHTML("[data-contact-list]", `
    <li class="contact-item">
      <ion-icon name="location-outline" aria-hidden="true"></ion-icon>

      <address class="contact-link">${esc(contact.address)}</address>
    </li>

    <li class="contact-item">
      <ion-icon name="call-outline" aria-hidden="true"></ion-icon>

      <a href="tel:${esc(contact.phone)}" class="contact-link">${esc(contact.phone)}</a>
    </li>

    <li class="contact-item">
      <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>

      <a href="mailto:${esc(contact.email)}" class="contact-link">${esc(contact.email)}</a>
    </li>
  `);

  const accessKey = document.querySelector("[data-web3forms-key]");
  if (accessKey && contact.web3forms_key) accessKey.value = contact.web3forms_key;
}



/**
 * "Get In Touch" call-to-action — every page except the contact page
 */

const renderCta = function (cta) {
  cta = cta || {};
  setText("[data-cta-subtitle]", cta.subtitle || "Get In Touch");
  setText("[data-cta-title]", cta.title || "Let's work together");
  setText("[data-cta-text]", cta.text || "Have a project in mind or just want to say hello? I'd love to hear from you.");
  setText("[data-cta-button]", cta.button || "Contact Me");
}



/**
 * footer — identical on every page
 */

const renderFooter = function (footer, socials) {
  setHTML("[data-copyright]", `
    ${footer.copyright || ""} <a href="index.html" class="copyright-link">Kryz-Ian.</a>
  `);

  setHTML("[data-social-list]", (socials || []).map(social => `
    <li>
      <a href="${esc(social.url)}" target="_blank" class="social-link" aria-label="${esc(social.label)}">
        <ion-icon name="${esc(social.icon)}"></ion-icon>
      </a>
    </li>
  `).join(""));
}
