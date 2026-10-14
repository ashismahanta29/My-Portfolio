(function () {
    const POLL_ID = "student-future";
    const TOKEN_KEY = "student-poll-voter-token-v1";
    const DISMISSED_KEY = "student-poll-dismissed-v1";
    let dismissedThisTab = false;
    const COPY = {
        continue: ["Continue the Website", "I find this website useful. Please keep it running."],
        close: ["Close the Website", "I don't think this website is needed."]
    };

    function voterToken() {
        let token = localStorage.getItem(TOKEN_KEY);
        if (token) return token;
        if (crypto.randomUUID) token = crypto.randomUUID();
        else {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 15) | 64;
            bytes[8] = (bytes[8] & 63) | 128;
            const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
            token = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
        localStorage.setItem(TOKEN_KEY, token);
        return token;
    }

    function markDismissed() {
        dismissedThisTab = true;
        try { localStorage.setItem(DISMISSED_KEY, "yes"); } catch (error) { /* Fall back to this tab's session. */ }
        try { sessionStorage.setItem(DISMISSED_KEY, "yes"); } catch (error) { /* In-memory state still applies. */ }
    }

    function wasDismissed() {
        if (dismissedThisTab) return true;
        try { if (localStorage.getItem(DISMISSED_KEY) === "yes") return true; } catch (error) { /* Check session storage. */ }
        try { return sessionStorage.getItem(DISMISSED_KEY) === "yes"; } catch (error) { return false; }
    }

    function messageFor(error) {
        return ({
            already_voted: "A vote has already been recorded from this browser.",
            poll_closed: "Voting has closed. Thank you for your interest.",
            rate_limited: "Too many attempts. Please wait a minute and try again.",
            poll_not_configured: "Voting is not available yet. Please try again later.",
            poll_temporarily_unavailable: "The poll is temporarily unavailable. Your vote was not confirmed. Please try again.",
            poll_unavailable: "This poll is not available.",
            invalid_vote: "The vote could not be accepted. Please refresh and try again."
        })[error] || "Something went wrong. Your vote was not confirmed. Please try again.";
    }

    async function sendVote(choice) {
        const token = voterToken();
        const response = await fetch("/api/poll", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pollId: POLL_ID, choice, voterToken: token })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.accepted !== true) throw new Error(data.error || "poll_temporarily_unavailable");
        markDismissed();
        return true;
    }

    function renderOptions(target, message, onSuccess) {
        const options = document.createElement("div");
        options.className = "student-poll-options";
        for (const choice of ["continue", "close"]) {
            const button = document.createElement("button");
            button.className = "student-poll-option";
            button.type = "button";
            button.innerHTML = `<strong>${COPY[choice][0]}</strong><span>${COPY[choice][1]}</span>`;
            button.addEventListener("click", async () => {
                options.querySelectorAll("button").forEach(item => { item.disabled = true; });
                message.dataset.kind = "";
                message.textContent = "Sending your vote…";
                try {
                    await sendVote(choice);
                    message.dataset.kind = "success";
                    message.textContent = "Thank you for sharing your opinion.";
                    onSuccess?.();
                } catch (error) {
                    message.dataset.kind = "error";
                    message.textContent = messageFor(error.message);
                    if (error.message !== "already_voted") options.querySelectorAll("button").forEach(item => { item.disabled = false; });
                }
            });
            options.append(button);
        }
        target.append(options);
    }

    function createPrompt() {
        const prompt = document.createElement("aside");
        prompt.className = "poll-prompt";
        prompt.hidden = true;
        prompt.setAttribute("aria-labelledby", "poll-prompt-title");
        prompt.setAttribute("aria-describedby", "poll-prompt-description");
        prompt.innerHTML = `<div class="poll-prompt-head"><h2 id="poll-prompt-title">Help Decide the Future of Student Notes Hub</h2><button class="poll-prompt-close" type="button" aria-label="Close poll prompt">×</button></div><p class="poll-prompt-copy" id="poll-prompt-description">This website was created to help students access study materials more easily. Before deciding its future, I want to hear from students like you.</p><p class="student-poll-message" aria-live="polite"></p><div class="poll-prompt-footer"><a href="student-poll.html">More about this poll</a><button type="button" class="poll-prompt-cancel">Cancel</button></div>`;
        const message = prompt.querySelector(".student-poll-message");
        const hide = () => {
            prompt.hidden = true;
            markDismissed();
        };
        prompt.querySelector(".poll-prompt-close").addEventListener("click", hide);
        prompt.querySelector(".poll-prompt-cancel").addEventListener("click", hide);
        renderOptions(prompt, message, () => {
            prompt.querySelectorAll(".student-poll-option").forEach(button => { button.disabled = true; });
        });
        document.body.append(prompt);
        return prompt;
    }

    function displayResults(root, data) {
        const results = document.createElement("div");
        results.className = "student-poll-results";
        const rows = [
            ["Continue the Website", data.results.continue],
            ["Close the Website", data.results.close]
        ];
        rows.forEach(([label, total]) => {
            const row = document.createElement("div");
            row.className = "student-poll-result";
            row.innerHTML = `<span>${label}</span><strong>${Number(total)}</strong>`;
            results.append(row);
        });
        const total = document.createElement("p");
        total.className = "student-poll-total";
        total.textContent = `Total votes: ${Number(data.results.total)}`;
        root.append(results, total);
    }

    async function initializePollPage() {
        const root = document.getElementById("student-poll-app");
        if (!root) return;
        const statusText = root.querySelector("[data-poll-status]");
        const target = root.querySelector("[data-poll-content]");
        try {
            const response = await fetch("/api/poll", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "poll_temporarily_unavailable");
            statusText.textContent = data.state === "not_launched" ? "Poll not launched" : data.state === "open" ? "Voting is open" : data.state === "closed" ? "Voting is closed" : "Poll unavailable";
            if (data.state === "published") {
                statusText.textContent = "Results published";
                displayResults(target, data);
            } else if (data.state === "not_launched") {
                const message = document.createElement("p");
                message.className = "student-poll-copy";
                message.textContent = "This poll has not launched. Please check back later.";
                target.append(message);
            } else if (data.state === "open") {
                const message = document.createElement("p");
                message.className = "student-poll-message";
                message.setAttribute("aria-live", "polite");
                target.append(message);
                renderOptions(target, message);
            } else {
                const message = document.createElement("p");
                message.className = "student-poll-copy";
                message.textContent = "Voting has ended. Thank you for taking an interest in the Student Notes Hub.";
                target.append(message);
            }
        } catch (error) {
            statusText.textContent = "Poll currently unavailable";
            const message = document.createElement("p");
            message.className = "student-poll-copy";
            message.textContent = "The poll service is not ready or cannot be reached right now. Please try again later.";
            target.append(message);
        }
    }

    async function initializeHomepagePrompt() {
        if (!document.body.classList.contains("homepage")) return;
        const prompt = createPrompt();
        try {
            const response = await fetch("/api/poll", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok || data.state !== "open" || wasDismissed()) return;
            window.setTimeout(() => { prompt.hidden = false; }, 1800);
        } catch (error) {
            prompt.remove();
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        initializePollPage();
        initializeHomepagePrompt();
    }, { once: true });
})();
