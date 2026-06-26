(function () {
  "use strict";

  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");
  var modal = document.getElementById("waitlist-modal");
  var modalClose = document.getElementById("modal-close");
  var waitlistForm = document.getElementById("waitlist-form");
  var formMessage = document.getElementById("form-message");
  var emailInput = document.getElementById("email");
  var waitlistTriggers = document.querySelectorAll("[data-waitlist-open]");
  var navLinks = siteNav ? siteNav.querySelectorAll("a") : [];

  var STORAGE_KEY = "simplbudget_waitlist";

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (emailInput) {
      emailInput.focus();
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (formMessage) {
      formMessage.textContent = "";
      formMessage.className = "form-message";
    }
    if (waitlistForm) {
      waitlistForm.reset();
    }
  }

  function closeNav() {
    if (!siteNav || !navToggle) return;
    siteNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  function toggleNav() {
    if (!siteNav || !navToggle) return;
    var isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function handleWaitlistSubmit(event) {
    event.preventDefault();

    if (!emailInput || !formMessage) return;

    var email = emailInput.value.trim();

    formMessage.className = "form-message";

    if (!email) {
      formMessage.textContent = "Please enter your email address.";
      formMessage.classList.add("error");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      formMessage.textContent = "Please enter a valid email address.";
      formMessage.classList.add("error");
      emailInput.focus();
      return;
    }

    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (err) {
      // localStorage unavailable — still show success
    }

    formMessage.textContent = "You're on the list! We'll be in touch soon.";
    formMessage.classList.add("success");
    waitlistForm.reset();

    window.setTimeout(closeModal, 2400);
  }

  if (navToggle) {
    navToggle.addEventListener("click", toggleNav);
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  waitlistTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", openModal);
  });

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  if (waitlistForm) {
    waitlistForm.addEventListener("submit", handleWaitlistSubmit);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });
})();
