(function () {
    const pollLinks = document.querySelectorAll("[data-poll-feature-link]");
    if (!pollLinks.length) return;

    fetch("/api/poll", { cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
            if (!data || !["open", "closed", "published"].includes(data.state)) return;
            pollLinks.forEach(link => { link.hidden = false; });
        })
        .catch(() => {
            // Fail closed: leave all poll links hidden if the server cannot confirm launch.
        });
})();
