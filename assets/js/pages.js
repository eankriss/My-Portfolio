'use strict';

/**
 * Drives the section pages — projects.html, skills.html, experience.html,
 * certifications.html and contact.html.
 *
 * Each page renders only the section it holds (the renderers skip selectors
 * that aren't on the page), plus the "Get In Touch" band, the shared footer
 * and the nav. Helpers and renderers come from common.js.
 */

/** Shown in place of a list the admin has emptied. */
const showEmpty = function (selector, message) {
  const list = document.querySelector(selector);
  if (list && !list.children.length) {
    list.innerHTML = `<li class="page-empty"><p class="section-text">${esc(message)}</p></li>`;
  }
}

/**
 * skills.html has its own layout (the home page keeps the dark progress-bar
 * section): a stats row, then one card per skill with a progress ring,
 * strongest first.
 */
const renderSkillsPage = function (skills) {
  const grid = document.querySelector("[data-skills-grid]");
  if (!grid) return;

  const items = (skills.items || [])
    .map(item => ({ name: item.name, logo: item.logo, level: Math.max(0, Math.min(100, Number(item.level) || 0)) }))
    .sort((a, b) => b.level - a.level);

  if (!items.length) return;

  const average = Math.round(items.reduce((sum, item) => sum + item.level, 0) / items.length);
  const expert = items.filter(item => item.level >= 90).length;

  setHTML("[data-skills-stats]", [
    [items.length, "", "Skills & tools"],
    [average, "%", "Average proficiency"],
    [expert, "", "At expert level (90%+)"],
  ].map(([value, suffix, label]) => `
    <li class="skills-stat">
      <span class="skills-stat-value" data-count-to="${value}" data-count-suffix="${suffix}">0${suffix}</span>
      <span class="skills-stat-label">${esc(label)}</span>
    </li>
  `).join(""));

  grid.innerHTML = items.map(item => `
    <li class="skill-card" data-meter>
      <div class="skill-card-head">
        ${skillLogoHTML(item, "skill-card-logo")}

        <div class="skill-ring" role="img" aria-label="${esc(item.name)}: ${item.level}%">
          <span class="skill-ring-value" data-count-to="${item.level}" data-count-suffix="%">0%</span>
        </div>
      </div>

      <h3 class="h3 skill-card-title">${esc(item.name)}</h3>

      <div class="skill-card-bar"><span></span></div>
    </li>
  `).join("");

  animateCounters(document.querySelector("[data-skills-stats]"));
  animateCounters(grid);
}

/**
 * contact.html — contact cards (tap to copy / open the map), social links,
 * and a message character counter
 */

const renderContactPage = function (contact, socials) {
  const methods = document.querySelector("[data-contact-methods]");
  if (!methods) return;

  const cards = [
    contact.email && { icon: "mail-outline", label: "Email", value: contact.email, href: `mailto:${contact.email}`, copy: true },
    contact.phone && { icon: "call-outline", label: "Phone", value: contact.phone, href: `tel:${contact.phone}`, copy: true },
    contact.address && {
      icon: "location-outline", label: "Location", value: contact.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`, external: true,
    },
  ].filter(Boolean);

  methods.innerHTML = cards.map(card => `
    <li>
      <div class="method-card">
        <span class="method-icon"><ion-icon name="${card.icon}" aria-hidden="true"></ion-icon></span>

        <a href="${esc(card.href)}" class="method-body"${card.external ? ' target="_blank" rel="noopener"' : ""}>
          <span class="method-label">${esc(card.label)}</span>
          <span class="method-value">${esc(card.value)}</span>
        </a>

        ${card.copy
          ? `<button class="method-action" data-copy="${esc(card.value)}" aria-label="copy ${esc(card.label.toLowerCase())}">
               <ion-icon name="copy-outline" aria-hidden="true"></ion-icon>
               <span class="method-tip" data-copy-tip>Copy</span>
             </button>`
          : `<a href="${esc(card.href)}" target="_blank" rel="noopener" class="method-action" aria-label="open in Google Maps">
               <ion-icon name="map-outline" aria-hidden="true"></ion-icon>
               <span class="method-tip">Open map</span>
             </a>`}
      </div>
    </li>
  `).join("");

  // copy to clipboard, with a "Copied!" tip
  methods.addEventListener("click", event => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;

    const tip = button.querySelector("[data-copy-tip]");
    const done = ok => {
      tip.textContent = ok ? "Copied!" : "Press Ctrl+C";
      button.classList.add("is-copied");
      setTimeout(() => { tip.textContent = "Copy"; button.classList.remove("is-copied"); }, 1800);
    };

    if (navigator.clipboard) navigator.clipboard.writeText(button.dataset.copy).then(() => done(true), () => done(false));
    else done(false);
  });

  setHTML("[data-contact-socials]", (socials || []).map(social => `
    <li>
      <a href="${esc(social.url)}" target="_blank" rel="noopener" class="contact-social" aria-label="${esc(social.label)}">
        <ion-icon name="${esc(social.icon)}" aria-hidden="true"></ion-icon>
      </a>
    </li>
  `).join(""));

  // message character counter
  const message = document.getElementById("message");
  const counter = document.querySelector("[data-char-count]");
  const max = Number(message.getAttribute("maxlength")) || 1000;
  const count = () => {
    counter.textContent = `${message.value.length} / ${max}`;
    counter.classList.toggle("is-near", message.value.length > max * 0.9);
  };
  message.addEventListener("input", count);
  document.getElementById("contactForm").addEventListener("reset", () => setTimeout(count));
}

Promise.all([loadJSON(CONTENT_URL), loadJSON(BLOG_URL)])
  .then(([content, blog]) => {
    content = content || {};

    renderProjects(content.projects || {});
    renderSkills(content.skills || {});
    renderSkillsPage(content.skills || {});
    renderExperience(content.experience || {});
    renderExperiencePage(content.experience || {});
    renderCertificates(content.certificates || {});
    renderContact(content.contact || {});
    renderContactPage(content.contact || {}, content.socials || []);
    renderCta(content.cta);
    renderFooter(content.footer || {}, content.socials || []);

    if (Object.keys(content).length) hideEmptySections(content);
    if (!publishedPosts(blog).length) {
      document.querySelectorAll("[data-blog-nav]").forEach(link => link.remove());
    }

    showEmpty("[data-projects-list]", "No projects to show yet — check back soon.");
    showEmpty("[data-skills-grid]", "No skills to show yet — check back soon.");
    showEmpty("[data-certificates-list]", "No certifications to show yet — check back soon.");
  });
