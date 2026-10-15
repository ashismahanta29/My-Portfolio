(function () {
    "use strict";

    const completionKey = "student-hub-poll-completed";
    const pollsEnabled = false;
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScJwdSt8z7Y1ka2jEAlpoBzx5uCh3bnejWU_ehcbvvFny8INw/viewform?embedded=true";

    function hasCompletedPoll() {
        try { return localStorage.getItem(completionKey) === "1"; }
        catch (error) { return false; }
    }

    function markPollCompleted() {
        try { localStorage.setItem(completionKey, "1"); }
        catch (error) { /* Confirmation still closes the dialog for this visit. */ }
    }

    function bindPageConfirmation() {
        const button = document.querySelector(".poll-page-complete");
        if (!button) return;

        button.addEventListener("click", function () {
            markPollCompleted();
            button.disabled = true;
            button.textContent = "Thanks for confirming!";
            const status = document.querySelector(".poll-page-status");
            if (status) status.textContent = "Your poll completion has been saved on this device.";
        });
    }

    function mountInvite() {
        if (!pollsEnabled) return;
        const pageName = window.location.pathname.split("/").pop();
        if (pageName && pageName !== "index.html") return;
        if (hasCompletedPoll()) return;

        const dialog = document.createElement("dialog");
        dialog.className = "poll-invite";
        dialog.setAttribute("aria-labelledby", "poll-invite-title");
        dialog.setAttribute("aria-describedby", "poll-invite-copy");
        dialog.innerHTML = `
            <div class="poll-invite-head">
                <div><h2 id="poll-invite-title">Have a moment to share your thoughts?</h2>
                <p class="poll-invite-copy" id="poll-invite-copy">Take part in our quick student poll. You can also visit it later from Polls in the navigation.</p></div>
                <button class="poll-invite-close" type="button" aria-label="Close poll invitation">&times;</button>
            </div>
            <iframe class="poll-invite-frame" title="Student poll Google Form" loading="lazy"></iframe>
            <div class="poll-invite-actions">
                <button class="poll-invite-secondary" type="button">Not Now</button>
                <button class="poll-invite-complete" type="button">I've voted</button>
                <a href="polls.html">Open Polls page</a>
            </div>`;

        const close = function () { dialog.close(); };
        dialog.querySelector(".poll-invite-complete").addEventListener("click", function () {
            markPollCompleted();
            close();
        });
        dialog.querySelector(".poll-invite-frame").src = formUrl;
        dialog.querySelector(".poll-invite-close").addEventListener("click", close);
        dialog.querySelector(".poll-invite-secondary").addEventListener("click", close);
        dialog.addEventListener("cancel", function () { close(); });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) close();
        });
        document.body.append(dialog);

        dialog.showModal();
    }

    function initialize() {
        bindPageConfirmation();
        mountInvite();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
    else initialize();
})();
