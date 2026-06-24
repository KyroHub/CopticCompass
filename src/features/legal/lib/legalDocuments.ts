import type { Language } from "@/types/i18n";

export interface LegalDocumentSection {
  bullets?: readonly string[];
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  description: string;
  sections: readonly LegalDocumentSection[];
}

const PRIVACY_DOCUMENTS = {
  en: {
    title: "Privacy Policy",
    description:
      "How Coptic Compass collects, uses, protects, and retains personal data.",
    sections: [
      {
        title: "1. Information We Collect",
        body: "We collect the information needed to provide the feature you use. This may include your account name, email address, profile picture, learning data, contact-form name, inquiry and message, chosen mailing topics and locale, consent and withdrawal history, and technical email-delivery events such as acceptance, delay, bounce, unsubscribe, or complaint status.",
      },
      {
        title: "2. Purposes and Legal Bases",
        body: "We process account and learning data to provide and secure the service; contact messages to answer your request; and essential transactional email to complete actions you request. Where applicable, these activities rely on performing a contract or requested pre-contractual steps, our legitimate interests in operating and protecting the service, or legal obligations. We send optional lesson, publication, and project marketing updates only after your explicit consent.",
      },
      {
        title: "3. Mailing Consent and Preferences",
        body: "Contact-form mailing choices are optional, separate from sending a message, and unchecked by default. We use double opt-in: opening the emailed link only displays the requested topics, while pressing the confirmation button records consent. You can change or stop topics without an account by requesting a short-lived private link from the email-preferences page. Authenticated users can also use dashboard settings.",
      },
      {
        title: "4. Service Providers and International Processing",
        body: "Supabase provides database and authentication infrastructure, Resend provides email delivery and audience tooling, and Vercel hosts the application and may provide disclosed performance analytics. They process data for Coptic Compass under their service terms and safeguards. Data may be processed outside your country where these providers operate, subject to applicable transfer protections.",
      },
      {
        title: "5. Delivery Events and Suppression",
        body: "We process provider delivery events to diagnose failures, prevent repeated sends to invalid addresses, honor unsubscribes, and suppress marketing after hard bounces or spam complaints. Suppression records override ordinary topic settings and are kept as needed to respect the request and protect sending integrity.",
      },
      {
        title: "6. Retention",
        body: "Contact messages are normally retained for up to 24 months after the last relevant interaction unless a longer period is needed for an ongoing matter or legal obligation. Active mailing preferences are retained while used; consent and withdrawal evidence may be retained for up to five years after the last change to demonstrate compliance. Detailed delivery-event payloads are normally retained for up to 90 days, while minimal suppression records may be retained longer so we do not resume unwanted mail. Account data is retained until deletion, subject to required legal or security records.",
      },
      {
        title: "7. Security and Data Sharing",
        body: "We apply access controls, row-level database policies, hashed action tokens, rate limits, and encrypted transport. No system is completely risk-free. We do not sell or rent personal data and do not share it with external advertisers.",
      },
      {
        title: "8. Your Choices and Rights",
        body: "Depending on applicable law, you may request access, correction, deletion, restriction, portability, or object to processing, and you may complain to your data-protection authority. You may withdraw mailing consent at any time through the no-account email-preferences flow or by contacting Coptic Compass; withdrawal does not affect earlier lawful processing. You may also request account deletion through the contact page.",
      },
      {
        title: "9. Cookies and Contact",
        body: "Cookies and local browser storage are described in our Cookie Policy. For privacy questions or requests, contact Coptic Compass through the contact page.",
      },
    ],
  },
  nl: {
    title: "Privacybeleid",
    description:
      "Hoe Coptic Compass persoonsgegevens verzamelt, gebruikt, beschermt en bewaart.",
    sections: [
      {
        title: "1. Welke gegevens we verzamelen",
        body: "We verzamelen de gegevens die nodig zijn voor de functie die u gebruikt. Dit kan uw accountnaam, e-mailadres, profielfoto, leergegevens, naam en bericht uit het contactformulier, gekozen mailingonderwerpen en taal, bewijs van toestemming en intrekking, en technische e-mailgebeurtenissen zoals acceptatie, vertraging, bounce, uitschrijving of klacht omvatten.",
      },
      {
        title: "2. Doeleinden en rechtsgronden",
        body: "We verwerken account- en leergegevens om de dienst te leveren en beveiligen, contactberichten om uw vraag te beantwoorden en noodzakelijke transactionele e-mail om gevraagde acties uit te voeren. Waar van toepassing steunt dit op uitvoering van een overeenkomst of gevraagde precontractuele stappen, ons gerechtvaardigd belang om de dienst te beheren en beschermen, of een wettelijke verplichting. Optionele marketingupdates over lessen, publicaties en het project sturen we alleen na uw uitdrukkelijke toestemming.",
      },
      {
        title: "3. Mailingtoestemming en voorkeuren",
        body: "Mailingkeuzes in het contactformulier zijn optioneel, staan los van het versturen van uw bericht en zijn standaard uitgeschakeld. We gebruiken dubbele opt-in: de e-maillink openen toont alleen de aangevraagde onderwerpen; pas de bevestigingsknop registreert toestemming. Zonder account kunt u onderwerpen wijzigen of stopzetten via een kort geldige persoonlijke link op de pagina met e-mailvoorkeuren. Ingelogde gebruikers kunnen ook de dashboardinstellingen gebruiken.",
      },
      {
        title: "4. Dienstverleners en internationale verwerking",
        body: "Supabase levert database- en authenticatie-infrastructuur, Resend verzorgt e-mailbezorging en mailingbeheer en Vercel host de applicatie en kan de beschreven prestatieanalyse leveren. Zij verwerken gegevens voor Coptic Compass onder hun dienstenvoorwaarden en beveiligingsmaatregelen. Gegevens kunnen buiten uw land worden verwerkt waar deze dienstverleners actief zijn, met de toepasselijke doorgiftewaarborgen.",
      },
      {
        title: "5. Bezorggebeurtenissen en onderdrukking",
        body: "We verwerken bezorggebeurtenissen van de provider om fouten te onderzoeken, herhaalde verzending naar ongeldige adressen te voorkomen, uitschrijvingen te respecteren en marketing te blokkeren na harde bounces of spamklachten. Onderdrukkingsrecords hebben voorrang op gewone onderwerpkeuzes en worden bewaard zolang dat nodig is om het verzoek te respecteren en betrouwbare verzending te beschermen.",
      },
      {
        title: "6. Bewaartermijnen",
        body: "Contactberichten worden normaal tot 24 maanden na de laatste relevante interactie bewaard, tenzij een lopende zaak of wettelijke verplichting een langere periode vereist. Actieve mailingvoorkeuren blijven bewaard zolang ze worden gebruikt; bewijs van toestemming en intrekking kan tot vijf jaar na de laatste wijziging worden bewaard om naleving aan te tonen. Gedetailleerde bezorggegevens worden normaal maximaal 90 dagen bewaard, terwijl minimale onderdrukkingsrecords langer kunnen blijven zodat ongewenste mail niet hervat. Accountgegevens blijven tot verwijdering bewaard, behoudens vereiste juridische of beveiligingsgegevens.",
      },
      {
        title: "7. Beveiliging en gegevensdeling",
        body: "We gebruiken toegangscontrole, databasebeleid op rijniveau, gehashte actietokens, rate limiting en versleuteld transport. Geen enkel systeem is volledig zonder risico. We verkopen of verhuren geen persoonsgegevens en delen ze niet met externe adverteerders.",
      },
      {
        title: "8. Uw keuzes en rechten",
        body: "Afhankelijk van het toepasselijke recht kunt u inzage, correctie, verwijdering, beperking of overdraagbaarheid vragen, bezwaar maken en een klacht indienen bij uw gegevensbeschermingsautoriteit. U kunt mailingtoestemming altijd intrekken via de e-mailvoorkeuren zonder account of door contact op te nemen; dit verandert niets aan eerdere rechtmatige verwerking. U kunt via de contactpagina ook verwijdering van uw account vragen.",
      },
      {
        title: "9. Cookies en contact",
        body: "Cookies en lokale browseropslag staan beschreven in ons cookiebeleid. Neem voor privacyvragen of verzoeken contact op met Coptic Compass via de contactpagina.",
      },
    ],
  },
} as const satisfies Record<Language, LegalDocument>;

const COOKIES_DOCUMENTS = {
  en: {
    title: "Cookie Policy",
    description: "How Coptic Compass uses cookies and browser storage.",
    sections: [
      {
        title: "1. Overview",
        body: "Coptic Compass keeps its storage footprint small. We use cookies, localStorage, and sessionStorage to keep the site secure, remember user preferences, hand off temporary feature state, and understand production performance. We do not use advertising cookies or behavioral tracking pixels.",
      },
      {
        title: "2. Essential and Authentication Storage",
        body: "Supabase session cookies are used only for authenticated features and private routes.",
        bullets: [
          "Keeps signed-in sessions active.",
          "Refreshes authentication safely.",
          "Protects private account, learning, and staff-only areas.",
          "Is not used for advertising.",
        ],
      },
      {
        title: "3. Preferences",
        body: "We store interface preferences so Coptic Compass feels consistent across visits.",
        bullets: [
          "Selected language in a first-party cookie and localStorage.",
          "Theme preference.",
          "Dictionary text-to-speech settings.",
          "Layout choices for learning and grammar tools.",
        ],
      },
      {
        title: "4. Temporary Feature Storage",
        body: "Shenute AI may use sessionStorage for a short-lived transfer between related Shenute surfaces.",
        bullets: [
          "May include temporary context needed to continue a task.",
          "Is removed after the transfer is complete.",
          "Is not used to track you across visits.",
        ],
      },
      {
        title: "5. Analytics and Performance",
        body: "In production deployments on Vercel, Coptic Compass may load Vercel Web Analytics and Vercel Speed Insights.",
        bullets: [
          "Used to understand aggregate traffic and real-world performance.",
          "Loaded only in production deployments.",
          "Vercel describes Web Analytics as cookie-free and anonymized.",
          "Vercel describes Speed Insights as anonymous performance data that is not tied to an individual visitor or IP address.",
        ],
      },
      {
        title: "6. No Advertising or Behavioral Tracking",
        body: "Coptic Compass does not use behavioral advertising, ad pixels, or session-replay tools.",
        bullets: [
          "No Google Analytics.",
          "No Hotjar.",
          "No Microsoft Clarity.",
          "No Meta Pixel.",
          "No similar advertising or behavior-tracking pixels.",
          "If that changes, we will update this policy and add consent controls where required.",
        ],
      },
      {
        title: "7. Consent Posture",
        body: "We do not show a cookie banner for storage that is essential, preference-based, or temporary.",
        bullets: [
          "The default posture keeps Vercel Analytics and Speed Insights production-only and disclosed here.",
          "If the stricter consent-first posture is enabled, analytics scripts are blocked until analytics consent is granted.",
          "Analytics consent is stored as a first-party preference in a cookie and localStorage.",
        ],
      },
    ],
  },
  nl: {
    title: "Cookiebeleid",
    description: "Hoe Coptic Compass cookies en browseropslag gebruikt.",
    sections: [
      {
        title: "1. Overzicht",
        body: "Coptic Compass houdt browseropslag bewust beperkt. We gebruiken cookies, localStorage en sessionStorage om de site veilig te houden, gebruikersvoorkeuren te onthouden, tijdelijke functiestatus over te dragen en productieprestaties te begrijpen. We gebruiken geen advertentiecookies of gedragsgerichte trackingpixels.",
      },
      {
        title: "2. Noodzakelijke opslag en authenticatie",
        body: "Supabase-sessiecookies worden alleen gebruikt voor ingelogde functies en privepagina's.",
        bullets: [
          "Houdt ingelogde sessies actief.",
          "Vernieuwt authenticatie veilig.",
          "Beschermt privepagina's voor accounts, leren en staffuncties.",
          "Wordt niet gebruikt voor advertenties.",
        ],
      },
      {
        title: "3. Voorkeuren",
        body: "We bewaren interfacevoorkeuren zodat Coptic Compass bij volgende bezoeken consistent aanvoelt.",
        bullets: [
          "Gekozen taal in een first-party cookie en localStorage.",
          "Themavoorkeur.",
          "Tekst-naar-spraakinstellingen voor het woordenboek.",
          "Lay-outkeuzes voor leer- en grammaticatools.",
        ],
      },
      {
        title: "4. Tijdelijke functieopslag",
        body: "Shenute AI kan sessionStorage gebruiken voor een korte overdracht tussen verwante Shenute-onderdelen.",
        bullets: [
          "Kan tijdelijke context bevatten die nodig is om een taak voort te zetten.",
          "Wordt verwijderd zodra de overdracht is voltooid.",
          "Wordt niet gebruikt om u over meerdere bezoeken te volgen.",
        ],
      },
      {
        title: "5. Analytics en prestaties",
        body: "In productieomgevingen op Vercel kan Coptic Compass Vercel Web Analytics en Vercel Speed Insights laden.",
        bullets: [
          "Gebruikt om geaggregeerd verkeer en echte prestaties te begrijpen.",
          "Alleen geladen in productieomgevingen.",
          "Vercel beschrijft Web Analytics als cookievrij en geanonimiseerd.",
          "Vercel beschrijft Speed Insights als anonieme prestatiedata die niet aan een individuele bezoeker of IP-adres is gekoppeld.",
        ],
      },
      {
        title: "6. Geen advertenties of gedragstracking",
        body: "Coptic Compass gebruikt geen gedragsgerichte advertenties, advertentiepixels of sessieherhalingstools.",
        bullets: [
          "Geen Google Analytics.",
          "Geen Hotjar.",
          "Geen Microsoft Clarity.",
          "Geen Meta Pixel.",
          "Geen vergelijkbare advertentie- of gedragstrackingpixels.",
          "Als dat verandert, werken we dit beleid bij en voegen we toestemmingskeuzes toe waar dat vereist is.",
        ],
      },
      {
        title: "7. Toestemmingsaanpak",
        body: "We tonen geen cookiebanner voor opslag die noodzakelijk is, voorkeuren onthoudt of tijdelijk is.",
        bullets: [
          "De standaardaanpak houdt Vercel Analytics en Speed Insights productiegericht en hier duidelijk beschreven.",
          "Als de strengere aanpak met voorafgaande toestemming actief is, worden analytics-scripts geblokkeerd totdat analytics-toestemming is gegeven.",
          "Analytics-toestemming wordt als first-party voorkeur bewaard in een cookie en localStorage.",
        ],
      },
    ],
  },
} as const satisfies Record<Language, LegalDocument>;

const TERMS_DOCUMENTS = {
  en: {
    title: "Terms of Service",
    description: "The rules and regulations for using our digital tools.",
    sections: [
      {
        title: "1. Terms",
        body: "By accessing Coptic Compass and using the digital Coptology platform and its tools, you agree to be bound by these terms of service and all applicable laws and regulations, and you agree that you are responsible for compliance with any applicable local laws.",
      },
      {
        title: "2. Use License",
        body: "Permission is granted to temporarily view the materials (information, text, or software) on Coptic Compass for personal, non-commercial transitory viewing and learning only. This is the grant of a license, not a transfer of title or intellectual property.",
      },
      {
        title: "3. Disclaimer",
        body: "The materials on Coptic Compass are provided on an 'as is' basis. Coptic Compass makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
      },
      {
        title: "4. Limitations",
        body: "In no event shall Coptic Compass be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the site, even if notified orally or in writing of the possibility of such damage.",
      },
      {
        title: "5. Revisions",
        body: "The materials appearing on Coptic Compass could include technical, typographical, or photographic errors. We do not warrant that any of the materials on the website are strictly accurate, complete or current. We may make changes to the materials contained on the web site at any time without notice.",
      },
    ],
  },
  nl: {
    title: "Gebruiksvoorwaarden",
    description:
      "De regels en voorwaarden voor het gebruik van onze digitale tools.",
    sections: [
      {
        title: "1. Voorwaarden",
        body: "Door Coptic Compass te bezoeken en het digitale Koptologieplatform en de bijbehorende tools te gebruiken, gaat u akkoord met deze gebruiksvoorwaarden en alle toepasselijke wet- en regelgeving. U erkent ook zelf verantwoordelijk te zijn voor naleving van eventueel geldende lokale wetten.",
      },
      {
        title: "2. Gebruikslicentie",
        body: "Er wordt toestemming verleend om de materialen (informatie, tekst of software) op Coptic Compass tijdelijk te bekijken voor uitsluitend persoonlijk, niet-commercieel en tijdelijk gebruik in het kader van studie en raadpleging. Dit is een licentie en geen overdracht van eigendom of intellectuele rechten.",
      },
      {
        title: "3. Disclaimer",
        body: "De materialen op Coptic Compass worden aangeboden op een 'as is'-basis. Coptic Compass geeft geen enkele uitdrukkelijke of impliciete garantie en wijst, voor zover wettelijk toegestaan, alle overige garanties af, waaronder impliciete garanties van verhandelbaarheid, geschiktheid voor een bepaald doel of niet-inbreuk op intellectuele eigendom of andere rechten.",
      },
      {
        title: "4. Beperkingen van aansprakelijkheid",
        body: "In geen geval kan Coptic Compass aansprakelijk worden gesteld voor enige schade, waaronder maar niet beperkt tot verlies van gegevens, winstderving of bedrijfsonderbreking, die voortvloeit uit het gebruik van of het onvermogen om de materialen op de site te gebruiken, zelfs wanneer op voorhand mondeling of schriftelijk op die mogelijkheid is gewezen.",
      },
      {
        title: "5. Herzieningen",
        body: "De materialen op Coptic Compass kunnen technische, typografische of fotografische fouten bevatten. Wij garanderen niet dat de materialen op de website volledig accuraat, volledig of actueel zijn. Wij kunnen de inhoud van de website op elk moment zonder voorafgaande kennisgeving wijzigen.",
      },
    ],
  },
} as const satisfies Record<Language, LegalDocument>;

/**
 * Returns the localized privacy-policy copy rendered on the legal page.
 */
export function getPrivacyDocument(locale: Language): LegalDocument {
  return PRIVACY_DOCUMENTS[locale];
}

/**
 * Returns the localized cookie-policy copy rendered on the legal page.
 */
export function getCookiesDocument(locale: Language): LegalDocument {
  return COOKIES_DOCUMENTS[locale];
}

/**
 * Returns the localized terms-of-service copy rendered on the legal page.
 */
export function getTermsDocument(locale: Language): LegalDocument {
  return TERMS_DOCUMENTS[locale];
}
