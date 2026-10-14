(function () {
    const storageKey = "my-portfolio-theme";
    const root = document.documentElement;

    function readTheme() {
        try {
            return localStorage.getItem(storageKey) === "bright" ? "bright" : "dark";
        } catch (error) {
            return "dark";
        }
    }

    function setTheme(theme) {
        root.dataset.theme = theme;
        root.style.colorScheme = theme === "bright" ? "light" : "dark";
        try {
            localStorage.setItem(storageKey, theme);
        } catch (error) {
            // The theme still works for this page when storage is unavailable.
        }
        updateButton(theme);
    }

    function updateButton(theme) {
        const button = document.querySelector(".theme-toggle");
        if (!button) return;
        const bright = theme === "bright";
        button.setAttribute("aria-label", bright ? "Switch to Dark Mode" : "Switch to Bright Mode");
        button.setAttribute("aria-pressed", String(bright));
        button.innerHTML = `<span class="theme-toggle-icon" aria-hidden="true">${bright ? "☾" : "☀"}</span><span>${bright ? "Dark Mode" : "Bright Mode"}</span>`;
    }

    function mountToggle() {
        if (document.querySelector(".theme-toggle")) return;
        const button = document.createElement("button");
        button.className = "theme-toggle";
        button.type = "button";
        button.addEventListener("click", function () {
            setTheme(root.dataset.theme === "bright" ? "dark" : "bright");
        });
        const nav = document.querySelector(".portal-nav, body > nav");
        if (nav) nav.append(button);
        else {
            const container = document.querySelector(".container");
            (container || document.body).prepend(button);
        }
        updateButton(root.dataset.theme || "dark");
    }

    setTheme(readTheme());
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
    } else {
        mountToggle();
    }
})();
