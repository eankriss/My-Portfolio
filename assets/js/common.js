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

/** Fetch a JSON file, cache-busted. Missing files resolve to null. */
const loadJSON = function (url) {
  return fetch(`${url}?v=${Date.now()}`)
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

/** Card markup for one post, matching the site's existing card styles. */
const blogCardHTML = function (post) {
  const href = `./post.html?slug=${encodeURIComponent(postSlug(post))}`;
  const cover = post.cover
    ? `<figure class="card-banner img-holder" style="--width: 1080; --height: 720;">
         <img src="${esc(assetPath(post.cover))}" width="1080" height="720" loading="lazy"
           alt="${esc(post.title)}" class="img-cover">
       </figure>`
    : '';

  return `
    <li class="blog-item">
      <div class="card news-card blog-card">

        ${cover}

        <a href="${href}" class="card-content">

          <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>

          <time class="card-text" datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>

          <h3 class="h3 card-title">${esc(post.title)}</h3>

          ${post.excerpt ? `<p class="card-text blog-excerpt">${esc(post.excerpt)}</p>` : ''}

        </a>

      </div>
    </li>
  `;
}



/**
 * hide a home-page section that has nothing to show, plus every nav link to it
 * (on index.html the link is "#id", on the blog pages "./index.html#id")
 */

const hideSection = function (id) {
  const section = document.getElementById(id);
  if (section) section.remove();

  document.querySelectorAll("[data-nav-link]").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (href === `#${id}` || href.endsWith(`index.html#${id}`)) {
      (link.closest("li") || link).remove();
    }
  });
}

/** Home-page sections that disappear when their list is emptied in the admin. */
const hideEmptySections = function (content) {
  const sections = [
    ["portfolio", content.projects],
    ["skills", content.skills],
    ["work-experience", content.experience],
    ["certificates", content.certificates],
  ];

  sections.forEach(([id, data]) => {
    if (!data || !(data.items || []).length) hideSection(id);
  });
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
