// ---------------------------------------------------------------------
// SMOKE TEST DE CONECTA IMPORTA
// ---------------------------------------------------------------------
// Recorre automáticamente la plataforma (landing, wizard Camino A y B,
// calculadora, portal de representante, accesibilidad, breakpoints) sin
// depender de internet real: reemplaza window.supabase por una versión de
// mentira que responde con datos de prueba fijos (ver MOCK_REPS /
// MOCK_PRODUCTS abajo), así se puede correr offline y sin representantes
// reales ni conexión a Supabase.
//
// Cómo correrlo:
//   1. Desde la carpeta del proyecto: python3 -m http.server 8791
//   2. En otra terminal: node tests/smoke-test.js
//
// No prueba lo que SÍ necesita internet real: login/registro reales,
// el chat de soporte y la clasificación por imagen (esas dependen de
// las Edge Functions y Anthropic) — para esas partes, pruébalas a mano
// en el sitio publicado.
// ---------------------------------------------------------------------

const { chromium } = require('playwright-core');

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:8791/index.html';
const CHROME_PATH = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const EXPECTED_OFFLINE_NOISE = [
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_CONNECTION_RESET',
  'No se pudo cargar la librería de Supabase',
  '404 (File not found)',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_INTERNET_DISCONNECTED'
];

const MOCK_REPS = [
  { id:'rep-1', profile_id:'p-1', business_name:'Aduanas Rápidas SAS', rep_type:'agencia_aduanas', categories:['Electrónica / tecnología'], available:true, min_order_usd:0, commission_type:'pct', commission_value:3, rating:4.8, operations_count:34, bank_entity:'Bancolombia', bank_account_type:'Ahorros', bank_last4:'1234', verification_status:{identidad:true,licencia:true} },
  { id:'rep-2', profile_id:'p-2', business_name:'Sourcing Global', rep_type:'agente_sourcing', categories:['Textil / confección'], available:true, min_order_usd:500, commission_type:'pct', commission_value:5, rating:4.5, operations_count:12, bank_entity:'Davivienda', bank_account_type:'Corriente', bank_last4:'5678', verification_status:{identidad:true} },
  { id:'rep-3', profile_id:'p-3', business_name:'Carga Directa', rep_type:'agente_carga', categories:['Hogar / ferretería'], available:true, min_order_usd:0, commission_type:'flat', commission_value:80, rating:4.2, operations_count:9, bank_entity:'BBVA', bank_account_type:'Ahorros', bank_last4:'9012', verification_status:{identidad:true} },
  { id:'rep-4', profile_id:'p-4', business_name:'Trading Bogotá', rep_type:'trading_company', categories:['Maquinaria / equipos industriales'], available:true, min_order_usd:0, commission_type:'pct', commission_value:8, rating:4.9, operations_count:50, bank_entity:'Bancolombia', bank_account_type:'Corriente', bank_last4:'3456', verification_status:{identidad:true,licencia:true,antecedentes:true,humana:true} },
  // Sin "identidad" verificada — regresión: NO debe aparecer en el marketplace.
  { id:'rep-5', profile_id:'p-5', business_name:'Recién Registrado SAS', rep_type:'agente_sourcing', categories:['General'], available:true, min_order_usd:0, commission_type:'pct', commission_value:5, rating:0, operations_count:0, verification_status:{} }
];
const MOCK_PRODUCTS = [
  { id:'prod-1', representative_id:'rep-4', name:'Taladro industrial 20V', description:'Ya nacionalizado', price_usd:145, unit:'unidad', stock:20, active:true, representatives:{ id:'rep-4', business_name:'Trading Bogotá', rating:4.9, available:true, verification_status:{identidad:true} } }
];

let passed = 0, failed = 0;
const failures = [];
function check(name, condition){
  if(condition){ passed++; }
  else { failed++; failures.push(name); console.log(`  ✗ FALLÓ: ${name}`); }
}

// Este entorno de pruebas no tiene internet real hacia ningún dominio, ni
// siquiera el CDN de jsdelivr que sirve la librería de Supabase — así que
// interceptar solo las llamadas REST no alcanza: la librería `window.supabase`
// nunca llega a existir, y supabaseClient.js la deja en null. En vez de eso,
// se inyecta un `window.supabase.createClient()` de mentira ANTES de que
// cargue la página, que responde con los datos de prueba de arriba sin tocar
// la red — así toda la lógica de la app (que si corre en el navegador real)
// se puede probar igual.
function fakeSupabaseInitScript(){
  return `
    window.__MOCK_REPS__ = ${JSON.stringify(MOCK_REPS)};
    window.__MOCK_PRODUCTS__ = ${JSON.stringify(MOCK_PRODUCTS)};
    window.supabase = {
      createClient(){
        function makeQuery(table){
          let isInsert = false, insertPayload = null;
          const fixtureFor = (t) => t === 'representatives' ? window.__MOCK_REPS__
            : t === 'products' ? window.__MOCK_PRODUCTS__ : [];
          const q = {
            select(){ return q; }, eq(){ return q; }, order(){ return q; },
            limit(){ return q; }, gte(){ return q; },
            insert(payload){ isInsert = true; insertPayload = Array.isArray(payload) ? payload[0] : payload; return q; },
            maybeSingle(){ return resolveOne(); },
            single(){ return resolveOne(); },
            then(resolve){
              const data = isInsert ? [{ id:'fake-'+table+'-id', folio:'SOL-9999', ...insertPayload }] : fixtureFor(table);
              resolve({ data, error:null, count:(data||[]).length });
            }
          };
          function resolveOne(){
            const data = isInsert ? { id:'fake-'+table+'-id', folio:'SOL-9999', ...insertPayload } : (fixtureFor(table)[0] || null);
            return Promise.resolve({ data, error:null });
          }
          return q;
        }
        return {
          from(table){ return makeQuery(table); },
          rpc(fnName, params){
            // Las transiciones de estado (accept/respond/reject_quote_request)
            // pasan por funciones de Postgres, no por .update() directo — acá
            // solo se confirma que la llamada no truena, sin backend real.
            return Promise.resolve({ data:null, error:null, __mock_rpc__:fnName, __mock_params__:params });
          },
          auth: {
            getSession: async () => ({ data:{ session:null } }),
            signInAnonymously: async () => ({ data:{ session:{ user:{ id:'fake-anon-id', is_anonymous:true } } }, error:null }),
            signInWithPassword: async () => ({ data:{ session:null }, error:{ message:'mock: sin auth real en pruebas offline' } }),
            signUp: async () => ({ data:{ session:null }, error:{ message:'mock: sin auth real en pruebas offline' } }),
            signOut: async () => ({}),
            updateUser: async () => ({ error:null })
          },
          functions: { invoke: async () => ({ data:null, error:{ message:'mock: Edge Functions no disponibles en pruebas offline' } }) }
        };
      }
    };
  `;
}
async function mockSupabase(page){
  await page.addInitScript(fakeSupabaseInitScript());
}

function newErrorCollector(page){
  const errors = [];
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  return {
    unexpected: () => errors.filter(e => !EXPECTED_OFFLINE_NOISE.some(n => e.includes(n)))
  };
}

async function run(){
  const browser = await chromium.launch({ executablePath: CHROME_PATH });

  // ---------------- A. LANDING ----------------
  console.log('A. Landing page');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    const errs = newErrorCollector(page);
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });

    check('A1 sin scroll horizontal en 390px', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    check('A2 header móvil visible, nav de escritorio oculto', await page.evaluate(() => getComputedStyle(document.querySelector('.mobile-header-actions')).display !== 'none' && getComputedStyle(document.querySelector('.landing-nav')).display === 'none'));
    check('A3 hero title, subtítulo y CTA presentes', await page.evaluate(() => !!document.querySelector('.hero-title') && !!document.querySelector('.hero-sub') && !!document.querySelector('.hero-cta-primary')));
    check('A4 no dice "desde Colombia"', !(await page.evaluate(() => document.querySelector('.hero-title').textContent.includes('desde Colombia'))));

    // Chat widget abre/cierra y devuelve el foco
    await page.click('#chatFab');
    check('A5 panel de chat visible tras clic', await page.evaluate(() => !document.getElementById('supportChatPanel').hidden));
    check('A6 foco entra al input del chat', await page.evaluate(() => document.activeElement && document.activeElement.id === 'supportChatInput'));
    await page.click('.chat-panel-close');
    check('A7 panel de chat oculto tras cerrar', await page.evaluate(() => document.getElementById('supportChatPanel').hidden));

    check('A8 sin errores de consola inesperados', errs.unexpected().length === 0);
    await page.close();
  }

  // ---------------- B. HEADER RESPONSIVE (regresión) ----------------
  console.log('B. Header responsive por breakpoint');
  for(const width of [320, 768, 1024, 1440]){
    const page = await browser.newPage({ viewport:{ width, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    const isDesktop = width >= 1024;
    const navVisible = await page.evaluate(() => getComputedStyle(document.querySelector('.landing-nav')).display !== 'none');
    const mobileVisible = await page.evaluate(() => getComputedStyle(document.querySelector('.mobile-header-actions')).display !== 'none');
    const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    check(`B ${width}px: nav escritorio ${isDesktop?'visible':'oculto'}`, navVisible === isDesktop);
    check(`B ${width}px: header móvil ${isDesktop?'oculto':'visible'}`, mobileVisible === !isDesktop);
    check(`B ${width}px: sin scroll horizontal`, noHScroll);
    await page.close();
  }

  // ---------------- C. NAVEGACIÓN AL WIZARD Y BOTÓN DE INICIO ----------------
  console.log('C. Entrar al wizard y volver al inicio');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('.hero-cta-primary');
    await page.waitForTimeout(200);
    check('C1 appShell visible tras "Quiero importar"', await page.evaluate(() => getComputedStyle(document.getElementById('appShell')).display !== 'none'));
    check('C2 botón de inicio del wizard es visible y con texto', (await page.$eval('.wizard-home-btn', el => el.textContent)).includes('inicio'));
    await page.click('.wizard-home-btn');
    await page.waitForTimeout(200);
    check('C3 vuelve al landing tras tocar el botón de inicio', await page.evaluate(() => getComputedStyle(document.getElementById('landingScreen')).display !== 'none'));
    await page.close();
  }

  // ---------------- D. LÓGICA CAMINO A / B (funciones puras) ----------------
  console.log('D. Lógica de decisión Camino A/B');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('.hero-cta-primary');
    await page.waitForTimeout(200);

    const cases = [
      ['sinRutNoQuiere', 'B'],
      ['sinRutDispuesto', 'ambos'],
      ['conRutImportador', 'A'],
      ['empresaImporta', 'A']
    ];
    for(const [status, expected] of cases){
      const result = await page.evaluate((s) => { state.status = s; return decideCamino(); }, status);
      check(`D decideCamino('${status}') === '${expected}'`, result === expected);
    }

    // Regresión: Camino B + ya tiene proveedor debe aclarar lo del catálogo,
    // no solo decir "revisa el catálogo" a secas.
    await page.evaluate(() => {
      state.status = 'sinRutNoQuiere';
      state.hasSupplier = 'yes';
      $('p_cat').value = 'Repuestos / autopartes';
      $('p_freq').selectedIndex = 0;
      $('p_value').selectedIndex = 0;
      renderProfileResult();
    });
    const resultHtml = await page.$eval('#profileResult', el => el.innerHTML);
    check('D regresión: nota de "ya tienes proveedor" aparece en Camino B', resultHtml.includes('proveedor identificado'));

    await page.close();
  }

  // ---------------- E. STEP 2 (SOCIOS) CON REPRESENTANTES DE PRUEBA ----------------
  console.log('E. Step 2: representantes de prueba');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('.hero-cta-primary');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      state.status = 'conRutImportador';
      state.hasSupplier = 'yes';
    });
    await page.evaluate(() => continueFromProfile('A'));
    await page.waitForTimeout(400);

    const repCount = await page.evaluate(() => allReps.length);
    check('E1 se cargaron los 4 representantes verificados de prueba', repCount === 4);
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('#repList .card, #repList [data-rep-id], #repList .rep-card').length > 0 || document.getElementById('repList').innerHTML.includes('Aduanas Rápidas'));
    check('E2 las tarjetas de representante se ven en pantalla', cardsRendered);
    const unverifiedHidden = await page.evaluate(() => !allReps.some(r => r.id === 'rep-5'));
    check('E3 regresión: representante sin identidad verificada NO aparece', unverifiedHidden);
    await page.close();
  }

  // ---------------- F. CALCULADORA: UN PRODUCTO Y VARIAS REFERENCIAS ----------------
  console.log('F. Calculadora de cotización preliminar');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('.hero-cta-primary');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      state.status = 'conRutImportador';
      state.hasSupplier = 'yes';
    });
    await page.evaluate(() => continueFromProfile('A'));
    await page.waitForTimeout(300);
    await page.evaluate(() => chooseRep('rep-1'));
    await page.waitForTimeout(200);

    check('F1 llegó a la pantalla de cotización (paso 3)', await page.evaluate(() => document.querySelector('.screen[data-screen="2"]').classList.contains('active')));

    // Un solo producto: FOB=1000, qty=100 -> costo/u debe ser mayor al FOB/u (por flete+aduana+comisión)
    await page.evaluate(() => {
      $('q_fob').value = 1000; $('q_qty').value = 100; $('q_weight').value = 300; $('q_cbm').value = 1; $('q_boxes').value = 10;
      state.mode = 'LCL'; state.incoterm = 'FOB'; state.verif = 'none';
      generateQuote();
    });
    const q1 = await page.evaluate(() => state.lastQuote);
    check('F2 total > FOB (se sumó flete/aduana/comisión)', q1.total > q1.fob);
    check('F3 costo por unidad se muestra en el resultado', (await page.$eval('#quoteResult', el => el.innerHTML)).includes('Costo por unidad'));

    // Varias referencias: 2 líneas con precios distintos
    await page.evaluate(() => { addRefLine(); addRefLine(); });
    await page.evaluate(() => {
      updateRefLine(0, 'name', 'Filtros de aceite'); updateRefLine(0, 'qty', 100); updateRefLine(0, 'unitFob', 2);
      updateRefLine(1, 'name', 'Pastillas de freno'); updateRefLine(1, 'qty', 50); updateRefLine(1, 'unitFob', 10);
    });
    const summedFob = await page.$eval('#q_fob', el => parseFloat(el.value));
    check('F4 FOB se suma automáticamente (200+500=700)', Math.abs(summedFob - 700) < 0.01);
    await page.evaluate(() => { $('quoteRepName').textContent = 'Rep de prueba'; generateQuote(); });
    const resultHtml2 = await page.$eval('#quoteResult', el => el.innerHTML);
    check('F5 desglose por referencia aparece con ambos nombres', resultHtml2.includes('Filtros de aceite') && resultHtml2.includes('Pastillas de freno'));

    await page.close();
  }

  // ---------------- G. SUBMIT DE COTIZACIÓN (mock insert) ----------------
  console.log('G. Envío de solicitud al representante');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    const errs = newErrorCollector(page);
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('.hero-cta-primary');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      state.status = 'conRutImportador';
      state.hasSupplier = 'yes';
      state.contactEmail = 'demo@conectaimporta.test';
    });
    await page.evaluate(() => continueFromProfile('A'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      chooseRep('rep-1');
      $('q_fob').value = 1000; $('q_qty').value = 100; $('q_weight').value = 300; $('q_cbm').value = 1; $('q_boxes').value = 10;
      state.mode = 'LCL'; state.incoterm = 'FOB'; state.verif = 'none';
      generateQuote();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => sendToRepForConfirmation());
    await page.waitForTimeout(400);
    check('G1 sin crash al enviar la solicitud (queda folio o pantalla de espera)', !!(await page.evaluate(() => state.requestId || document.getElementById('quoteResult').innerHTML.length > 0)));
    check('G2 sin errores de consola inesperados al enviar', errs.unexpected().length === 0);
    await page.close();
  }

  // ---------------- H. PORTAL DEL REPRESENTANTE (regresión de seguridad) ----------------
  console.log('H. Portal del representante');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.evaluate(() => {
      state.repVerifType = 'agencia_aduanas';
      state.repVerifStatus = { identidad:true };
      goToRepPortal();
      showRepPortalContent();
      renderRepVerificationChecklist();
    });
    await page.waitForTimeout(200);
    const verifHtml = await page.$eval('#repVerifBox', el => el.innerHTML).catch(() => '');
    check('H1 NO existe el botón de auto-verificación (regresión de seguridad)', !verifHtml.includes('simulateVerifStep') && !verifHtml.includes('Avanzar siguiente paso'));
    check('H2 el checklist explica que la verificación la hace el equipo', verifHtml.includes('revisa el equipo'));
    await page.close();
  }

  // ---------------- I. ACCESIBILIDAD BÁSICA ----------------
  console.log('I. Accesibilidad');
  {
    const page = await browser.newPage({ viewport:{ width:390, height:900 } });
    await mockSupabase(page);
    await page.goto(BASE_URL, { waitUntil:'networkidle' });
    await page.click('#mobileMenuBtn');
    await page.waitForTimeout(150);
    const trapFocusOnClose = await page.evaluate(() => document.activeElement && document.activeElement.id === 'mobileMenuClose');
    check('I1 el menú móvil mueve el foco al abrir', trapFocusOnClose);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('I2 Escape cierra el menú móvil y devuelve el foco', await page.evaluate(() => document.getElementById('mobileMenuPanel').hidden && document.activeElement.id === 'mobileMenuBtn'));

    const imgBtnDisabled = await page.evaluate(() => {
      goTo ? null : null; // no-op, solo por si acaso
      return true;
    });
    await page.close();
  }

  await browser.close();

  console.log(`\n${passed} pruebas OK, ${failed} fallaron.`);
  if(failed > 0){
    console.log('Fallaron:');
    failures.forEach(f => console.log('  - ' + f));
    process.exitCode = 1;
  }
}

run().catch(err => { console.error('El test se cayó con un error inesperado:', err); process.exitCode = 1; });
