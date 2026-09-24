/* De Witwasser: koppeling met Supabase
   Vul hier alleen de publieke gegevens in (Project URL en anon/publishable key).
   Zet hier NOOIT de service_role key of het databasewachtwoord: dit bestand is openbaar. */
window.WITWASSER_CONFIG = {
  supabaseUrl: '[PLACEHOLDER: Supabase Project URL, bijvoorbeeld https://abcdefgh.supabase.co]',
  supabaseAnonKey: '[PLACEHOLDER: Supabase anon public key]',

  /* Gebruikersnamen voor demo-accounts. Inloggen met een gebruikersnaam kan alleen met wachtwoord.
     Het adres hoort bij een gebruiker die je zelf aanmaakt in Supabase (Authentication > Users). */
  gebruikersnamen: {
    sem: 'sem@example.com'
  },

  /* Demo-modus: zolang supabaseUrl en supabaseAnonKey hierboven placeholders zijn, bewaart de app
     alles alleen in de browser van de bezoeker. Deze accounts bestaan dan in elke browser.
     Dit wachtwoord beschermt niets en is openbaar: gebruik het niet voor een echt account. */
  demoAccounts: [
    { email: 'sem@example.com', wachtwoord: 'witwassen', naam: 'Sem' }
  ]
};
