(function () {
    "use strict";

    const inviteDismissalKey = "student-hub-home-poll-popup-dismissed-v1";
    function activateIframeFallback() {
        document.querySelectorAll("iframe[data-tally-src]:not([src])").forEach(function (frame) {
            frame.src = frame.dataset.tallySrc;
            frame.dataset.tallyFallbackMode = "true";
        });
    }

    function loadTallyEmbeds() {
        if (window.Tally && typeof window.Tally.loadEmbeds === "function") {
            try { window.Tally.loadEmbeds(); }
            catch (error) { activateIframeFallback(); }
            return;
        }

        let script = document.querySelector('script[data-tally-widget]');
        if (!script) {
            script = document.createElement("script");
            script.src = "https://tally.so/widgets/embed.js";
            script.async = true;
            script.dataset.tallyWidget = "true";
            document.head.append(script);
        }

        let finished = false;
        const finishWithFallback = function () {
            if (finished) return;
            finished = true;
            window.clearTimeout(fallbackTimer);
            activateIframeFallback();
        };
        const finishWithTally = function () {
            if (finished) return;
            if (!window.Tally || typeof window.Tally.loadEmbeds !== "function") {
                finishWithFallback();
                return;
            }
            finished = true;
            window.clearTimeout(fallbackTimer);
            try { window.Tally.loadEmbeds(); }
            catch (error) { activateIframeFallback(); }
        };
        const fallbackTimer = window.setTimeout(finishWithFallback, 10000);
        script.addEventListener("load", finishWithTally, { once: true });
        script.addEventListener("error", finishWithFallback, { once: true });
    }

    function hasDismissedInvite() {
        try { return localStorage.getItem(inviteDismissalKey) === "1"; }
        catch (error) {
            try { return sessionStorage.getItem(inviteDismissalKey) === "1"; }
            catch (storageError) { return false; }
        }
    }

    function rememberInviteDismissal() {
        try { localStorage.setItem(inviteDismissalKey, "1"); }
        catch (error) {
            try { sessionStorage.setItem(inviteDismissalKey, "1"); }
            catch (storageError) { /* The popup still closes when storage is unavailable. */ }
        }
    }

    function mountInvite() {
        const pageName = window.location.pathname.split("/").pop();
        if (pageName && pageName !== "index.html") return;
        if (hasDismissedInvite()) return;

        const dialog = document.createElement("dialog");
        dialog.className = "poll-invite";
        dialog.setAttribute("aria-labelledby", "poll-invite-title");
        dialog.setAttribute("aria-describedby", "poll-invite-copy");
        dialog.innerHTML = `
          <button class="poll-invite-close" type="button" aria-label="Cancel poll invitation">×</button>
          <div class="poll-invite-content">
            <h2 id="poll-invite-title">Your Voice Matters!</h2>
            <p class="poll-invite-copy" id="poll-invite-copy">Help improve Notes Hub by sharing your feedback.</p>
            <div class="poll-invite-actions">
              <a class="poll-invite-vote" href="polls.html">Vote Now</a>
              <button class="poll-invite-later" type="button">Later</button>
            </div>
          </div>`;

        const close = function () {
            rememberInviteDismissal();
            dialog.close();
        };
        dialog.querySelector(".poll-invite-vote").addEventListener("click", close);
        dialog.querySelector(".poll-invite-close").addEventListener("click", close);
        dialog.querySelector(".poll-invite-later").addEventListener("click", close);
        dialog.addEventListener("cancel", function (event) { event.preventDefault(); close(); });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) close();
        });
        document.body.append(dialog);
        dialog.showModal();
    }

    function initialize() {
        if (document.querySelector('iframe[data-tally-src]')) loadTallyEmbeds();
        mountInvite();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
    else initialize();
})();
