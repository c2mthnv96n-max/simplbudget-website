(function () {
  "use strict";

  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");
  var modal = document.getElementById("waitlist-modal");
  var modalClose = document.getElementById("modal-close");
  var waitlistForm = document.getElementById("waitlist-form");
  var formMessage = document.getElementById("form-message");
  var emailInput = document.getElementById("email");
  var submitButton = document.getElementById("waitlist-submit");
  var waitlistTriggers = document.querySelectorAll("[data-waitlist-open]");
  var navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
  var screenTabs = document.querySelectorAll(".screen-tab");
  var screenPanels = document.querySelectorAll(".screen-panel");

  var STORAGE_KEY = "simplbudget_waitlist";
  var API_ENDPOINT = "/api/waitlist";

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
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Join the Waitlist";
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

  function rememberEmail(email) {
    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (err) {
      // localStorage unavailable
    }
  }

  function showFormMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = "form-message " + type;
  }

  function activateScreen(screenId) {
    screenTabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-screen") === screenId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    screenPanels.forEach(function (panel) {
      var isActive = panel.id === "screen-" + screenId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  async function handleWaitlistSubmit(event) {
    event.preventDefault();

    if (!emailInput || !formMessage) return;

    var email = emailInput.value.trim().toLowerCase();
    formMessage.className = "form-message";

    if (!email) {
      showFormMessage("Please enter your email address.", "error");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showFormMessage("Please enter a valid email address.", "error");
      emailInput.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Joining…";
    }

    try {
      var response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });

      var payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to join the waitlist.");
      }

      rememberEmail(email);
      showFormMessage(payload.message || "You're on the list! Check your inbox for a confirmation email.", "success");
      waitlistForm.reset();
      window.setTimeout(closeModal, 2800);
    } catch (error) {
      showFormMessage(
        error.message || "We couldn't complete your signup right now. Please try again shortly.",
        "error",
      );
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Join the Waitlist";
      }
    }
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

  screenTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateScreen(tab.getAttribute("data-screen"));
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });
})();
