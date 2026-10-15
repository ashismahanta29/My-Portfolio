(function () {
    const availabilityLabels = document.querySelectorAll("[data-material-availability]");
    if (availabilityLabels.length === 0) return;

    fetch(new URL("notes-catalog.json", window.location.href))
        .then(function (response) {
            if (!response.ok) throw new Error("Catalog request failed");
            return response.json();
        })
        .then(function (catalog) {
            if (!catalog || !Array.isArray(catalog.contributions)) {
                throw new Error("Catalog format is invalid");
            }

            const counts = new Map();
            catalog.contributions.forEach(function (item) {
                if (!item || !item.subject || !item.path) return;
                counts.set(item.subject, (counts.get(item.subject) || 0) + 1);
            });

            availabilityLabels.forEach(function (label) {
                const card = label.closest(".portal-card");
                const heading = card && card.querySelector("h3");
                if (!heading) return;

                const subject = heading.dataset.catalogSubject || heading.textContent.trim();
                const count = counts.get(subject) || 0;
                label.textContent = count
                    ? count + (count === 1 ? " material is" : " materials are") + " listed."
                    : "No materials are available yet.";
            });
        })
        .catch(function () {
            availabilityLabels.forEach(function (label) {
                label.textContent = "Material availability could not be loaded.";
            });
        });
})();
