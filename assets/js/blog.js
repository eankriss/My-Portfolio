'use strict';

/**
 * Drives the two blog pages:
 *
 *   blog.html  — the archive, every published post
 *   post.html  — a single post, chosen by the ?slug= query parameter
 *
 * Both read content/blog.json (edited via /admin/ → Blog) and content.json for
 * the shared footer. Helpers come from common.js.
 */

/** Markdown -> HTML. Uses marked when the CDN script loaded, else a small subset. */
const renderMarkdown = function (markdown) {
  const text = String(markdown || '');
  if (typeof marked !== "undefined") return marked.parse(text);

  // Fallback: headings, bold/italic, links and paragraphs — enough to stay readable.
  return text.split(/\n{2,}/).map(block => {
    const safe = esc(block.trim())
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    const heading = /^(#{1,6})\s+(.*)$/.exec(safe);
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;

    return `<p>${safe.replace(/\n/g, '<br>')}</p>`;
  }).join("\n");
}

const renderArchive = function (blog) {
  const posts = publishedPosts(blog);
  const list = document.querySelector("[data-blog-list]");

  setText("[data-blog-subtitle]", (blog && blog.subtitle) || "Blogs");
  setText("[data-blog-title]", (blog && blog.archive_title) || (blog && blog.title) || "All Posts");

  if (!posts.length) {
    setHTML("[data-blog-list]", `<li class="blog-empty"><p class="section-text">No posts published yet — check back soon.</p></li>`);
    return;
  }

  const toolbar = document.querySelector("[data-blog-toolbar]");
  const search = document.querySelector("[data-blog-search]");
  const tagsBox = document.querySelector("[data-blog-tags]");
  const count = document.querySelector("[data-blog-count]");

  // tag chips, most used first
  const tagCounts = new Map();
  posts.forEach(post => (post.tags || []).forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
  const tags = Array.from(tagCounts.keys()).sort((a, b) => tagCounts.get(b) - tagCounts.get(a) || a.localeCompare(b));

  let activeTag = "all";

  if (toolbar) {
    toolbar.hidden = false;
    tagsBox.innerHTML = tags.length ? [["all", posts.length], ...tags.map(tag => [tag, tagCounts.get(tag)])].map(([tag, n]) => `
      <button class="filter-chip${tag === "all" ? " active" : ""}" aria-pressed="${tag === "all"}" data-tag="${esc(tag)}">
        ${tag === "all" ? "All" : esc(tag)} <span class="filter-chip-count">${n}</span>
      </button>
    `).join("") : "";
  }

  const matches = function (post, query) {
    if (activeTag !== "all" && !(post.tags || []).includes(activeTag)) return false;
    if (!query) return true;
    return [post.title, post.excerpt, (post.tags || []).join(" "), post.body]
      .join(" ").toLowerCase().includes(query);
  };

  // the newest post is featured while nothing is filtered
  const draw = function () {
    const query = search ? search.value.trim().toLowerCase() : "";
    const shown = posts.filter(post => matches(post, query));
    const feature = !query && activeTag === "all" && shown.length > 2;

    list.innerHTML = shown.length
      ? shown.map((post, i) => blogCardHTML(post, feature && i === 0)).join("")
      : `<li class="blog-empty"><p class="section-text">No posts match “${esc(query || activeTag)}”.</p></li>`;

    if (count) count.textContent = `Showing ${shown.length} of ${posts.length} post${posts.length === 1 ? "" : "s"}`;
    revealCards(list);
  };

  if (search) {
    let timer;
    search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
  }

  if (tagsBox) {
    tagsBox.addEventListener("click", event => {
      const chip = event.target.closest("[data-tag]");
      if (!chip) return;
      activeTag = chip.dataset.tag;
      tagsBox.querySelectorAll("[data-tag]").forEach(other => {
        other.classList.toggle("active", other === chip);
        other.setAttribute("aria-pressed", other === chip);
      });
      draw();
    });
  }

  draw();
}

/** Cards fade up one after another as they scroll in. */
const revealCards = function (list) {
  const cards = Array.from(list.children);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cards.forEach(card => card.classList.add("reveal"));

  if (reduced || !("IntersectionObserver" in window)) {
    cards.forEach(card => card.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach((entry, i) => {
      entry.target.style.transitionDelay = `${i * 90}ms`;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  cards.forEach(card => observer.observe(card));
}

const renderPost = function (blog) {
  const slug = new URLSearchParams(location.search).get("slug");
  const posts = publishedPosts(blog);
  const post = posts.find(item => postSlug(item) === slug);

  if (!post) {
    document.title = "Post not found";
    setHTML("[data-post]", `
      <p class="section-subtitle">404</p>
      <h1 class="h2 section-title">That post isn't here</h1>
      <p class="section-text">It may have been unpublished or the link is wrong.</p>
      <p class="post-back"><a href="./blog.html" class="btn">Back to all posts</a></p>
    `);
    return;
  }

  document.title = `${post.title} — Kryz-Ian`;

  const cover = post.cover
    ? `<figure class="post-banner img-holder" style="--width: 1600; --height: 900;">
         <img src="${esc(assetPath(post.cover))}" width="1600" height="900" alt="${esc(post.title)}" class="img-cover">
       </figure>`
    : '';

  const tags = (post.tags || []).length
    ? `<ul class="post-tags">${post.tags.map(tag => `<li class="post-tag">${esc(tag)}</li>`).join("")}</ul>`
    : '';

  setHTML("[data-post]", `
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="./index.html">Home</a>
      <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      <a href="./blog.html">Blogs</a>
      <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      <span aria-current="page">${esc(post.title)}</span>
    </nav>

    <p class="section-subtitle post-meta">
      <time datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>
      <span aria-hidden="true">·</span>
      <span>${readingTime(post)}</span>
    </p>

    <h1 class="h2 section-title post-title">${esc(post.title)}</h1>

    ${tags}

    ${cover}

    <div class="post-body">${renderMarkdown(post.body)}</div>

    ${shareHTML(post)}

    ${postNavHTML(posts, post)}
  `);

  bindShare();
  enhanceBody(post);
  renderToc();
  renderRecent(posts, post);
}

/**
 * post body extras — heading anchors, copy buttons on code blocks, and
 * images that open in the Lightbox
 */

const headingId = function (text, used) {
  let id = String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  while (used.has(id)) id += "-2";
  used.add(id);
  return id;
}

const enhanceBody = function (post) {
  const body = document.querySelector(".post-body");
  if (!body) return;

  const used = new Set();
  body.querySelectorAll("h2, h3").forEach(heading => {
    heading.id = headingId(heading.textContent, used);
    heading.insertAdjacentHTML("beforeend",
      ` <a href="#${heading.id}" class="heading-anchor" aria-label="link to this section">#</a>`);
  });

  body.querySelectorAll("pre").forEach(pre => {
    const wrap = document.createElement("div");
    wrap.className = "code-block";
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    wrap.insertAdjacentHTML("beforeend", `<button class="code-copy" aria-label="copy code">Copy</button>`);

    wrap.querySelector(".code-copy").addEventListener("click", function () {
      const button = this;
      const done = text => { button.textContent = text; setTimeout(() => { button.textContent = "Copy"; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(pre.innerText).then(() => done("Copied!"), () => done("Failed"));
      else done("Failed");
    });
  });

  const images = Array.from(document.querySelectorAll(".post-banner img, .post-body img"));
  const entries = images.map(img => ({ image: img.src, title: img.alt || post.title, meta: post.title }));
  images.forEach((img, index) => {
    img.classList.add("is-zoomable");
    img.tabIndex = 0;
    const open = () => Lightbox.open(entries, index, img);
    img.addEventListener("click", open);
    img.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
  });
}

/** "On this page" — built from the post's h2 / h3, highlights the one being read. */
const renderToc = function () {
  const headings = Array.from(document.querySelectorAll(".post-body :is(h2, h3)"));
  const toc = document.querySelector("[data-post-toc]");
  if (!toc || headings.length < 2) return;

  setHTML("[data-post-toc-list]", headings.map(heading => `
    <li class="post-toc-item${heading.tagName === "H3" ? " is-sub" : ""}">
      <a href="#${heading.id}" class="post-toc-link" data-toc-link>${esc(heading.firstChild.textContent.trim())}</a>
    </li>
  `).join(""));

  toc.hidden = false;
  showAside();

  const links = Array.from(toc.querySelectorAll("[data-toc-link]"));

  // smooth scroll that clears the fixed header
  links.forEach(link => link.addEventListener("click", event => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (!target) return;
    event.preventDefault();
    const header = document.querySelector("[data-header]");
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 20, behavior: "smooth" });
    history.replaceState(null, "", `#${target.id}`);
  }));

  const setActive = () => {
    let current = headings[0];
    headings.forEach(heading => { if (heading.getBoundingClientRect().top < window.innerHeight * 0.3) current = heading; });
    links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${current.id}`));
  };

  window.addEventListener("scroll", setActive, { passive: true });
  setActive();
}

const showAside = function () {
  const aside = document.querySelector("[data-post-aside]");
  const layout = document.querySelector("[data-post-layout]");
  if (!aside) return;
  aside.hidden = false;
  layout.classList.add("has-aside");
}

/** Previous / next post at the end of the article. */
const postNavHTML = function (posts, current) {
  const index = posts.indexOf(current);
  const newer = posts[index - 1];
  const older = posts[index + 1];
  if (!newer && !older) return "";

  const link = (post, direction) => post ? `
    <a href="./post.html?slug=${encodeURIComponent(postSlug(post))}" class="post-nav-link is-${direction}">
      <span class="post-nav-label">
        ${direction === "prev" ? `<ion-icon name="arrow-back" aria-hidden="true"></ion-icon> Older post` : `Newer post <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>`}
      </span>
      <span class="post-nav-title">${esc(post.title)}</span>
    </a>
  ` : `<span></span>`;

  return `<nav class="post-nav" aria-label="more posts">${link(older, "prev")}${link(newer, "next")}</nav>`;
}

/**
 * "Recent blogs" beside the post (under it on mobile) — up to three other
 * posts; hidden when this is the only one.
 */

const renderRecent = function (posts, current) {
  const recent = document.querySelector("[data-post-recent]");
  const others = posts.filter(item => item !== current).slice(0, 3);
  if (!recent || !others.length) return;

  setHTML("[data-post-aside-list]", others.map(post => {
    const href = `./post.html?slug=${encodeURIComponent(postSlug(post))}`;
    const cover = post.cover
      ? `<figure class="recent-card-banner">
           <img src="${esc(assetPath(post.cover))}" width="160" height="120" loading="lazy" alt="" class="img-cover">
         </figure>`
      : '';

    return `
      <li>
        <a href="${href}" class="recent-card">
          ${cover}

          <div class="recent-card-content">
            <time class="recent-card-date" datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>

            <h3 class="recent-card-title">${esc(post.title)}</h3>
          </div>
        </a>
      </li>
    `;
  }).join(""));

  recent.hidden = false;
  showAside();
}

/**
 * share buttons at the end of a post
 */

const shareHTML = function (post) {
  const url = encodeURIComponent(location.href);
  const title = encodeURIComponent(post.title);

  const links = [
    { label: "Facebook", icon: "logo-facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { label: "X", icon: "logo-x", href: `https://x.com/intent/post?url=${url}&text=${title}` },
    { label: "LinkedIn", icon: "logo-linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    { label: "WhatsApp", icon: "logo-whatsapp", href: `https://wa.me/?text=${title}%20${url}` },
    { label: "Email", icon: "mail-outline", href: `mailto:?subject=${title}&body=${url}` },
  ];

  return `
    <div class="post-share">
      <p class="post-share-title">Share this post</p>

      <ul class="post-share-list">
        ${links.map(link => `
          <li>
            <a href="${link.href}" target="_blank" rel="noopener" class="post-share-btn" aria-label="Share on ${link.label}" title="${link.label}">
              <ion-icon name="${link.icon}" aria-hidden="true"></ion-icon>
            </a>
          </li>
        `).join("")}

        <li>
          <button class="post-share-btn" data-copy-link aria-label="Copy link" title="Copy link">
            <ion-icon name="link-outline" aria-hidden="true"></ion-icon>
          </button>
        </li>
      </ul>

      <p class="post-share-status" data-copy-status aria-live="polite"></p>
    </div>
  `;
}

const bindShare = function () {
  const copyBtn = document.querySelector("[data-copy-link]");
  const status = document.querySelector("[data-copy-status]");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", function () {
    const done = function (message) {
      status.textContent = message;
      setTimeout(function () { status.textContent = ""; }, 2000);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href)
        .then(function () { done("Link copied!"); })
        .catch(function () { done("Couldn't copy — copy it from the address bar."); });
    } else {
      done("Couldn't copy — copy it from the address bar.");
    }
  });
}



/**
 * boot
 */

Promise.all([loadJSON(CONTENT_URL), loadJSON(BLOG_URL)])
  .then(([content, blog]) => {
    content = content || {};

    if (document.querySelector("[data-post]")) {
      renderPost(blog);
    } else {
      renderArchive(blog);
    }

    if (Object.keys(content).length) hideEmptySections(content);

    if (document.querySelector("[data-contact-list]")) renderContact(content.contact || {});
    renderCta(content.cta);

    renderFooter(content.footer || {}, content.socials || []);
  });
