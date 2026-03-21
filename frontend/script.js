/**
 * BJ30 COMPARADOR — script.js
 * ════════════════════════════════════════════════════
 * SETUP (3 pasos):
 *   1. Reemplazá CONFIG.SUPABASE_URL con tu Project URL
 *   2. Reemplazá CONFIG.SUPABASE_KEY con tu anon/public key
 *   3. Reemplazá CONFIG.WA_NUMBER con tu número (con código de país, sin +)
 */


// ════════════════════════════════════════════════════
// CONFIG — único lugar donde tocar credenciales
// ════════════════════════════════════════════════════
const CONFIG = {
  SUPABASE_URL: 'https://TU_PROJECT.supabase.co',  // ← REEMPLAZAR
  SUPABASE_KEY: 'TU_ANON_PUBLIC_KEY',              // ← REEMPLAZAR
  WA_NUMBER:    '5491100000000',                   // ← REEMPLAZAR (sin +)
};


// ════════════════════════════════════════════════════
// SUPABASE — fetch nativo, sin dependencias externas
// ════════════════════════════════════════════════════

async function saveLead(lead) {
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/leads`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(lead),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn('[Supabase] Error al guardar:', errBody);
      return { ok: false, error: errBody.message || `HTTP ${res.status}` };
    }

    console.info('[Supabase] Lead guardado ✓');
    return { ok: true, error: null };

  } catch (err) {
    console.warn('[Supabase] Error de red:', err.message);
    return { ok: false, error: err.message };
  }
}


// ════════════════════════════════════════════════════
// WHATSAPP — mensaje dinámico con datos del usuario
// ════════════════════════════════════════════════════

const TIPO_MAP = {
  financiado:       'financiado en pesos',
  contado:          'contado / dólares',
  usado_parte_pago: 'entrego mi auto como parte de pago',
  leasing:          'leasing / empresa',
};

const VERSION_MAP = {
  '4x2':  'BJ30 4×2',
  '4x4':  'BJ30 4×4',
  'no_se': 'sin definir todavía',
};

const MOMENTO_MAP = {
  ahora:      '🔥 Quiero comprar ahora',
  '1_3_meses': '📅 En los próximos 1–3 meses',
  explorando:  '🔍 Estoy explorando opciones',
};

function buildWhatsAppURL(nombre, tipo_compra, version, momento_compra) {
  const tipo    = TIPO_MAP[tipo_compra]      || tipo_compra;
  const ver     = VERSION_MAP[version]       || 'sin especificar';
  const momento = MOMENTO_MAP[momento_compra]|| momento_compra;

  const lines = [
    '¡Hola! Quiero recibir la mejor oferta del *BAIC BJ30* 🤖',
    '',
    `👤 *Nombre:* ${nombre}`,
    `🚗 *Versión:* ${ver}`,
    `💳 *Forma de pago:* ${tipo}`,
    `⏱ *Momento de compra:* ${momento}`,
    '',
    'Por favor enviarme la comparativa actualizada.',
  ];

  return `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}


// ════════════════════════════════════════════════════
// VALIDACIÓN
// ════════════════════════════════════════════════════

function validateForm(form) {
  const errors = {};

  const nombre   = form.nombre.value.trim();
  const telefono = form.telefono.value.trim().replace(/\D/g, '');
  const tipo     = form.tipo_compra.value;
  const momento  = form.momento_compra ? form.momento_compra.value : null;

  if (!nombre || nombre.length < 2) {
    errors.nombre = 'Ingresá tu nombre (mínimo 2 caracteres)';
  }

  if (!telefono || telefono.length < 8 || telefono.length > 15) {
    errors.telefono = 'Ingresá un número de WhatsApp válido (solo dígitos)';
  }

  if (!tipo) {
    errors.tipo_compra = 'Seleccioná cómo querés comprarlo';
  }

  if (!momento) {
    errors.momento_compra = 'Seleccioná cuándo pensás comprar';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function showFieldErrors(form, errors) {
  clearFieldErrors(form);

  for (const [field, msg] of Object.entries(errors)) {
    if (field === 'momento_compra') {
      const group = form.querySelector('.radio-group');
      if (group) {
        group.classList.add('error');
        _appendError(group.parentElement, msg);
      }
      continue;
    }

    const input = form.elements[field];
    if (!input) continue;
    input.classList.add('error');
    _appendError(input.parentElement, msg);
  }
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach(el => el.remove());
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function _appendError(parent, msg) {
  const span = document.createElement('span');
  span.className = 'field-error';
  span.style.cssText = 'font-size:12px;color:#f87171;margin-top:4px;display:block;font-weight:500';
  span.textContent = msg;
  parent.appendChild(span);
}


// ════════════════════════════════════════════════════
// ESTADO DEL BOTÓN DE ENVÍO
// ════════════════════════════════════════════════════

const BTN_LABELS = {
  loading: 'Analizando opciones...',
  success: 'Abriendo WhatsApp...',
  idle:    'Recibir mejor opción ahora',
};

function setSubmitState(btn, textEl, state) {
  const isLoading = state === 'loading';
  btn.classList.toggle('loading', isLoading);
  btn.disabled = isLoading;
  textEl.textContent = BTN_LABELS[state] || BTN_LABELS.idle;
}


// ════════════════════════════════════════════════════
// MANEJO DEL FORMULARIO
// ════════════════════════════════════════════════════

async function handleFormSubmit(e) {
  e.preventDefault();

  const form      = e.target;
  const submitBtn = document.getElementById('submitBtn');
  const submitTxt = document.getElementById('submitText');
  const statusEl  = document.getElementById('formStatus');

  clearFieldErrors(form);
  statusEl.className   = 'form-status';
  statusEl.textContent = '';

  const { valid, errors } = validateForm(form);
  if (!valid) {
    showFieldErrors(form, errors);
    const firstError = form.querySelector('.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const nombre         = form.nombre.value.trim();
  const telefono       = form.telefono.value.trim().replace(/\D/g, '');
  const tipo_compra    = form.tipo_compra.value;
  const version        = form.version.value || 'no_se';
  const momento_compra = form.momento_compra.value;

  const lead = {
    nombre,
    telefono,
    interes:      'BAIC BJ30',
    tipo_compra,
    version,
    momento_compra,
    utm_source:   getParam('utm_source'),
    utm_medium:   getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
  };

  setSubmitState(submitBtn, submitTxt, 'loading');

  const { ok } = await saveLead(lead);
  if (!ok) saveLeadLocalFallback(lead);

  setSubmitState(submitBtn, submitTxt, 'success');

  statusEl.className   = 'form-status success';
  statusEl.textContent = '✅ ¡Listo! Abrimos WhatsApp con tu recomendación...';

  const waURL = buildWhatsAppURL(nombre, tipo_compra, version, momento_compra);

  setTimeout(() => {
    window.open(waURL, '_blank', 'noopener,noreferrer');
    setSubmitState(submitBtn, submitTxt, 'idle');
  }, 700);
}


// ════════════════════════════════════════════════════
// FALLBACK localStorage
// ════════════════════════════════════════════════════

function saveLeadLocalFallback(lead) {
  try {
    const queue = JSON.parse(localStorage.getItem('bj30_leads_queue') || '[]');
    queue.push({ ...lead, _fallback_at: new Date().toISOString() });
    localStorage.setItem('bj30_leads_queue', JSON.stringify(queue));
    console.info('[Fallback] Lead en localStorage. Cola:', queue.length);
  } catch (_) {}
}


// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key) || null;
}

function trackEvent(event, params = {}) {
  try {
    if (typeof gtag === 'function') gtag('event', event, params);
    if (typeof fbq  === 'function') fbq('track', event, params);
  } catch (_) {}
}


// ════════════════════════════════════════════════════
// SCROLL SUAVE
// ════════════════════════════════════════════════════

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id     = this.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (id === 'formulario') {
        setTimeout(() => {
          const first = target.querySelector('input:not([type="radio"]), select');
          if (first) first.focus();
        }, 600);
      }
    });
  });
}


// ════════════════════════════════════════════════════
// BOTÓN FLOTANTE WHATSAPP
// ════════════════════════════════════════════════════

function initFloatingWA() {
  const floatBtn = document.getElementById('waFloat');
  if (!floatBtn) return;

  const directURL = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent('Hola! Quiero recibir la mejor oferta del BAIC BJ30 🤖')}`;

  floatBtn.addEventListener('click', (e) => {
    if (window.scrollY > 400) {
      e.preventDefault();
      window.open(directURL, '_blank', 'noopener,noreferrer');
      trackEvent('floating_wa_click');
    }
  });
}


// ════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      await handleFormSubmit(e);
      trackEvent('generate_lead', { method: 'whatsapp', content_name: 'BAIC BJ30' });
    });

    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => {
        el.classList.remove('error');
        const errEl = el.parentNode.querySelector('.field-error');
        if (errEl) errEl.remove();
      });
    });

    form.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const group = form.querySelector('.radio-group');
        if (group) group.classList.remove('error');
        const errEl = group?.parentElement?.querySelector('.field-error');
        if (errEl) errEl.remove();
      });
    });
  }

  initSmoothScroll();
  initFloatingWA();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting) trackEvent('section_view', { section: target.id });
    });
  }, { threshold: 0.35 });

  ['autoridad', 'como-funciona', 'beneficios', 'asistente', 'cta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

});


