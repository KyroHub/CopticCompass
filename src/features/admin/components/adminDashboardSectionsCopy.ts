export const adminDashboardSectionsCopy = {
  en: {
    audience: {
      dbError:
        "Audience contacts could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Track who has opted into release emails before you start sending lesson or publication announcements. The list keeps actionable contacts in full and shows a recent inactive window below them.",
      emptyDescription:
        "Opt-ins from the contact form, signup flow, and dashboard preferences will appear here.",
      emptyTitle: "No audience contacts yet.",
      lessons: "Lessons",
      noSummary: "No contacts yet",
      overflowLabel: "audience contact",
      overflowPluralLabel: "audience contacts",
      reachable: "reachable",
      summaryTotal: "total",
      synced: "Synced",
      syncErrors: "Sync errors",
      title: "Audience communication",
    },
    communicationsDesk: {
      activeReleases: "Active releases",
      audienceSyncDescription:
        "Push the current audience preferences to Resend before sending a release, especially after new signups or preference changes.",
      audienceSyncTitle: "Audience sync",
      badge: "Communications Desk",
      booksGeneral: "Books + general",
      description:
        "Draft new announcements here, keep the audience in sync with Resend, and let the release and contact history sit further down the page instead of crowding the compose flow.",
      draftInputsDescription:
        "Published lessons and publications currently available to announce.",
      draftInputsLabel: "Draft inputs",
      inQueueDescription:
        "Releases already queued or actively delivering in the background.",
      inQueueLabel: "In queue",
      lessons: "Lessons",
      reachableAudienceDescription:
        "Contacts who can receive lessons, books, or general updates now.",
      reachableAudienceLabel: "Reachable audience",
      synced: "Synced",
      syncErrors: "Sync errors",
      syncHealthDescription:
        "Contacts with sync issues that need a resend or manual check.",
      syncHealthLabel: "Sync health",
      title: "Plan releases without carrying the review queues with you",
    },
    contactInbox: {
      active: "Active",
      answered: "Answered",
      dbError:
        "Contact messages could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Triage public contact messages, keep track of replies, and note who wants future updates.",
      emptyDescription:
        "When visitors send a message from the contact page, it will appear here for follow-up.",
      emptyTitle: "No contact messages yet.",
      summaryLabels: {
        active: "active",
        none: "No messages",
        plural: "messages",
        singular: "message",
        total: "total",
      },
      title: "Contact inbox",
    },
    entryReports: {
      dbError:
        "Dictionary reports could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Review flagged lemmas, inspect the current published meaning, and move each report through your inbox.",
      emptyDescription:
        "When readers flag entries from the dictionary, they will appear here for review.",
      emptyTitle: "No dictionary reports yet.",
      open: "Open",
      resolved: "Resolved",
      summaryLabels: {
        active: "active",
        none: "No reports",
        plural: "reports",
        singular: "report",
        total: "total",
      },
      title: "Dictionary entry reports",
    },
    notifications: {
      attentionDescription:
        "Failures and still-queued notifications stay at the top.",
      attentionLabel: "Needs attention",
      dbError:
        "Notification activity could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Use this as a reference area for delivery health: failed or queued events first, then a bounded recent success log beneath.",
      emptyDescription:
        "Notification events will appear here once contact alerts, submission alerts, and review emails have been sent.",
      emptyHistory:
        "Successful sends will collect here once the system starts delivering notifications.",
      emptyIssues: "No notification issues are waiting right now.",
      emptyTitle: "No notification activity yet.",
      failed: "Failed",
      historyDescription:
        "Successful sends stay available here as a quieter recent audit trail.",
      historyLabel: "Recent delivery log",
      historyOverflowLabel: "history event",
      historyOverflowPluralLabel: "history events",
      metrics: {
        accepted: "Accepted",
        bounced: "Bounced",
        complained: "Complaints",
        delayed: "Delayed",
        delivered: "Delivered",
        queued: "Queued",
        suppressed: "Suppressed",
        title: "Operational snapshot",
      },
      noSummary: "No notification activity yet",
      notificationOverflowLabel: "notification",
      notificationOverflowPluralLabel: "notifications",
      recentSent: "Recent sent",
      sentInRecentLog: "sent in recent log",
      title: "Notification log",
    },
    quickJump: {
      badge: "Quick Jump",
      descriptions: {
        communications:
          "Focus on outbound announcements and audience health without carrying the review queues with you.",
        review:
          "Stay inside the live teaching queues. History now lives inside each section, so this view stays focused on work that still needs you.",
        system:
          "Inspect delivery health and operational alerts without the rest of the workspace competing for attention.",
      },
      links: {
        alerts: "Alerts",
        audience: "Audience",
        inbox: "Inbox",
        releases: "Releases",
        reports: "Reports",
        submissions: "Submissions",
      },
    },
    rag: {
      description:
        "Upload knowledge files to enrich Shenute AI context. Files are parsed, OCR-checked, chunked (default target 1600 chars with 200 overlap), embedded via your selected provider (Hugging Face or Gemini), and stored in pgvector. RAG status also tracks dictionary.json and grammar JSON knowledge sources.",
      destination: "Destination",
      embeddings: "Embeddings",
      selectable: "selectable",
      summary: "Multi-file ingestion with OCR + embeddings",
      title: "RAG knowledge ingestion",
    },
    releases: {
      active: "active",
      candidates: "Candidates",
      dbError:
        "Release drafts could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Build snapshot-based announcement drafts for published lessons and publications. The list below shows the latest release activity window so the workspace stays lightweight.",
      emptyDescription:
        "Create a draft above to snapshot the published lessons or publications you want to announce.",
      emptyTitle: "No release drafts yet.",
      inQueue: "In queue",
      noSummary: "No release drafts yet",
      readyOrLive: "Ready or live",
      recentWindow: "in recent window",
      title: "Release drafts",
    },
    reviewInbox: {
      activeDescription:
        "Start with the live queues below. Reviewed, archived, and resolved work stays tucked into each section's history view so this mode can stay calm.",
      activeTitleSuffix: "active items need attention",
      badge: "Review Inbox",
      clearDescription:
        "Nothing urgent is waiting right now. You can still open each section to revisit history or switch into Communications and System when you want the slower administrative work.",
      clearTitle: "Your review queues are clear",
      liveQueues: "Live queues",
      links: {
        inbox: {
          label: "Inbox",
          note: "Open conversations from learners and visitors.",
        },
        reports: {
          label: "Reports",
          note: "Dictionary feedback and entry issues to resolve.",
        },
        submissions: {
          label: "Submissions",
          note: "Translation work waiting for scoring and feedback.",
        },
      },
    },
    submissions: {
      dbError:
        "Exercise submissions could not load right now. Refresh the admin workspace, and check the database setup if this keeps happening.",
      description:
        "Review translation work, assign a score, and return feedback to students.",
      needsReview: "Needs review",
      reviewed: "Reviewed",
      summaryLabels: {
        active: "active",
        none: "No submissions",
        plural: "submissions",
        singular: "submission",
        total: "total",
      },
      title: "Exercise submissions",
    },
    systemHealth: {
      activeSuppressionsDescription:
        "Current suppressions that override marketing preferences.",
      activeSuppressionsLabel: "Active suppressions",
      alertsTitle: "Operational alerts",
      badge: "System Health",
      deadLetterLabel: "Dead-letter",
      description:
        "This mode is meant for quiet operational checks. Failures and queued sends surface first, while successful delivery history sits below as a reference log.",
      failedDescription: "Notifications that need investigation or a resend.",
      failedLabel: "Failed",
      failedNotifications: "Failed notifications",
      issuePlural: "delivery issues need attention",
      issueSingular: "delivery issue needs attention",
      nextRetryLabel: "Next retry",
      noneLabel: "None",
      noAlerts: "No operational alerts are active.",
      oldestEligibleLabel: "Oldest eligible",
      operationalAlertDetails: {
        "audience-sync-error-rate": {
          detail: "Audience sync errors are above the dashboard threshold.",
          label: "Audience sync drift",
        },
        "complaint-events": {
          detail: "Complaint events require immediate deliverability review.",
          label: "Complaint event recorded",
        },
        "dead-letter-email-jobs": {
          detail:
            "Dead-letter jobs need an admin retry decision with an audit reason.",
          label: "Dead-letter notification jobs",
        },
        "expired-processing-email-jobs": {
          detail:
            "At least one processing notification email job has exceeded its lease.",
          label: "Processing job lease expired",
        },
        "failed-provider-webhooks": {
          detail:
            "One or more provider webhook events were captured but failed processing.",
          label: "Webhook processing failures",
        },
        "recent-bounce-rate": {
          detail:
            "Recent bounce rate is above the initial dashboard threshold.",
          label: "Bounce rate elevated",
        },
        "stale-content-releases": {
          detail:
            "A content release has remained queued or sending beyond the operational window.",
          label: "Content release incomplete",
        },
        "stale-email-queue": {
          detail:
            "The oldest eligible notification email job is older than five minutes.",
          label: "Queued email job is stale",
        },
      },
      processingLabel: "Processing",
      processingExpiredLabel: "Expired leases",
      queuedDescription:
        "Events that are waiting to process or still completing.",
      queuedLabel: "Queued",
      queueOperationsDescription:
        "Email job depth by status, with stale lease and retry timing signals.",
      queueOperationsLabel: "Queue operations",
      recentSentDescription:
        "Successfully delivered notifications in the recent log window.",
      recentSentLabel: "Recent sent",
      receivedWebhooksLabel: "Received webhooks",
      steadyTitle: "Delivery health is steady",
      staleReleasesLabel: "Stale releases",
      webhookFailuresDescription:
        "Provider webhook events captured but not processed successfully.",
      webhookFailuresLabel: "Webhook failures",
    },
  },
  nl: {
    audience: {
      dbError:
        "Publiekscontacten konden nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Volg wie zich heeft aangemeld voor release-e-mails voordat u les- of publicatieaankondigingen verstuurt. De lijst toont actiegerichte contacten volledig en plaatst een recent inactief venster daaronder.",
      emptyDescription:
        "Aanmeldingen via het contactformulier, de registratieflow en dashboardvoorkeuren verschijnen hier.",
      emptyTitle: "Nog geen publiekscontacten.",
      lessons: "Lessen",
      noSummary: "Nog geen contacten",
      overflowLabel: "publiekscontact",
      overflowPluralLabel: "publiekscontacten",
      reachable: "bereikbaar",
      summaryTotal: "totaal",
      synced: "Gesynchroniseerd",
      syncErrors: "Synchronisatiefouten",
      title: "Publiekscommunicatie",
    },
    communicationsDesk: {
      activeReleases: "Actieve releases",
      audienceSyncDescription:
        "Stuur de huidige publieksvoorkeuren naar Resend voordat u een release verstuurt, vooral na nieuwe aanmeldingen of voorkeurwijzigingen.",
      audienceSyncTitle: "Publiekssynchronisatie",
      badge: "Communicatiedesk",
      booksGeneral: "Boeken + algemeen",
      description:
        "Maak hier nieuwe aankondigingen, houd het publiek gesynchroniseerd met Resend en laat release- en contactgeschiedenis lager op de pagina staan zodat de opstelstroom rustig blijft.",
      draftInputsDescription:
        "Gepubliceerde lessen en publicaties die nu aangekondigd kunnen worden.",
      draftInputsLabel: "Conceptbronnen",
      inQueueDescription:
        "Releases die al in de wachtrij staan of op de achtergrond worden verzonden.",
      inQueueLabel: "In wachtrij",
      lessons: "Lessen",
      reachableAudienceDescription:
        "Contacten die nu lessen, boeken of algemene updates kunnen ontvangen.",
      reachableAudienceLabel: "Bereikbaar publiek",
      synced: "Gesynchroniseerd",
      syncErrors: "Synchronisatiefouten",
      syncHealthDescription:
        "Contacten met synchronisatieproblemen waarvoor opnieuw verzenden of een handmatige controle nodig is.",
      syncHealthLabel: "Synchronisatiestatus",
      title: "Plan releases zonder de beoordelingswachtrijen erbij te houden",
    },
    contactInbox: {
      active: "Actief",
      answered: "Beantwoord",
      dbError:
        "Contactberichten konden nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Behandel openbare contactberichten, houd antwoorden bij en noteer wie toekomstige updates wil ontvangen.",
      emptyDescription:
        "Wanneer bezoekers een bericht via de contactpagina sturen, verschijnt het hier voor opvolging.",
      emptyTitle: "Nog geen contactberichten.",
      summaryLabels: {
        active: "actief",
        none: "Geen berichten",
        plural: "berichten",
        singular: "bericht",
        total: "totaal",
      },
      title: "Contactinbox",
    },
    entryReports: {
      dbError:
        "Woordenboekmeldingen konden nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Beoordeel gemarkeerde lemma's, controleer de huidige gepubliceerde betekenis en verwerk elk rapport in uw inbox.",
      emptyDescription:
        "Wanneer lezers woordenboekitems markeren, verschijnen ze hier voor beoordeling.",
      emptyTitle: "Nog geen woordenboekmeldingen.",
      open: "Open",
      resolved: "Opgelost",
      summaryLabels: {
        active: "actief",
        none: "Geen rapporten",
        plural: "rapporten",
        singular: "rapport",
        total: "totaal",
      },
      title: "Woordenboekmeldingen",
    },
    notifications: {
      attentionDescription:
        "Mislukte en nog wachtrijstaande meldingen blijven bovenaan.",
      attentionLabel: "Vraagt aandacht",
      dbError:
        "Meldingsactiviteit kon nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Gebruik dit als referentiegebied voor leveringsstatus: mislukte of wachtrijstaande events eerst, daarna een begrensd recent succeslog.",
      emptyDescription:
        "Meldingsevents verschijnen hier zodra contactmeldingen, inzendingsmeldingen en beoordelingsmails zijn verstuurd.",
      emptyHistory:
        "Succesvolle verzendingen worden hier verzameld zodra het systeem meldingen begint te bezorgen.",
      emptyIssues: "Er wachten nu geen meldingsproblemen.",
      emptyTitle: "Nog geen meldingsactiviteit.",
      failed: "Mislukt",
      historyDescription:
        "Succesvolle verzendingen blijven hier beschikbaar als rustig recent auditspoor.",
      historyLabel: "Recent leveringslog",
      historyOverflowLabel: "geschiedenisitem",
      historyOverflowPluralLabel: "geschiedenisitems",
      metrics: {
        accepted: "Geaccepteerd",
        bounced: "Bounced",
        complained: "Klachten",
        delayed: "Vertraagd",
        delivered: "Bezorgd",
        queued: "In wachtrij",
        suppressed: "Geblokkeerd",
        title: "Operationele momentopname",
      },
      noSummary: "Nog geen meldingsactiviteit",
      notificationOverflowLabel: "melding",
      notificationOverflowPluralLabel: "meldingen",
      recentSent: "Recent verzonden",
      sentInRecentLog: "verzonden in recent log",
      title: "Meldingenlog",
    },
    quickJump: {
      badge: "Snelle sprong",
      descriptions: {
        communications:
          "Richt u op uitgaande aankondigingen en publieksstatus zonder de beoordelingswachtrijen erbij te houden.",
        review:
          "Blijf in de actieve onderwijswachtrijen. Geschiedenis staat nu in elke sectie, zodat deze weergave gericht blijft op werk dat nog aandacht vraagt.",
        system:
          "Controleer leveringsstatus en operationele meldingen zonder dat de rest van de werkruimte om aandacht vraagt.",
      },
      links: {
        alerts: "Meldingen",
        audience: "Publiek",
        inbox: "Inbox",
        releases: "Releases",
        reports: "Rapporten",
        submissions: "Inzendingen",
      },
    },
    rag: {
      description:
        "Upload kennisbestanden om de context van Shenute AI te verrijken. Bestanden worden geparsed, via OCR gecontroleerd, in chunks verdeeld (standaarddoel 1600 tekens met 200 overlap), ingebed via de geselecteerde provider (Hugging Face of Gemini) en opgeslagen in pgvector. De RAG-status volgt ook dictionary.json en grammatica-JSON-kennisbronnen.",
      destination: "Bestemming",
      embeddings: "Embeddings",
      selectable: "selecteerbaar",
      summary: "Invoer van meerdere bestanden met OCR + embeddings",
      title: "RAG-kennisinvoer",
    },
    releases: {
      active: "actief",
      candidates: "Kandidaten",
      dbError:
        "Releaseconcepten konden nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Maak snapshotgebaseerde aankondigingsconcepten voor gepubliceerde lessen en publicaties. De lijst hieronder toont de nieuwste release-activiteit zodat de werkruimte licht blijft.",
      emptyDescription:
        "Maak hierboven een concept om de gepubliceerde lessen of publicaties vast te leggen die u wilt aankondigen.",
      emptyTitle: "Nog geen releaseconcepten.",
      inQueue: "In wachtrij",
      noSummary: "Nog geen releaseconcepten",
      readyOrLive: "Klaar of live",
      recentWindow: "in recent venster",
      title: "Releaseconcepten",
    },
    reviewInbox: {
      activeDescription:
        "Begin met de actieve wachtrijen hieronder. Beoordeeld, gearchiveerd en opgelost werk staat in de geschiedenis van elke sectie, zodat deze modus rustig blijft.",
      activeTitleSuffix: "actieve items vragen aandacht",
      badge: "Beoordelingsinbox",
      clearDescription:
        "Er wacht nu niets dringends. U kunt elke sectie openen om geschiedenis te bekijken of overschakelen naar Communicatie en Systeem voor trager administratief werk.",
      clearTitle: "Uw beoordelingswachtrijen zijn leeg",
      liveQueues: "Actieve wachtrijen",
      links: {
        inbox: {
          label: "Inbox",
          note: "Open gesprekken van studenten en bezoekers.",
        },
        reports: {
          label: "Rapporten",
          note: "Woordenboekfeedback en itemproblemen om op te lossen.",
        },
        submissions: {
          label: "Inzendingen",
          note: "Vertaalwerk dat wacht op score en feedback.",
        },
      },
    },
    submissions: {
      dbError:
        "Inzendingen konden nu niet worden geladen. Vernieuw de adminwerkruimte en controleer de database-inrichting als dit blijft gebeuren.",
      description:
        "Beoordeel vertaalwerk, geef een score en stuur feedback terug naar studenten.",
      needsReview: "Te beoordelen",
      reviewed: "Beoordeeld",
      summaryLabels: {
        active: "actief",
        none: "Geen inzendingen",
        plural: "inzendingen",
        singular: "inzending",
        total: "totaal",
      },
      title: "Oefeninzendingen",
    },
    systemHealth: {
      activeSuppressionsDescription:
        "Actieve onderdrukkingen die marketingvoorkeuren overschrijven.",
      activeSuppressionsLabel: "Actieve onderdrukkingen",
      alertsTitle: "Operationele waarschuwingen",
      badge: "Systeemstatus",
      deadLetterLabel: "Definitief mislukt",
      description:
        "Deze modus is bedoeld voor rustige operationele controles. Mislukkingen en wachtrij-items komen eerst; succesvolle leveringsgeschiedenis staat daaronder als referentielog.",
      failedDescription:
        "Meldingen waarvoor onderzoek of opnieuw verzenden nodig is.",
      failedLabel: "Mislukt",
      failedNotifications: "Mislukte meldingen",
      issuePlural: "leveringsproblemen vragen aandacht",
      issueSingular: "leveringsprobleem vraagt aandacht",
      nextRetryLabel: "Volgende retry",
      noneLabel: "Geen",
      noAlerts: "Er zijn geen actieve operationele waarschuwingen.",
      oldestEligibleLabel: "Oudste gereed",
      operationalAlertDetails: {
        "audience-sync-error-rate": {
          detail:
            "Publiekssynchronisatiefouten liggen boven de dashboarddrempel.",
          label: "Drift in publiekssynchronisatie",
        },
        "complaint-events": {
          detail:
            "Klachtevents vragen onmiddellijke controle van de deliverability.",
          label: "Klachtevent vastgelegd",
        },
        "dead-letter-email-jobs": {
          detail:
            "Definitief mislukte jobs vragen een adminbeslissing met auditreden.",
          label: "Definitief mislukte meldingjobs",
        },
        "expired-processing-email-jobs": {
          detail:
            "Minstens een meldingjob in verwerking heeft de lease overschreden.",
          label: "Verwerkingslease verlopen",
        },
        "failed-provider-webhooks": {
          detail:
            "Een of meer providerwebhooks zijn vastgelegd maar konden niet worden verwerkt.",
          label: "Webhookverwerking mislukt",
        },
        "recent-bounce-rate": {
          detail:
            "Het recente bouncepercentage ligt boven de startdrempel van het dashboard.",
          label: "Bouncepercentage verhoogd",
        },
        "stale-content-releases": {
          detail:
            "Een contentrelease staat langer dan het operationele venster in wachtrij of verzending.",
          label: "Contentrelease niet afgerond",
        },
        "stale-email-queue": {
          detail:
            "De oudste gereedstaande meldingjob is ouder dan vijf minuten.",
          label: "E-mailjob blijft te lang staan",
        },
      },
      processingLabel: "In verwerking",
      processingExpiredLabel: "Verlopen leases",
      queuedDescription:
        "Events die wachten op verwerking of nog worden afgerond.",
      queuedLabel: "In wachtrij",
      queueOperationsDescription:
        "Diepte van e-mailjobs per status, met signalen voor verlopen leases en retry-timing.",
      queueOperationsLabel: "Wachtrijstatus",
      recentSentDescription:
        "Succesvol bezorgde meldingen in het recente logvenster.",
      recentSentLabel: "Recent verzonden",
      receivedWebhooksLabel: "Ontvangen webhooks",
      steadyTitle: "De leveringsstatus is stabiel",
      staleReleasesLabel: "Vastgelopen releases",
      webhookFailuresDescription:
        "Providerwebhooks die wel zijn vastgelegd maar niet succesvol verwerkt.",
      webhookFailuresLabel: "Webhookfouten",
    },
  },
} as const;
