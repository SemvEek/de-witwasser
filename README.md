# De Witwasser

Landingspagina en gebruikersapp voor De Witwasser, een ophaal- en bezorgdienst voor de was van studenten in Groningen-stad. Studenten zetten hun was klaar, wij halen op per pand of straat, laten wassen bij een bestaande wasserette en brengen het schoon terug op een vast moment.

Studentenconcept voor het vak Bedrijfskunde, Hanzehogeschool Groningen. Er worden geen echte bestellingen aangenomen en geen betalingen verwerkt.

Live: https://semveek.github.io/de-witwasser/

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html`, `styles.css`, `script.js` | De landingspagina met aanmeldformulier |
| `inloggen.html` | Inloggen (wachtwoord of inloglink) en account aanmaken |
| `account.html` | De gebruikerspagina: planning, huis, gegevens, pauzeren, opzeggen |
| `app.js`, `app.css` | Logica en extra opmaak voor de app |
| `config.js` | Koppeling met Supabase (alleen publieke gegevens) |
| `supabase/schema.sql` | Database, rij-niveau-toegang en trigger. Eenmalig uitvoeren. |
| `supabase/demo-sem.sql` | Zet de naam van het demo-account van Sem |
| `icons/`, `manifest.webmanifest`, `logo.jpg` | Logo en iconen |

Geen build-stap. De app gebruikt [Supabase](https://supabase.com) (gratis plan) voor inloggen en opslag.

## Demo-modus (nu actief)

Zolang `config.js` nog placeholders bevat, draait de app zonder database:

- Log in op `inloggen.html` met gebruikersnaam **Sem** en wachtwoord **witwassen**.
- Groepsgenoten kunnen er ook een eigen demo-account aanmaken.
- Alles wordt alleen in de browser van de bezoeker bewaard (localStorage). Een ander apparaat of een andere browser begint dus leeg, behalve het account van Sem.
- Inloglinks per mail werken in de demo-modus niet en zijn verborgen.

Het demo-wachtwoord staat openbaar in `config.js`. Het beschermt niets: gebruik het niet voor een echt account.

Zodra je de Supabase-gegevens invult, schakelt de app vanzelf over op de echte database.

## Supabase instellen (later, eenmalig)

1. **Project aanmaken.** Maak een account op supabase.com (inloggen met GitHub kan). Klik op *New project*, kies regio *Frankfurt (eu-central-1)* en bewaar het databasewachtwoord buiten deze repo.
2. **Database.** Ga naar *SQL Editor*, plak de inhoud van `supabase/schema.sql` en klik op *Run*.
3. **Inloginstellingen.** Ga naar *Authentication > URL Configuration*:
   - Site URL: `https://semveek.github.io/de-witwasser/`
   - Redirect URLs: `https://semveek.github.io/de-witwasser/**`
4. **E-mailbevestiging.** Onder *Authentication > Sign In / Providers > Email* kun je *Confirm email* uitzetten. Groepsgenoten kunnen dan direct inloggen na het aanmaken van een account, zonder mail. Laat je het aan, dan moet de bevestigingsmail wel aankomen (zie stap 7).
5. **Demo-account Sem.** Ga naar *Authentication > Users > Add user > Create new user*:
   - E-mail: `sem@example.com`
   - Wachtwoord: het wachtwoord dat je hebt afgesproken
   - Vink *Auto Confirm User* aan

   Voer daarna `supabase/demo-sem.sql` uit in de SQL Editor. Inloggen gaat met gebruikersnaam `Sem` en dat wachtwoord.
6. **Sleutels.** Kopieer onder *Project Settings > API* (of *API Keys*) de **Project URL** en de **anon public key** (bij nieuwe projecten heet die *publishable key*). Zet ze in `config.js`. Gebruik **nooit** de `service_role` of *secret* key: `config.js` is openbaar.
7. **Magic links voor groepsgenoten.** De standaard mailserver van Supabase stuurt alleen naar leden van je Supabase-organisatie, en maar een paar mails per uur. Kies een van deze twee:
   - Nodig je groepsgenoten uit via *Organization settings > Team*, of
   - stel een eigen mailserver in via *Authentication > Emails > SMTP Settings* (bijvoorbeeld het gratis plan van Brevo).
8. **Optioneel.** Onder *Authentication > Emails* kun je de mailteksten in het Nederlands zetten.

Een gratis project pauzeert na 7 dagen zonder gebruik. Zet het dan weer aan in het dashboard.

## Controleren voordat je de link deelt

- Open `inloggen.html`: de melding "nog niet gekoppeld" mag niet verschijnen.
- Log in met `Sem` en het wachtwoord. Je komt op "Hoi Sem."
- Wijzig je planning en herlaad de pagina. De keuze moet blijven staan.
- Vul het aanmeldformulier op de homepage in, klik op *Maak je account aan* en maak een account. Postcode, frequentie, ophaaldag en aantal studenten moeten in je account staan.
- Vraag een inloglink aan voor je eigen e-mailadres en open hem.
- Kijk in Supabase bij *Advisors > Security Advisor*: er mogen geen waarschuwingen over RLS staan.
- Log in met een tweede account: je ziet alleen je eigen gegevens.

## Nog in te vullen

Zoek op `PLACEHOLDER`:

- `[PLACEHOLDER: wasvoorschriften: temperatuur, scheiden van bont en wit]` (index.html)
- `[PLACEHOLDER: aansprakelijkheid bij verlies of schade]` (index.html)
- `[PLACEHOLDER: privacyverklaring]` (index.html, inloggen.html, account.html)
- `[PLACEHOLDER: tijdvakken per dagdeel]` (account.html)
- `[PLACEHOLDER: opzegtermijn en voorwaarden]` (account.html)
- `[PLACEHOLDER: hoe je een losse ophaling aanvraagt]` (account.html)
- `[PLACEHOLDER: Supabase Project URL]` en `[PLACEHOLDER: Supabase anon public key]` (config.js)

De prijs staat op "Prijs volgt".
