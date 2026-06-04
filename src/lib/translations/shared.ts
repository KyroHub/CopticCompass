import { defineMessages } from "@/lib/translations/defineMessages";

/**
 * Localized shared UI copy for navigation, footer, and language controls.
 */
export const sharedMessages = defineMessages({
  en: {
    "lang.toggle": "Toggle language",
    "lang.switchToDutch": "Switch to Dutch",
    "lang.switchToEnglish": "Switch to English",

    "shared.contents": "Contents",

    "nav.home": "Home",
    "nav.publications": "Publications",
    "nav.dictionary": "Dictionary",
    "nav.dictionaryMenu": "Dictionary tools",
    "nav.dictionarySearch": "Dictionary search",
    "nav.dictionarySearchShort": "Search",
    "nav.dictionarySearchDescription": "Search entries, forms, and meanings.",
    "nav.grammar": "Grammar",
    "nav.developers": "Developers",
    "nav.contact": "Contact",
    "nav.shenute": "Shenute AI",
    "nav.analytics": "Analytics Dashboard",
    "nav.analyticsShort": "Analytics",
    "nav.analyticsDescription": "Explore dictionary data and patterns.",
    "nav.login": "Sign In",
    "nav.dashboard": "Dashboard",
    "nav.account": "Account",
    "nav.openDashboard": "Open dashboard",
    "nav.authPrompt.title": "Sign in",
    "nav.authPrompt.description":
      "Save practice progress, favorites, and account settings.",

    "shenute.launcher.open": "Open Shenute AI",
    "shenute.launcher.loading": "Loading Shenute AI...",

    "notFound.title": "Page not found",
    "notFound.description":
      "This route does not exist, or the page may have moved.",
    "notFound.primaryAction": "Go home",
    "notFound.secondaryAction": "Open dictionary",
    "notFound.helpTitle": "Useful routes",
    "notFound.homeDescription": "Return to the main Coptic Compass workspace.",
    "notFound.dictionaryDescription":
      "Search Coptic entries, forms, and meanings.",
    "notFound.grammarDescription":
      "Continue with lessons, examples, and exercises.",
    "notFound.publicationsDescription":
      "Browse books, editions, and study material.",
    "notFound.shenuteDescription":
      "Ask Shenute AI for help with Coptic language questions.",

    "footer.rights": "All rights reserved.",
    "footer.credit": "is independently built and maintained.",
    "footer.privacy": "Privacy Policy",
    "footer.cookies": "Cookie Policy",
    "footer.cookiePreferences": "Cookie preferences",
    "footer.terms": "Terms of Service",
    "footer.faq": "FAQ",
    "footer.apiDocs": "API Docs",
    "footer.developers": "Developers",
    "footer.contributors": "Contributors",

    "legal.analyticsPreferences.title": "Analytics preferences",
    "legal.analyticsPreferences.description":
      "Control Vercel Analytics and Speed Insights when consent-first analytics is enabled.",
    "legal.analyticsPreferences.allowLabel": "Allow privacy-focused analytics",
    "legal.analyticsPreferences.allowDescription":
      "Used only for aggregate traffic and real-world performance measurement.",
    "legal.analyticsPreferences.allowedStatus":
      "Analytics are allowed. Changing this reloads the page.",
    "legal.analyticsPreferences.blockedStatus":
      "Analytics are blocked until you allow them.",
    "legal.analyticsConsentBanner.title": "Analytics preferences",
    "legal.analyticsConsentBanner.description":
      "Help us measure aggregate traffic and performance with Vercel Analytics and Speed Insights.",
    "legal.analyticsConsentBanner.acceptAnalytics": "Accept analytics",
    "legal.analyticsConsentBanner.essentialOnly": "Essential only",
  },
  nl: {
    "lang.toggle": "Taal wisselen",
    "lang.switchToDutch": "Overschakelen naar het Nederlands",
    "lang.switchToEnglish": "Overschakelen naar het Engels",

    "shared.contents": "Inhoud",

    "nav.home": "Home",
    "nav.publications": "Publicaties",
    "nav.dictionary": "Woordenboek",
    "nav.dictionaryMenu": "Woordenboektools",
    "nav.dictionarySearch": "Woordenboek zoeken",
    "nav.dictionarySearchShort": "Zoeken",
    "nav.dictionarySearchDescription": "Zoek lemma's, vormen en betekenissen.",
    "nav.grammar": "Grammatica",
    "nav.developers": "Ontwikkelaars",
    "nav.contact": "Contact",
    "nav.shenute": "Shenute AI",
    "nav.analytics": "Analytics-dashboard",
    "nav.analyticsShort": "Analytics",
    "nav.analyticsDescription": "Verken woordenboekgegevens en patronen.",
    "nav.login": "Inloggen",
    "nav.dashboard": "Dashboard",
    "nav.account": "Account",
    "nav.openDashboard": "Dashboard openen",
    "nav.authPrompt.title": "Inloggen",
    "nav.authPrompt.description":
      "Bewaar uw oefenvoortgang, favorieten en accountinstellingen.",

    "shenute.launcher.open": "Shenute AI openen",
    "shenute.launcher.loading": "Shenute AI laden...",

    "notFound.title": "Pagina niet gevonden",
    "notFound.description":
      "Deze route bestaat niet, of de pagina is verplaatst.",
    "notFound.primaryAction": "Ga naar de homepagina",
    "notFound.secondaryAction": "Open het woordenboek",
    "notFound.helpTitle": "Handige routes",
    "notFound.homeDescription":
      "Keer terug naar het startpunt van Coptic Compass.",
    "notFound.dictionaryDescription":
      "Zoek Koptische lemma's, vormen en betekenissen.",
    "notFound.grammarDescription":
      "Ga verder met lessen, voorbeelden en oefeningen.",
    "notFound.publicationsDescription":
      "Blader door boeken, edities en studiemateriaal.",
    "notFound.shenuteDescription":
      "Vraag Shenute AI om hulp bij Koptische taalvragen.",

    "footer.rights": "Alle rechten voorbehouden.",
    "footer.credit": "wordt onafhankelijk ontwikkeld en beheerd.",
    "footer.privacy": "Privacybeleid",
    "footer.cookies": "Cookiebeleid",
    "footer.cookiePreferences": "Cookievoorkeuren",
    "footer.terms": "Gebruiksvoorwaarden",
    "footer.faq": "FAQ",
    "footer.apiDocs": "API-docs",
    "footer.developers": "Ontwikkelaars",
    "footer.contributors": "Bijdragers",

    "legal.analyticsPreferences.title": "Analyticsvoorkeuren",
    "legal.analyticsPreferences.description":
      "Beheer Vercel Analytics en Speed Insights wanneer analytics met voorafgaande toestemming actief is.",
    "legal.analyticsPreferences.allowLabel":
      "Privacyvriendelijke analytics toestaan",
    "legal.analyticsPreferences.allowDescription":
      "Alleen gebruikt voor geaggregeerd verkeer en echte prestatiemetingen.",
    "legal.analyticsPreferences.allowedStatus":
      "Analytics zijn toegestaan. Een wijziging herlaadt de pagina.",
    "legal.analyticsPreferences.blockedStatus":
      "Analytics blijven geblokkeerd totdat u ze toestaat.",
    "legal.analyticsConsentBanner.title": "Analyticsvoorkeuren",
    "legal.analyticsConsentBanner.description":
      "Help ons geaggregeerd verkeer en prestaties te meten met Vercel Analytics en Speed Insights.",
    "legal.analyticsConsentBanner.acceptAnalytics": "Analytics toestaan",
    "legal.analyticsConsentBanner.essentialOnly": "Alleen noodzakelijk",
  },
});
