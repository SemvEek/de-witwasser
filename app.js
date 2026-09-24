/* De Witwasser, gebruikersapp: inloggen (inloggen.html) en account (account.html) */
(function () {
  'use strict';

  var cfg = window.WITWASSER_CONFIG || {};
  var pagina = document.body.getAttribute('data-page');
  var OPSLAG_AANMELDING = 'witwasser-aanmelding';
  var FREQUENTIE_LABEL = { 'elke week': 'Elke week', 'om de week': 'Om de week', 'los': 'Los' };

  /* iOS Safari activeert :active pas met een touchstart-listener */
  document.addEventListener('touchstart', function () {}, { passive: true });

  function isGekoppeld() {
    return typeof cfg.supabaseUrl === 'string' && /^https:\/\/\S+$/.test(cfg.supabaseUrl) &&
      typeof cfg.supabaseAnonKey === 'string' && cfg.supabaseAnonKey.length > 20 &&
      cfg.supabaseAnonKey.indexOf('[PLACEHOLDER') === -1;
  }

  /* Zonder ingevulde config draait de app in demo-modus: alles blijft in deze browser */
  var demo = !isGekoppeld();
  var db = null;
  if (demo) {
    db = maakDemoClient();
  } else if (window.supabase) {
    db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      /* implicit: een magic link werkt ook als je hem in een andere browser opent */
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
  }

  /* Demo-modus: bootst het deel van de Supabase-client na dat de app gebruikt.
     Net als met de echte database ziet een gebruiker alleen zijn eigen profiel. */
  function maakDemoClient() {
    var SLEUTEL = 'witwasser-demo';
    var DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    var FREQUENTIES = ['elke week', 'om de week', 'los'];
    var geheugen = null;

    function nieuwProfiel(id, email, m) {
      m = m || {};
      var pc = String(m.postcode || '').replace(/\s+/g, '').toUpperCase();
      var st = Number(m.studenten_in_huis);
      var nu = new Date().toISOString();
      return {
        id: id,
        email: email,
        naam: m.naam ? String(m.naam).trim().slice(0, 100) : null,
        straat: null,
        huisnummer: null,
        postcode: /^[1-9][0-9]{3}[A-Z]{2}$/.test(pc) ? pc.slice(0, 4) + ' ' + pc.slice(4) : null,
        frequentie: FREQUENTIES.indexOf(m.frequentie) !== -1 ? m.frequentie : null,
        ophaaldag: DAGEN.indexOf(m.ophaaldag) !== -1 ? m.ophaaldag : null,
        brengdag: null,
        brengdagdeel: null,
        studenten_in_huis: st >= 1 && st <= 50 && st % 1 === 0 ? st : null,
        status: 'actief',
        gepauzeerd_tot: null,
        opgezegd_op: null,
        aangemaakt_op: nu,
        bijgewerkt_op: nu
      };
    }

    function lees() {
      var st = null;
      try { st = JSON.parse(localStorage.getItem(SLEUTEL) || 'null'); } catch (e) { st = geheugen; }
      st = st || { gebruikers: {}, profielen: {}, sessie: null };
      /* Demo-accounts uit config.js altijd beschikbaar maken */
      (cfg.demoAccounts || []).forEach(function (a) {
        var email = String(a.email).toLowerCase();
        if (st.gebruikers[email]) return;
        var id = 'demo-' + email;
        st.gebruikers[email] = { id: id, wachtwoord: a.wachtwoord };
        st.profielen[id] = nieuwProfiel(id, email, { naam: a.naam });
      });
      return st;
    }

    function schrijf(st) {
      geheugen = st;
      try { localStorage.setItem(SLEUTEL, JSON.stringify(st)); } catch (e) { /* alleen in geheugen */ }
    }

    function antwoord(data, error) { return Promise.resolve({ data: data, error: error || null }); }

    return {
      auth: {
        getSession: function () {
          var st = lees();
          return antwoord({ session: st.sessie ? { user: st.sessie } : null });
        },
        onAuthStateChange: function () {
          return { data: { subscription: { unsubscribe: function () {} } } };
        },
        signInWithPassword: function (o) {
          var st = lees();
          var email = String(o.email).toLowerCase();
          var g = st.gebruikers[email];
          if (!g || g.wachtwoord !== o.password) {
            return antwoord(null, { code: 'invalid_credentials', message: 'Invalid login credentials' });
          }
          st.sessie = { id: g.id, email: email };
          schrijf(st);
          return antwoord({ session: { user: st.sessie } });
        },
        signUp: function (o) {
          var st = lees();
          var email = String(o.email).toLowerCase();
          if (st.gebruikers[email]) {
            return antwoord(null, { code: 'user_already_exists', message: 'User already registered' });
          }
          var id = 'demo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          st.gebruikers[email] = { id: id, wachtwoord: o.password };
          st.profielen[id] = nieuwProfiel(id, email, o.options && o.options.data);
          st.sessie = { id: id, email: email };
          schrijf(st);
          return antwoord({ session: { user: st.sessie } });
        },
        signInWithOtp: function () {
          return antwoord(null, { code: 'demo_modus', message: 'Demo mode' });
        },
        signOut: function () {
          var st = lees();
          st.sessie = null;
          schrijf(st);
          return antwoord({});
        }
      },
      from: function () {
        var actie = 'select';
        var gegevens = null;
        function uitvoeren() {
          var st = lees();
          if (!st.sessie) return antwoord(null, { message: 'JWT expired' });
          var id = st.sessie.id;
          if (actie === 'insert') st.profielen[id] = nieuwProfiel(id, st.sessie.email, gegevens);
          if (actie === 'update') {
            if (!st.profielen[id]) return antwoord(null, { message: 'Profiel niet gevonden' });
            Object.assign(st.profielen[id], gegevens, { bijgewerkt_op: new Date().toISOString() });
          }
          if (actie !== 'select') schrijf(st);
          var p = st.profielen[id];
          return antwoord(p ? Object.assign({}, p) : null);
        }
        var bouwer = {
          select: function () { return bouwer; },
          eq: function () { return bouwer; },
          insert: function (x) { actie = 'insert'; gegevens = x; return bouwer; },
          update: function (x) { actie = 'update'; gegevens = x; return bouwer; },
          maybeSingle: uitvoeren,
          single: uitvoeren
        };
        return bouwer;
      }
    };
  }

  /* Hulpfuncties */

  function $(id) { return document.getElementById(id); }

  function absoluut(bestand) { return new URL(bestand, window.location.href).href; }

  function melding(el, soort, tekst) {
    el.className = 'notice notice--' + soort;
    el.textContent = tekst || '';
    el.hidden = !tekst;
  }

  function bezig(knop, isBezig, tekst) {
    if (isBezig) {
      knop.setAttribute('data-label', knop.textContent);
      knop.textContent = tekst;
      knop.disabled = true;
    } else {
      knop.textContent = knop.getAttribute('data-label') || knop.textContent;
      knop.disabled = false;
    }
  }

  function leesAanmelding() {
    try { return JSON.parse(sessionStorage.getItem(OPSLAG_AANMELDING) || 'null'); } catch (e) { return null; }
  }
  function wisAanmelding() {
    try { sessionStorage.removeItem(OPSLAG_AANMELDING); } catch (e) { /* niets te wissen */ }
  }

  var emailPatroon = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var huisnummerPatroon = /^[0-9]{1,5}[ -]?[A-Za-z0-9]{0,6}$/;

  function formatPostcode(v) {
    var compact = v.replace(/\s+/g, '').toUpperCase();
    return /^[1-9][0-9]{3}[A-Z]{2}$/.test(compact) ? compact.slice(0, 4) + ' ' + compact.slice(4) : v.trim();
  }

  /* Zet of wist de foutmelding van een veld. Geeft true terug als het veld klopt. */
  function veldFout(veld, tekst) {
    var el = $(veld.id + '-fout');
    if (el) el.textContent = tekst || '';
    if (tekst) veld.setAttribute('aria-invalid', 'true'); else veld.removeAttribute('aria-invalid');
    return !tekst;
  }

  function groepFout(form, naam, tekst) {
    var el = $(naam + '-fout');
    if (el) el.textContent = tekst || '';
    form.elements[naam][0].closest('fieldset').setAttribute('data-invalid', tekst ? 'true' : 'false');
    return !tekst;
  }

  function focusEersteFout(form) {
    var veld = form.querySelector('[aria-invalid="true"], fieldset[data-invalid="true"] input');
    if (veld) veld.focus();
  }

  function studentenFout(veld) {
    if (veld.validity.badInput) return 'Vul een getal in, bijvoorbeeld 5.';
    var v = veld.value.trim();
    if (!v) return 'Vul in met hoeveel studenten je in huis woont.';
    if (!/^[0-9]+$/.test(v) || Number(v) < 1) return 'Vul een heel getal in van 1 of meer. Tel jezelf mee.';
    return Number(v) <= 50 ? '' : 'Vul een getal in tot en met 50.';
  }

  function vertaalFout(err) {
    var m = (err && err.message) || '';
    var code = (err && err.code) || '';
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(m)) {
      return 'Deze combinatie van e-mail of gebruikersnaam en wachtwoord kennen we niet. Check op typfouten.';
    }
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(m)) {
      return 'Je e-mailadres is nog niet bevestigd. Klik eerst op de link in de mail die we je stuurden.';
    }
    if (code === 'user_already_exists' || /already (been )?registered/i.test(m)) {
      return 'Er bestaat al een account met dit e-mailadres. Log in via het tabblad Inloggen.';
    }
    if (code === 'demo_modus') {
      return 'Inloglinks werken pas als de app aan een database gekoppeld is. Log in met een wachtwoord.';
    }
    if (code === 'otp_disabled' || /signups not allowed/i.test(m)) {
      return 'We kennen dit e-mailadres niet. Maak eerst een account aan.';
    }
    if (/rate limit|too many|security purposes/i.test(m) || /rate_limit/.test(code)) {
      return 'Even te veel pogingen achter elkaar. Probeer het over een paar minuten opnieuw.';
    }
    if (code === 'weak_password' || /password.*(least|short|weak)/i.test(m)) {
      return 'Dit wachtwoord is te kort of te makkelijk. Kies een langer wachtwoord.';
    }
    if (code === 'email_address_invalid' || /email.*invalid|invalid.*email/i.test(m)) {
      return 'Dit e-mailadres wordt niet geaccepteerd. Gebruik een ander adres.';
    }
    if (/failed to fetch|networkerror|load failed/i.test(m)) {
      return 'Geen verbinding met de database. Check je internet. Staat het Supabase-project op pauze, zet het dan weer aan in het dashboard.';
    }
    if (code === '23514') return 'Een van de waarden wordt niet geaccepteerd. Check je invoer.';
    if (/jwt|session/i.test(m)) return 'Je sessie is verlopen. Log opnieuw in.';
    return 'Er ging iets mis: ' + (m || 'onbekende fout') + '.';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDatum(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function morgen() { var d = new Date(); d.setDate(d.getDate() + 1); return isoDatum(d); }
  function datumLang(waarde) {
    if (!waarde) return '';
    var d = /^\d{4}-\d{2}-\d{2}$/.test(waarde)
      ? new Date(Number(waarde.slice(0, 4)), Number(waarde.slice(5, 7)) - 1, Number(waarde.slice(8, 10)))
      : new Date(waarde);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function toonNietGekoppeld() {
    var el = $('niet-gekoppeld');
    if (el) el.hidden = false;
  }

  /* Demo-modus: melding tonen en inloglinks verbergen (die hebben een mailserver nodig) */
  function toonDemo() {
    var el = $('demo-melding');
    if (el) el.hidden = false;
    document.querySelectorAll('.auth__alt').forEach(function (blok) { blok.hidden = true; });
  }

  /* Inloggen en account aanmaken */

  function initInloggen() {
    initTabs();
    var aanmelding = leesAanmelding();
    vulMeegenomen(aanmelding);

    if (!db) {
      toonNietGekoppeld();
      document.querySelectorAll('.tabs__panel .btn').forEach(function (b) { b.disabled = true; });
      return;
    }
    if (demo) toonDemo();

    /* Al ingelogd: direct door naar je account */
    db.auth.getSession().then(function (r) {
      if (r.data && r.data.session) window.location.replace('account.html');
    });

    var inlogForm = $('inlogformulier');
    var inlogMelding = $('inlog-melding');

    function naarEmail(invoer) {
      if (invoer.indexOf('@') !== -1) return invoer;
      var lijst = cfg.gebruikersnamen || {};
      var sleutel = invoer.toLowerCase();
      return Object.prototype.hasOwnProperty.call(lijst, sleutel) ? lijst[sleutel] : null;
    }

    inlogForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var idVeld = $('login-id');
      var pwVeld = $('login-wachtwoord');
      var knop = inlogForm.querySelector('[type="submit"]');
      melding(inlogMelding, 'info', '');

      var invoer = idVeld.value.trim();
      var email = invoer ? naarEmail(invoer) : null;
      var idTekst = '';
      if (!invoer) idTekst = 'Vul je e-mailadres of gebruikersnaam in.';
      else if (!email) idTekst = 'Deze gebruikersnaam kennen we niet. Log in met je e-mailadres.';
      else if (!emailPatroon.test(email)) idTekst = 'Dit lijkt geen geldig e-mailadres. Check even op typfouten.';
      var ok = veldFout(idVeld, idTekst);
      ok = veldFout(pwVeld, pwVeld.value ? '' : 'Vul je wachtwoord in.') && ok;
      if (!ok) { focusEersteFout(inlogForm); return; }

      bezig(knop, true, 'Bezig met inloggen…');
      db.auth.signInWithPassword({ email: email, password: pwVeld.value }).then(function (r) {
        if (r.error) {
          bezig(knop, false);
          melding(inlogMelding, 'error', vertaalFout(r.error));
          return;
        }
        window.location.href = 'account.html';
      });
    });

    $('stuur-inloglink').addEventListener('click', function () {
      var knop = this;
      var idVeld = $('login-id');
      var v = idVeld.value.trim();
      veldFout($('login-wachtwoord'), '');
      melding(inlogMelding, 'info', '');
      var tekst = '';
      if (!v) tekst = 'Vul je e-mailadres in, dan sturen we de link daarheen.';
      else if (v.indexOf('@') === -1) tekst = 'Een inloglink kan alleen naar een e-mailadres. Met een gebruikersnaam log je in met je wachtwoord.';
      else if (!emailPatroon.test(v)) tekst = 'Dit lijkt geen geldig e-mailadres. Check even op typfouten.';
      if (!veldFout(idVeld, tekst)) { idVeld.focus(); return; }

      bezig(knop, true, 'Link wordt verstuurd…');
      db.auth.signInWithOtp({
        email: v,
        options: { shouldCreateUser: false, emailRedirectTo: absoluut('account.html') }
      }).then(function (r) {
        bezig(knop, false);
        if (r.error) { melding(inlogMelding, 'error', vertaalFout(r.error)); return; }
        melding(inlogMelding, 'success', 'Check je mail. We hebben een inloglink gestuurd naar ' + v + '. De link werkt een keer.');
      });
    });

    var aanmaakForm = $('aanmaakformulier');
    aanmaakForm.addEventListener('submit', function (e) {
      e.preventDefault();
      maakAccount(true, aanmaakForm.querySelector('[type="submit"]'));
    });
    $('aanmaken-met-link').addEventListener('click', function () {
      maakAccount(false, this);
    });

    function maakAccount(metWachtwoord, knop) {
      var naamVeld = $('nieuw-naam');
      var emailVeld = $('nieuw-email');
      var pwVeld = $('nieuw-wachtwoord');
      var uitkomst = $('aanmaak-melding');
      melding(uitkomst, 'info', '');

      var naam = naamVeld.value.trim();
      var email = emailVeld.value.trim();
      var ok = veldFout(naamVeld, naam ? '' : 'Vul je naam in.');
      ok = veldFout(emailVeld, !email ? 'Vul je e-mailadres in.'
        : (emailPatroon.test(email) ? '' : 'Dit lijkt geen geldig e-mailadres. Check even op typfouten.')) && ok;
      if (metWachtwoord) {
        ok = veldFout(pwVeld, pwVeld.value.length >= 8 ? '' : 'Kies een wachtwoord van minimaal 8 tekens.') && ok;
      } else {
        veldFout(pwVeld, '');
      }
      if (!ok) { focusEersteFout(aanmaakForm); return; }

      /* Gegevens uit het aanmeldformulier gaan mee als metadata; een databasetrigger zet ze in het profiel */
      var a = leesAanmelding() || {};
      var meta = {
        naam: naam,
        postcode: a.postcode || null,
        frequentie: a.frequentie || null,
        ophaaldag: a.ophaaldag || null,
        studenten_in_huis: a.studenten_in_huis || null
      };
      var terug = absoluut('account.html');

      bezig(knop, true, 'Bezig…');
      var verzoek = metWachtwoord
        ? db.auth.signUp({ email: email, password: pwVeld.value, options: { emailRedirectTo: terug, data: meta } })
        : db.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: terug, data: meta } });

      verzoek.then(function (r) {
        bezig(knop, false);
        if (r.error) { melding(uitkomst, 'error', vertaalFout(r.error)); return; }
        wisAanmelding();
        if (metWachtwoord && r.data && r.data.session) {
          window.location.href = 'account.html';
          return;
        }
        melding(uitkomst, 'success', metWachtwoord
          ? 'Bijna klaar. We hebben een bevestigingsmail gestuurd naar ' + email + '. Klik op de link in die mail, daarna kun je inloggen.'
          : 'Check je mail. We hebben een link gestuurd naar ' + email + '. Klik erop om je account te openen.');
      });
    }
  }

  function initTabs() {
    var tabs = [$('tab-inloggen'), $('tab-aanmaken')];
    function kies(tab, focus) {
      tabs.forEach(function (t) {
        var actief = t === tab;
        t.setAttribute('aria-selected', String(actief));
        t.tabIndex = actief ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !actief;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        kies(t);
        history.replaceState(null, '', i === 1 ? '#aanmaken' : '#inloggen');
      });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          kies(tabs[1 - i], true);
        }
      });
    });
    kies(window.location.hash === '#aanmaken' ? tabs[1] : tabs[0]);
  }

  function vulMeegenomen(a) {
    if (!a) return;
    if (a.naam) $('nieuw-naam').value = a.naam;
    if (a.email) $('nieuw-email').value = a.email;
    var rijen = [
      ['Postcode', a.postcode],
      ['Hoe vaak', FREQUENTIE_LABEL[a.frequentie] || null],
      ['Ophaaldag', a.ophaaldag ? a.ophaaldag.charAt(0).toUpperCase() + a.ophaaldag.slice(1) : null],
      ['Studenten in huis', a.studenten_in_huis ? String(a.studenten_in_huis) : null]
    ].filter(function (r) { return r[1]; });
    if (!rijen.length) return;
    var lijst = $('meegenomen-lijst');
    rijen.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      lijst.appendChild(dt); lijst.appendChild(dd);
    });
    $('meegenomen').hidden = false;
  }

  /* Account */

  var gebruiker = null;
  var profiel = null;
  var bezigMetUitloggen = false;

  function initAccount() {
    if (!db) {
      toonNietGekoppeld();
      $('laden').hidden = true;
      return;
    }
    if (demo) toonDemo();

    db.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && !bezigMetUitloggen) window.location.replace('inloggen.html');
    });

    $('uitloggen').addEventListener('click', function () {
      bezigMetUitloggen = true;
      bezig(this, true, 'Uitloggen…');
      db.auth.signOut().then(function () { window.location.href = 'index.html'; });
    });

    koppelFormulieren();

    db.auth.getSession().then(function (r) {
      var sessie = r.data && r.data.session;
      if (!sessie) { window.location.replace('inloggen.html'); return null; }
      gebruiker = sessie.user;
      /* Token uit een magic link niet in de adresbalk laten staan */
      if (window.location.hash.indexOf('access_token') !== -1) history.replaceState(null, '', 'account.html');
      return laadProfiel();
    }).catch(function (err) {
      $('laden').hidden = true;
      melding($('laadfout'), 'error', 'Je account kon niet worden geladen. ' + vertaalFout(err));
    });
  }

  function laadProfiel() {
    return db.from('profiles').select('*').eq('id', gebruiker.id).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data) return r.data;
        /* Geen profiel (bijvoorbeeld een account van voor het databasescript): maak een leeg profiel */
        return db.from('profiles').insert({ id: gebruiker.id, email: gebruiker.email }).select().single()
          .then(function (r2) { if (r2.error) throw r2.error; return r2.data; });
      })
      .then(function (p) {
        profiel = p;
        vulFormulieren();
        $('laden').hidden = true;
        $('account').hidden = false;
        $('uitloggen').hidden = false;
        render();
        /* Pauze verlopen: automatisch weer actief */
        if (p.status === 'gepauzeerd' && p.gepauzeerd_tot && p.gepauzeerd_tot < isoDatum(new Date())) {
          return bewaar({ status: 'actief', gepauzeerd_tot: null });
        }
      });
  }

  function bewaar(wijzigingen) {
    return db.from('profiles').update(wijzigingen).eq('id', gebruiker.id).select().single()
      .then(function (r) {
        if (r.error) throw r.error;
        profiel = r.data;
        render();
        return r.data;
      });
  }

  function zetKeuze(form, naam, waarde) {
    Array.prototype.forEach.call(form.elements[naam], function (radio) {
      radio.checked = radio.value === waarde;
    });
  }

  function vulFormulieren() {
    var planning = $('form-planning');
    zetKeuze(planning, 'frequentie', profiel.frequentie);
    zetKeuze(planning, 'ophaaldag', profiel.ophaaldag);
    zetKeuze(planning, 'brengdag', profiel.brengdag);
    zetKeuze(planning, 'brengdagdeel', profiel.brengdagdeel);
    $('studenten').value = profiel.studenten_in_huis || '';
    $('naam').value = profiel.naam || '';
    $('straat').value = profiel.straat || '';
    $('huisnummer').value = profiel.huisnummer || '';
    $('postcode').value = profiel.postcode || '';
    $('email-weergave').textContent = gebruiker.email || profiel.email || '';
  }

  function overzichtTekst(p) {
    if (p.status === 'opgezegd') return 'Je hebt opgezegd op ' + datumLang(p.opgezegd_op) + '. We halen niets meer op.';
    if (p.status === 'gepauzeerd') return 'Je account staat op pauze tot en met ' + datumLang(p.gepauzeerd_tot) + '. Daarna halen we weer op zoals gepland.';
    if (!p.frequentie || !p.ophaaldag) return 'Je hebt nog geen planning. Kies hieronder hoe vaak en op welke dag we je was ophalen.';
    var zin = p.frequentie === 'los'
      ? 'Je hebt gekozen voor losse ophaling, op ' + p.ophaaldag
      : 'We halen je was ' + p.frequentie + ' op ' + p.ophaaldag + ' op';
    if (p.brengdag) {
      var dagdeel = { ochtend: '’s ochtends', middag: '’s middags', avond: '’s avonds' }[p.brengdagdeel];
      zin += ' en brengen hem terug op ' + p.brengdag + (dagdeel ? ' ' + dagdeel : '') + '.';
    } else {
      zin += '. Kies hieronder nog wanneer we hem terugbrengen.';
    }
    return zin;
  }

  function render() {
    var p = profiel;
    $('begroeting').textContent = p.naam ? 'Hoi ' + p.naam + '.' : 'Hoi.';

    var label = $('status-label');
    label.textContent = { actief: 'Actief', gepauzeerd: 'Gepauzeerd', opgezegd: 'Opgezegd' }[p.status] || p.status;
    label.className = 'status-pill status-pill--' + p.status;

    $('overzicht').textContent = overzichtTekst(p);
    $('overzicht-los').hidden = !(p.status === 'actief' && p.frequentie === 'los');

    var ontbreekt = [];
    if (!p.straat || !p.huisnummer || !p.postcode) ontbreekt.push('je adres');
    if (!p.frequentie || !p.ophaaldag || !p.brengdag || !p.brengdagdeel) ontbreekt.push('je planning');
    if (!p.studenten_in_huis) ontbreekt.push('het aantal studenten in huis');
    var ontbreektEl = $('ontbreekt');
    if (ontbreekt.length && p.status !== 'opgezegd') {
      var laatste = ontbreekt.pop();
      melding(ontbreektEl, 'info', 'Nog in te vullen: ' + (ontbreekt.length ? ontbreekt.join(', ') + ' en ' + laatste : laatste) + '.');
    } else {
      ontbreektEl.hidden = true;
    }

    $('blok-actief').hidden = p.status !== 'actief';
    $('blok-gepauzeerd').hidden = p.status !== 'gepauzeerd';
    $('blok-opgezegd').hidden = p.status !== 'opgezegd';
    $('tekst-gepauzeerd').textContent = p.status === 'gepauzeerd' ? 'Gepauzeerd tot en met ' + datumLang(p.gepauzeerd_tot) + '.' : '';
    $('tekst-opgezegd').textContent = p.status === 'opgezegd' ? 'Opgezegd op ' + datumLang(p.opgezegd_op) + '.' : '';
    $('pauze-tot').min = morgen();
  }

  /* Opslaan met een zichtbare uitkomst naast de knop. Geeft true terug als het gelukt is. */
  function opslaan(knop, statusEl, wijzigingen, succesTekst) {
    bezig(knop, true, 'Opslaan…');
    statusEl.textContent = '';
    return bewaar(wijzigingen).then(function () {
      statusEl.className = 'save-status save-status--ok';
      statusEl.textContent = succesTekst || 'Opgeslagen.';
      return true;
    }, function (err) {
      statusEl.className = 'save-status save-status--fout';
      statusEl.textContent = 'Niet opgeslagen. ' + vertaalFout(err);
      return false;
    }).then(function (gelukt) { bezig(knop, false); return gelukt; });
  }

  function koppelFormulieren() {
    var planning = $('form-planning');
    ['frequentie', 'ophaaldag', 'brengdag', 'brengdagdeel'].forEach(function (naam) {
      Array.prototype.forEach.call(planning.elements[naam], function (radio) {
        radio.addEventListener('change', function () { groepFout(planning, naam, ''); });
      });
    });
    planning.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = planning.elements;
      var ok = groepFout(planning, 'frequentie', el.frequentie.value ? '' : 'Kies hoe vaak we ophalen.');
      ok = groepFout(planning, 'ophaaldag', el.ophaaldag.value ? '' : 'Kies een ophaaldag.') && ok;
      ok = groepFout(planning, 'brengdag', el.brengdag.value ? '' : 'Kies een dag waarop we terugbrengen.') && ok;
      ok = groepFout(planning, 'brengdagdeel', el.brengdagdeel.value ? '' : 'Kies een dagdeel.') && ok;
      if (!ok) { focusEersteFout(planning); return; }
      opslaan(planning.querySelector('[type="submit"]'), $('planning-status'), {
        frequentie: el.frequentie.value,
        ophaaldag: el.ophaaldag.value,
        brengdag: el.brengdag.value,
        brengdagdeel: el.brengdagdeel.value
      }, 'Planning opgeslagen.');
    });

    var huis = $('form-huis');
    huis.addEventListener('submit', function (e) {
      e.preventDefault();
      var veld = $('studenten');
      if (!veldFout(veld, studentenFout(veld))) { veld.focus(); return; }
      opslaan(huis.querySelector('[type="submit"]'), $('huis-status'), { studenten_in_huis: Number(veld.value) });
    });

    var gegevens = $('form-gegevens');
    $('postcode').addEventListener('blur', function () { this.value = formatPostcode(this.value); });
    gegevens.addEventListener('submit', function (e) {
      e.preventDefault();
      var naam = $('naam'), straat = $('straat'), nr = $('huisnummer'), pc = $('postcode');
      pc.value = formatPostcode(pc.value);
      var ok = veldFout(naam, naam.value.trim() ? '' : 'Vul je naam in.');
      ok = veldFout(straat, '') && ok;
      ok = veldFout(nr, !nr.value.trim() || huisnummerPatroon.test(nr.value.trim()) ? '' : 'Vul een huisnummer in zoals 12, 12a of 12-2.') && ok;
      ok = veldFout(pc, !pc.value || /^[1-9][0-9]{3} [A-Z]{2}$/.test(pc.value) ? '' : 'Dit is geen geldige postcode. Gebruik vier cijfers en twee letters, zoals 9742 AB.') && ok;
      if (!ok) { focusEersteFout(gegevens); return; }
      opslaan(gegevens.querySelector('[type="submit"]'), $('gegevens-status'), {
        naam: naam.value.trim(),
        straat: straat.value.trim() || null,
        huisnummer: nr.value.trim() || null,
        postcode: pc.value || null
      }, 'Gegevens opgeslagen.');
    });

    var statusMelding = $('status-melding');

    var pauze = $('form-pauze');
    pauze.addEventListener('submit', function (e) {
      e.preventDefault();
      var veld = $('pauze-tot');
      var v = veld.value;
      var tekst = !v ? 'Kies tot en met welke datum je wilt pauzeren.' : (v < morgen() ? 'Kies een datum vanaf morgen.' : '');
      if (!veldFout(veld, tekst)) { veld.focus(); return; }
      opslaan(pauze.querySelector('[type="submit"]'), statusMelding, { status: 'gepauzeerd', gepauzeerd_tot: v },
        'Gepauzeerd. We halen niets op tot en met ' + datumLang(v) + '.').then(function (gelukt) { if (gelukt) veld.value = ''; });
    });

    $('hervatten').addEventListener('click', function () {
      opslaan(this, statusMelding, { status: 'actief', gepauzeerd_tot: null }, 'Hervat. We halen weer op zoals gepland.');
    });

    var bevestig = $('bevestig-opzeggen');
    $('opzeggen').addEventListener('click', function () {
      bevestig.hidden = false;
      $('bevestig-titel').focus();
    });
    $('bevestig-nee').addEventListener('click', function () {
      bevestig.hidden = true;
      $('opzeggen').focus();
    });
    $('bevestig-ja').addEventListener('click', function () {
      opslaan(this, statusMelding, { status: 'opgezegd', opgezegd_op: new Date().toISOString(), gepauzeerd_tot: null },
        'Opgezegd. Jammer dat je gaat.').then(function (gelukt) { if (gelukt) bevestig.hidden = true; });
    });

    $('heropenen').addEventListener('click', function () {
      opslaan(this, statusMelding, { status: 'actief', opgezegd_op: null }, 'Welkom terug. Je account is weer actief.');
    });
  }

  if (pagina === 'inloggen') initInloggen();
  else if (pagina === 'account') initAccount();
})();
