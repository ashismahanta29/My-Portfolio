
(function () {
    "use strict";

    const grid = document.getElementById("subjectGrid");
    if (!grid) return;

    const catalogUrl = new URL("notes-catalog.json", window.location.href);

    const subjects = [
        { name: "Organizational Behaviour", code: "OB · Core 1.1", page: "organizational-behaviour.html" },
        { name: "Principles of Management", code: "Core 1.2", page: "principles-of-management.html" },
        { name: "Introduction to Business Economics", code: "Core 1.3", page: "business-economics.html" },
        { name: "Recruitment and Selection", code: "Core 1.4", page: "recruitment-and-selection.html" },
        { name: "Financial Accounting", code: "Core 2.1", page: "financial-accounting.html" },
        { name: "Business Communication", code: "AEC · English", page: "business-communication.html" },
        { name: "Environmental Studies and Disaster Management", displayName: "Environmental Studies", code: "VAC · EVS and Disaster Management", page: "environmental-studies.html" }
    ];

    function normalize(value) {
        return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    }

    function makeCard(subject, items) {
        const card = document.createElement("article");
        card.className = "portal-card";

        const code = document.createElement("p");
        code.className = "portal-code";
        code.textContent = subject.code;

        const heading = document.createElement("h3");
        heading.textContent = subject.displayName || subject.name;

        const count = document.createElement("p");
        count.className = "portal-card-copy";
        count.textContent = items.length
            ? items.length + (items.length === 1 ? " material is listed." : " materials are listed.")
            : "No materials are listed yet.";

        const link = document.createElement("a");
        link.className = "portal-card-link";
        link.href = subject.page;
        link.textContent = "Explore Subject";

        card.append(code, heading, count, link);


        return card;
    }

    fetch(catalogUrl.href, { cache: "no-cache" })
        .then(function (response) {
            if (!response.ok) throw new Error("Catalog request failed");
            return response.json();
        })
        .then(function (catalog) {
            if (!catalog || !Array.isArray(catalog.contributions)) {
                throw new Error("Invalid catalog");
            }

            const contributions = catalog.contributions.filter(function (item) {
                return item && typeof item.title === "string"
                    && typeof item.path === "string"
                    && item.title.trim() && item.path.trim();
            });

            grid.replaceChildren();

            subjects.forEach(function (subject) {
                const matching = contributions.filter(function (item) {
                    return normalize(item.subject) === normalize(subject.name);
                });
                grid.append(makeCard(subject, matching));
            });
        })
        .catch(function (error) {
            console.error("Notes Hub catalog could not be loaded:", error);
        });
})();
