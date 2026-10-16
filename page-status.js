
/*
  CENTRAL PAGE STATUS CONTROL

  available   = page works normally
  unavailable = show an unavailable notice
  hidden      = hide the page and its navigation links
*/

const PAGE_STATUS = {
    "index.html": "available",
    "notes.html": "available",
    "share-notes.html": "available",
    "contributors.html": "unavailable",
    "polls.html": "hidden",
    "about.html": "available"
};

(function () {
    "use strict";

    const HIDDEN_CLASS = "page-status-hidden";

    // Add the hiding rule once, including for navigation added later.
    if (!document.getElementById("page-status-style")) {
        const style = document.createElement("style");
        style.id = "page-status-style";
        style.textContent = `
            .${HIDDEN_CLASS} {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function getPageName(href) {
        try {
            const url = new URL(href, window.location.href);

            if (url.origin !== window.location.origin) {
                return null;
            }

            const lastPart =
                url.pathname.split("/").filter(Boolean).pop() || "";

            return lastPart.endsWith(".html")
                ? lastPart
                : "index.html";
        } catch (_) {
            return null;
        }
    }

    function applyNavigationVisibility(root) {
        const links = [];

        if (root.matches && root.matches("a[href]")) {
            links.push(root);
        }

        if (root.querySelectorAll) {
            links.push(...root.querySelectorAll("a[href]"));
        }

        links.forEach(function (link) {
            const page = getPageName(link.getAttribute("href"));

            if (!page) return;

            if (PAGE_STATUS[page] === "hidden") {
                link.classList.add(HIDDEN_CLASS);
                link.setAttribute("aria-hidden", "true");
                link.setAttribute("tabindex", "-1");
            } else {
                link.classList.remove(HIDDEN_CLASS);
                link.removeAttribute("aria-hidden");
                link.removeAttribute("tabindex");
            }
        });
    }

    function initializePageStatus() {
        applyNavigationVisibility(document);

        // Also handle navigation links inserted or rebuilt later.
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        applyNavigationVisibility(node);
                    }
                });

                if (
                    mutation.type === "attributes" &&
                    mutation.target.matches("a[href]")
                ) {
                    applyNavigationVisibility(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["href"]
        });

        const pathParts =
            window.location.pathname.split("/").filter(Boolean);
        const currentPage =
            pathParts[pathParts.length - 1] || "index.html";
        const status = PAGE_STATUS[currentPage] || "available";

        if (status === "unavailable" || status === "hidden") {
            const notice = document.createElement("section");

            notice.style.cssText =
                "max-width:760px;margin:60px auto;padding:32px 24px;" +
                "text-align:center;border:1px solid #8b5cf6;" +
                "border-radius:18px;background:#171526;color:#fff;" +
                "font-family:inherit;";

            notice.innerHTML =
                "<h2 style='margin-top:0'>Page temporarily unavailable</h2>" +
                "<p style='color:#c4b5fd'>" +
                "We're working on this page. Please check back later." +
                "</p>";

            const main = document.querySelector("main");

            if (main) {
                main.replaceChildren(notice);
            } else {
                document.body.replaceChildren(notice);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializePageStatus,
            { once: true }
        );
    } else {
        initializePageStatus();
    }
})();
