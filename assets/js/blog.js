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

  setText("[data-blog-subtitle]", (blog && blog.subtitle) || "Blogs");
  setText("[data-blog-title]", (blog && blog.archive_title) || (blog && blog.title) || "All Posts");

  if (!posts.length) {
    setHTML("[data-blog-list]", `<li class="blog-empty"><p class="section-text">No posts published yet — check back soon.</p></li>`);
    return;
  }

  setHTML("[data-blog-list]", posts.map(blogCardHTML).join(""));
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
    <p class="section-subtitle">
      <time datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>
    </p>

    <h1 class="h2 section-title post-title">${esc(post.title)}</h1>

    ${tags}

    ${cover}

    <div class="post-body">${renderMarkdown(post.body)}</div>

    ${shareHTML(post)}
  `);

  bindShare();
  renderRecent(posts, post);
}

/**
 * "Recent blogs" beside the post (under it on mobile) — up to three other
 * posts; hidden when this is the only one.
 */

const renderRecent = function (posts, current) {
  const aside = document.querySelector("[data-post-aside]");
  const layout = document.querySelector("[data-post-layout]");
  const others = posts.filter(item => item !== current).slice(0, 3);
  if (!aside || !others.length) return;

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

  aside.hidden = false;
  layout.classList.add("has-aside");
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

    renderFooter(content.footer || {}, content.socials || []);
  });
