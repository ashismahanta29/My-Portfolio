
(function () {
    "use strict";

    const categories = ["Syllabus", "Chapters", "Notes", "Questions"];

    const subjectByPage = {
        "financial-accounting.html": "Financial Accounting",
        "organizational-behaviour.html": "Organizational Behaviour",
        "environmental-studies.html": "Environmental Studies and Disaster Management",
        "recruitment-and-selection.html": "Recruitment and Selection",
        "business-communication.html": "Business Communication",
        "business-economics.html": "Introduction to Business Economics",
        "principles-of-management.html": "Principles of Management"
    };

    // CONTROL EACH SUBJECT, CATEGORY AND ACTION HERE.
    // Anything not listed below remains available.
   
const actionAvailability = {
    "Financial Accounting": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Organizational Behaviour": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Environmental Studies and Disaster Management": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Recruitment and Selection": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Business Communication": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Introduction to Business Economics": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    },

    "Principles of Management": {
        "Syllabus": { view: "available", download: "unavailable" },
        "Chapters": { view: "available", download: "unavailable" },
        "Notes": { view: "available", download: "unavailable" },
        "Questions": { view: "available", download: "unavailable" }
    }
};


    const pageName = window.location.pathname.split("/").pop();
    const subjectName = subjectByPage[pageName];
    const heading = document.querySelector("[data-catalog-subject]");
    const sections = Array.from(
        document.querySelectorAll(".resource-section[data-category]")
    );

    if (!subjectName || !heading || sections.length !== categories.length) {
        console.error("Subject catalog renderer could not find the expected subject or category sections.");
        return;
    }

    function normalize(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase();
    }

    function encodePath(path) {
        return path.split("/").map(function (segment) {
            try {
                return encodeURIComponent(decodeURIComponent(segment));
            } catch (_) {
                return encodeURIComponent(segment);
            }
        }).join("/");
    }

    function isAvailable(category, action) {
        const subjectSettings = actionAvailability[subjectName];
        const categorySettings = subjectSettings && subjectSettings[category];
        const setting = categorySettings && categorySettings[action];

        return setting !== "unavailable";
    }

    function configureAction(link, available) {
        if (available) return;

        // Keep the link visible, but prevent navigation or downloading.
        link.removeAttribute("href");
        link.removeAttribute("download");
        link.setAttribute("aria-disabled", "true");
        link.classList.add("portal-action-unavailable");
        link.title = "This action is currently unavailable";

        link.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    function makeCard(item, category) {
        const card = document.createElement("article");
        card.className = "portal-material-card";

        const title = document.createElement("h3");
        title.textContent = item.title;

        const extension = item.path.split(".").pop().toUpperCase();

        const description = document.createElement("p");
        description.textContent = item.description || (extension + " document");

        const actions = document.createElement("div");
        actions.className = "portal-actions";

        const view = document.createElement("a");
        view.className = "portal-action";
        view.href = encodePath(item.path);
        view.target = "_blank";
        view.rel = "noopener";
        view.textContent = "View " + extension;

        configureAction(view, isAvailable(category, "view"));

        const download = document.createElement("a");
        download.className = "portal-action";
        download.href = encodePath(item.path);
        download.setAttribute("download", "");
        download.textContent = "Download " + extension;

        configureAction(download, isAvailable(category, "download"));

        actions.append(view, download);
        card.append(title, description, actions);

        if (typeof item.note === "string" && item.note.trim()) {
            const note = document.createElement("p");
            note.className = "portal-relevance-note";
            note.textContent = item.note;
            card.append(note);
        }

        return card;
    }

    function setupSection(section) {
        const category = section.dataset.category;
        const list = section.querySelector(".resource-list");
        const title = section.querySelector("h2");

        if (!categories.includes(category) || !list || !title) return null;

        const panelId = list.id || (section.id + "-list");
        list.id = panelId;
        list.classList.add("resource-list-panel");
        list.setAttribute("aria-labelledby", title.id);
        list.setAttribute("aria-hidden", "true");
        list.setAttribute("inert", "");

        const titleText = title.textContent.trim();
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "category-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", panelId);

        toggle.innerHTML = `
            <span class="category-title"></span>
            <span class="category-count"></span>
            <span class="category-chevron" aria-hidden="true">›</span>
        `;

        toggle.querySelector(".category-title").textContent = titleText;
        title.replaceChildren(toggle);

        return {
            category: category,
            list: list,
            button: toggle,
            title: titleText,
            count: toggle.querySelector(".category-count")
        };
    }

    const targets = sections.map(setupSection).filter(Boolean);

    if (targets.length !== categories.length) {
        console.error("Subject catalog renderer could not initialize all category lists.");
        return;
    }

    function render(items) {
        const grouped = new Map(
            categories.map(function (category) {
                return [category, []];
            })
        );

        items.forEach(function (item) {
            if (
                !item ||
                typeof item.title !== "string" || !item.title.trim() ||
                typeof item.path !== "string" || !item.path.trim() ||
                typeof item.subject !== "string" || !item.subject.trim() ||
                normalize(item.subject) !== normalize(subjectName)
            ) {
                return;
            }

            const category = categories.includes(item.category)
                ? item.category
                : "Notes";

            grouped.get(category).push(item);
        });

        targets.forEach(function (target) {
            target.list.replaceChildren();

            const categoryItems = grouped.get(target.category) || [];

            target.count.textContent = String(categoryItems.length);

            if (categoryItems.length) {
                categoryItems.forEach(function (item) {
                    target.list.append(makeCard(item, target.category));
                });
            } else {
                const empty = document.createElement("p");
                empty.className = "resource-empty";
                empty.textContent =
                    "Resources coming soon. Check back as materials are added.";
                target.list.append(empty);
            }

            target.list.style.maxHeight =
                target.button.getAttribute("aria-expanded") === "true"
                    ? target.list.scrollHeight + "px"
                    : "0px";
        });
    }

    targets.forEach(function (target) {
        const button = target.button;

        button.addEventListener("click", function () {
            const open = button.getAttribute("aria-expanded") === "true";

            button.setAttribute("aria-expanded", String(!open));
            button.setAttribute(
                "aria-label",
                target.title + (open ? ", expand" : ", collapse")
            );

            target.list.setAttribute("aria-hidden", String(open));

            if (open) {
                target.list.setAttribute("inert", "");
            } else {
                target.list.removeAttribute("inert");
            }

            target.list.style.maxHeight = open
                ? "0px"
                : target.list.scrollHeight + "px";
        });
    });

    fetch(new URL("notes-catalog.json", window.location.href))
        .then(function (response) {
            if (!response.ok) throw new Error("Catalog request failed");
            return response.json();
        })
        .then(function (catalog) {
            if (!catalog || !Array.isArray(catalog.contributions)) {
                throw new Error("Invalid catalog");
            }

            render(catalog.contributions);
        })
        .catch(function () {
            targets.forEach(function (target) {
                const message = document.createElement("p");
                message.className = "resource-empty";
                message.textContent =
                    "Materials could not be loaded. Please try again later.";

                target.list.replaceChildren(message);
                target.count.textContent = "0";

                target.list.style.maxHeight =
                    target.button.getAttribute("aria-expanded") === "true"
                        ? target.list.scrollHeight + "px"
                        : "0px";
            });
        });
})();
