(function () {
    "use strict";

    const availabilityLabels = Array.from(document.querySelectorAll("[data-material-availability]"));
    if (availabilityLabels.length === 0) return;

    // Resolve beside the current page so GitHub Pages project sites keep their /My-Portfolio/ base path.
    const catalogUrl = new URL("notes-catalog.json", window.location.href);

    function normalizeSubject(subject) {
        return String(subject || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    }

    function setLoading() {
        availabilityLabels.forEach(function (label) {
            label.textContent = "Checking listed materials…";
        });
        const panel = document.querySelector(".catalog-retry-panel");
        if (panel) panel.remove();
    }

    function showLoadError(error) {
        console.error("Notes catalog could not be loaded:", error);
        availabilityLabels.forEach(function (label) {
            label.textContent = "Availability could not be loaded.";
        });

        const firstLabel = availabilityLabels[0];
        const section = firstLabel.closest(".portal-main") || firstLabel.closest("main");
        const grid = section && section.querySelector(".portal-grid");
        if (!section || !grid) return;

        let panel = section.querySelector(".catalog-retry-panel");
        if (!panel) {
            panel = document.createElement("div");
            panel.className = "portal-no-materials catalog-retry-panel";
            panel.setAttribute("role", "status");
            grid.insertAdjacentElement("afterend", panel);
        }

        panel.replaceChildren();
        const message = document.createElement("p");
        const localFile = window.location.protocol === "file:";
        message.textContent = localFile
            ? "Catalog requests need a local web server. Open this site with Live Server, then reload."
            : "Material availability could not be loaded. Check your connection and try again.";
        panel.append(message);

        if (!localFile) {
            const retry = document.createElement("button");
            retry.className = "portal-action catalog-retry-button";
            retry.type = "button";
            retry.textContent = "Retry";
            retry.addEventListener("click", loadCatalog);
            panel.append(retry);
        }
    }

    function loadCatalog() {
        setLoading();
        fetch(catalogUrl.href, { cache: "no-cache" })
            .then(function (response) {
                if (!response.ok) throw new Error("Catalog request failed with HTTP " + response.status);
                return response.json();
            })
            .then(function (catalog) {
                if (!catalog || !Array.isArray(catalog.contributions)) {
                    throw new Error("Catalog must contain a contributions array");
                }

                const counts = new Map();
                catalog.contributions.forEach(function (item) {
                    if (!item || typeof item.subject !== "string" || !item.subject.trim() || typeof item.path !== "string" || !item.path.trim()) return;
                    const key = normalizeSubject(item.subject);
                    counts.set(key, (counts.get(key) || 0) + 1);
                });

                availabilityLabels.forEach(function (label) {
                    const card = label.closest(".portal-card");
                    const heading = card && card.querySelector("h3");
                    if (!heading) return;

                    const subject = heading.dataset.catalogSubject || heading.textContent.trim();
                    const count = counts.get(normalizeSubject(subject)) || 0;
                    label.textContent = count
                        ? count + (count === 1 ? " material is" : " materials are") + " listed."
                        : "No materials are listed yet.";
                });
            })
            .catch(showLoadError);
    }

    if (window.location.protocol === "file:") {
        showLoadError(new Error("Catalog fetch is not available from file:// pages"));
        return;
    }

    loadCatalog();
})();
