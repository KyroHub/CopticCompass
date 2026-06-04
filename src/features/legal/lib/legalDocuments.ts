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
    description: "How we handle and protect your data.",
    sections: [
      {
        title: "1. Information We Collect",
        body: "When you sign in using Google Authentication, we collect only your basic profile information (such as your name, profile picture, and email address) explicitly granted by Google. This information is used strictly to create and manage your personal session on Coptic Compass.",
      },
      {
        title: "2. How We Use Your Information",
        body: "Your email address is used to uniquely identify your account, secure your profile, and save your progress across our digital tools (such as dictionary settings or learning progress). We do not ever sell, rent, or share your personal information with third parties or external advertisers.",
      },
      {
        title: "3. Data Security",
        body: "Your account data is managed and secured using Supabase, which implements industry-standard encryption, rate-limiting, and security protocols to protect your information and password hashes.",
      },
      {
        title: "4. Account Deletion",
        body: "You may request to have your account and all associated data permanently deleted from our servers at any time by contacting us.",
      },
      {
        title: "5. Contact Us",
        body: "If you have any questions or concerns about this Privacy Policy, please contact Coptic Compass through the contact page.",
      },
      {
        title: "6. Cookies and Local Storage",
        body: "Cookies and local storage are described in our Cookie Policy.",
      },
    ],
  },
  nl: {
    title: "Privacybeleid",
    description: "Hoe we uw gegevens behandelen en beschermen.",
    sections: [
      {
        title: "1. Welke gegevens we verzamelen",
        body: "Wanneer u inlogt via Google-authenticatie, verzamelen we uitsluitend de basisprofielgegevens die u uitdrukkelijk via Google hebt gedeeld, zoals uw naam, profielfoto en e-mailadres. Deze informatie wordt alleen gebruikt om uw persoonlijke sessie op Coptic Compass aan te maken en te beheren.",
      },
      {
        title: "2. Hoe we uw gegevens gebruiken",
        body: "Uw e-mailadres wordt gebruikt om uw account uniek te identificeren, uw profiel te beveiligen en uw voortgang in onze digitale tools op te slaan, zoals woordenboekinstellingen of leerprogressie. Wij verkopen, verhuren of delen uw persoonsgegevens nooit met derden of externe adverteerders.",
      },
      {
        title: "3. Gegevensbeveiliging",
        body: "Uw accountgegevens worden beheerd en beveiligd via Supabase, dat gebruikmaakt van industriestandaard versleuteling, rate limiting en beveiligingsprotocollen om uw gegevens en wachtwoordhashes te beschermen.",
      },
      {
        title: "4. Verwijdering van uw account",
        body: "U kunt op elk moment verzoeken om uw account en alle bijbehorende gegevens permanent van onze servers te laten verwijderen door contact met ons op te nemen.",
      },
      {
        title: "5. Contact",
        body: "Als u vragen of zorgen heeft over dit privacybeleid, neem dan contact op met Coptic Compass via de contactpagina.",
      },
      {
        title: "6. Cookies en lokale opslag",
        body: "Cookies en lokale opslag worden beschreven in ons cookiebeleid.",
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
