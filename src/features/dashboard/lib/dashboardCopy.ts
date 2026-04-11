import type { Language } from "@/types/i18n";

const DATE_LOCALES = {
  en: "en-US",
  nl: "nl-BE",
} as const satisfies Record<Language, string>;

const DASHBOARD_COPY = {
  en: {
    metaTitle: "Student Dashboard",
    metaDescription:
      "Private student workspace for lessons, submissions, and progress.",
    pageTitle: "Student Dashboard",
    pageDescription: "Manage your grammar exercises and view feedback.",
    signOut: "Sign Out",
    welcomeBack: "Welcome back",
    fallbackStudentName: "Student",
    loggedInAs: "Logged in as",
    avatarAlt: "Avatar",
    recentExercisesTitle: "Your Recent Exercises",
    noExercisesTitle: "No Exercises Submitted Yet",
    noExercisesDescription:
      "Head over to the Grammar section to complete your first lesson!",
    reviewedLabel: "Reviewed",
    grammar: {
      title: "Grammar progress",
      description:
        "Track your lesson completion, saved lessons, and personal notes across the grammar course.",
      publishedLessons: "Published lessons",
      startedLessons: "Started",
      completedLessons: "Completed",
      savedLessons: "Saved / noted",
      completedBadge: "Completed",
      savedBadge: "Saved",
      notesBadge: "Notes",
      notStartedYet: "Not started yet",
      continueLesson: "Continue lesson",
      startLesson: "Start lesson",
    },
    dictionary: {
      title: "Saved dictionary entries",
      description:
        "Keep quick access to the lemmas you bookmarked while studying lessons or checking vocabulary.",
      totalSaved: "Saved entries",
      availableEntries: "Available now",
      missingEntries: "Archived or changed",
      savedBadge: "Saved",
      missingBadge: "Unavailable",
      savedOnPrefix: "Saved on",
      viewEntry: "Open entry",
      removedNotice:
        "This entry no longer appears in the current dictionary dataset, but the bookmark is kept for reference.",
      noSavedTitle: "No saved entries yet",
      noSavedDescription:
        "Use the heart button on any dictionary entry to keep it close at hand in your dashboard.",
    },
    account: {
      eyebrow: "Account",
      title: "Settings",
      privateBadge: "Private",
      description:
        "Manage your profile details, password access, and account-level requests without cluttering the rest of the dashboard.",
      profileTitle: "Profile Settings",
      profileDescription:
        "Update your display name and avatar while keeping your sign-in email visible for reference.",
      passwordTitle: "Update Password",
      passwordDescription:
        "Change your dashboard password here instead of leaving the dashboard flow.",
      passwordExternalDescription:
        "This account uses {provider} for sign-in, so password changes are not managed locally.",
      passwordAvailableBadge: "Available",
      passwordExternalBadge: "External sign-in",
      communicationTitle: "Email Updates",
      communicationDescription:
        "Choose which lesson, publication, and project announcements should reach your inbox.",
      communicationBadge: "Opt-in",
      communicationLead:
        "These preferences control release and announcement emails only. Account and grading emails continue to use their own operational paths.",
      communicationEmailLabel: "Delivery Email",
      communicationLocaleLabel: "Email language",
      communicationLocaleHint:
        "Release announcements can be localized, so choose the language you want to receive when both versions are available.",
      communicationLessonsLabel: "New grammar lessons",
      communicationBooksLabel: "Book and publication releases",
      communicationGeneralLabel: "Major project updates",
      communicationHint:
        "You can pause every topic here without affecting required account emails like password resets or feedback notices.",
      communicationSaveIdle: "Save Preferences",
      communicationSavePending: "Saving...",
      deleteTitle: "Delete Profile",
      deleteDescription:
        "Review the permanent deletion path before removing your account and associated learning data.",
      deleteBadge: "Manual review",
      passwordManagedElsewhere:
        "This account signs in with {provider}, so password changes are not managed here.",
      newPasswordLabel: "New Password",
      newPasswordPlaceholder: "Must be at least 8 characters",
      confirmPasswordLabel: "Confirm New Password",
      confirmPasswordPlaceholder: "Repeat your new password",
      passwordHint:
        "Use a password you do not reuse elsewhere. Updating it here keeps your dashboard login current without leaving this page.",
      updatePasswordIdle: "Update Password",
      updatePasswordPending: "Updating...",
      passwordUpdateSuccess: "Password updated successfully.",
      passwordUpdateFailed: "Could not update your password.",
      passwordMismatch: "Passwords do not match.",
      deleteNoticeTitle: "Permanent deletion",
      deleteNoticeBody:
        "Requesting deletion removes your profile together with associated dashboard data such as submissions, lesson progress, bookmarks, and notes.",
      deleteNoticeLead:
        "Account deletion is currently handled manually so we can safely remove your profile and the learning data tied to it.",
      requestDeletion: "Request Deletion",
      reviewPrivacy: "Review Privacy Policy",
    },
    profile: {
      sectionTitle: "Profile Settings",
      avatarAlt: "Avatar",
      noAvatar: "No Avatar",
      uploadIdle: "Upload Image",
      uploadPending: "Uploading...",
      fullNameLabel: "Full Name",
      fullNamePlaceholder: "Your Name",
      emailLabel: "Email Address",
      emailHint: "Email cannot be changed currently.",
      saveChanges: "Save Changes",
      compressingImage: "Compressing image...",
      uploadingImage: "Uploading to server...",
      updatedSuccess: "Profile updated successfully!",
      selectImageError: "You must select an image to upload.",
      uploadUnavailableError:
        "Database connection disabled. Cannot upload file.",
      uploadUnknownError: "Unknown upload error occurred",
      updateFailed: "Failed to update profile.",
    },
    submissions: {
      scoreLabel: "Score",
      feedbackTitle: "Instructor Feedback",
      awaitingReviewLabel: "Awaiting review",
      showDetails: "Show response and feedback",
      hideDetails: "Hide response and feedback",
      responseLabel: "Your response",
      waitingForReview: "Waiting for instructor review. Check back later!",
    },
    loading: {
      title: "Preparing your dashboard",
      description:
        "Loading your profile, lesson progress, and recent exercise feedback.",
    },
    error: {
      title: "We couldn't load your dashboard",
      description:
        "Your private workspace hit a temporary problem while loading.",
      details:
        "Progress, profile, or submission data could not be prepared for this request. Try again, and if it keeps happening, return to the grammar hub and retry from there.",
      primaryLabel: "Open grammar hub",
    },
  },
  nl: {
    metaTitle: "Leerdashboard",
    metaDescription: "Privéleeromgeving voor lessen, inzendingen en voortgang.",
    pageTitle: "Leerdashboard",
    pageDescription: "Beheer je grammaticaoefeningen en bekijk feedback.",
    signOut: "Uitloggen",
    welcomeBack: "Welkom terug",
    fallbackStudentName: "Student",
    loggedInAs: "Ingelogd als",
    avatarAlt: "Avatar",
    recentExercisesTitle: "Je recente oefeningen",
    noExercisesTitle: "Nog geen oefeningen ingestuurd",
    noExercisesDescription:
      "Ga naar de grammatica-sectie om je eerste les af te ronden.",
    reviewedLabel: "Nagekeken",
    grammar: {
      title: "Voortgang grammatica",
      description:
        "Volg je lesvoortgang, opgeslagen lessen en persoonlijke notities doorheen de grammaticacursus.",
      publishedLessons: "Gepubliceerde lessen",
      startedLessons: "Begonnen",
      completedLessons: "Voltooid",
      savedLessons: "Opgeslagen / genoteerd",
      completedBadge: "Voltooid",
      savedBadge: "Opgeslagen",
      notesBadge: "Notities",
      notStartedYet: "Nog niet begonnen",
      continueLesson: "Ga verder met de les",
      startLesson: "Start les",
    },
    dictionary: {
      title: "Opgeslagen woordenboeklemma's",
      description:
        "Hou de lemma's die je tijdens het studeren of opzoeken bewaart snel binnen bereik.",
      totalSaved: "Opgeslagen lemma's",
      availableEntries: "Nu beschikbaar",
      missingEntries: "Gearchiveerd of gewijzigd",
      savedBadge: "Opgeslagen",
      missingBadge: "Niet beschikbaar",
      savedOnPrefix: "Opgeslagen op",
      viewEntry: "Lemma openen",
      removedNotice:
        "Dit lemma staat niet meer in de huidige woordenboekdataset, maar de bladwijzer blijft bewaard als referentie.",
      noSavedTitle: "Nog geen opgeslagen lemma's",
      noSavedDescription:
        "Gebruik het hartje op een woordenboeklemma om het hier in je dashboard bij te houden.",
    },
    account: {
      eyebrow: "Account",
      title: "Instellingen",
      privateBadge: "Privé",
      description:
        "Beheer je profielgegevens, wachtwoordtoegang en accountaanvragen zonder de rest van je dashboard te overladen.",
      profileTitle: "Profielinstellingen",
      profileDescription:
        "Werk je weergavenaam en avatar bij, terwijl je aanmeldadres zichtbaar blijft als referentie.",
      passwordTitle: "Wachtwoord bijwerken",
      passwordDescription:
        "Wijzig hier je dashboardwachtwoord zonder de dashboardflow te verlaten.",
      passwordExternalDescription:
        "Dit account gebruikt {provider} om in te loggen, dus wachtwoordwijzigingen worden niet lokaal beheerd.",
      passwordAvailableBadge: "Beschikbaar",
      passwordExternalBadge: "Externe aanmelding",
      communicationTitle: "E-mailupdates",
      communicationDescription:
        "Kies welke les-, publicatie- en projectaankondigingen je in je inbox wilt ontvangen.",
      communicationBadge: "Opt-in",
      communicationLead:
        "Deze voorkeuren gelden alleen voor release- en aankondigingsmails. Account- en beoordelingsmails blijven hun eigen operationele weg volgen.",
      communicationEmailLabel: "Ontvangstadres",
      communicationLocaleLabel: "Taal van e-mails",
      communicationLocaleHint:
        "Releaseaankondigingen kunnen gelokaliseerd zijn, dus kies de taal die je wilt ontvangen wanneer beide versies beschikbaar zijn.",
      communicationLessonsLabel: "Nieuwe grammaticlessen",
      communicationBooksLabel: "Boek- en publicatiereleases",
      communicationGeneralLabel: "Belangrijke projectupdates",
      communicationHint:
        "Je kunt hier elk onderwerp pauzeren zonder verplichte accountmails zoals wachtwoordresets of feedbackmeldingen te beïnvloeden.",
      communicationSaveIdle: "Voorkeuren opslaan",
      communicationSavePending: "Bezig met opslaan...",
      deleteTitle: "Profiel verwijderen",
      deleteDescription:
        "Bekijk eerst het permanente verwijderingspad voordat je je account en bijbehorende leerdata verwijdert.",
      deleteBadge: "Handmatige controle",
      passwordManagedElsewhere:
        "Dit account meldt zich aan met {provider}, dus wachtwoordwijzigingen worden hier niet beheerd.",
      newPasswordLabel: "Nieuw wachtwoord",
      newPasswordPlaceholder: "Moet minstens 8 tekens bevatten",
      confirmPasswordLabel: "Nieuw wachtwoord bevestigen",
      confirmPasswordPlaceholder: "Herhaal je nieuwe wachtwoord",
      passwordHint:
        "Gebruik een wachtwoord dat je nergens anders hergebruikt. Door het hier bij te werken blijft je dashboardaanmelding actueel zonder deze pagina te verlaten.",
      updatePasswordIdle: "Wachtwoord bijwerken",
      updatePasswordPending: "Bezig met bijwerken...",
      passwordUpdateSuccess: "Wachtwoord succesvol bijgewerkt.",
      passwordUpdateFailed: "Het wachtwoord kon niet worden bijgewerkt.",
      passwordMismatch: "Wachtwoorden komen niet overeen.",
      deleteNoticeTitle: "Permanente verwijdering",
      deleteNoticeBody:
        "Een verwijderingsverzoek wist je profiel samen met bijbehorende dashboardgegevens zoals inzendingen, lesvoortgang, bladwijzers en notities.",
      deleteNoticeLead:
        "Accountverwijdering wordt momenteel handmatig afgehandeld zodat we je profiel en gekoppelde leerdata veilig kunnen verwijderen.",
      requestDeletion: "Verwijdering aanvragen",
      reviewPrivacy: "Privacybeleid bekijken",
    },
    profile: {
      sectionTitle: "Profielinstellingen",
      avatarAlt: "Avatar",
      noAvatar: "Geen avatar",
      uploadIdle: "Afbeelding uploaden",
      uploadPending: "Bezig met uploaden...",
      fullNameLabel: "Volledige naam",
      fullNamePlaceholder: "Je naam",
      emailLabel: "E-mailadres",
      emailHint: "Het e-mailadres kan momenteel niet worden gewijzigd.",
      saveChanges: "Wijzigingen opslaan",
      compressingImage: "Afbeelding comprimeren...",
      uploadingImage: "Uploaden naar de server...",
      updatedSuccess: "Profiel succesvol bijgewerkt!",
      selectImageError: "Je moet een afbeelding selecteren om te uploaden.",
      uploadUnavailableError:
        "Databaseverbinding uitgeschakeld. Bestand uploaden is niet mogelijk.",
      uploadUnknownError: "Er is een onbekende uploadfout opgetreden",
      updateFailed: "Profiel bijwerken mislukt.",
    },
    submissions: {
      scoreLabel: "Score",
      feedbackTitle: "Feedback van docent",
      awaitingReviewLabel: "Wacht op beoordeling",
      showDetails: "Antwoord en feedback tonen",
      hideDetails: "Antwoord en feedback verbergen",
      responseLabel: "Jouw antwoord",
      waitingForReview:
        "Wacht op beoordeling door de docent. Kom later nog eens terug.",
    },
    loading: {
      title: "Je dashboard wordt voorbereid",
      description:
        "Je profiel, lesvoortgang en recente oefenfeedback worden geladen.",
    },
    error: {
      title: "Je dashboard kon niet worden geladen",
      description:
        "Er liep tijdelijk iets mis bij het laden van je privéleeromgeving.",
      details:
        "Voortgang, profiel- of inzendingsgegevens konden niet voor dit verzoek worden voorbereid. Probeer het opnieuw en ga, als het probleem blijft bestaan, terug naar het grammatica-overzicht om het opnieuw te proberen.",
      primaryLabel: "Open grammatica-overzicht",
    },
  },
} as const satisfies Record<Language, unknown>;

/**
 * Returns the localized dashboard copy bundle used by the student dashboard
 * UI.
 */
export function getDashboardCopy(language: Language) {
  return DASHBOARD_COPY[language];
}

/**
 * Formats a dashboard date string for the selected UI language.
 */
export function formatDashboardDate(value: string | null, language: Language) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(DATE_LOCALES[language]);
}

/**
 * Replaces the provider placeholder in dashboard copy strings for externally
 * managed auth providers.
 */
export function formatDashboardProviderDescription(
  template: string,
  providerLabel: string,
) {
  return template.replace("{provider}", providerLabel);
}
