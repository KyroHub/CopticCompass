import { defineMessages } from "@/lib/translations/defineMessages";

/**
 * Localized copy for sign-in, signup, password reset, and password update
 * flows.
 */
export const loginMessages = defineMessages({
  en: {
    "login.title": "Welcome to Coptic Compass",
    "login.subtitle":
      "Sign in to save exercises, receive feedback, and continue your Coptic studies.",
    "login.email": "Email Address",
    "login.emailPlaceholder": "you@email.com",
    "login.password": "Password",
    "login.passwordPlaceholder": "••••••••",
    "login.forgotPassword": "Forgot password?",
    "login.signIn": "Sign In",
    "login.createAccount": "Create an Account",
    "login.orContinueWith": "Or continue with",
    "login.google": "Sign in with Google",
    "login.metaTitle": "Sign In",
    "login.metaDescription":
      "Account sign-in for the Coptic Compass learning workspace.",
    "forgot.metaTitle": "Reset Password",
    "forgot.metaDescription":
      "Password reset page for the Coptic Compass learning workspace.",
    "forgot.title": "Reset Password",
    "forgot.subtitle":
      "Enter the email associated with your account, and we'll send you a link to reset your password.",
    "forgot.email": "Email Address",
    "forgot.emailPlaceholder": "you@example.com",
    "forgot.sendLink": "Send Reset Link",
    "forgot.backToSignIn": "Back to Sign In",
    "forgot.notice.invalidInput": "Please enter a valid email address.",
    "forgot.notice.error": "An error occurred. Please try again.",
    "forgot.notice.rateLimited":
      "Too many requests. Please wait a bit before trying again.",
    "forgot.notice.success":
      "If an account exists, a password reset link has been sent. Check your inbox!",
    "update.metaTitle": "Update Password",
    "update.metaDescription":
      "Password update page for the Coptic Compass learning workspace.",
    "update.title": "Create New Password",
    "update.subtitle": "Please choose a strong, new password for your account.",
    "update.password": "New Password",
    "update.passwordPlaceholder": "Must be at least 8 characters",
    "update.submit": "Update Password",
    "update.backToDashboard": "Back to Dashboard",
    "update.notice.invalidInput":
      "Password must be at least 8 characters long.",
    "update.notice.error":
      "Could not update your password. The link may have expired.",
    "update.notice.rateLimited":
      "Too many attempts. Please wait a bit before trying again.",
    "login.notice.authUnavailable":
      "Authentication is temporarily unavailable. Please try again later.",
    "login.notice.loginInvalidInput":
      "Enter a valid email address and password.",
    "login.notice.loginError":
      "Could not authenticate user. Check your email and password and try again.",
    "login.notice.loginRateLimited":
      "Too many sign-in attempts. Please wait a few minutes and try again.",
    "login.notice.signupCheckEmail":
      "Account created. Please confirm your email address using the message we sent, then sign in with the same email and password.",
    "login.notice.signupConfirmed":
      "Your email has been confirmed. You can now sign in with the same email and password.",
    "login.notice.signupError":
      "Could not create your account. If you already signed up, try signing in instead.",
    "login.notice.signupInvalidInput":
      "Use a valid email address and a password with at least 8 characters.",
    "login.notice.signupRateLimited":
      "Too many account creation attempts. Please try again later.",
  },
  nl: {
    "login.title": "Welkom bij Koptisch Kompas",
    "login.subtitle":
      "Inloggen om oefeningen op te slaan, feedback te ontvangen en je Koptische studie voort te zetten.",
    "login.email": "E-mailadres",
    "login.emailPlaceholder": "jij@email.com",
    "login.password": "Wachtwoord",
    "login.passwordPlaceholder": "••••••••",
    "login.forgotPassword": "Wachtwoord vergeten?",
    "login.signIn": "Inloggen",
    "login.createAccount": "Account aanmaken",
    "login.orContinueWith": "Of ga verder met",
    "login.google": "Inloggen met Google",
    "login.metaTitle": "Inloggen",
    "login.metaDescription":
      "Inlogpagina voor de leeromgeving van Koptisch Kompas.",
    "forgot.metaTitle": "Wachtwoord opnieuw instellen",
    "forgot.metaDescription":
      "Pagina om het wachtwoord van de leeromgeving van Koptisch Kompas opnieuw in te stellen.",
    "forgot.title": "Wachtwoord opnieuw instellen",
    "forgot.subtitle":
      "Voer het e-mailadres van je account in en we sturen je een link om je wachtwoord opnieuw in te stellen.",
    "forgot.email": "E-mailadres",
    "forgot.emailPlaceholder": "jij@example.com",
    "forgot.sendLink": "Resetlink verzenden",
    "forgot.backToSignIn": "Terug naar inloggen",
    "forgot.notice.invalidInput": "Voer een geldig e-mailadres in.",
    "forgot.notice.error": "Er is iets misgegaan. Probeer het opnieuw.",
    "forgot.notice.rateLimited":
      "Te veel verzoeken. Wacht even en probeer het opnieuw.",
    "forgot.notice.success":
      "Als er een account bestaat, is er een resetlink verzonden. Controleer je inbox.",
    "update.metaTitle": "Wachtwoord bijwerken",
    "update.metaDescription":
      "Pagina om het wachtwoord van de leeromgeving van Koptisch Kompas bij te werken.",
    "update.title": "Nieuw wachtwoord instellen",
    "update.subtitle": "Kies een sterk nieuw wachtwoord voor je account.",
    "update.password": "Nieuw wachtwoord",
    "update.passwordPlaceholder": "Moet minstens 8 tekens bevatten",
    "update.submit": "Wachtwoord bijwerken",
    "update.backToDashboard": "Terug naar dashboard",
    "update.notice.invalidInput":
      "Het wachtwoord moet minstens 8 tekens bevatten.",
    "update.notice.error":
      "Het wachtwoord kon niet worden bijgewerkt. De link is mogelijk verlopen.",
    "update.notice.rateLimited":
      "Te veel pogingen. Wacht even en probeer het opnieuw.",
    "login.notice.authUnavailable":
      "Authenticatie is tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    "login.notice.loginInvalidInput":
      "Voer een geldig e-mailadres en wachtwoord in.",
    "login.notice.loginError":
      "Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord en probeer het opnieuw.",
    "login.notice.loginRateLimited":
      "Te veel inlogpogingen. Wacht een paar minuten en probeer het opnieuw.",
    "login.notice.signupCheckEmail":
      "Account aangemaakt. Bevestig eerst je e-mailadres via de e-mail die we hebben gestuurd en log daarna in met hetzelfde e-mailadres en wachtwoord.",
    "login.notice.signupConfirmed":
      "Je e-mailadres is bevestigd. Je kunt nu inloggen met hetzelfde e-mailadres en wachtwoord.",
    "login.notice.signupError":
      "Je account kon niet worden aangemaakt. Als je al geregistreerd bent, probeer dan in te loggen.",
    "login.notice.signupInvalidInput":
      "Gebruik een geldig e-mailadres en een wachtwoord van minstens 8 tekens.",
    "login.notice.signupRateLimited":
      "Te veel pogingen om een account aan te maken. Probeer het later opnieuw.",
  },
});
