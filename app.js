(function () {
  const ANALYTICS_KEY = "apideprecationqa_analytics_events";
  const INTENT_KEY = "apideprecationqa_purchase_intents";
  const ISSUE_BASE = "https://github.com/ert93333-ops/api-deprecation-notice-briefs/issues/new";

  const SAMPLE_CHANGE_NOTES = [
    "API behavior is changing soon.",
    "Customers should move to the new API later.",
    "Old SDKs should keep working. This migration is simple and automatic."
  ].join("\n");
  const SAMPLE_SCOPE_NOTES = "Some API route is changing.";
  const SAMPLE_DEADLINE_NOTES = "Soon.";
  const SAMPLE_BREAKING_NOTES = "Unclear.";
  const SAMPLE_MIGRATION_NOTES = "Use the new endpoint.";
  const SAMPLE_IMPACT_NOTES = "Some customers might be affected.";
  const SAMPLE_DOCS_NOTES = "Help will be updated later.";
  const SAMPLE_OWNER_NOTES = "TBD later.";
  const SAMPLE_CADENCE_NOTES = "Reminder later.";

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function track(event, detail) {
    const payload = {
      event,
      detail: detail || {},
      path: window.location.pathname,
      query: window.location.search,
      timestamp: nowIso()
    };
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]");
    events.push(payload);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-80)));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(selector, value) {
    const element = qs(selector);
    if (element) element.textContent = value;
  }

  function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function has(pattern, value) {
    return pattern.test(String(value || ""));
  }

  function wordCount(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function hasSpecificDate(value) {
    return /\b(\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|q[1-4]|eod|end of day|utc|pst|est|cst|gmt|on\s+\d{1,2}\/\d{1,2}|\d+\s*(day|days|week|weeks|month|months)|by\s+\w+|before\s+\w+|after\s+\w+)\b/i.test(value || "");
  }

  function hasOwner(value) {
    return /\b(owner|owned by|product|pm|devrel|developer relations|docs|technical writer|platform|engineering|support|launch owner|assigned|lead|team|person|named|responsible)\b/i.test(value || "");
  }

  function hasDecision(value) {
    return /\b(decision|decide|approved|approve|blocked|ship|publish|send|hold|follow-up|follow up|review|retest|date|deadline|next step|next-step|owner|reminder|cutoff)\b/i.test(value || "");
  }

  function analyze(input) {
    const raw = [
      input.changeNotes,
      input.scopeNotes,
      input.deadlineNotes,
      input.breakingNotes,
      input.migrationNotes,
      input.impactNotes,
      input.docsNotes,
      input.ownerNotes,
      input.cadenceNotes,
      input.apiSurfaceType
    ].join("\n");

    const parseSummary = [
      "API change note characters: " + String(input.changeNotes || "").length,
      "API surface type: " + (input.apiSurfaceType || "not provided"),
      "Public-safe reminder: remove API keys, tokens, customer data, incident details, contracts, billing data, legal data, and security-sensitive details before using pasted samples."
    ];

    const dateWarnings = [];
    const scopeWarnings = [];
    const breakingWarnings = [];
    const impactWarnings = [];
    const migrationWarnings = [];
    const docsWarnings = [];
    const ownerWarnings = [];
    const segmentWarnings = [];
    const vagueLanguageWarnings = [];
    const compatibilityWarnings = [];
    const followUpWarnings = [];

    if (!hasSpecificDate(input.deadlineNotes) && !hasSpecificDate(input.changeNotes) && !hasSpecificDate(input.cadenceNotes)) {
      dateWarnings.push("missing effective date or deadline: notes do not include a concrete sunset date, migration window, support-end date, timezone, or final cutoff.");
    }
    if (has(/\b(soon|later|eventually|future release|upcoming|tbd|to be announced|coming months)\b/i, raw)) {
      vagueLanguageWarnings.push("risky vague language: notes use timing such as soon, later, future release, or TBD without a customer-actionable date.");
    }

    if (!has(/\b(endpoint|route|path|url|field|property|parameter|param|webhook|payload|event|sdk|library|client|version|v\d|graphql|rest|auth|token|beta)\b/i, input.scopeNotes + "\n" + input.changeNotes)) {
      scopeWarnings.push("missing affected endpoint, field, version, or SDK scope: notes do not name the API surface customers need to inspect.");
    } else if (!has(/\b(\/[a-z0-9_\/{}:-]+|v\d|sdk|library|client|field|webhook|payload|graphql|rest|token|auth|parameter|param)\b/i, input.scopeNotes + "\n" + input.changeNotes)) {
      scopeWarnings.push("missing affected endpoint, field, version, or SDK scope: notes mention an API change but do not give enough specific endpoint, version, field, webhook, SDK, or client detail.");
    }

    if (!has(/\b(breaking|non-breaking|backward|backwards|compatible|incompatible|beta|sunset|removal|removed|deprecated|required|optional|version-specific|v\d)\b/i, input.breakingNotes + "\n" + input.changeNotes)) {
      breakingWarnings.push("breaking versus non-breaking ambiguity: notes do not say whether this change breaks existing clients, is beta-only, is backwards-compatible, or only applies to a version.");
    }
    if (has(/\b(probably|should|might|maybe|expected to|we think|simple|automatic)\b/i, input.breakingNotes + "\n" + input.changeNotes) && !has(/\b(test|verified|compatibility matrix|confirmed|requires|must)\b/i, input.breakingNotes + "\n" + input.migrationNotes)) {
      compatibilityWarnings.push("overpromise or backwards-compatibility ambiguity: notes imply compatibility or automatic migration without a verified test, requirement, or explicit customer action.");
    }

    if (!has(/\b(customer|developer|integration|partner|app|client|workflow|tenant|account|plan|enterprise|free|paid|pro|team|segment|users|breaking|fail|error|blocked|impact|affected)\b/i, input.impactNotes + "\n" + input.changeNotes) || wordCount(input.impactNotes) < 6) {
      impactWarnings.push("missing customer impact summary: impact notes do not clearly state which customers, integrations, apps, plans, or workflows are affected.");
    }
    if (!has(/\b(plan|tier|enterprise|pro|free|paid|segment|customer type|partner|developer|integration type|sdk user|webhook user|beta user|public api user)\b/i, input.impactNotes + "\n" + input.scopeNotes)) {
      segmentWarnings.push("missing customer segment or plan impact: notes do not name which customer group, plan, integration type, SDK user, or API user should act.");
    }

    if (!has(/\b(migrate|migration|replace|replacement|use|switch|upgrade|update|install|pin|version|sample|code|snippet|guide|step|test|verify|docs|endpoint|sdk)\b/i, input.migrationNotes)) {
      migrationWarnings.push("missing migration steps: notes do not describe replacement endpoint, SDK version, code change, docs link, test step, or sequence customers should follow.");
    } else if (wordCount(input.migrationNotes) < 7) {
      migrationWarnings.push("missing migration steps: migration notes are too thin to guide customers from old behavior to the replacement path.");
    }

    if (!has(/\b(doc|docs|documentation|guide|migration guide|help center|support|forum|community|contact|ticket|email|devrel|developer relations|changelog|release notes|url|https?:\/\/)\b/i, input.docsNotes + "\n" + input.changeNotes)) {
      docsWarnings.push("missing docs/support path: notes do not point customers to migration docs, support channel, changelog, help center, forum, or devrel contact path.");
    }

    if (!hasOwner(input.ownerNotes + "\n" + input.docsNotes)) {
      ownerWarnings.push("missing owner or escalation path: notes do not name the product, devrel, docs, platform, support, or launch owner responsible for the notice.");
    }

    if (!hasDecision(input.ownerNotes + "\n" + input.cadenceNotes)) {
      followUpWarnings.push("missing internal follow-up decision: owner notes do not record send/hold decision, docs owner, support readiness owner, reminder cadence, review date, or final cutoff owner.");
    }
    if (has(/\b(no owner|not assigned|tbd|unknown|later)\b/i, input.ownerNotes + "\n" + input.cadenceNotes)) {
      followUpWarnings.push("missing internal follow-up decision: owner or cadence notes explicitly leave ownership or follow-up unresolved.");
    }

    const customerNotice = [
      "Subject: API deprecation notice",
      "",
      "We are preparing a change to " + (input.scopeNotes || "the affected API surface") + ".",
      "Effective date to confirm: " + (input.deadlineNotes || "add a concrete date, timezone, or migration window before publishing."),
      "Customer impact: " + (input.impactNotes || "add the affected integrations, plans, SDKs, or customer workflows."),
      "Migration path: " + (input.migrationNotes || "add replacement endpoint, SDK version, code step, and test guidance."),
      "Docs and support: " + (input.docsNotes || "add migration docs and support path before publishing."),
      "",
      "This notice should avoid vague timing and should not promise backwards compatibility unless the owner has verified it."
    ];

    const internalHandoff = [
      "API surface type: " + (input.apiSurfaceType || "not provided"),
      "Breaking-change clarity: " + (input.breakingNotes || "missing"),
      "Notice cadence: " + (input.cadenceNotes || "missing"),
      "Owner/follow-up: " + (input.ownerNotes || "missing"),
      "Docs/support path: " + (input.docsNotes || "missing")
    ];

    const issueCount =
      dateWarnings.length +
      scopeWarnings.length +
      breakingWarnings.length +
      impactWarnings.length +
      migrationWarnings.length +
      docsWarnings.length +
      ownerWarnings.length +
      segmentWarnings.length +
      vagueLanguageWarnings.length +
      compatibilityWarnings.length +
      followUpWarnings.length;

    const status = issueCount === 0
      ? "Ready for API notice review"
      : issueCount >= 5
        ? "Fix before publishing"
        : "Manual review";

    return {
      status,
      issueCount,
      parseSummary: unique(parseSummary),
      dateWarnings: unique(dateWarnings),
      scopeWarnings: unique(scopeWarnings),
      breakingWarnings: unique(breakingWarnings),
      impactWarnings: unique(impactWarnings),
      migrationWarnings: unique(migrationWarnings),
      docsWarnings: unique(docsWarnings),
      ownerWarnings: unique(ownerWarnings),
      segmentWarnings: unique(segmentWarnings),
      vagueLanguageWarnings: unique(vagueLanguageWarnings),
      compatibilityWarnings: unique(compatibilityWarnings),
      followUpWarnings: unique(followUpWarnings),
      customerNotice,
      internalHandoff,
      handoffReminders: [
        "Remove API keys, tokens, customer data, incident details, security-sensitive data, contract text, and billing data before using pasted samples.",
        "Get internal approval before publishing customer notices, changelog entries, support commitments, compatibility claims, or deadline changes.",
        "Treat this output as API/product communication QA and internal launch guidance, not legal advice, compliance advice, SLA advice, contract advice, API runtime validation, or a substitute for company policy."
      ]
    };
  }

  function listHtml(items, emptyText) {
    const list = items && items.length ? items : [emptyText];
    return "<ul>" + list.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
  }

  function briefToText(brief) {
    return [
      "API deprecation notice brief",
      "Status: " + brief.status,
      "Checks needing attention: " + brief.issueCount,
      "",
      "Parse summary:",
      brief.parseSummary.join("\n"),
      "",
      "Effective date warnings:",
      brief.dateWarnings.length ? brief.dateWarnings.join("\n") : "None found.",
      "",
      "API scope warnings:",
      brief.scopeWarnings.length ? brief.scopeWarnings.join("\n") : "None found.",
      "",
      "Breaking-change warnings:",
      brief.breakingWarnings.length ? brief.breakingWarnings.join("\n") : "None found.",
      "",
      "Customer impact warnings:",
      brief.impactWarnings.length ? brief.impactWarnings.join("\n") : "None found.",
      "",
      "Migration warnings:",
      brief.migrationWarnings.length ? brief.migrationWarnings.join("\n") : "None found.",
      "",
      "Docs/support warnings:",
      brief.docsWarnings.length ? brief.docsWarnings.join("\n") : "None found.",
      "",
      "Owner warnings:",
      brief.ownerWarnings.length ? brief.ownerWarnings.join("\n") : "None found.",
      "",
      "Segment warnings:",
      brief.segmentWarnings.length ? brief.segmentWarnings.join("\n") : "None found.",
      "",
      "Vague language warnings:",
      brief.vagueLanguageWarnings.length ? brief.vagueLanguageWarnings.join("\n") : "None found.",
      "",
      "Compatibility warnings:",
      brief.compatibilityWarnings.length ? brief.compatibilityWarnings.join("\n") : "None found.",
      "",
      "Internal follow-up warnings:",
      brief.followUpWarnings.length ? brief.followUpWarnings.join("\n") : "None found.",
      "",
      "Customer notice draft:",
      brief.customerNotice.join("\n"),
      "",
      "Internal handoff:",
      brief.internalHandoff.join("\n"),
      "",
      "Handoff reminders:",
      brief.handoffReminders.join("\n")
    ].join("\n");
  }

  function renderBrief(brief) {
    const output = qs("#brief-output");
    if (!output) return;
    output.innerHTML = [
      '<div class="brief-summary">',
      '<strong>' + escapeHtml(brief.status) + '</strong>',
      '<span>' + brief.issueCount + ' checks need attention</span>',
      "</div>",
      '<section class="brief-section"><h4>Parse summary</h4>' + listHtml(brief.parseSummary, "No parse notes found.") + "</section>",
      '<section class="brief-section"><h4>Effective date warnings</h4>' + listHtml(brief.dateWarnings, "No effective date warnings found.") + "</section>",
      '<section class="brief-section"><h4>API scope warnings</h4>' + listHtml(brief.scopeWarnings, "No endpoint, version, field, or SDK scope warnings found.") + "</section>",
      '<section class="brief-section"><h4>Breaking-change warnings</h4>' + listHtml(brief.breakingWarnings, "No breaking-change warnings found.") + "</section>",
      '<section class="brief-section"><h4>Customer impact warnings</h4>' + listHtml(brief.impactWarnings, "No customer impact warnings found.") + "</section>",
      '<section class="brief-section"><h4>Migration warnings</h4>' + listHtml(brief.migrationWarnings, "No migration warnings found.") + "</section>",
      '<section class="brief-section"><h4>Docs/support warnings</h4>' + listHtml(brief.docsWarnings, "No docs or support warnings found.") + "</section>",
      '<section class="brief-section"><h4>Owner warnings</h4>' + listHtml(brief.ownerWarnings, "No owner warnings found.") + "</section>",
      '<section class="brief-section"><h4>Segment warnings</h4>' + listHtml(brief.segmentWarnings, "No customer segment warnings found.") + "</section>",
      '<section class="brief-section"><h4>Vague language warnings</h4>' + listHtml(brief.vagueLanguageWarnings, "No vague language warnings found.") + "</section>",
      '<section class="brief-section"><h4>Compatibility warnings</h4>' + listHtml(brief.compatibilityWarnings, "No compatibility warnings found.") + "</section>",
      '<section class="brief-section"><h4>Internal follow-up warnings</h4>' + listHtml(brief.followUpWarnings, "No internal follow-up warnings found.") + "</section>",
      '<section class="brief-section"><h4>Customer notice draft</h4><pre>' + escapeHtml(brief.customerNotice.join("\n")) + "</pre></section>",
      '<section class="brief-section"><h4>Internal launch handoff</h4>' + listHtml(brief.internalHandoff, "No internal handoff notes found.") + "</section>",
      '<section class="brief-section"><h4>Handoff reminders</h4>' + listHtml(brief.handoffReminders, "No handoff reminders found.") + "</section>"
    ].join("");
    setText("#output-title", "API deprecation notice brief ready");
    setText("#status-pill", brief.status);
    const outputPanel = qs("#output-panel");
    if (outputPanel) {
      outputPanel.classList.add("has-brief");
      outputPanel.classList.toggle("status-good", brief.status === "Ready for API notice review");
      outputPanel.classList.toggle("status-warning", brief.status === "Manual review");
      outputPanel.classList.toggle("status-danger", brief.status === "Fix before publishing");
    }
    const copyButton = qs("#copy-brief");
    if (copyButton) copyButton.disabled = false;
    window.__latestBriefText = briefToText(brief);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  function issueUrl(intent) {
    const body = [
      "API Deprecation Notice Briefs early-access request",
      "",
      "Role: " + intent.role,
      "API surface type: " + intent.siteType,
      "Deprecation cadence: " + intent.cadence,
      "Plan interest: " + intent.plan,
      "Willingness to pay: " + intent.budget,
      "Purchase intent: " + (intent.purchaseIntent ? "yes" : "no"),
      "",
      "Current API deprecation process or pain:",
      intent.pain,
      "",
      "Note: Email is intentionally omitted from this public issue body."
    ].join("\n");
    const params = new URLSearchParams({
      title: "API Deprecation Notice Briefs early-access request",
      body,
      labels: "early-access,purchase-intent,demo-request",
      template: "demo_request.md"
    });
    return ISSUE_BASE + "?" + params.toString();
  }

  function requestDetails(intent) {
    return [
      "API Deprecation Notice Briefs early-access request",
      "Email: " + intent.email,
      "Role: " + intent.role,
      "API surface type: " + intent.siteType,
      "Deprecation cadence: " + intent.cadence,
      "Plan interest: " + intent.plan,
      "Willingness to pay: " + intent.budget,
      "Purchase intent: " + (intent.purchaseIntent ? "yes" : "no"),
      "",
      "Pain:",
      intent.pain
    ].join("\n");
  }

  function init() {
    const changeNotes = qs("#change-notes");
    const scopeNotes = qs("#scope-notes");
    const deadlineNotes = qs("#deadline-notes");
    const breakingNotes = qs("#breaking-notes");
    const migrationNotes = qs("#migration-notes");
    const impactNotes = qs("#impact-notes");
    const docsNotes = qs("#docs-notes");
    const ownerNotes = qs("#owner-notes");
    const apiSurfaceType = qs("#api-surface-type");
    const cadenceNotes = qs("#cadence-notes");
    const error = qs("#workflow-error");
    const form = qs("#qa-form");
    const loadSample = qs("#load-sample");
    const copyBrief = qs("#copy-brief");
    const waitlistForm = qs("#waitlist-form");
    const handoffPanel = qs("#handoff-panel");
    const remoteLink = qs("#remote-intent-link");
    const copyRequest = qs("#copy-request");

    track("landing_viewed", { product: "API Deprecation Notice Briefs" });

    qsa("[data-track-cta]").forEach((element) => {
      element.addEventListener("click", () => {
        track("cta_clicked", { cta: element.getAttribute("data-track-cta") || element.textContent.trim() });
      });
    });

    if (loadSample) {
      loadSample.addEventListener("click", () => {
        if (changeNotes) changeNotes.value = SAMPLE_CHANGE_NOTES;
        if (scopeNotes) scopeNotes.value = SAMPLE_SCOPE_NOTES;
        if (deadlineNotes) deadlineNotes.value = SAMPLE_DEADLINE_NOTES;
        if (breakingNotes) breakingNotes.value = SAMPLE_BREAKING_NOTES;
        if (migrationNotes) migrationNotes.value = SAMPLE_MIGRATION_NOTES;
        if (impactNotes) impactNotes.value = SAMPLE_IMPACT_NOTES;
        if (docsNotes) docsNotes.value = SAMPLE_DOCS_NOTES;
        if (ownerNotes) ownerNotes.value = SAMPLE_OWNER_NOTES;
        if (apiSurfaceType) apiSurfaceType.value = "REST endpoint deprecation";
        if (cadenceNotes) cadenceNotes.value = SAMPLE_CADENCE_NOTES;
        if (error) error.textContent = "";
        track("sample_api_deprecation_notes_loaded");
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        track("core_action_started", { workflow: "api_deprecation_notice" });
        if (error) error.textContent = "";
        const input = {
          changeNotes: changeNotes ? changeNotes.value.trim() : "",
          scopeNotes: scopeNotes ? scopeNotes.value.trim() : "",
          deadlineNotes: deadlineNotes ? deadlineNotes.value.trim() : "",
          breakingNotes: breakingNotes ? breakingNotes.value.trim() : "",
          migrationNotes: migrationNotes ? migrationNotes.value.trim() : "",
          impactNotes: impactNotes ? impactNotes.value.trim() : "",
          docsNotes: docsNotes ? docsNotes.value.trim() : "",
          ownerNotes: ownerNotes ? ownerNotes.value.trim() : "",
          apiSurfaceType: apiSurfaceType ? apiSurfaceType.value.trim() : "",
          cadenceNotes: cadenceNotes ? cadenceNotes.value.trim() : ""
        };
        if (!input.changeNotes && !input.scopeNotes && !input.deadlineNotes && !input.migrationNotes && !input.impactNotes) {
          if (error) error.textContent = "Paste API deprecation notes and affected scope notes before generating a brief.";
          track("core_action_failed", { reason: "empty_input" });
          return;
        }
        const brief = analyze(input);
        renderBrief(brief);
        track("core_action_completed", { status: brief.status, issueCount: brief.issueCount });
      });
    }

    if (copyBrief) {
      copyBrief.addEventListener("click", async () => {
        await copyText(window.__latestBriefText || "");
        setText("#copy-status", "Copied brief");
        track("brief_copied");
      });
    }

    qsa(".price-card").forEach((card) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            track("pricing_viewed", { plan: card.querySelector("h3")?.textContent || "" });
            observer.disconnect();
          }
        });
      }, { threshold: 0.35 });
      observer.observe(card);
    });

    qsa(".plan-button").forEach((button) => {
      button.addEventListener("click", () => {
        const plan = button.getAttribute("data-plan") || "";
        const planSelect = qs("#plan");
        if (planSelect) planSelect.value = plan;
        track("checkout_started", { plan });
        qs("#waitlist")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (waitlistForm) {
      waitlistForm.addEventListener("submit", (event) => {
        event.preventDefault();
        track("signup_started", { form: "early_access" });
        const intent = {
          email: qs("#email")?.value.trim() || "",
          role: qs("#role")?.value || "",
          siteType: qs("#site-type-intent")?.value || "",
          cadence: qs("#deprecation-cadence")?.value || "",
          plan: qs("#plan")?.value || "",
          budget: qs("#budget")?.value || "",
          pain: qs("#pain")?.value.trim() || "",
          purchaseIntent: Boolean(qs("#purchase-intent")?.checked),
          timestamp: nowIso()
        };
        const intents = JSON.parse(localStorage.getItem(INTENT_KEY) || "[]");
        intents.push(intent);
        localStorage.setItem(INTENT_KEY, JSON.stringify(intents.slice(-20)));
        setText("#waitlist-status", "You are on the early access list. A public-safe GitHub demo request is ready.");
        if (remoteLink) remoteLink.href = issueUrl(intent);
        if (handoffPanel) handoffPanel.hidden = false;
        window.__latestRequestDetails = requestDetails(intent);
        track("waitlist_submitted", { role: intent.role, plan: intent.plan, purchaseIntent: intent.purchaseIntent });
        track("feedback_submitted", { field: "api_deprecation_process" });
        track("remote_intent_ready", { repo: "api-deprecation-notice-briefs" });
        if (intent.purchaseIntent) track("checkout_intent", { plan: intent.plan, budget: intent.budget });
      });
    }

    if (copyRequest) {
      copyRequest.addEventListener("click", async () => {
        await copyText(window.__latestRequestDetails || "");
        setText("#handoff-status", "Copied request details");
        track("remote_intent_copied");
      });
    }

    const revealItems = qsa(".reveal");
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      }, { threshold: 0.12 });
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
