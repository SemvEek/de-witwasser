/* De Witwasser, landingspagina */
(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Veercurve uit styles.css hergebruiken voor animaties vanuit JS */
  var css = getComputedStyle(root);
  var spring = {
    easing: css.getPropertyValue('--spring').trim() || 'cubic-bezier(0.25, 1, 0.5, 1)',
    duration: parseFloat(css.getPropertyValue('--spring-duration')) || 515
  };

  /* iOS Safari activeert :active pas met een touchstart-listener.
     Zo reageren knoppen direct op aanraken in plaats van bij loslaten. */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* Schaduw onder de header pas tonen als er content onder schuift */
  var header = document.querySelector('.site-header');
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 4);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Aanmeldformulier */
  var form = document.getElementById('aanmeldformulier');
  var success = document.getElementById('aanmelding-gelukt');
  var again = document.getElementById('nog-een');
  if (!form) return;

  var postcodePattern = /^[1-9][0-9]{3}\s?[a-zA-Z]{2}$/;
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    naam: function (f) {
      return f.value.trim() ? '' : 'Vul je naam in.';
    },
    email: function (f) {
      var v = f.value.trim();
      if (!v) return 'Vul je e-mailadres in.';
      return emailPattern.test(v) ? '' : 'Dit lijkt geen geldig e-mailadres. Check even op typfouten.';
    },
    postcode: function (f) {
      var v = f.value.trim();
      if (!v) return 'Vul je postcode in, bijvoorbeeld 9742 AB.';
      return postcodePattern.test(v) ? '' : 'Dit is geen geldige postcode. Gebruik vier cijfers en twee letters, zoals 9742 AB.';
    },
    frequentie: function () {
      return form.querySelector('input[name="frequentie"]:checked') ? '' : 'Kies hoe vaak je het zou gebruiken.';
    },
    toestemming: function (f) {
      return f.checked ? '' : 'Zonder je toestemming kunnen we je niet mailen.';
    }
  };

  function errorEl(name) {
    return document.getElementById(name + '-fout');
  }

  function validate(name) {
    var field = form.elements[name];
    var message = rules[name](field);
    errorEl(name).textContent = message;
    if (name === 'frequentie') {
      form.querySelector('fieldset').setAttribute('data-invalid', message ? 'true' : 'false');
    } else if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
    return !message;
  }

  function formatPostcode(v) {
    var compact = v.replace(/\s+/g, '').toUpperCase();
    return /^[1-9][0-9]{3}[A-Z]{2}$/.test(compact) ? compact.slice(0, 4) + ' ' + compact.slice(4) : v.trim();
  }

  /* Inline valideren: bij verlaten van een veld, en direct opnieuw zodra een fout is hersteld */
  ['naam', 'email', 'postcode', 'toestemming'].forEach(function (name) {
    var field = form.elements[name];
    field.addEventListener('blur', function () {
      if (name === 'postcode') field.value = formatPostcode(field.value);
      if (name !== 'toestemming' && !field.value.trim()) return;
      validate(name);
    });
    field.addEventListener(name === 'toestemming' ? 'change' : 'input', function () {
      if (field.getAttribute('aria-invalid') === 'true') validate(name);
    });
  });
  form.querySelectorAll('input[name="frequentie"]').forEach(function (radio) {
    radio.addEventListener('change', function () { validate('frequentie'); });
  });

  function animateIn(el) {
    if (!el.animate) return;
    if (reducedMotion.matches) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      return;
    }
    el.animate(
      [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: spring.duration, easing: spring.easing }
    );
  }

  function swap(from, to, afterSwap) {
    function done() {
      from.hidden = true;
      to.hidden = false;
      animateIn(to);
      if (afterSwap) afterSwap();
    }
    if (!from.animate) return done();
    var out = from.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' });
    out.onfinish = done;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    form.elements.postcode.value = formatPostcode(form.elements.postcode.value);

    var order = ['naam', 'email', 'postcode', 'frequentie', 'toestemming'];
    var firstInvalid = null;
    order.forEach(function (name) {
      if (!validate(name) && !firstInvalid) firstInvalid = name;
    });
    if (firstInvalid) {
      var target = firstInvalid === 'frequentie'
        ? form.querySelector('input[name="frequentie"]')
        : form.elements[firstInvalid];
      target.focus();
      return;
    }

    var data = {
      naam: form.elements.naam.value.trim(),
      email: form.elements.email.value.trim(),
      postcode: form.elements.postcode.value,
      frequentie: form.querySelector('input[name="frequentie"]:checked').value,
      huisgenoten: form.elements.huisgenoten.value,
      toestemming: form.elements.toestemming.checked,
      aangemeldOp: new Date().toISOString()
    };
    /* Geen backend: de aanmelding wordt alleen gelogd */
    console.log('Nieuwe aanmelding De Witwasser:', data);

    success.querySelector('[data-naam]').textContent = ', ' + data.naam;
    swap(form, success, function () {
      success.querySelector('.success__title').focus();
    });
  });

  again.addEventListener('click', function () {
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); });
    form.querySelector('fieldset').removeAttribute('data-invalid');
    form.querySelectorAll('.field__error').forEach(function (e) { e.textContent = ''; });
    swap(success, form, function () {
      form.elements.naam.focus();
    });
  });
})();
