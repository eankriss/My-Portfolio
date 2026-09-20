'use strict';



/**
 * add event on element
 */

const addEventOnElem = function (elem, type, callback) {
  if (elem.length > 1) {
    for (let i = 0; i < elem.length; i++) {
      elem[i].addEventListener(type, callback);
    }
  } else {
    elem.addEventListener(type, callback);
  }
}



/**
 * toggle navbar
 */

const navbar = document.querySelector("[data-navbar]");
const navLinks = document.querySelectorAll("[data-nav-link]");
const navToggler = document.querySelector("[data-nav-toggler]");

const navOverlay = document.querySelector("[data-nav-overlay]");

const setNavbar = function (open) {
  navbar.classList.toggle("active", open);
  navToggler.classList.toggle("active", open);
  navOverlay.classList.toggle("active", open);
  document.body.classList.toggle("nav-open", open);
  navToggler.setAttribute("aria-expanded", open);
}

const toggleNavbar = function () { setNavbar(!navbar.classList.contains("active")); }

addEventOnElem(navToggler, "click", toggleNavbar);

const closeNavbar = function () { setNavbar(false); }

addEventOnElem(navOverlay, "click", closeNavbar);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeNavbar();
});

// close the drawer first, then scroll to the section (body is scroll-locked while open)
const goToSection = function (event) {
  const hash = this.getAttribute("href");
  const target = hash && hash.startsWith("#") && document.querySelector(hash);
  if (!target) { closeNavbar(); return; }

  event.preventDefault();
  closeNavbar();

  requestAnimationFrame(function () {
    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    history.replaceState(null, "", hash);
  });
}

addEventOnElem(navLinks, "click", goToSection);
addEventOnElem(document.querySelector("[data-nav-logo]"), "click", goToSection);



/**
 * header active
 */

const header = document.querySelector("[data-header]");

window.addEventListener("scroll", function () {
  if (window.scrollY > 100) {
    header.classList.add("active");
  } else {
    header.classList.remove("active");
  }
});

/**
 * SLIDER ARROWS + PROGRESS
 */

document.querySelectorAll("[data-slider]").forEach(function (slider) {
  const list = slider.querySelector(".has-scrollbar");
  const prev = slider.querySelector("[data-slider-prev]");
  const next = slider.querySelector("[data-slider-next]");
  const thumb = slider.querySelector("[data-slider-thumb]");
  const AUTOPLAY_DELAY = 5000;

  const items = function () { return Array.from(list.children); };
  const maxScroll = function () { return list.scrollWidth - list.clientWidth; };

  // left offset of a card inside the scroll area
  const offsetOf = function (item) { return item.offsetLeft - list.firstElementChild.offsetLeft; };

  // index of the card currently snapped at the left edge
  const currentIndex = function () {
    let index = 0;
    items().forEach(function (item, i) {
      if (offsetOf(item) <= list.scrollLeft + 5) index = i;
    });
    return index;
  };

  // last index that can actually sit at the left edge (the rest are already visible)
  const lastIndex = function () {
    const all = items();
    for (let i = 0; i < all.length; i++) {
      if (offsetOf(all[i]) >= maxScroll() - 5) return i;
    }
    return Math.max(all.length - 1, 0);
  };

  const goTo = function (index) {
    const all = items();
    if (!all.length) return;
    index = Math.max(0, Math.min(index, lastIndex()));
    list.scrollTo({ left: Math.min(offsetOf(all[index]), maxScroll()), behavior: "smooth" });
  };

  const update = function () {
    const max = maxScroll();
    const ratio = list.scrollWidth ? list.clientWidth / list.scrollWidth : 1;
    thumb.style.width = (ratio * 100) + "%";
    thumb.style.left = (max > 0 ? (list.scrollLeft / max) * (1 - ratio) * 100 : 0) + "%";
    prev.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft >= max - 1;
    slider.querySelector(".slider-controls").style.display = max > 0 ? "" : "none";
    slider.querySelector(".slider-arrows").style.display = max > 0 ? "" : "none";
  };

  // autoplay — runs only while the slider is on screen (and the tab is visible);
  // paused while the slider is hovered, focused or touched
  let paused = false;
  let visible = false;
  let timer;

  const stopAutoplay = function () { clearInterval(timer); };

  const restartAutoplay = function () {
    stopAutoplay();
    if (!visible || document.hidden) return;

    timer = setInterval(function () {
      if (paused || maxScroll() <= 0) return;
      goTo(list.scrollLeft >= maxScroll() - 5 ? 0 : currentIndex() + 1);
    }, AUTOPLAY_DELAY);
  };

  const pause = function () { paused = true; };
  const resume = function () { paused = false; };

  slider.addEventListener("mouseenter", pause);
  slider.addEventListener("mouseleave", resume);
  slider.addEventListener("focusin", pause);
  slider.addEventListener("focusout", resume);
  list.addEventListener("touchstart", pause, { passive: true });
  list.addEventListener("touchend", function () { resume(); restartAutoplay(); });

  prev.addEventListener("click", function () { goTo(currentIndex() - 1); restartAutoplay(); });
  next.addEventListener("click", function () { goTo(currentIndex() + 1); restartAutoplay(); });

  list.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  new MutationObserver(update).observe(list, { childList: true });
  update();

  // start counting only once the slider scrolls into view; stop when it leaves
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      restartAutoplay();
    }, { threshold: 0.5 }).observe(slider);
  } else {
    visible = true;
    restartAutoplay();
  }

  document.addEventListener("visibilitychange", restartAutoplay);
});


/**
 * highlight the nav link of the section in view
 */

// only in-page links (#section) — on other pages the active link is set in the HTML
const sectionLinks = Array.from(document.querySelectorAll("[data-nav-link]"))
  .filter(function (link) { return link.getAttribute("href").startsWith("#"); });

const setActiveLink = function () {
  if (!sectionLinks.length) return;
  const offset = window.innerHeight * 0.35;
  let current = sectionLinks[0];

  sectionLinks.forEach(function (link) {
    const section = document.querySelector(link.getAttribute("href"));
    if (section && section.offsetParent !== null && section.getBoundingClientRect().top <= offset) {
      current = link;
    }
  });

  sectionLinks.forEach(function (link) { link.classList.toggle("active", link === current); });
};

window.addEventListener("scroll", setActiveLink, { passive: true });
window.addEventListener("load", setActiveLink);



/**
 * light / dark theme toggle
 * (the initial theme is applied by an inline script in <head>)
 */

const themeToggle = document.querySelector("[data-theme-toggle]");

const applyTheme = function (theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", theme === "dark" ? "switch to light mode" : "switch to dark mode");
  }
};

if (themeToggle) {
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");

  themeToggle.addEventListener("click", function () {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
}



/**
 * scroll progress bar + back-to-top button (every page)
 */

document.body.insertAdjacentHTML("beforeend", `
  <div class="scroll-progress" aria-hidden="true"><span data-scroll-progress></span></div>
  <button class="back-to-top" aria-label="back to top" data-back-to-top>
    <ion-icon name="arrow-up" aria-hidden="true"></ion-icon>
  </button>
`);

const scrollBar = document.querySelector("[data-scroll-progress]");
const backToTop = document.querySelector("[data-back-to-top]");

const updateScrollUI = function () {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollBar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  backToTop.classList.toggle("is-shown", window.scrollY > 600);
};

window.addEventListener("scroll", updateScrollUI, { passive: true });
window.addEventListener("resize", updateScrollUI);
updateScrollUI();

backToTop.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});



/**
 * contact form — checked in the page, sent in the background (Web3Forms JSON
 * API), with a spinner and an inline success / error message
 */

const contactForm = document.getElementById("contactForm");

if (contactForm) {
  const submitBtn = contactForm.querySelector(".submit-btn");
  contactForm.setAttribute("novalidate", "");
  contactForm.insertAdjacentHTML("beforeend", `<p class="form-status" role="status" aria-live="polite" data-form-status></p>`);
  const status = contactForm.querySelector("[data-form-status]");

  const setStatus = function (type, message) {
    status.className = `form-status${type ? " is-" + type : ""}`;
    status.textContent = message;
  };

  const fieldError = function (field) {
    if (field.validity.valueMissing) return `Please enter your ${field.getAttribute("aria-label")}.`;
    if (field.validity.typeMismatch) return "Please enter a valid email address.";
    return "";
  };

  // clear a field's error as soon as it's fixed
  contactForm.addEventListener("input", function (event) {
    const field = event.target;
    if (field.classList.contains("is-invalid") && !fieldError(field)) {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
    }
  });

  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fields = Array.from(contactForm.querySelectorAll(".input-field"));
    const invalid = fields.filter(function (field) {
      const bad = Boolean(fieldError(field));
      field.classList.toggle("is-invalid", bad);
      if (bad) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid");
      return bad;
    });

    if (invalid.length) {
      setStatus("error", fieldError(invalid[0]));
      invalid[0].focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    setStatus("", "Sending…");

    fetch(contactForm.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || result.data.success === false) throw new Error(result.data.message || "Request failed");
        contactForm.reset();
        contactForm.classList.add("is-sent");
        setTimeout(function () { contactForm.classList.remove("is-sent"); }, 1600);
        setStatus("success", "Thanks! Your message has been sent — I'll get back to you soon.");
      })
      .catch(function () {
        setStatus("error", "Sorry, your message couldn't be sent. Please try again, or email me directly.");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
      });
  });
}
