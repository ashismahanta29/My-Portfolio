
(function () {
    "use strict";

    const subjects = {
        "financial-accounting.html": {
            name: "Financial Accounting",
            code: "Core 2.1"
        },
        "organizational-behaviour.html": {
            name: "Organizational Behaviour",
            code: "OB · Core 1.1"
        },
        "environmental-studies.html": {
            name: "Environmental Studies and Disaster Management",
            code: "VAC"
        },
        "recruitment-and-selection.html": {
            name: "Recruitment and Selection",
            code: "Core 1.4"
        },
        "business-communication.html": {
            name: "Business Communication",
            code: "AEC"
        },
        "business-economics.html": {
            name: "Introduction to Business Economics",
            code: "Core 1.3"
        },
        "principles-of-management.html": {
            name: "Principles of Management",
            code: "Core 1.2"
        }
    };

    const pageName = window.location.pathname.split("/").pop();
    const subject = subjects[pageName];

    if (!subject) {
        console.error("Subject page configuration not found:", pageName);
        return;
    }

    document.title = subject.name + " | Student Notes Hub";

    document.body.innerHTML = `
        <nav class="portal-nav" aria-label="Main navigation">
            <a href="index.html">Home</a>
            <a href="share-notes.html">Share Notes</a>
            <a href="notes.html" aria-current="page">Notes Hub</a>
            <a href="contributors.html">Contributors</a>
            <a href="polls.html">Polls</a>
            <a href="about.html">About Me</a>
            <a href="contact.html">Contact</a>
        </nav>

        <header class="portal-hero">
            <div class="portal-hero-inner">
                <p class="portal-kicker"></p>
                <h1></h1>
                <p class="portal-hero-copy"></p>
            </div>
        </header>

        <main class="portal-main portal-detail">
            <div class="portal-detail-topline">
                <a class="portal-back-link" href="notes.html">
                    <span aria-hidden="true">←</span>
                    <span>Back to Student Notes Hub</span>
                </a>
            </div>

            <section class="portal-detail-panel" aria-labelledby="materials-heading">
                <h2 class="portal-section-heading" id="materials-heading" data-catalog-subject></h2>
                <p class="portal-code"></p>
                <p class="portal-detail-intro">
                    Browse the materials currently listed for this subject.
                </p>

                <section class="resource-section" id="syllabus" aria-labelledby="syllabus-heading" data-category="Syllabus">
                    <h2 id="syllabus-heading">Syllabus</h2>
                    <div class="resource-list" id="syllabus-list"></div>
                </section>

                <section class="resource-section" id="chapters" aria-labelledby="chapters-heading" data-category="Chapters">
                    <h2 id="chapters-heading">Chapters</h2>
                    <div class="resource-list" id="chapters-list"></div>
                </section>

                <section class="resource-section" id="notes" aria-labelledby="notes-heading" data-category="Notes">
                    <h2 id="notes-heading">Notes</h2>
                    <div class="resource-list" id="notes-list"></div>
                </section>

                <section class="resource-section" id="questions" aria-labelledby="questions-heading" data-category="Questions">
                    <h2 id="questions-heading">Questions</h2>
                    <div class="resource-list" id="questions-list"></div>
                </section>
            </section>
        </main>

        <footer class="portal-footer">
            <div class="portal-footer-inner">
                <p>Student Notes Hub · Made for learning and sharing.</p>
                <p><a href="notes.html">Back to all subjects</a></p>
            </div>
        </footer>
    `;

    document.querySelector(".portal-kicker").textContent = subject.code;
    document.querySelector(".portal-hero h1").textContent = subject.name;
    document.querySelector(".portal-hero-copy").textContent =
        "This page lists the materials currently available for " + subject.name + ".";
    document.querySelector("[data-catalog-subject]").textContent = subject.name;
    document.querySelector(".portal-code").textContent = subject.code;
})();
