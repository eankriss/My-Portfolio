# Portfolio Admin Dashboard

The site's content now lives in **`content/content.json`** instead of being hardcoded in
`index.html`. `assets/js/render.js` reads that file at page load and builds the markup, so
the CSS and the look of the site are unchanged.

You edit that content through a dashboard at **`/admin/`**, powered by
[Sveltia CMS](https://github.com/sveltia/sveltia-cms) — a Decap/Netlify-CMS-compatible editor
that signs in to GitHub through its own hosted auth service, so there is no server to run.

## One-time setup

1. Push these files to `main` and let GitHub Pages deploy.
2. Authorize the Sveltia auth app once: visit
   `https://eankriss.github.io/My-Portfolio/admin/`, click **Sign in with GitHub**, and
   approve access to the `My-Portfolio` repository.

That's it. No OAuth app, no backend, no extra hosting.

## Daily use

- Go to `https://eankriss.github.io/My-Portfolio/admin/`.
- Open **Site Content → Portfolio Content** for the page itself, or **Blog → Blog Posts**
  for articles.
- Edit any section: hero photo and details, social links, projects, skills, work experience,
  certifications, contact info, footer.
- Add a project or certificate with **Add item**, and upload its image right in the form —
  it is committed to `assets/images/uploads/`.
- Click **Save**. Sveltia commits to `main`; GitHub Pages rebuilds in roughly 30–60 seconds,
  then the change is live.

## Writing a blog post

- Go to **Blog → Blog Posts → Posts → Add Post**.
- Fill in the title, a **URL slug** (lowercase with dashes — it becomes
  `post.html?slug=your-slug`, so don't change it after sharing the link), the date, an
  optional cover image, a short excerpt for the cards, tags, and the body in markdown.
- Leave **Published** on to put it live; turn it off to park a draft — unpublished posts are
  invisible to the site.
- The home page shows the three newest published posts and a **See more posts** button
  (the button appears once there is a fourth post). With no published posts at all, the whole
  blog section and its nav link are removed from the home page.
- `blog.html` lists every published post; `post.html` renders one.

Because every save is a git commit, you have full history and can revert anything from GitHub.

## Editing locally

`fetch()` cannot read files over `file://`, so opening `index.html` by double-clicking will
show an empty page. Run a local server from the project folder instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

To run the dashboard against your local files (no commits, edits written straight to disk),
`local_backend: true` is already set in `admin/config.yml` — just open
`http://localhost:8000/admin/` and choose **Work with Local Repository**.

## What is where

| File | Purpose |
| --- | --- |
| `content/content.json` | All editable content |
| `content/blog.json` | Blog posts |
| `assets/js/common.js` | Helpers shared by every page |
| `assets/js/render.js` | Renders the home page from that JSON |
| `assets/js/blog.js` | Renders `blog.html` and `post.html` |
| `blog.html` | Blog archive |
| `post.html` | Single post template |
| `admin/index.html` | Loads the dashboard |
| `admin/config.yml` | Defines the dashboard's fields |
| `assets/images/uploads/` | Images uploaded through the dashboard |

## Not editable from the dashboard

The nav bar links, the page layout, and the CSS are still in `index.html` /
`assets/css/style.css` — they change rarely and are tied to the design.
