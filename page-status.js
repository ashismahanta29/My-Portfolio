
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
    "polls.html": "unavailable"
};

(function () {
    const path = window.location.pathname;
    const lastPart = path.split("/").filter(Boolean).pop() || "";
    const currentPage = lastPart.endsWith(".html")
        ? lastPart
        : "index.html";

    const status = PAGE_STATUS[currentPage] || "available";

    // Hide navigation links for hidden pages.
    document.querySelectorAll("a[href]").forEach(function (link) {
        try {
            const url = new URL(link.href, window.location.href);

            if (url.origin !== window.location.origin) return;

            const parts = url.pathname.split("/").filter(Boolean);
            const page = (parts.pop() || "").endsWith(".html")
                ? parts[parts.length] // Replaced below for clarity
                : "index.html";

            const targetPage = url.pathname.split("/").filter(Boolean).pop() || "";
            const resolvedPage = targetPage.endsWith(".html")
                ? targetPage
                : "index.html";

            if (PAGE_STATUS[resolvedPage] === "hidden") {
                link.style.display = "none";
            }
        } catch (error) {
            // Ignore links that cannot be resolved.
        }
    });

    // Show a notice when the current page is unavailable or hidden.
    if (status === "unavailable" || status === "hidden") {
        const notice = document.createElement("section");
        notice.style.cssText =
            "max-width:760px;margin:60px auto;padding:32px 24px;" +
            "text-align:center;border:1px solid #8b5cf6;border-radius:18px;" +
            "background:#171526;color:#fff;font-family:inherit;";

        notice.innerHTML =
            "<h2 style='margin-top:0'>Page temporarily unavailable</h2>" +
            "<p style='color:#c4b5fd'>We're working on this page. Please check back later.</p>";

        const main = document.querySelector("main");

        if (main) {
            main.replaceChildren(notice);
        } else {
            document.body.replaceChildren(notice);
        }
    }
})();
