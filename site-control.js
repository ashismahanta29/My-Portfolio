
/* ==========================================
   B.COM CLASSROOM — GLOBAL SITE CONTROL
   Modes: "active" | "deactivated"
   ========================================== */

// Change this setting to control the website.
const SITE_MODE = "deactivated";

// Contact details shown during deactivation.
const SITE_CONTACT_EMAIL = "your-email@example.com";
const SITE_CONTACT_MESSAGE =
    "For assistance, please contact the website administrator.";
    // Separate maintenance poll page.
// This does not modify the existing polls.html.
const MAINTENANCE_POLL_PAGE = "maintenance-poll.html";

// Poll countdown: 7 days
const MAINTENANCE_POLL_DURATION = 7 * 24 * 60 * 60 * 1000;
const MAINTENANCE_POLL_TIMER_KEY = "maintenance-poll-timer-v2";

(function () {
    "use strict";

    if (SITE_MODE === "active") {
        return;
    }

    if (SITE_MODE !== "deactivated") {
        console.error("Invalid SITE_MODE setting.");
        return;
    }

    // Replace the page visually while preserving CSS animations.
    const style = document.createElement("style");
    style.textContent = `
        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0 !important;
            min-height: 100% !important;
            background: #080b14 !important;
        }

        body {
            font-family: Inter, Arial, sans-serif !important;
            color: #f3f4f6 !important;
        }

        .site-control-screen {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background:
                radial-gradient(
                    circle at top right,
                    rgba(59, 130, 246, .16),
                    transparent 45%
                ),
                #080b14;
        }

        .site-control-card {
            width: 100%;
            max-width: 580px;
            padding: 36px 26px;
            text-align: center;
            border: 1px solid #293247;
            border-radius: 22px;
            background: #111827;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .35);
        }

        .site-control-card .error-code {
            color: #93c5fd;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 3px;
        }

        .site-control-card h1 {
            margin: 16px 0;
            font-size: clamp(28px, 5vw, 40px);
            line-height: 1.2;
        }

        .site-control-card p {
            color: #b7c0d1;
            font-size: 16px;
            line-height: 1.8;
            overflow-wrap: anywhere;
        }

        .site-control-contact {
            margin-top: 26px;
            padding: 18px;
            border: 1px solid #293247;
            border-radius: 14px;
        }

        .site-control-contact a {
            color: #93c5fd;
            overflow-wrap: anywhere;
        }

        /* Keep hover and click animations working. */
        .site-control-card button {
            cursor: pointer;
            transition: transform .18s ease, box-shadow .18s ease;
        }

        .site-control-card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(96, 165, 250, .2);
        }
            .site-control-poll {
    margin-top: 22px;
    padding: 22px 18px;
    border: 1px solid rgba(96, 165, 250, .4);
    border-radius: 16px;
    background:
        radial-gradient(
            circle at top right,
            rgba(139, 92, 246, .18),
            transparent 65%
        ),
        #0c1425;
}

.site-control-poll h2 {
    margin: 0 0 10px;
    font-size: 21px;
}

.site-control-poll-timer {
    margin: 12px 0;
    color: #93c5fd !important;
    font-size: 14px !important;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
.site-control-poll-link {
    display: inline-block;
    margin-top: 8px;
    padding: 12px 20px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: #fff !important;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease;
}

.site-control-poll-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(96, 165, 250, .25);
}

        @media (prefers-reduced-motion: reduce) {
            .site-control-card button {
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);

    const screen = document.createElement("main");
    screen.className = "site-control-screen";

    const card = document.createElement("section");
    card.className = "site-control-card";

    const code = document.createElement("div");
    code.className = "error-code";
    code.textContent = "ERROR 503";

    const heading = document.createElement("h1");
    heading.textContent = "Website Temporarily Unavailable";

    const explanation = document.createElement("p");
    explanation.textContent =
        "Our website is temporarily unavailable. Please try again later.";

    const contact = document.createElement("section");
    contact.className = "site-control-contact";

    const contactHeading = document.createElement("h2");
    contactHeading.textContent = "Contact Us";

    const contactMessage = document.createElement("p");
    contactMessage.textContent = SITE_CONTACT_MESSAGE;

    contact.append(contactHeading, contactMessage);

    if (
        SITE_CONTACT_EMAIL &&
        SITE_CONTACT_EMAIL !== "your-email@example.com"
    ) {
        const emailText = document.createElement("p");
        emailText.textContent = "Email: ";

        const emailLink = document.createElement("a");
        emailLink.href = "mailto:" + SITE_CONTACT_EMAIL;
        emailLink.textContent = SITE_CONTACT_EMAIL;

        emailText.appendChild(emailLink);
        contact.appendChild(emailText);
    }

    // Separate poll invitation for deactivated mode only.
const pollSection = document.createElement("section");
pollSection.className = "site-control-poll";

const pollHeading = document.createElement("h2");
pollHeading.textContent = "Help Improve B.Com Classroom";

const pollMessage = document.createElement("p");
pollMessage.textContent =
    "Share your feedback through our community poll.";

const pollLink = document.createElement("a");
pollLink.className = "site-control-poll-link";
pollLink.href = MAINTENANCE_POLL_PAGE;
pollLink.textContent = "Participate in the Poll";


const pollTimer = document.createElement("p");
pollTimer.className = "site-control-poll-timer";
pollTimer.setAttribute("aria-live", "polite");

pollSection.append(pollHeading, pollMessage, pollTimer, pollLink);

// Start a 7-day countdown for this visitor.
let pollStartTime = 0;

try {
    pollStartTime = Number(
        localStorage.getItem(MAINTENANCE_POLL_TIMER_KEY)
    );

    if (!pollStartTime || !Number.isFinite(pollStartTime)) {
        pollStartTime = Date.now();
        localStorage.setItem(
            MAINTENANCE_POLL_TIMER_KEY,
            String(pollStartTime)
        );
    }
} catch (error) {
    pollStartTime = Date.now();
}

const pollEndTime = pollStartTime + MAINTENANCE_POLL_DURATION;
let pollTimerInterval;

function updatePollTimer() {
    const remaining = pollEndTime - Date.now();

    if (remaining <= 0) {
        pollSection.remove();

        if (pollTimerInterval) {
            clearInterval(pollTimerInterval);
        }

        return false;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    pollTimer.textContent =
        `Poll closes in ${days}d ${hours}h ${minutes}m ${seconds}s`;

    return true;
}

if (updatePollTimer()) {
    pollTimerInterval = setInterval(updatePollTimer, 1000);
}

card.append(code, heading, explanation, pollSection, contact);
screen.appendChild(card);

    // Remove original content, navigation, forms and page controls.
    document.body.replaceChildren(screen);

    // Block normal website actions without blocking visual hover effects.
   const blockEvent = event => {
    // Allow navigation through the dedicated maintenance poll link.
    if (
        event.target.closest &&
        event.target.closest(".site-control-poll-link")
    ) {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
};

    ["click", "submit", "reset", "change"].forEach(type => {
        document.addEventListener(type, blockEvent, true);
    });

    // Prevent normal keyboard activation of website controls.
    document.addEventListener("keydown", event => {
        if (
    event.target.closest &&
    event.target.closest(".site-control-poll-link")
) {
    return;
}
        if (
            event.target.closest &&
            event.target.closest("a, button, input, select, textarea") &&
            ["Enter", " "].includes(event.key)
        ) {
            blockEvent(event);
        }
    }, true);

})();
