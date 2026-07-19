(function () {
  "use strict";

  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");
  var modal = document.getElementById("waitlist-modal");
  var modalClose = document.getElementById("modal-close");
  var waitlistForm = document.getElementById("waitlist-form");
  var formMessage = document.getElementById("form-message");
  var firstNameInput = document.getElementById("first_name");
  var lastNameInput = document.getElementById("last_name");
  var emailInput = document.getElementById("email");
  var consentInput = document.getElementById("consent");
  var submitButton = document.getElementById("waitlist-submit");
  var waitlistTriggers = document.querySelectorAll("[data-waitlist-open]");
  var navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
  var screenTabs = document.querySelectorAll(".screen-tab");
  var screenPanels = document.querySelectorAll(".screen-panel");

  var STORAGE_KEY = "simplbudget_waitlist";
  var cfg = window.SIMPLBUDGET_CONFIG || {};
  var API_ENDPOINT = cfg.waitlistEndpoint || "/api/waitlist";
  var ANON_KEY = cfg.supabaseAnonKey || "";
  var SUCCESS_MESSAGE =
    "You're on the list!\nWe'll let you know as soon as SimplBudget is ready.";
  var DUPLICATE_MESSAGE =
    "You're already on the waitlist. We'll contact you when invitations begin.";
  var SERVER_MESSAGE =
    "We're having trouble processing signups right now. Please try again in a few minutes.";
  var INVALID_EMAIL_MESSAGE = "Please enter a valid email address.";

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (firstNameInput) {
      firstNameInput.focus();
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

    var firstName = (firstNameInput && firstNameInput.value || "").trim();
    var lastName = (lastNameInput && lastNameInput.value || "").trim();
    var email = emailInput.value.trim().toLowerCase();
    var consent = !!(consentInput && consentInput.checked);

    formMessage.className = "form-message";

    if (!firstName) {
      showFormMessage("Please enter your first name.", "error");
      if (firstNameInput) firstNameInput.focus();
      return;
    }
    if (!lastName) {
      showFormMessage("Please enter your last name.", "error");
      if (lastNameInput) lastNameInput.focus();
      return;
    }
    if (!email) {
      showFormMessage("Please enter your email address.", "error");
      emailInput.focus();
      return;
    }
    if (!isValidEmail(email)) {
      showFormMessage(INVALID_EMAIL_MESSAGE, "error");
      emailInput.focus();
      return;
    }
    if (!consent) {
      showFormMessage("Please agree to the privacy policy to continue.", "error");
      if (consentInput) consentInput.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Joining…";
    }

    try {
      var headers = { "Content-Type": "application/json" };
      if (ANON_KEY) {
        headers.apikey = ANON_KEY;
        headers.Authorization = "Bearer " + ANON_KEY;
      }

      var response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          consent: true,
          source: "website",
        }),
      });

      var payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || SERVER_MESSAGE);
      }

      rememberEmail(email);
      var message = payload.duplicate
        ? (payload.message || DUPLICATE_MESSAGE)
        : (payload.message || SUCCESS_MESSAGE);
      showFormMessage(message, "success");
      waitlistForm.reset();
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "You're on the list";
      }
      window.setTimeout(closeModal, 3200);
    } catch (error) {
      var errText = error && error.message ? error.message : SERVER_MESSAGE;
      if (/couldn't complete|try again shortly/i.test(errText)) {
        errText = SERVER_MESSAGE;
      }
      showFormMessage(errText, "error");
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

  // Deep-link support: /#waitlist opens the modal.
  if (window.location.hash === "#waitlist") {
    openModal();
  }
})();
