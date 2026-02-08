/**
 * Cally Embed Loader Script (~3KB)
 *
 * Usage:
 *
 * Popup mode (booking/contact):
 *   <script src="https://cally.live/embed.js"
 *     data-tenant-id="TENANT_ID"
 *     data-widget="booking"
 *     data-mode="popup">
 *   </script>
 *
 * Inline mode:
 *   <div id="cally-booking"></div>
 *   <script src="https://cally.live/embed.js"
 *     data-tenant-id="TENANT_ID"
 *     data-widget="contact"
 *     data-mode="inline"
 *     data-container="#cally-booking">
 *   </script>
 *
 * Float mode (chat):
 *   <script src="https://cally.live/embed.js"
 *     data-tenant-id="TENANT_ID"
 *     data-widget="chat"
 *     data-mode="float">
 *   </script>
 *
 * Programmatic API:
 *   CallyEmbed.open('booking');
 *   CallyEmbed.close();
 */
(function () {
  "use strict";

  // Prevent double-init
  if (window.CallyEmbed) return;

  const script = document.currentScript;
  if (!script) return;

  const tenantId = script.getAttribute("data-tenant-id");
  const widget = script.getAttribute("data-widget") || "booking";
  const mode = script.getAttribute("data-mode") || "popup";
  const container = script.getAttribute("data-container");

  if (!tenantId) {
    console.error("[CallyEmbed] data-tenant-id is required");
    return;
  }

  // Resolve base URL from script src
  const baseUrl = (function () {
    const src = script.src;
    const url = new URL(src);
    return url.origin;
  })();

  // State
  let overlayEl = null;
  let iframeEl = null;
  let triggerEl = null;
  let floatBubbleEl = null;
  let isOpen = false;

  /**
   * Build the iframe URL for a given widget type
   */
  function getIframeSrc(w) {
    return baseUrl + "/embed/" + tenantId + "/" + w;
  }

  /**
   * Create an iframe element
   */
  function createIframe(w, styles) {
    const iframe = document.createElement("iframe");
    iframe.src = getIframeSrc(w);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("allow", "clipboard-read; clipboard-write; web-share");
    iframe.style.border = "none";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.colorScheme = "normal";
    if (styles) {
      Object.keys(styles).forEach(function (k) {
        iframe.style[k] = styles[k];
      });
    }
    return iframe;
  }

  // ====== POPUP MODE ======

  function initPopup() {
    // Create trigger button
    triggerEl = document.createElement("button");
    triggerEl.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
    if (widget === "contact") {
      triggerEl.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>';
    }
    const btnText = widget === "contact" ? " Contact Us" : " Book Now";
    triggerEl.innerHTML += btnText;
    triggerEl.style.cssText =
      "display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;transition:background 0.2s;";
    triggerEl.onmouseenter = function () {
      triggerEl.style.background = "#4f46e5";
    };
    triggerEl.onmouseleave = function () {
      triggerEl.style.background = "#6366f1";
    };
    triggerEl.onclick = function () {
      openPopup(widget);
    };

    script.parentNode.insertBefore(triggerEl, script.nextSibling);
  }

  function openPopup(w) {
    if (overlayEl) return;
    isOpen = true;

    overlayEl = document.createElement("div");
    overlayEl.style.cssText =
      "position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:callyFadeIn .2s ease;";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:relative;width:90%;max-width:480px;max-height:90vh;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:callySlideUp .25s ease;";

    iframeEl = createIframe(w, { height: "500px", maxHeight: "85vh" });
    panel.appendChild(iframeEl);
    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) closePopup();
    });

    // Inject animation keyframes if not present
    if (!document.getElementById("cally-embed-styles")) {
      const style = document.createElement("style");
      style.id = "cally-embed-styles";
      style.textContent =
        "@keyframes callyFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes callySlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}" +
        "@keyframes callyScaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}";
      document.head.appendChild(style);
    }
  }

  function closePopup() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.remove();
    overlayEl = null;
    iframeEl = null;
  }

  // ====== INLINE MODE ======

  function initInline() {
    const containerEl = container
      ? document.querySelector(container)
      : script.parentNode;
    if (!containerEl) {
      console.error("[CallyEmbed] Container not found:", container);
      return;
    }

    iframeEl = createIframe(widget, {
      minHeight: "400px",
      borderRadius: "8px",
    });
    containerEl.appendChild(iframeEl);
  }

  // ====== FLOAT MODE ======

  function initFloat() {
    // Create floating bubble button
    floatBubbleEl = document.createElement("button");
    floatBubbleEl.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:999998;width:56px;height:56px;border-radius:50%;background:#6366f1;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:all 0.2s;";
    floatBubbleEl.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>';
    floatBubbleEl.onmouseenter = function () {
      floatBubbleEl.style.transform = "scale(1.05)";
    };
    floatBubbleEl.onmouseleave = function () {
      floatBubbleEl.style.transform = "scale(1)";
    };
    floatBubbleEl.onclick = function () {
      toggleFloat();
    };
    document.body.appendChild(floatBubbleEl);
  }

  function toggleFloat() {
    if (isOpen) {
      closeFloat();
    } else {
      openFloat();
    }
  }

  function openFloat() {
    if (iframeEl) return;
    isOpen = true;

    const panel = document.createElement("div");
    panel.id = "cally-float-panel";
    panel.style.cssText =
      "position:fixed;bottom:90px;right:24px;z-index:999999;width:380px;height:520px;max-height:calc(100vh - 120px);border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.2);animation:callyScaleIn .2s ease;";

    iframeEl = createIframe(widget);
    panel.appendChild(iframeEl);
    document.body.appendChild(panel);

    // Update bubble icon to close
    floatBubbleEl.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    floatBubbleEl.style.background = "#4b5563";

    // Inject animation keyframes if not present
    if (!document.getElementById("cally-embed-styles")) {
      const style = document.createElement("style");
      style.id = "cally-embed-styles";
      style.textContent =
        "@keyframes callyFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes callySlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}" +
        "@keyframes callyScaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}";
      document.head.appendChild(style);
    }
  }

  function closeFloat() {
    isOpen = false;
    const panel = document.getElementById("cally-float-panel");
    if (panel) panel.remove();
    iframeEl = null;

    // Restore bubble icon
    if (floatBubbleEl) {
      floatBubbleEl.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>';
      floatBubbleEl.style.background = "#6366f1";
    }
  }

  // ====== postMessage listener ======

  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data.type !== "string") return;
    if (!e.data.type.startsWith("cally:")) return;

    switch (e.data.type) {
      case "cally:close":
        if (mode === "popup") closePopup();
        if (mode === "float") closeFloat();
        break;

      case "cally:resize":
        // Resize iframe height for inline mode
        if (mode === "inline" && iframeEl && e.data.payload) {
          iframeEl.style.height = e.data.payload.height + "px";
        }
        break;

      case "cally:booked":
      case "cally:contacted":
        // Dispatch custom DOM event for host page to listen to
        document.dispatchEvent(
          new CustomEvent(e.data.type, { detail: e.data.payload }),
        );
        break;
    }
  });

  // ====== Public API ======

  window.CallyEmbed = {
    open: function (w) {
      const targetWidget = w || widget;
      if (mode === "popup") openPopup(targetWidget);
      if (mode === "float") openFloat();
    },
    close: function () {
      if (mode === "popup") closePopup();
      if (mode === "float") closeFloat();
    },
    isOpen: function () {
      return isOpen;
    },
  };

  // ====== Init ======

  if (mode === "popup") initPopup();
  else if (mode === "inline") initInline();
  else if (mode === "float") initFloat();
})();
