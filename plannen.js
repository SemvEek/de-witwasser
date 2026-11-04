/* De Witwasser, was plannen (plannen.html en het blok Planning in account.html)
   Alles gebeurt in deze browsertab: er wordt niets opgeslagen (geen localStorage, geen cookies)
   en niets verstuurd. Daardoor kan de hele klas tegelijk plannen zonder elkaar te storen.
   De drukte per tijdvak is nep, maar vast per datum: iedereen ziet dezelfde volle tijdvakken. */
(function () {
  'use strict';

  /* Prijzen: het abonnement (elke week ophalen) kost € 13,25 per maand, zoals in de presentatie.
     Een losse wasbeurt kost ook € 13,25. */
  var PRIJS_ABONNEMENT = 13.25;
  var PRIJS_LOS = 13.25;
  /* Aannames: de presentatie noemt extra was en strijken als toeslag, maar geen bedrag. */
  var PRIJS_EXTRA_ZAK = 2.5;
  var PRIJS_STRIJKEN = 2.5;
  var MAX_EXTRA_ZAKKEN = 3;
  /* Zoveel stuks passen in een waszak. Zit hij vol, dan komt er vanzelf een extra zak bij. */
  var MAX_STUKS_PER_ZAK = 25;

  var TIJDVAKKEN = [[9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21]];
  var PLANBARE_DAGEN = 14;        /* kalenderdagen vooruit; op zondag rijden we niet */
  var MIN_VOORBEREIDING_UUR = 2;  /* ophalen kan op zijn vroegst over 2 uur */
  var MIN_WASTIJD_UUR = 24;       /* wassen, drogen, controleren en vouwen */
  var MAX_DAGEN_TERUG = 6;        /* terug voor de volgende ophaaldag */

  /* Opmaak van de planner. plannen.html en account.html hebben alleen een <div data-planner>;
     de bevestiging en de pushmelding komen los in de body, boven alles. */
  var PLANNER_HTML = [
    '<ol class="stepper" id="stepper" role="list" aria-label="Stappen">',
    '  <li><button class="stepper__btn" type="button" data-naar="1"><span class="stepper__nr">1</span><span class="stepper__label">Je was</span></button></li>',
    '  <li><button class="stepper__btn" type="button" data-naar="2"><span class="stepper__nr">2</span><span class="stepper__label">Ophalen</span></button></li>',
    '  <li><button class="stepper__btn" type="button" data-naar="3"><span class="stepper__nr">3</span><span class="stepper__label">Terugbrengen</span></button></li>',
    '  <li><button class="stepper__btn" type="button" data-naar="4"><span class="stepper__nr">4</span><span class="stepper__label">Gegevens</span></button></li>',
    '</ol>',
    '',
    '<div class="plan-grid">',
    '  <div class="plan-main">',
    '    <!-- Stap 1: wat zit er in je zak -->',
    '    <section class="plan-panel" data-paneel="1" aria-labelledby="stap1-titel">',
    '      <h2 class="plan-panel__title" id="stap1-titel" tabindex="-1">Wat zit er in je waszak?</h2>',
    '      <p class="plan-panel__intro">Tik op een kledingstuk om het toe te voegen. Zo tellen we bij het sorteren na of alles er is.</p>',
    '',
    '      <div class="cat-tabs" role="tablist" aria-label="Soort was" id="cat-tabs"></div>',
    '      <div class="items" id="items" role="tabpanel"></div>',
    '',
    '      <div class="details" id="details" aria-live="polite"></div>',
    '',
    '      <div class="extras">',
    '        <h3 class="extras__title">Extra\'s</h3>',
    '        <div class="fill" id="zak-vulling" aria-live="polite"></div>',
    '        <div class="extra">',
    '          <div class="extra__text">',
    '            <p class="extra__name">Extra waszak</p>',
    '            <p class="extra__hint" id="zak-uitleg"></p>',
    '          </div>',
    '          <div class="stepper-input" role="group" aria-label="Aantal extra waszakken">',
    '            <button type="button" class="stepper-input__btn" id="zak-min" aria-label="Eén extra waszak minder">&minus;</button>',
    '            <output class="stepper-input__value" id="zak-aantal" aria-live="polite">0</output>',
    '            <button type="button" class="stepper-input__btn" id="zak-plus" aria-label="Eén extra waszak erbij">+</button>',
    '          </div>',
    '        </div>',
    '        <div class="extra">',
    '          <div class="extra__text">',
    '            <p class="extra__name" id="strijken-label">Strijken</p>',
    '            <p class="extra__hint">We strijken je overhemden en broeken. <span id="prijs-strijken"></span> per wasbeurt.</p>',
    '          </div>',
    '          <button type="button" class="switch" role="switch" id="strijken" aria-checked="false" aria-labelledby="strijken-label"><span class="switch__knob"></span></button>',
    '        </div>',
    '      </div>',
    '',
    '      <p class="field__error plan-fout" id="stap1-fout" aria-live="polite"></p>',
    '      <button class="linkbtn" type="button" id="overslaan">Geen zin om te tellen? Sla over, wij tellen bij het sorteren.</button>',
    '    </section>',
    '',
    '    <!-- Stap 2: ophalen -->',
    '    <section class="plan-panel" data-paneel="2" aria-labelledby="stap2-titel" hidden>',
    '      <h2 class="plan-panel__title" id="stap2-titel" tabindex="-1">Wanneer halen we je was op?</h2>',
    '      <p class="plan-panel__intro">Kies een dag en een tijdvak van twee uur. Zet je waszak dan klaar bij de voordeur.</p>',
    '      <div class="days" id="ophaal-dagen" role="group" aria-label="Ophaaldag"></div>',
    '      <p class="slots__head" id="ophaal-dagtitel"></p>',
    '      <div class="slots" id="ophaal-vakken" role="group" aria-labelledby="ophaal-dagtitel"></div>',
    '      <p class="field__error plan-fout" id="stap2-fout" aria-live="polite"></p>',
    '    </section>',
    '',
    '    <!-- Stap 3: terugbrengen -->',
    '    <section class="plan-panel" data-paneel="3" aria-labelledby="stap3-titel" hidden>',
    '      <h2 class="plan-panel__title" id="stap3-titel" tabindex="-1">Wanneer brengen we hem terug?</h2>',
    '      <div class="rule" id="terug-regel"></div>',
    '      <p class="notice notice--info" id="terug-gewist" hidden>Je oude terugbrengmoment past niet meer bij het nieuwe ophaalmoment. Kies hieronder een nieuw moment.</p>',
    '      <div class="days" id="terug-dagen" role="group" aria-label="Terugbrengdag"></div>',
    '      <p class="slots__head" id="terug-dagtitel"></p>',
    '      <div class="slots" id="terug-vakken" role="group" aria-labelledby="terug-dagtitel"></div>',
    '      <p class="field__error plan-fout" id="stap3-fout" aria-live="polite"></p>',
    '    </section>',
    '',
    '    <!-- Stap 4: gegevens -->',
    '    <section class="plan-panel" data-paneel="4" aria-labelledby="stap4-titel" hidden>',
    '      <h2 class="plan-panel__title" id="stap4-titel" tabindex="-1">Waar halen we op?</h2>',
    '      <p class="plan-panel__intro">Vul iets in wat lijkt op een adres. Dit is een demo: niets wordt bewaard of verstuurd.</p>',
    '      <form class="form" id="gegevens" novalidate>',
    '        <div class="field">',
    '          <label for="p-naam">Naam</label>',
    '          <input id="p-naam" name="naam" type="text" autocomplete="given-name" maxlength="60" aria-describedby="p-naam-fout">',
    '          <p class="field__error" id="p-naam-fout" aria-live="polite"></p>',
    '        </div>',
    '        <div class="field-row">',
    '          <div class="field">',
    '            <label for="p-straat">Straat</label>',
    '            <input id="p-straat" name="straat" type="text" autocomplete="address-line1" maxlength="60" aria-describedby="p-straat-fout">',
    '            <p class="field__error" id="p-straat-fout" aria-live="polite"></p>',
    '          </div>',
    '          <div class="field">',
    '            <label for="p-huisnummer">Huisnummer</label>',
    '            <input id="p-huisnummer" name="huisnummer" type="text" autocomplete="address-line2" maxlength="12" aria-describedby="p-huisnummer-fout">',
    '            <p class="field__error" id="p-huisnummer-fout" aria-live="polite"></p>',
    '          </div>',
    '        </div>',
    '        <div class="field">',
    '          <label for="p-postcode">Postcode</label>',
    '          <input class="input--short" id="p-postcode" name="postcode" type="text" autocomplete="postal-code" autocapitalize="characters" spellcheck="false" maxlength="7" placeholder="9742 AB" aria-describedby="p-postcode-hint p-postcode-fout">',
    '          <p class="field__hint" id="p-postcode-hint">We starten in Groningen-stad.</p>',
    '          <p class="field__error" id="p-postcode-fout" aria-live="polite"></p>',
    '        </div>',
    '',
    '        <fieldset class="field" aria-describedby="p-soort-hint">',
    '          <legend>Hoe vaak?</legend>',
    '          <div class="choices">',
    '            <label class="choice"><input type="radio" name="soort" value="abonnement" checked><span>Elke week (abonnement)</span></label>',
    '            <label class="choice"><input type="radio" name="soort" value="los"><span>Een keer</span></label>',
    '          </div>',
    '          <p class="field__hint" id="p-soort-hint"></p>',
    '        </fieldset>',
    '',
    '        <div class="field">',
    '          <label for="p-opmerking">Opmerking voor de bezorger <span class="optional">(mag leeg)</span></label>',
    '          <input id="p-opmerking" name="opmerking" type="text" maxlength="100" placeholder="Bijvoorbeeld: bel aan bij 2-hoog">',
    '        </div>',
    '      </form>',
    '    </section>',
    '  </div>',
    '',
    '  <!-- Samenvatting -->',
    '  <aside class="plan-summary" aria-labelledby="samenvatting-titel">',
    '    <h2 class="plan-summary__title" id="samenvatting-titel">Je bestelling</h2>',
    '    <ul class="sum-lines" id="sum-lijnen" role="list"></ul>',
    '    <p class="sum-empty" id="sum-leeg">Nog niets gekozen. Tik op een kledingstuk om het toe te voegen.</p>',
    '    <p class="sum-note" id="sum-sport" hidden>Sportkleding wassen we apart.</p>',
    '    <dl class="sum-when">',
    '      <div><dt>Ophalen</dt><dd id="sum-ophalen">Nog niet gekozen</dd></div>',
    '      <div><dt>Terug</dt><dd id="sum-terug">Nog niet gekozen</dd></div>',
    '    </dl>',
    '    <dl class="sum-prices" id="sum-prijzen"></dl>',
    '    <div class="sum-total">',
    '      <span>Totaal</span>',
    '      <strong id="sum-totaal"></strong>',
    '    </div>',
    '    <p class="sum-small" id="sum-soort">Een keer. Er wordt niets betaald: dit is een demo.</p>',
    '  </aside>',
    '</div>',
    '<!-- Actiebalk: blijft onderin beeld zolang de planner zichtbaar is -->',
    '<div class="actionbar" id="actiebalk">',
    '  <div class="actionbar__inner">',
    '    <button class="btn btn--secondary actionbar__back" type="button" id="terug-knop" hidden>Terug</button>',
    '    <div class="actionbar__total">',
    '      <span class="actionbar__count" id="balk-aantal">Nog niets gekozen</span>',
    '      <strong class="actionbar__price" id="balk-totaal"></strong>',
    '    </div>',
    '    <button class="btn btn--primary actionbar__next" type="button" id="verder-knop">Verder</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  var OVERLAY_HTML = [
    '<!-- Bevestiging -->',
    '<div class="done" id="klaar" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="klaar-titel" hidden>',
    '  <div class="done__scroll">',
    '    <div class="done__stage" aria-hidden="true">',
    '      <div class="bubbles" id="bellen"></div>',
    '      <svg class="drum" viewBox="0 0 120 120">',
    '        <defs><clipPath id="drum-clip"><circle cx="60" cy="60" r="43"/></clipPath></defs>',
    '        <circle class="drum__ring" cx="60" cy="60" r="54"/>',
    '        <g clip-path="url(#drum-clip)">',
    '          <rect x="0" y="0" width="120" height="120" class="drum__glass"/>',
    '          <g class="drum__spin">',
    '            <path class="drum__shirt" d="M48 40 l-7 3 -5 6 4 4 3 -2 v15 h14 v-15 l3 2 4 -4 -5 -6 -7 -3 c-.5 2 -2 3 -2 3 s-1.5 -1 -2 -3z"/>',
    '            <path class="drum__sock" d="M68 58 h7 v12 l5 4 c2 1.5 1 5 -2 5 h-8 c-3 0 -4 -2 -3 -5z"/>',
    '            <path class="drum__shirt drum__shirt--b" d="M44 70 h16 l2 12 h-6 l-2 -6 -2 6 h-6z"/>',
    '          </g>',
    '          <g class="drum__water"><path d="M-120 74 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 v60 h-240z"/></g>',
    '        </g>',
    '        <circle class="drum__rim" cx="60" cy="60" r="43"/>',
    '        <path class="drum__shine" d="M33 45 a30 30 0 0 1 18 -16"/>',
    '      </svg>',
    '      <svg class="check" viewBox="0 0 120 120">',
    '        <circle class="check__ring" cx="60" cy="60" r="54"/>',
    '        <circle class="check__fill" cx="60" cy="60" r="54"/>',
    '        <path class="check__mark" d="M37 62 l16 15 l31 -33"/>',
    '      </svg>',
    '      <div class="confetti" id="confetti"></div>',
    '    </div>',
    '',
    '    <div class="done__body">',
    '      <p class="done__status" id="klaar-status">Je afspraak wordt ingepland&hellip;</p>',
    '      <h2 class="done__title" id="klaar-titel" tabindex="-1">Gelukt! Je afspraak staat.</h2>',
    '      <p class="done__order" id="klaar-nummer"></p>',
    '',
    '      <div class="done__cards">',
    '        <div class="done-card done-card--when">',
    '          <div>',
    '            <p class="done-card__label">Ophalen</p>',
    '            <p class="done-card__value" id="klaar-ophalen"></p>',
    '          </div>',
    '          <div class="done-card__arrow" aria-hidden="true">',
    '            <svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
    '          </div>',
    '          <div>',
    '            <p class="done-card__label">Terug</p>',
    '            <p class="done-card__value" id="klaar-terug"></p>',
    '          </div>',
    '        </div>',
    '        <div class="done-card">',
    '          <dl class="done-list" id="klaar-lijst"></dl>',
    '        </div>',
    '        <div class="done-card">',
    '          <p class="done-card__label">Wat gebeurt er nu?</p>',
    '          <ol class="done-steps" id="klaar-stappen" role="list"></ol>',
    '        </div>',
    '      </div>',
    '',
    '      <div class="done__actions">',
    '        <button class="btn btn--primary" type="button" id="agenda">Zet in je agenda</button>',
    '        <button class="btn btn--on-navy" type="button" id="opnieuw">Nog een wasbeurt plannen</button>',
    '        <a class="done__link" id="klaar-link" href="index.html">Naar de site</a>',
    '      </div>',
    '      <p class="done__demo">Dit was een demo. Er is niets opgeslagen of verstuurd. Sluit je deze pagina, dan is alles weg.</p>',
    '    </div>',
    '  </div>',
    '</div>',
    '',
    '<!-- Pushmelding -->',
    '<div class="push" id="push" role="status" aria-live="polite" hidden>',
    '  <button class="push__card" type="button" id="push-knop" aria-label="Melding sluiten">',
    '    <img class="push__icon" src="icons/icon-192.png" width="40" height="40" alt="">',
    '    <span class="push__text">',
    '      <span class="push__meta"><span>De Witwasser</span><span>nu</span></span>',
    '      <span class="push__title" id="push-titel"></span>',
    '      <span class="push__body" id="push-tekst"></span>',
    '    </span>',
    '  </button>',
    '</div>'
  ].join('\n');

  var root = document.querySelector('[data-planner]');
  if (!root) return;
  var inAccount = root.hasAttribute('data-account');
  root.classList.add('planner');
  root.setAttribute('data-stap', '1');
  root.innerHTML = PLANNER_HTML;
  var overlays = document.createElement('div');
  overlays.innerHTML = OVERLAY_HTML;
  while (overlays.firstChild) document.body.appendChild(overlays.firstChild);

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* Iconen: lijntekeningen met een gekleurde vlak (.f) */
  var ICONEN = {
    tshirt: '<path class="f" d="M18 8 10 11.5 4 19l5.5 5L13 21v20h22V21l3.5 3 5.5-5-6-7.5L30 8c-1 3-3.2 4.5-6 4.5S19 11 18 8Z"/>',
    overhemd: '<path class="f" d="M18 7l-7 2.5C8 11 6.5 13 6 16L4 37h6l3-15v20h22V22l3 15h6l-2-21c-.5-3-2-5-5-6.5L30 7Z"/><path d="M18 7l3 6 3-2 3 2 3-6M24 11v31"/><circle cx="24" cy="20" r="1" class="d"/><circle cx="24" cy="27" r="1" class="d"/><circle cx="24" cy="34" r="1" class="d"/>',
    trui: '<path class="f" d="M18 8l-7 2c-3 1-4 3-4.5 6l-2 20h6L13 21v19h22V21l2.5 15h6l-2-20c-.5-3-1.5-5-4.5-6l-7-2c-1 3-3.2 4-6 4s-5-1-6-4Z"/><path d="M13 36h22M5 33h6M37 33h6M20 8.5c1 1.8 2.3 2.5 4 2.5s3-.7 4-2.5"/>',
    hoodie: '<path class="f" d="M17 9l-6 1.5c-3 1-4 3-4.5 6l-2 19.5h6L13 21v19h22V21l2.5 15h6l-2-19.5c-.5-3-1.5-5-4.5-6L31 9"/><path class="f" d="M17 10c0-5 3-7.5 7-7.5S31 5 31 10c-1.5 3-4 4-7 4s-5.5-1-7-4Z"/><path d="M22 13.5V19M26 13.5V19M18 32h12l-2-5h-8Z"/>',
    broek: '<path class="f" d="M14 6h20l3 36h-9.5L24 17l-3.5 25H11Z"/><path d="M14 11h20M24 11v6M16 11c0 3 2 4 4 4M32 11c0 3-2 4-4 4"/>',
    kortebroek: '<path class="f" d="M12 10h24l3 23H27.5L24 21l-3.5 12H9Z"/><path d="M12 15h24M24 15v6"/>',
    jurk: '<path class="f" d="M19 5h2c0 3 1.5 4 3 4s3-1 3-4h2v6c3 2 4 5 3 8l5 23H11l5-23c-1-3 0-6 3-8Z"/><path d="M16 19h16"/>',
    rok: '<path class="f" d="M15 10h18l6 30H9Z"/><path d="M15 15h18M20 15l-3 25M28 15l3 25M24 15v25"/>',
    ondergoed: '<path class="f" d="M7 13h34v6c-7 2-12 8-13 16h-8c-1-8-6-14-13-16Z"/><path d="M7 17h34"/><path class="d" d="M18 22.5c2-2 4-1.2 6 0 2-1.2 4-2 6 0-1 3-3 3.6-6 2.6-3 1-5 .4-6-2.6Z"/>',
    sokken: '<path class="f" d="M17 5h11v20l8.5 6c3.5 2.5 2.5 9-2.5 9.5L22 41c-4.5 0-6.5-3.5-5.5-7.5L17 29Z"/><path d="M17 10h11"/>',
    sportshirt: '<path class="f" d="M18 8 10 11.5 4 19l5.5 5L13 21v20h22V21l3.5 3 5.5-5-6-7.5L30 8l-6 6Z"/><path d="M21 21h6l-4 12M7.5 15.5l4.5 4M40.5 15.5l-4.5 4"/>',
    sporttop: '<path class="f" d="M17 6h3.5c0 4 1.5 6 3.5 6s3.5-2 3.5-6H31c0 5 1 8 3 11v25H14V17c2-3 3-6 3-11Z"/><path d="M14 24h20"/>',
    sportbroek: '<path class="f" d="M12 10h24l3 23H27.5L24 21l-3.5 12H9Z"/><path d="M12 15h24M24 15v6M14 15l-2.5 17M34 15l2.5 17"/>',
    legging: '<path class="f" d="M16 6h16l-1 36h-5l-2-26-2 26h-5Z"/><path d="M16 10h16"/>',
    trainingsjack: '<path class="f" d="M18 8l-7 2c-3 1-4 3-4.5 6l-2 20h6L13 21v19h22V21l2.5 15h6l-2-20c-.5-3-1.5-5-4.5-6l-7-2-6 4Z"/><path d="M24 12v28M18 8l6 4 6-4M8 18l-2 14M40 18l2 14"/>',
    sportsokken: '<path class="f" d="M17 5h11v20l8.5 6c3.5 2.5 2.5 9-2.5 9.5L22 41c-4.5 0-6.5-3.5-5.5-7.5L17 29Z"/><path d="M17 9h11M17 13h11"/>',
    dekbed: '<rect class="f" x="5" y="9" width="38" height="30" rx="3"/><path d="M5 17h38"/><path class="p" d="M14 25h0M24 25h0M34 25h0M19 31h0M29 31h0"/>',
    hoeslaken: '<path class="f" d="M9 12h30q3 0 3 3v18q0 3-3 3H9q-3 0-3-3V15q0-3 3-3Z"/><path d="M6 18c3 0 5-2 5-6M42 18c-3 0-5-2-5-6M6 30c3 0 5 2 5 6M42 30c-3 0-5 2-5 6"/>',
    kussen: '<path class="f" d="M9 12c5-2 25-2 30 0 2 6 2 18 0 24-5 2-25 2-30 0-2-6-2-18 0-24Z"/><path d="M15 18c6 1.5 12 1.5 18 0"/>',
    handdoek: '<path d="M6 9h36"/><path class="f" d="M11 9h26v30H11Z"/><path d="M11 31h26M11 34.5h26"/>',
    theedoek: '<rect class="f" x="10" y="8" width="28" height="32" rx="2"/><path d="M10 16h28M10 24h28M10 32h28M17 8v32M24 8v32M31 8v32" class="l"/>',
    eigen: '<path class="f" d="M8 24 22 10h15v15L23 39Z"/><circle cx="31" cy="16" r="2.2"/>'
  };

  var CATEGORIEEN = [
    { id: 'kleding', naam: 'Kleding' },
    { id: 'sport', naam: 'Sport' },
    { id: 'bed', naam: 'Bed en bad' }
  ];

  var KLEUR = { blauw: '#BFE0FB', geel: '#FFE08A', koraal: '#F9B9AC', mint: '#BDEBD6', lila: '#D9CCF5', zand: '#F1DEC2', grijs: '#DDE1E6' };

  var ITEMS = [
    { id: 'tshirt', naam: 'T-shirt', cat: 'kleding', icoon: 'tshirt', kleur: KLEUR.geel },
    { id: 'overhemd', naam: 'Overhemd', cat: 'kleding', icoon: 'overhemd', kleur: KLEUR.blauw },
    { id: 'trui', naam: 'Trui', cat: 'kleding', icoon: 'trui', kleur: KLEUR.koraal },
    { id: 'hoodie', naam: 'Hoodie', cat: 'kleding', icoon: 'hoodie', kleur: KLEUR.grijs },
    { id: 'broek', naam: 'Broek', cat: 'kleding', icoon: 'broek', kleur: KLEUR.blauw },
    { id: 'kortebroek', naam: 'Korte broek', cat: 'kleding', icoon: 'kortebroek', kleur: KLEUR.zand },
    { id: 'jurk', naam: 'Jurk', cat: 'kleding', icoon: 'jurk', kleur: KLEUR.koraal },
    { id: 'rok', naam: 'Rok', cat: 'kleding', icoon: 'rok', kleur: KLEUR.lila },
    { id: 'ondergoed', naam: 'Ondergoed', cat: 'kleding', icoon: 'ondergoed', kleur: KLEUR.blauw },
    { id: 'sokken', naam: 'Sokken (paar)', cat: 'kleding', icoon: 'sokken', kleur: KLEUR.mint },
    { id: 'sportshirt', naam: 'Sportshirt', cat: 'sport', icoon: 'sportshirt', kleur: KLEUR.mint, sport: true },
    { id: 'sporttop', naam: 'Sporttop', cat: 'sport', icoon: 'sporttop', kleur: KLEUR.lila, sport: true },
    { id: 'sportbroek', naam: 'Sportbroek', cat: 'sport', icoon: 'sportbroek', kleur: KLEUR.grijs, sport: true },
    { id: 'legging', naam: 'Legging', cat: 'sport', icoon: 'legging', kleur: KLEUR.koraal, sport: true },
    { id: 'trainingsjack', naam: 'Trainingsjack', cat: 'sport', icoon: 'trainingsjack', kleur: KLEUR.blauw, sport: true },
    { id: 'sportsokken', naam: 'Sportsokken', cat: 'sport', icoon: 'sportsokken', kleur: KLEUR.geel, sport: true },
    { id: 'dekbed', naam: 'Dekbedovertrek', cat: 'bed', icoon: 'dekbed', kleur: KLEUR.blauw },
    { id: 'hoeslaken', naam: 'Hoeslaken', cat: 'bed', icoon: 'hoeslaken', kleur: KLEUR.mint },
    { id: 'kussen', naam: 'Kussensloop', cat: 'bed', icoon: 'kussen', kleur: KLEUR.zand },
    { id: 'handdoek', naam: 'Handdoek', cat: 'bed', icoon: 'handdoek', kleur: KLEUR.koraal },
    { id: 'theedoek', naam: 'Theedoek', cat: 'bed', icoon: 'theedoek', kleur: KLEUR.geel }
  ];

  var BIJZONDERHEDEN = ['Vlek', 'Fijne was', 'Niet in de droger', 'Kleurt af', 'Gat of scheur'];
  var WASKLEUREN = [
    { id: 'wit', naam: 'Wit' },
    { id: 'licht', naam: 'Licht' },
    { id: 'donker', naam: 'Donker' },
    { id: 'bont', naam: 'Bont' }
  ];

  var PER_ID = {};
  ITEMS.forEach(function (it) { PER_ID[it.id] = it; });

  /* Hulpfuncties */

  function $(id) { return document.getElementById(id); }
  function maak(tag, cls, tekst) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  function svg(binnen) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + binnen + '</svg>';
  }

  var euroFormat = window.Intl ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }) : null;
  function euro(n) { return euroFormat ? euroFormat.format(n) : '€ ' + n.toFixed(2).replace('.', ','); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function plusDagen(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function vandaag() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function sleutel(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  /* Uren boven 24 lopen door naar de volgende dag. Rekent op de klok, dus ook goed rond zomertijd. */
  function opUur(d, uur) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), uur); }
  function verschilDagen(a, b) { return Math.round((plusDagen(b, 0) - plusDagen(a, 0)) / 864e5); }
  function zelfdeDag(a, b) { return a && b && sleutel(a) === sleutel(b); }
  function dagLang(d) { return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function dagKort(d) { return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''); }
  function weekdag(d) { return d.toLocaleDateString('nl-NL', { weekday: 'long' }); }
  function tijd(uur) { return pad(uur) + ':00'; }
  function vakTekst(v) { return tijd(v[0]) + '–' + tijd(v[1]); }
  function hoofdletter(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Nepdrukte: een vaste hash van datum en tijdvak, zodat iedereen hetzelfde ziet */
  function hash(tekst) {
    var h = 2166136261;
    for (var i = 0; i < tekst.length; i++) {
      h ^= tekst.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }
  function drukte(soort, dag, vak) {
    var h = hash(soort + sleutel(dag) + ':' + vak[0]);
    if (h < 0.2) return 'vol';
    if (h < 0.36) return 'bijna';
    return 'vrij';
  }
  function isVrij(status) { return status === 'vrij' || status === 'bijna'; }

  /* Status */

  var state;
  function beginState() {
    return {
      stap: 1,
      cat: 'kleding',
      items: {},
      volgorde: [],
      eigen: {},
      eigenTeller: 0,
      actief: null,
      overgeslagen: false,
      extraGekozen: 0,  /* extra zakken die je zelf toevoegt; volle zakken tellen daarbovenop */
      zakVol: false,    /* net een zak bijgekomen omdat de vorige vol zat */
      strijken: false,
      ophalen: null,
      terug: null,
      ophaalDag: null,
      terugDag: null,
      bezig: false
    };
  }
  state = beginState();

  function itemInfo(id) {
    if (PER_ID[id]) return PER_ID[id];
    return { id: id, naam: state.eigen[id].naam, cat: state.eigen[id].cat, icoon: 'eigen', kleur: KLEUR.grijs };
  }
  function regels() {
    return state.volgorde.filter(function (id) { return state.items[id] && state.items[id].aantal > 0; });
  }
  function aantalStuks() {
    return regels().reduce(function (s, id) { return s + state.items[id].aantal; }, 0);
  }
  /* Zakken die nodig zijn voor wat je hebt gekozen. Niet geteld: een zak. */
  function zakkenNodig() {
    return Math.max(1, Math.ceil(aantalStuks() / MAX_STUKS_PER_ZAK));
  }
  function extraZakken() {
    return Math.max(state.extraGekozen, zakkenNodig() - 1);
  }
  function maxStuks() {
    return (1 + MAX_EXTRA_ZAKKEN) * MAX_STUKS_PER_ZAK;
  }
  function extras() {
    return extraZakken() * PRIJS_EXTRA_ZAK + (state.strijken ? PRIJS_STRIJKEN : 0);
  }
  /* Abonnement: vast bedrag per maand, extra's per wasbeurt. Een keer: alles in een bedrag. */
  function prijsTekst(kort) {
    var x = extras();
    if (soort() === 'abonnement') {
      return euro(PRIJS_ABONNEMENT) + (kort ? '/mnd' : ' per maand') + (x ? ' + ' + euro(x) : '');
    }
    return euro(PRIJS_LOS + x);
  }

  /* Tijdvakken */

  function ophaalStatus(dag, vak) {
    if (dag.getDay() === 0) return 'gesloten';
    if (opUur(dag, vak[0]) < new Date(Date.now() + MIN_VOORBEREIDING_UUR * 36e5)) return 'verlopen';
    return drukte('o', dag, vak);
  }

  function vroegstKlaar() {
    return opUur(state.ophalen.dag, state.ophalen.vak[1] + MIN_WASTIJD_UUR);
  }

  function terugStatus(dag, vak) {
    if (!state.ophalen) return 'gesloten';
    if (dag.getDay() === 0) return 'gesloten';
    var dagen = verschilDagen(state.ophalen.dag, dag);
    if (dagen < 0) return 'voor';
    if (dagen === 0) return 'ophaaldag';
    if (dagen > MAX_DAGEN_TERUG) return 'telaat';
    if (opUur(dag, vak[0]) < vroegstKlaar()) return 'tevroeg';
    return drukte('b', dag, vak);
  }

  var VAK_LABEL = {
    vrij: 'Beschikbaar',
    bijna: 'Nog 1 plek',
    vol: 'Vol',
    verlopen: 'Te laat om te plannen',
    tevroeg: 'Te snel na ophalen',
    ophaaldag: 'Te snel na ophalen',
    voor: 'Voor het ophalen',
    telaat: 'Te laat',
    gesloten: 'Gesloten'
  };

  /* Label onder een dag: waarom hij wel of niet kan */
  function dagStatus(dag, statusFn) {
    var statussen = TIJDVAKKEN.map(function (v) { return statusFn(dag, v); });
    var vrij = statussen.some(isVrij);
    var label;
    if (vrij) {
      var t = vandaag();
      label = zelfdeDag(dag, t) ? 'Vandaag' : zelfdeDag(dag, plusDagen(t, 1)) ? 'Morgen' : 'Vrij';
      if (statussen.filter(isVrij).length <= 2) label = 'Bijna vol';
    } else if (statussen[0] === 'gesloten') label = 'Gesloten';
    else if (statussen[0] === 'voor') label = 'Voor ophalen';
    else if (statussen[0] === 'ophaaldag') label = 'Ophaaldag';
    else if (statussen.indexOf('tevroeg') !== -1) label = 'Te snel';
    else if (statussen.every(function (s) { return s === 'verlopen'; })) label = 'Voorbij';
    else label = 'Vol';
    return { vrij: vrij, label: label };
  }

  /* Stap 1: kleding kiezen */

  var tegels = {};

  function bouwTabs() {
    var tabs = $('cat-tabs');
    tabs.textContent = '';
    CATEGORIEEN.forEach(function (c) {
      var b = maak('button', 'cat-tabs__tab', c.naam);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.id = 'tab-' + c.id;
      b.setAttribute('aria-controls', 'items');
      b.setAttribute('aria-selected', String(c.id === state.cat));
      b.tabIndex = c.id === state.cat ? 0 : -1;
      b.addEventListener('click', function () { kiesCategorie(c.id); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var i = CATEGORIEEN.indexOf(c) + (e.key === 'ArrowRight' ? 1 : -1);
        var volgende = CATEGORIEEN[(i + CATEGORIEEN.length) % CATEGORIEEN.length];
        kiesCategorie(volgende.id);
        $('tab-' + volgende.id).focus();
      });
      tabs.appendChild(b);
    });
  }

  function kiesCategorie(id) {
    state.cat = id;
    CATEGORIEEN.forEach(function (c) {
      var b = $('tab-' + c.id);
      b.setAttribute('aria-selected', String(c.id === id));
      b.tabIndex = c.id === id ? 0 : -1;
    });
    $('items').setAttribute('aria-labelledby', 'tab-' + id);
    bouwTegels();
  }

  function bouwTegels() {
    var grid = $('items');
    grid.textContent = '';
    tegels = {};
    var lijst = ITEMS.filter(function (it) { return it.cat === state.cat; });
    Object.keys(state.eigen).forEach(function (id) {
      if (state.eigen[id].cat === state.cat) lijst.push(itemInfo(id));
    });
    lijst.forEach(function (it) { grid.appendChild(maakTegel(it)); });
    grid.appendChild(maakEigenTegel());
    Object.keys(tegels).forEach(werkTegelBij);
  }

  function maakTegel(it) {
    var tegel = maak('div', 'item');
    tegel.style.setProperty('--c', it.kleur);
    var plus = maak('button', 'item__add');
    plus.type = 'button';
    plus.innerHTML = svg(ICONEN[it.icoon]);
    plus.appendChild(maak('span', 'item__name', it.naam));
    if (it.sport) plus.appendChild(maak('span', 'item__flag', 'Apart'));
    plus.addEventListener('click', function () { wijzig(it.id, 1); });
    var aantal = maak('span', 'item__count');
    aantal.setAttribute('aria-hidden', 'true');
    var min = maak('button', 'item__min');
    min.type = 'button';
    min.setAttribute('aria-label', 'Een ' + it.naam.toLowerCase() + ' minder');
    min.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
    min.addEventListener('click', function () { wijzig(it.id, -1); });
    tegel.appendChild(plus);
    tegel.appendChild(aantal);
    tegel.appendChild(min);
    tegels[it.id] = { tegel: tegel, plus: plus, aantal: aantal, min: min, naam: it.naam };
    return tegel;
  }

  function maakEigenTegel() {
    var tegel = maak('div', 'item item--eigen');
    var knop = maak('button', 'item__add');
    knop.type = 'button';
    knop.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="12"/><path d="M24 18v12M18 24h12"/></svg>';
    knop.appendChild(maak('span', 'item__name', 'Iets anders'));
    var form = maak('form', 'item__form');
    form.hidden = true;
    var input = maak('input');
    input.type = 'text';
    input.maxLength = 30;
    input.placeholder = 'Bijv. jas';
    input.setAttribute('aria-label', 'Wat wil je toevoegen?');
    var ok = maak('button', 'item__ok', 'Voeg toe');
    ok.type = 'submit';
    form.appendChild(input);
    form.appendChild(ok);
    knop.addEventListener('click', function () {
      knop.hidden = true;
      form.hidden = false;
      input.focus();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var naam = input.value.replace(/\s+/g, ' ').trim();
      if (!naam) { input.focus(); return; }
      state.eigenTeller += 1;
      var id = 'eigen-' + state.eigenTeller;
      state.eigen[id] = { naam: hoofdletter(naam), cat: state.cat };
      bouwTegels();
      wijzig(id, 1);
      tegels[id].plus.focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { form.hidden = true; knop.hidden = false; knop.focus(); }
    });
    tegel.appendChild(knop);
    tegel.appendChild(form);
    return tegel;
  }

  function werkTegelBij(id) {
    var t = tegels[id];
    if (!t) return;
    var r = state.items[id];
    var n = r ? r.aantal : 0;
    t.tegel.classList.toggle('has-count', n > 0);
    t.tegel.classList.toggle('is-active', state.actief === id && n > 0);
    t.aantal.textContent = n;
    t.min.hidden = n === 0;
    t.plus.setAttribute('aria-label', t.naam + (n ? ', ' + n + ' gekozen. Nog een toevoegen' : ' toevoegen'));
  }

  function tik(el) {
    if (!el.animate || reducedMotion.matches) return;
    el.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
  }

  function wijzig(id, delta) {
    var r = state.items[id];
    if (!r) {
      r = state.items[id] = { aantal: 0, kleuren: [], tags: [] };
    }
    if (delta > 0 && aantalStuks() >= maxStuks()) {
      var vol = 'Er passen maximaal ' + maxStuks() + ' stuks in ' + (1 + MAX_EXTRA_ZAKKEN) +
        ' waszakken. Plan de rest in een tweede wasbeurt.';
      $('stap1-fout').textContent = vol;
      /* Ook direct onder de tegels, waar je net tikte */
      var details = $('details');
      var oud = details.querySelector('.details__vol');
      if (oud) oud.remove();
      details.insertBefore(maak('p', 'field__error details__vol', vol), details.firstChild);
      if (tegels[id] && tegels[id].tegel.animate && !reducedMotion.matches) {
        tegels[id].tegel.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 240 });
      }
      return;
    }
    if (state.volgorde.indexOf(id) === -1) state.volgorde.push(id);
    var zakkenVoor = extraZakken();
    r.aantal = Math.max(0, r.aantal + delta);
    state.zakVol = delta > 0 && extraZakken() > zakkenVoor;
    if (r.aantal > 0) {
      state.actief = id;
      state.overgeslagen = false;
      $('stap1-fout').textContent = '';
    } else if (state.actief === id) {
      state.actief = null;
    }
    var vorige = Object.keys(tegels);
    vorige.forEach(werkTegelBij);
    if (delta > 0 && tegels[id]) tik(tegels[id].aantal);
    renderDetails();
    renderSamenvatting();
  }

  function renderDetails() {
    var box = $('details');
    box.textContent = '';
    var id = state.actief;
    if (!id || !state.items[id] || !state.items[id].aantal) {
      box.appendChild(maak('p', 'details__hint', 'Kies een kledingstuk. Daarna kun je hier aangeven of er een vlek op zit en welke kleur het heeft.'));
      return;
    }
    var r = state.items[id];
    var info = itemInfo(id);
    var kop = maak('p', 'details__title');
    kop.appendChild(document.createTextNode('Bijzonderheden voor '));
    kop.appendChild(maak('strong', null, info.naam + ' (' + r.aantal + ')'));
    box.appendChild(kop);

    var tags = maak('div', 'tags');
    tags.setAttribute('role', 'group');
    tags.setAttribute('aria-label', 'Bijzonderheden');
    BIJZONDERHEDEN.forEach(function (t) {
      var b = maak('button', 'tag', t);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(r.tags.indexOf(t) !== -1));
      b.addEventListener('click', function () {
        var i = r.tags.indexOf(t);
        if (i === -1) r.tags.push(t); else r.tags.splice(i, 1);
        b.setAttribute('aria-pressed', String(i === -1));
        renderSamenvatting();
      });
      tags.appendChild(b);
    });
    box.appendChild(tags);

    var kleurKop = maak('p', 'details__sub', 'Kleuren, zodat we wit, licht, donker en bont apart wassen. Je kunt er meer kiezen.');
    kleurKop.id = 'kleur-kop';
    box.appendChild(kleurKop);
    var kleuren = maak('div', 'swatches');
    kleuren.setAttribute('role', 'group');
    kleuren.setAttribute('aria-labelledby', 'kleur-kop');
    WASKLEUREN.forEach(function (k) {
      var b = maak('button', 'swatch swatch--' + k.id);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(r.kleuren.indexOf(k.id) !== -1));
      b.appendChild(maak('span', 'swatch__dot'));
      b.appendChild(maak('span', 'swatch__name', k.naam));
      b.addEventListener('click', function () {
        var i = r.kleuren.indexOf(k.id);
        if (i === -1) r.kleuren.push(k.id); else r.kleuren.splice(i, 1);
        b.setAttribute('aria-pressed', String(i === -1));
        renderSamenvatting();
      });
      kleuren.appendChild(b);
    });
    box.appendChild(kleuren);
  }

  function regelOmschrijving(id) {
    var r = state.items[id];
    /* Kleuren in de vaste volgorde wit, licht, donker, bont */
    var kleuren = WASKLEUREN.filter(function (k) { return r.kleuren.indexOf(k.id) !== -1; })
      .map(function (k) { return k.naam; });
    var delen = kleuren.length ? [kleuren.join(', ')] : [];
    return delen.concat(r.tags).join(' · ');
  }

  /* Samenvatting en actiebalk */

  function renderSamenvatting() {
    var lijst = $('sum-lijnen');
    lijst.textContent = '';
    var ids = regels();
    ids.forEach(function (id) {
      var li = maak('li', 'sum-line');
      var links = maak('div');
      links.appendChild(maak('span', 'sum-line__name', itemInfo(id).naam));
      var sub = regelOmschrijving(id);
      if (sub) links.appendChild(maak('span', 'sum-line__sub', sub));
      li.appendChild(links);
      li.appendChild(maak('span', 'sum-line__qty', '× ' + state.items[id].aantal));
      lijst.appendChild(li);
    });
    var leeg = $('sum-leeg');
    leeg.hidden = ids.length > 0;
    leeg.textContent = state.overgeslagen
      ? 'Niet geteld. Wij tellen je was bij het labelen en sorteren.'
      : 'Nog niets gekozen. Tik op een kledingstuk om het toe te voegen.';
    $('sum-sport').hidden = !ids.some(function (id) { return itemInfo(id).sport; });

    $('sum-ophalen').textContent = state.ophalen ? hoofdletter(dagKort(state.ophalen.dag)) + ', ' + vakTekst(state.ophalen.vak) : 'Nog niet gekozen';
    $('sum-terug').textContent = state.terug ? hoofdletter(dagKort(state.terug.dag)) + ', ' + vakTekst(state.terug.vak) : 'Nog niet gekozen';

    var prijzen = $('sum-prijzen');
    prijzen.textContent = '';
    function prijsRegel(naam, bedrag) {
      var div = maak('div');
      div.appendChild(maak('dt', null, naam));
      div.appendChild(maak('dd', null, bedrag));
      prijzen.appendChild(div);
    }
    var abo = soort() === 'abonnement';
    if (abo) prijsRegel('Abonnement, elke week', euro(PRIJS_ABONNEMENT) + ' per maand');
    else prijsRegel('Losse wasbeurt (1 waszak)', euro(PRIJS_LOS));
    var extra = extraZakken();
    if (extra) prijsRegel('Extra waszak × ' + extra, euro(extra * PRIJS_EXTRA_ZAK));
    if (state.strijken) prijsRegel('Strijken', euro(PRIJS_STRIJKEN));
    $('sum-totaal').textContent = prijsTekst();

    $('sum-soort').textContent = (abo
      ? 'Abonnement: we halen elke week op voor ' + euro(PRIJS_ABONNEMENT) + ' per maand. Extra\'s betaal je per wasbeurt.'
      : 'Een keer.') + ' Er wordt niets betaald: dit is een demo.';

    var n = aantalStuks();
    $('balk-aantal').textContent = n
      ? n + (n === 1 ? ' stuk' : ' stuks') + (extra ? ', ' + (1 + extra) + ' zakken' : '')
      : state.overgeslagen ? 'Wij tellen het' : 'Nog niets gekozen';
    $('balk-totaal').textContent = prijsTekst(true);
    renderZakken();
  }

  /* Vulmeter per zak en de knoppen voor extra zakken */
  function renderZakken() {
    var extra = extraZakken();
    var zakken = 1 + extra;
    var n = aantalStuks();
    $('zak-aantal').textContent = extra;
    $('zak-min').disabled = extra <= zakkenNodig() - 1;
    $('zak-plus').disabled = extra >= MAX_EXTRA_ZAKKEN;

    var box = $('zak-vulling');
    box.textContent = '';
    var tekst = maak('p', 'fill__text');
    if (n) {
      tekst.appendChild(maak('strong', null, n + ' van ' + zakken * MAX_STUKS_PER_ZAK + ' stuks'));
      tekst.appendChild(document.createTextNode(' in ' + zakken + (zakken === 1 ? ' waszak' : ' waszakken')));
    } else {
      tekst.textContent = 'In een waszak passen ' + MAX_STUKS_PER_ZAK + ' stuks.';
    }
    box.appendChild(tekst);
    var balken = maak('div', 'fill__bags');
    balken.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < zakken; i++) {
      var inZak = Math.max(0, Math.min(MAX_STUKS_PER_ZAK, n - i * MAX_STUKS_PER_ZAK));
      var zak = maak('span', 'fill__bag' + (inZak === MAX_STUKS_PER_ZAK ? ' is-vol' : ''));
      var balk = maak('span', 'fill__bar');
      balk.style.width = (inZak / MAX_STUKS_PER_ZAK * 100) + '%';
      zak.appendChild(balk);
      balken.appendChild(zak);
    }
    box.appendChild(balken);
    if (state.zakVol) {
      box.appendChild(maak('p', 'fill__note', 'Je zak zit vol. We hebben een extra waszak toegevoegd (+ ' + euro(PRIJS_EXTRA_ZAK) + ').'));
    }
  }

  function koppelExtras() {
    $('zak-uitleg').textContent = 'Zit je zak vol (' + MAX_STUKS_PER_ZAK + ' stuks), dan komt er vanzelf een bij. + ' + euro(PRIJS_EXTRA_ZAK) + ' per zak.';
    $('prijs-strijken').textContent = '+ ' + euro(PRIJS_STRIJKEN);
    $('zak-min').addEventListener('click', function () {
      /* Terug tot wat nodig is: dan weer vanzelf, zodat de zak verdwijnt als je stuks weghaalt */
      var nieuw = Math.max(zakkenNodig() - 1, extraZakken() - 1);
      state.extraGekozen = nieuw > zakkenNodig() - 1 ? nieuw : 0;
      state.zakVol = false;
      renderSamenvatting();
    });
    $('zak-plus').addEventListener('click', function () {
      state.extraGekozen = Math.min(MAX_EXTRA_ZAKKEN, extraZakken() + 1);
      state.zakVol = false;
      renderSamenvatting();
    });
    $('strijken').addEventListener('click', function () {
      state.strijken = !state.strijken;
      this.setAttribute('aria-checked', String(state.strijken));
      renderSamenvatting();
    });
  }

  /* Stap 2 en 3: dagen en tijdvakken */

  function renderDagen(container, dagen, statusFn, gekozenDag, bijKeuze, vanafBegin) {
    container.textContent = '';
    var eerste = null;
    dagen.forEach(function (dag) {
      var st = dagStatus(dag, statusFn);
      var b = maak('button', 'day');
      b.type = 'button';
      b.disabled = !st.vrij;
      b.setAttribute('aria-pressed', String(zelfdeDag(dag, gekozenDag)));
      b.setAttribute('aria-label', dagLang(dag) + ', ' + st.label.toLowerCase());
      b.appendChild(maak('span', 'day__wd', dag.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')));
      b.appendChild(maak('span', 'day__nr', String(dag.getDate())));
      b.appendChild(maak('span', 'day__mo', dag.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '')));
      b.appendChild(maak('span', 'day__st', st.label));
      if (!st.vrij) b.classList.add('day--' + (st.label === 'Vol' || st.label === 'Bijna vol' ? 'vol' : 'nee'));
      b.addEventListener('click', function () { bijKeuze(dag); });
      container.appendChild(b);
      if (zelfdeDag(dag, gekozenDag)) eerste = b;
    });
    if (vanafBegin) {
      container.scrollLeft = 0;
    } else if (eerste) {
      /* Gekozen dag in beeld schuiven zonder de pagina te laten springen */
      var links = eerste.offsetLeft - container.offsetLeft - 8;
      container.scrollTo({ left: Math.max(0, links - container.clientWidth / 3), behavior: 'auto' });
    }
  }

  function renderVakken(container, titel, dag, statusFn, gekozen, bijKeuze, markeerSnelst) {
    container.textContent = '';
    titel.textContent = dag ? hoofdletter(dagLang(dag)) : '';
    if (!dag) return;
    var snelstGezet = false;
    TIJDVAKKEN.forEach(function (vak) {
      var st = statusFn(dag, vak);
      var b = maak('button', 'slot slot--' + st);
      b.type = 'button';
      b.disabled = !isVrij(st);
      var isGekozen = gekozen && zelfdeDag(gekozen.dag, dag) && gekozen.vak[0] === vak[0];
      b.setAttribute('aria-pressed', String(!!isGekozen));
      b.appendChild(maak('span', 'slot__time', vakTekst(vak)));
      b.appendChild(maak('span', 'slot__st', VAK_LABEL[st]));
      if (markeerSnelst && isVrij(st) && !snelstGezet && markeerSnelst(dag, vak)) {
        b.appendChild(maak('span', 'slot__badge', 'Snelst'));
        snelstGezet = true;
      }
      b.setAttribute('aria-label', tijd(vak[0]) + ' tot ' + tijd(vak[1]) + ', ' + VAK_LABEL[st].toLowerCase());
      b.addEventListener('click', function () { bijKeuze(vak); });
      container.appendChild(b);
    });
  }

  function ophaalDagen() {
    var t = vandaag();
    var lijst = [];
    for (var i = 0; i < PLANBARE_DAGEN; i++) {
      var d = plusDagen(t, i);
      if (d.getDay() !== 0) lijst.push(d);
    }
    return lijst;
  }

  /* Van twee dagen voor het ophalen tot het maximum erna. Zo zie je ook welke dagen niet kunnen. */
  function terugDagen() {
    var t = vandaag();
    var p = state.ophalen.dag;
    var start = plusDagen(p, -2) < t ? t : plusDagen(p, -2);
    var lijst = [];
    for (var d = start; verschilDagen(p, d) <= MAX_DAGEN_TERUG; d = plusDagen(d, 1)) {
      if (d.getDay() !== 0) lijst.push(d);
    }
    return lijst;
  }

  function eersteVrijeDag(dagen, statusFn) {
    for (var i = 0; i < dagen.length; i++) {
      if (dagStatus(dagen[i], statusFn).vrij) return dagen[i];
    }
    return null;
  }

  function eersteVrijTerug() {
    var dagen = terugDagen();
    for (var i = 0; i < dagen.length; i++) {
      for (var j = 0; j < TIJDVAKKEN.length; j++) {
        if (isVrij(terugStatus(dagen[i], TIJDVAKKEN[j]))) return { dag: dagen[i], vak: TIJDVAKKEN[j] };
      }
    }
    return null;
  }

  function renderOphalen() {
    var dagen = ophaalDagen();
    if (!state.ophaalDag || !dagStatus(state.ophaalDag, ophaalStatus).vrij) {
      state.ophaalDag = state.ophalen ? state.ophalen.dag : eersteVrijeDag(dagen, ophaalStatus);
    }
    renderDagen($('ophaal-dagen'), dagen, ophaalStatus, state.ophaalDag, function (dag) {
      state.ophaalDag = dag;
      renderOphalen();
    });
    renderVakken($('ophaal-vakken'), $('ophaal-dagtitel'), state.ophaalDag, ophaalStatus, state.ophalen, function (vak) {
      state.ophalen = { dag: state.ophaalDag, vak: vak };
      $('stap2-fout').textContent = '';
      /* Past het terugbrengmoment niet meer, dan opnieuw laten kiezen */
      var gewist = false;
      if (state.terug && !isVrij(terugStatus(state.terug.dag, state.terug.vak))) {
        state.terug = null;
        gewist = true;
      }
      $('terug-gewist').hidden = !gewist;
      state.terugDag = null;
      renderOphalen();
      renderSamenvatting();
    });
  }

  function renderTerug() {
    var p = state.ophalen;
    var regel = $('terug-regel');
    regel.textContent = '';
    var r1 = maak('p', 'rule__line');
    r1.appendChild(maak('span', 'rule__label', 'Ophalen'));
    r1.appendChild(maak('strong', null, hoofdletter(dagLang(p.dag)) + ', ' + vakTekst(p.vak)));
    var r2 = maak('p', 'rule__line');
    var klaar = vroegstKlaar();
    r2.appendChild(maak('span', 'rule__label', 'Op zijn vroegst klaar'));
    r2.appendChild(maak('strong', null, hoofdletter(dagLang(klaar)) + ', ' + tijd(klaar.getHours())));
    var uitleg = maak('p', 'rule__hint', 'We hebben minstens ' + MIN_WASTIJD_UUR + ' uur nodig om te wassen, te drogen, te controleren en te vouwen. Eerdere momenten kun je daarom niet kiezen.');
    regel.appendChild(r1);
    regel.appendChild(r2);
    regel.appendChild(uitleg);

    var dagen = terugDagen();
    if (!state.terugDag || !dagStatus(state.terugDag, terugStatus).vrij) {
      state.terugDag = state.terug ? state.terug.dag : eersteVrijeDag(dagen, terugStatus);
    }
    var snelst = eersteVrijTerug();
    renderDagen($('terug-dagen'), dagen, terugStatus, state.terugDag, function (dag) {
      state.terugDag = dag;
      renderTerug();
    }, !state.terug);
    renderVakken($('terug-vakken'), $('terug-dagtitel'), state.terugDag, terugStatus, state.terug, function (vak) {
      state.terug = { dag: state.terugDag, vak: vak };
      $('stap3-fout').textContent = '';
      $('terug-gewist').hidden = true;
      renderTerug();
      renderSamenvatting();
    }, function (dag, vak) {
      return snelst && zelfdeDag(snelst.dag, dag) && snelst.vak[0] === vak[0];
    });
    if (!state.terugDag) {
      $('terug-dagtitel').textContent = 'Er is in deze week geen plek meer om terug te brengen. Kies een ander ophaalmoment.';
    }
  }

  /* Stap 4: gegevens */

  var postcodePatroon = /^[1-9][0-9]{3} ?[A-Z]{2}$/;
  var huisnummerPatroon = /^[0-9]{1,5}[ -]?[A-Za-z0-9]{0,6}$/;

  function formatPostcode(v) {
    var compact = v.replace(/\s+/g, '').toUpperCase();
    return /^[1-9][0-9]{3}[A-Z]{2}$/.test(compact) ? compact.slice(0, 4) + ' ' + compact.slice(4) : v.trim();
  }

  function veldFout(veld, tekst) {
    $(veld.id + '-fout').textContent = tekst || '';
    if (tekst) veld.setAttribute('aria-invalid', 'true'); else veld.removeAttribute('aria-invalid');
    return !tekst;
  }

  function soort() {
    var r = document.querySelector('input[name="soort"]:checked');
    return r ? r.value : 'los';
  }

  function renderSoortHint() {
    var hint = $('p-soort-hint');
    if (soort() === 'abonnement') {
      hint.textContent = state.ophalen
        ? 'We halen daarna elke ' + weekdag(state.ophalen.dag) + ' tussen ' + tijd(state.ophalen.vak[0]) + ' en ' + tijd(state.ophalen.vak[1]) + ' op. ' + euro(PRIJS_ABONNEMENT) + ' per maand, pauzeren kan in je account.'
        : 'We halen daarna elke week op hetzelfde moment op.';
    } else {
      hint.textContent = 'Alleen deze wasbeurt. Je kunt later altijd een nieuwe plannen.';
    }
  }

  function controleerGegevens() {
    var naam = $('p-naam'), straat = $('p-straat'), nr = $('p-huisnummer'), pc = $('p-postcode');
    pc.value = formatPostcode(pc.value);
    var ok = veldFout(naam, naam.value.trim() ? '' : 'Vul je naam in.');
    ok = veldFout(straat, straat.value.trim() ? '' : 'Vul je straat in.') && ok;
    ok = veldFout(nr, !nr.value.trim() ? 'Vul je huisnummer in.'
      : huisnummerPatroon.test(nr.value.trim()) ? '' : 'Vul een huisnummer in zoals 12, 12a of 12-2.') && ok;
    ok = veldFout(pc, !pc.value ? 'Vul je postcode in, bijvoorbeeld 9742 AB.'
      : postcodePatroon.test(pc.value) ? '' : 'Dit is geen geldige postcode. Gebruik vier cijfers en twee letters, zoals 9742 AB.') && ok;
    if (!ok) {
      var eerste = $('gegevens').querySelector('[aria-invalid="true"]');
      if (eerste) eerste.focus();
    }
    return ok;
  }

  function koppelGegevens() {
    var form = $('gegevens');
    form.addEventListener('submit', function (e) { e.preventDefault(); volgende(); });
    ['p-naam', 'p-straat', 'p-huisnummer', 'p-postcode'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        if (this.getAttribute('aria-invalid') === 'true') veldFout(this, '');
      });
    });
    $('p-postcode').addEventListener('blur', function () { this.value = formatPostcode(this.value); });
    form.querySelectorAll('input[name="soort"]').forEach(function (r) {
      r.addEventListener('change', function () { renderSoortHint(); renderSamenvatting(); });
    });
  }

  /* Stappen */

  var VERDER_LABEL = { 1: 'Verder', 2: 'Verder', 3: 'Verder', 4: 'Bevestig afspraak' };

  function stapKlopt(n, toonFout) {
    if (n === 1) {
      if (aantalStuks() > 0 || state.overgeslagen) return true;
      if (toonFout) $('stap1-fout').textContent = 'Kies minstens een kledingstuk, of sla het tellen over.';
      return false;
    }
    if (n === 2) {
      if (state.ophalen) return true;
      if (toonFout) $('stap2-fout').textContent = 'Kies een tijdvak waarop we je was ophalen.';
      return false;
    }
    if (n === 3) {
      if (state.terug) return true;
      if (toonFout) $('stap3-fout').textContent = 'Kies een tijdvak waarop we je was terugbrengen.';
      return false;
    }
    return true;
  }

  function gaNaar(n, focus) {
    state.stap = n;
    root.setAttribute('data-stap', String(n));
    document.querySelectorAll('[data-paneel]').forEach(function (p) {
      p.hidden = Number(p.getAttribute('data-paneel')) !== n;
    });
    document.querySelectorAll('.stepper__btn').forEach(function (b) {
      var i = Number(b.getAttribute('data-naar'));
      b.classList.toggle('is-done', i < n);
      if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = i > n;
    });
    if (n === 2) renderOphalen();
    if (n === 3) renderTerug();
    if (n === 4) renderSoortHint();
    $('terug-knop').hidden = n === 1;
    $('verder-knop').textContent = VERDER_LABEL[n];

    var paneel = document.querySelector('[data-paneel="' + n + '"]');
    if (paneel.animate && !reducedMotion.matches) {
      paneel.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
    }
    if (focus !== false) {
      var stepper = $('stepper');
      var boven = stepper.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > boven) window.scrollTo({ top: boven, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      paneel.querySelector('.plan-panel__title').focus({ preventScroll: true });
    }
  }

  function volgende() {
    if (state.bezig) return;
    if (!stapKlopt(state.stap, true)) {
      var fout = $('stap' + state.stap + '-fout');
      if (fout && fout.animate && !reducedMotion.matches) {
        fout.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 });
      }
      return;
    }
    if (state.stap < 4) { gaNaar(state.stap + 1); return; }
    if (controleerGegevens()) bevestig();
  }

  function koppelStappen() {
    $('verder-knop').addEventListener('click', volgende);
    $('terug-knop').addEventListener('click', function () { if (state.stap > 1) gaNaar(state.stap - 1); });
    document.querySelectorAll('.stepper__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Number(b.getAttribute('data-naar'));
        if (n < state.stap) gaNaar(n);
      });
    });
    $('overslaan').addEventListener('click', function () {
      state.overgeslagen = true;
      state.actief = null;
      $('stap1-fout').textContent = '';
      renderDetails();
      renderSamenvatting();
      gaNaar(2);
    });
  }

  /* Bevestiging */

  var bestelling = null;

  function bestelnummer() {
    var n;
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      n = a[0] % 90000 + 10000;
    } else {
      n = Math.floor(Math.random() * 90000) + 10000;
    }
    return 'WW-' + n;
  }

  function herinneringTekst(ophalen) {
    var avondErvoor = opUur(plusDagen(ophalen.dag, -1), 20);
    if (avondErvoor > new Date()) {
      return 'Je krijgt ' + dagLang(avondErvoor) + ' om 20:00 een herinnering voor je ophaalmoment.';
    }
    return 'Je krijgt een uur van tevoren een herinnering voor je ophaalmoment.';
  }

  function bevestig() {
    state.bezig = true;
    var ids = regels();
    var sportStuks = ids.filter(function (id) { return itemInfo(id).sport; })
      .reduce(function (s, id) { return s + state.items[id].aantal; }, 0);
    bestelling = {
      nummer: bestelnummer(),
      naam: $('p-naam').value.trim(),
      adres: $('p-straat').value.trim() + ' ' + $('p-huisnummer').value.trim() + ', ' + $('p-postcode').value,
      ophalen: state.ophalen,
      terug: state.terug,
      stuks: aantalStuks(),
      sportStuks: sportStuks,
      zakken: 1 + extraZakken(),
      strijken: state.strijken,
      prijs: prijsTekst(),
      abonnement: soort() === 'abonnement',
      opmerking: $('p-opmerking').value.trim()
    };
    vulBevestiging(bestelling);
    toonBevestiging();
    /* In je account neemt app.js de nieuwe planning over in je profiel */
    if (inAccount) {
      document.dispatchEvent(new CustomEvent('witwasser:geboekt', { detail: {
        abonnement: bestelling.abonnement,
        ophaaldag: weekdag(bestelling.ophalen.dag),
        brengdag: weekdag(bestelling.terug.dag),
        brengUur: bestelling.terug.vak[0]
      } }));
    }
  }

  function vulBevestiging(b) {
    var voornaam = b.naam.split(' ')[0];
    $('klaar-titel').textContent = 'Gelukt' + (voornaam ? ', ' + voornaam : '') + '! Je afspraak staat.';
    $('klaar-nummer').textContent = 'Bestelnummer ' + b.nummer;
    $('klaar-ophalen').textContent = hoofdletter(dagKort(b.ophalen.dag)) + '\n' + vakTekst(b.ophalen.vak);
    $('klaar-terug').textContent = hoofdletter(dagKort(b.terug.dag)) + '\n' + vakTekst(b.terug.vak);

    var lijst = $('klaar-lijst');
    lijst.textContent = '';
    function rij(label, waarde) {
      var div = maak('div');
      div.appendChild(maak('dt', null, label));
      div.appendChild(maak('dd', null, waarde));
      lijst.appendChild(div);
    }
    rij('Adres', b.adres);
    rij('Inhoud', b.stuks
      ? b.stuks + (b.stuks === 1 ? ' stuk' : ' stuks') + ' in ' + b.zakken + (b.zakken === 1 ? ' waszak' : ' waszakken') +
        (b.sportStuks ? ', waarvan ' + b.sportStuks + ' sportkleding (apart gewassen)' : '')
      : b.zakken + (b.zakken === 1 ? ' waszak' : ' waszakken') + ', wij tellen bij het sorteren');
    if (b.strijken) rij('Extra', 'Strijken');
    if (b.opmerking) rij('Voor de bezorger', b.opmerking);
    rij(b.abonnement ? 'Abonnement' : 'Totaal', b.prijs + (b.abonnement ? ', elke ' + weekdag(b.ophalen.dag) + ' ophalen' : ', een keer'));

    var stappen = $('klaar-stappen');
    stappen.textContent = '';
    [
      herinneringTekst(b.ophalen),
      'Zet je waszak ' + dagLang(b.ophalen.dag) + ' voor ' + tijd(b.ophalen.vak[0]) + ' klaar bij de voordeur.',
      'Zodra je was schoon is, krijg je een bericht. ' + hoofdletter(dagLang(b.terug.dag)) + ' tussen ' + tijd(b.terug.vak[0]) + ' en ' + tijd(b.terug.vak[1]) + ' staat hij gevouwen voor je deur.'
    ].forEach(function (t) { stappen.appendChild(maak('li', null, t)); });

    $('push-titel').textContent = 'Afspraak bevestigd';
    $('push-tekst').textContent = 'We halen je was op ' + dagKort(b.ophalen.dag) + ' tussen ' + tijd(b.ophalen.vak[0]) + ' en ' + tijd(b.ophalen.vak[1]) + '. Bestelnummer ' + b.nummer + '.';
  }

  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }

  function maakBellen() {
    var box = $('bellen');
    box.textContent = '';
    for (var i = 0; i < 14; i++) {
      var b = maak('span', 'bubble');
      b.style.setProperty('--x', (Math.random() * 200 - 100).toFixed(0) + 'px');
      b.style.setProperty('--s', (6 + Math.random() * 14).toFixed(0) + 'px');
      b.style.setProperty('--d', (Math.random() * 1.2).toFixed(2) + 's');
      b.style.setProperty('--t', (1.4 + Math.random() * 1.2).toFixed(2) + 's');
      box.appendChild(b);
    }
  }

  function maakConfetti() {
    var box = $('confetti');
    box.textContent = '';
    if (reducedMotion.matches) return;
    var kleuren = ['#4A9FE8', '#FFC83D', '#FFFFFF', '#7CC4F5', '#F9B9AC', '#BDEBD6'];
    for (var i = 0; i < 36; i++) {
      var c = maak('span', 'confetto' + (i % 3 === 0 ? ' confetto--round' : ''));
      var hoek = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
      var afstand = 90 + Math.random() * 90;
      c.style.setProperty('--x', (Math.cos(hoek) * afstand).toFixed(0) + 'px');
      c.style.setProperty('--y', (Math.sin(hoek) * afstand - 30).toFixed(0) + 'px');
      c.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      c.style.setProperty('--c', kleuren[i % kleuren.length]);
      c.style.setProperty('--d', (Math.random() * 0.12).toFixed(2) + 's');
      box.appendChild(c);
    }
  }

  function toonBevestiging() {
    var klaar = $('klaar');
    stopTimers();
    klaar.classList.remove('is-klaar');
    klaar.classList.add('is-wassen');
    klaar.hidden = false;
    klaar.scrollTop = 0;
    document.documentElement.classList.add('has-overlay');
    $('klaar-status').textContent = 'Je afspraak wordt ingepland…';
    maakBellen();
    klaar.focus();

    var wasduur = reducedMotion.matches ? 400 : 1700;
    later(function () {
      maakConfetti();
      klaar.classList.remove('is-wassen');
      klaar.classList.add('is-klaar');
      $('klaar-status').textContent = '';
      $('klaar-titel').focus({ preventScroll: true });
      if (navigator.vibrate) { try { navigator.vibrate([30, 60, 30]); } catch (e) { /* niet ondersteund */ } }
    }, wasduur);
    later(toonPush, wasduur + 700);
    later(verbergPush, wasduur + 7700);
  }

  function toonPush() {
    var push = $('push');
    push.hidden = false;
    push.classList.remove('is-weg');
    push.classList.add('is-in');
  }
  function verbergPush() {
    var push = $('push');
    if (push.hidden) return;
    push.classList.remove('is-in');
    push.classList.add('is-weg');
    setTimeout(function () { push.hidden = true; push.classList.remove('is-weg'); }, 400);
  }

  function icsDatum(d, uur) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(uur) + '0000';
  }
  function icsTekst(s) { return s.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'); }

  function downloadAgenda() {
    if (!bestelling) return;
    var b = bestelling;
    var nu = new Date();
    var stempel = nu.getUTCFullYear() + pad(nu.getUTCMonth() + 1) + pad(nu.getUTCDate()) + 'T' + pad(nu.getUTCHours()) + pad(nu.getUTCMinutes()) + '00Z';
    function event(id, moment, titel, tekst) {
      return [
        'BEGIN:VEVENT',
        'UID:' + b.nummer + '-' + id + '@de-witwasser.demo',
        'DTSTAMP:' + stempel,
        'DTSTART:' + icsDatum(moment.dag, moment.vak[0]),
        'DTEND:' + icsDatum(moment.dag, moment.vak[1]),
        'SUMMARY:' + icsTekst(titel),
        'DESCRIPTION:' + icsTekst(tekst),
        'LOCATION:' + icsTekst(b.adres),
        'END:VEVENT'
      ].join('\r\n');
    }
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//De Witwasser//Demo//NL', 'CALSCALE:GREGORIAN',
      event('ophalen', b.ophalen, 'De Witwasser haalt je was op', 'Zet je waszak klaar bij de voordeur. Bestelnummer ' + b.nummer + '. (Demo)'),
      event('terug', b.terug, 'De Witwasser brengt je was terug', 'Je was komt schoon, droog en gevouwen terug. Bestelnummer ' + b.nummer + '. (Demo)'),
      'END:VCALENDAR', ''
    ].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = maak('a');
    a.href = url;
    a.download = 'witwasser-' + b.nummer + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function opnieuw() {
    stopTimers();
    verbergPush();
    $('klaar').hidden = true;
    $('klaar').classList.remove('is-wassen', 'is-klaar');
    document.documentElement.classList.remove('has-overlay');
    var cat = state.cat;
    state = beginState();
    state.cat = cat;
    bestelling = null;
    $('gegevens').reset();
    $('gegevens').querySelectorAll('[aria-invalid]').forEach(function (v) { veldFout(v, ''); });
    $('strijken').setAttribute('aria-checked', 'false');
    $('terug-gewist').hidden = true;
    ['stap1-fout', 'stap2-fout', 'stap3-fout'].forEach(function (id) { $(id).textContent = ''; });
    kiesCategorie(cat);
    vulUitProfiel(profiel);
    renderDetails();
    renderSamenvatting();
    gaNaar(1, false);
    if (inAccount) root.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    $('stap1-titel').focus({ preventScroll: true });
  }

  /* In je account: naam, adres en abonnement alvast invullen vanuit je profiel (komt van app.js) */
  var profiel = null;
  function vulUitProfiel(p) {
    if (!p) return;
    if (p.naam) $('p-naam').value = p.naam;
    if (p.straat) $('p-straat').value = p.straat;
    if (p.huisnummer) $('p-huisnummer').value = p.huisnummer;
    if (p.postcode) $('p-postcode').value = p.postcode;
    var keuze = p.frequentie === 'los' ? 'los' : 'abonnement';
    document.querySelectorAll('input[name="soort"]').forEach(function (r) { r.checked = r.value === keuze; });
    renderSoortHint();
    renderSamenvatting();
  }
  if (inAccount) {
    var link = $('klaar-link');
    link.textContent = 'Terug naar je account';
    link.href = '#planning';
    link.addEventListener('click', function (e) { e.preventDefault(); opnieuw(); });
    document.addEventListener('witwasser:profiel', function (e) {
      var eerste = !profiel;
      profiel = e.detail;
      if (eerste) vulUitProfiel(profiel);
    });
  }

  function koppelBevestiging() {
    $('agenda').addEventListener('click', downloadAgenda);
    $('opnieuw').addEventListener('click', opnieuw);
    $('push-knop').addEventListener('click', verbergPush);
    /* Focus binnen het venster houden */
    $('klaar').addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusbaar = Array.prototype.filter.call(
        this.querySelectorAll('button, a[href], [tabindex="-1"]'),
        function (x) { return x.offsetParent !== null; }
      );
      var eerste = focusbaar[0], laatste = focusbaar[focusbaar.length - 1];
      if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
      else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
    });
  }

  /* Tijdvakken van vandaag kunnen verlopen terwijl de pagina openstaat (bijvoorbeeld tijdens de les) */
  function verversTijd() {
    if (state.ophalen && !isVrij(ophaalStatus(state.ophalen.dag, state.ophalen.vak))) {
      state.ophalen = null;
      state.terug = null;
      renderSamenvatting();
      if (state.stap > 2) gaNaar(2);
      $('stap2-fout').textContent = 'Je gekozen ophaalmoment is inmiddels te dichtbij. Kies een nieuw moment.';
    }
    if (state.stap === 2) renderOphalen();
    if (state.stap === 3) renderTerug();
  }

  /* Start */

  bouwTabs();
  kiesCategorie(state.cat);
  koppelExtras();
  koppelGegevens();
  koppelStappen();
  koppelBevestiging();
  renderDetails();
  renderSamenvatting();
  gaNaar(1, false);
  setInterval(verversTijd, 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) verversTijd(); });
})();
