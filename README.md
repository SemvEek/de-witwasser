# De Witwasser

Landingspagina en gebruikersapp voor De Witwasser, een ophaal- en bezorgdienst voor de was van studenten in Groningen-stad. Studenten plannen een wasbeurt, zetten hun waszak klaar, wij halen op per pand of straat, wassen, drogen en vouwen en brengen het schoon terug op het tijdvak dat de student kiest. Prijs: abonnement € 13,25 per maand (elke week ophalen), een losse wasbeurt € 13,25.

Studentenconcept voor het vak Bedrijfskunde, Hanzehogeschool Groningen. Er worden geen echte bestellingen aangenomen en geen betalingen verwerkt.

Live: https://semveek.github.io/de-witwasser/

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html`, `styles.css`, `script.js` | De landingspagina met aanmeldformulier |
| `plannen.html`, `plannen.css`, `plannen.js` | Was plannen (de live demo): kleding kiezen, ophaal- en terugbrengmoment, gegevens en een bevestiging met animatie. Dezelfde planner staat als blok Planning in `account.html` |
| `inloggen.html` | Inloggen (wachtwoord of inloglink) en account aanmaken |
| `account.html` | De gebruikerspagina: planning (de planner uit `plannen.js`), huis, gegevens, pauzeren, opzeggen. Een bevestigde afspraak wordt je vaste planning |
| `app.js`, `app.css` | Logica en extra opmaak voor de app |
| `config.js` | Koppeling met Supabase (alleen publieke gegevens) |
| `supabase/schema.sql` | Database, rij-niveau-toegang en trigger. Eenmalig uitvoeren. |
| `supabase/demo-sem.sql` | Zet de naam van het demo-account van Sem |
| `icons/`, `manifest.webmanifest`, `logo.jpg` | Logo en iconen |

Geen build-stap. De app gebruikt [Supabase](https://supabase.com) (gratis plan) voor inloggen en opslag.

## Was plannen (live demo in de les)

Link: https://semveek.github.io/de-witwasser/plannen.html

- Geen inloggen nodig. Alles gebeurt in de browsertab van de bezoeker: er wordt niets opgeslagen (geen localStorage, sessionStorage of cookies) en niets verstuurd. Een hele klas kan dus tegelijk plannen zonder elkaar te storen. Sluit je de pagina, dan is alles weg.
- De tijdvakken zijn nep: twee uur per vak, van 09:00 tot 21:00, maandag tot en met zaterdag. Welke vakken vol zijn, volgt vast uit de datum, dus iedereen ziet dezelfde volle vakken.
- Ophalen kan op zijn vroegst 2 uur vooruit. Terugbrengen kan op zijn vroegst 24 uur na het einde van het ophaaltijdvak en uiterlijk 6 dagen erna. Voorbeeld: dinsdag 19:00 tot 21:00 ophalen, dan kunnen maandag, dinsdag en woensdag niet en is donderdag de eerste dag.
- Na een wijziging in css of js: verhoog `?v=2` in de html-bestanden, anders laden browsers soms de oude versie.
- Instellingen staan bovenaan `plannen.js`. De prijs voor strijken (€ 2,50) is een aanname: die staat niet in de presentatie.

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

Zoek op `PLACEHOLDER`. Deze staan niet in de eindpresentatie:

- `[PLACEHOLDER: vergoeding bij verlies of schade]` (index.html)
- `[PLACEHOLDER: opzegtermijn en voorwaarden]` (account.html)
- `[PLACEHOLDER: Supabase Project URL]` en `[PLACEHOLDER: Supabase anon public key]` (config.js)

De privacytekst zegt dat er niets naar een server gaat. Dat klopt alleen zolang de demo-modus aan staat: pas hem aan als je Supabase koppelt.
