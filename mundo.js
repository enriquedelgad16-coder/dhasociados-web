/* ==========================================================
   LA SEDE — el recorrido
   ----------------------------------------------------------
   El fondo de esta pagina es una sola toma continua: una
   camara que entra por la recepcion y no vuelve a salir. Cruza
   contabilidad, el archivo de auditoria, gestion fiscal, la
   sala de juntas, recursos humanos, el aula, la galeria y el
   pasillo de clientes, y termina asomada al valle.

   No hay corte en ninguna parte porque no hay nada que cortar:
   es UN metraje, y el scroll no cambia de plano, cambia el
   MINUTO del plano. Desplazarse hacia abajo es avanzar por el
   pasillo; hacia arriba, retroceder. La imagen de fondo esta
   literalmente amarrada a la posicion del lector.

   Se probo antes un edificio construido en 3D en el navegador
   y se descarto por una razon que no admite discusion: por
   bien iluminado que este, un interior generado en tiempo real
   se ve A 3D. Y la firma no quiere parecer una maqueta, quiere
   parecer lo que es. Asi que el fondo es metraje fotografico y
   el navegador solo hace una cosa: decidir en que fotograma
   esta. Ademas pesa menos que la libreria 3D que sustituye.

   Dos motores, un solo comportamiento:

     · RECORRIDO   el video real, buscado por scroll. Es el
                   titular en escritorio.
     · ESTANCIAS   las diez fotografias fijas encadenadas con
                   un avance de camara y una disolvencia. Entra
                   al instante mientras el video carga, y se
                   queda para siempre en movil, donde buscar
                   dentro de un video en cada fotograma no es
                   una promesa que se pueda cumplir.

   Los dos leen el MISMO reparto de actos y la MISMA posicion
   amortiguada, asi que el cambio de uno a otro no altera donde
   esta el lector: solo cambia con que se le dibuja.
   ========================================================== */
(function laSede() {
  'use strict';

  var REDUCIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOVIL = window.matchMedia('(max-width: 900px)').matches;

  var lienzo = document.getElementById('mundo');
  var video = document.getElementById('mundo-video');
  if (!lienzo) return;
  var ctx = lienzo.getContext('2d', { alpha: false });
  if (!ctx) return;

  /* --- Las diez estancias ----------------------------------
     El orden ES el recorrido. Cada una esta anclada a la
     seccion de la pagina que le corresponde, no a un
     porcentaje del scroll: si manana crece un bloque o el muro
     de clientes cambia de alto, la camara sigue llegando al
     archivo cuando toca Auditoria.                          */
  var SALAS = [
    { img: 'k00-lobby',        ancla: 'inicio',   svc: -1, mira:  0.00, calma: 0.00 },
    { img: 'k01-contabilidad', ancla: null,       svc:  0, mira:  0.55, calma: 0.16 },
    { img: 'k02-auditoria',    ancla: null,       svc:  1, mira: -0.55, calma: 0.16 },
    { img: 'k03-fiscal',       ancla: null,       svc:  2, mira:  0.55, calma: 0.16 },
    /* El mirador aparece dos veces a proposito. Es la unica sala
       de la sede que mira hacia fuera, y planificacion estrategica
       es la unica linea de la firma que hace lo mismo: dejar de
       mirar el registro para mirar el horizonte. Vuelve al final,
       en contacto, cerrando el recorrido donde empezo la idea.  */
    { img: 'k09-mirador',      ancla: null,       svc:  3, mira: -0.55, calma: 0.16 },
    { img: 'k04-consultoria',  ancla: null,       svc:  4, mira:  0.55, calma: 0.16 },
    { img: 'k05-rrhh',         ancla: null,       svc:  5, mira: -0.55, calma: 0.16 },
    { img: 'k06-academy',      ancla: null,       svc:  6, mira:  0.55, calma: 0.16 },
    { img: 'k07-cifras',       ancla: 'metodo',   svc: -1, mira:  0.25, calma: 0.46 },
    { img: 'k08-clientes',     ancla: 'clientes', svc: -1, mira:  0.00, calma: 0.56 },
    { img: 'k09-mirador',      ancla: 'contacto', svc: -1, mira:  0.00, calma: 0.18 }
  ];
  var TRAMO = 5;                     // segundos de metraje por sala
  var SVC = [].slice.call(document.querySelectorAll('section.svc'));

  function nodo(s) {
    return s.ancla ? document.getElementById(s.ancla) : (SVC[s.svc] || null);
  }

  function anclar() {
    var alto = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var desp = window.scrollY || window.pageYOffset || 0;
    var n = SALAS.length;
    for (var i = 0; i < n; i++) {
      var el = nodo(SALAS[i]);
      if (!el) { SALAS[i].p = i / (n - 1); continue; }
      var c = el.getBoundingClientRect();
      SALAS[i].p = Math.min(1, Math.max(0,
        (c.top + desp + c.height / 2 - window.innerHeight / 2) / alto));
    }
    SALAS[0].p = 0;
    SALAS[n - 1].p = 1;
    // Estrictamente creciente, o la interpolacion divide por cero
    for (var j = 1; j < n - 1; j++) {
      SALAS[j].p = Math.min(Math.max(SALAS[j].p, SALAS[j - 1].p + 0.006),
                            1 - 0.006 * (n - 1 - j));
    }

    /* --- Presupuesto de movimiento por sala -----------------
       Cada sala avanza lo mismo (un zoom R y un barrido) sin
       importar cuanto scroll ocupe. Con la pagina corta eso
       funcionaba; al crecer, una sala que antes cubria una
       seccion pasa a cubrir cinco y el mismo recorrido repartido
       entre cinco veces mas rueda deja de percibirse: el fondo
       parece congelado.

       La correccion es dar a cada sala movimiento en proporcion
       al terreno que le toca, midiendolo contra el reparto
       parejo. Asi la CAMARA MANTIENE SU VELOCIDAD aunque las
       salas sean desiguales, que es lo que el ojo juzga.      */
    var parejo = 1 / (n - 1);
    for (var k = 0; k < n - 1; k++) {
      var largo = SALAS[k + 1].p - SALAS[k].p;
      SALAS[k].amp = Math.min(2.2, Math.max(0.8, largo / parejo));
    }
    SALAS[n - 1].amp = SALAS[n - 2].amp;

    /* --- Reparto del metraje ---------------------------------
       El video es un solo plano continuo por la sede. Darle a
       cada sala el mismo trozo de metraje solo funciona si todas
       ocupan el mismo scroll; cuando no, las salas cortas pasan
       el video a camara rapida y las largas lo dejan casi
       parado, que es justo lo contrario de un recorrido.

       Se reparte entonces segun el terreno de cada sala, con un
       tercio de reparto parejo para que ninguna se quede sin
       aire y cada estancia siga cayendo cerca de su seccion.  */
    var peso = 0;
    for (var q = 0; q < n - 1; q++) {
      SALAS[q].peso = 0.34 * parejo + 0.66 * (SALAS[q + 1].p - SALAS[q].p);
      peso += SALAS[q].peso;
    }
    var suma = 0;
    for (var r2 = 0; r2 < n - 1; r2++) {
      SALAS[r2].t0 = suma / peso;
      suma += SALAS[r2].peso;
    }
    SALAS[n - 1].t0 = 1;
  }

  /* --- Estado del viaje ------------------------------------
     pObj es donde esta el scroll. p es donde esta la camara. La
     camara persigue al scroll amortiguada: si sueltas la rueda
     no frena en seco, se posa; y si cambias de idea a mitad de
     camino obedece desde donde esta, no desde donde iba. Como
     es persecucion y no animacion programada, se puede
     interrumpir en cualquier fotograma.                      */
  var pObj = 0, p = 0, ultimo = 0, vivo = false, raf = 0;
  var anchoAct = 0, altoAct = 0, calmaAct = 0;
  var motor = 'estancias';

  function leerScroll() {
    var alto = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    pObj = Math.min(1, Math.max(0, (window.scrollY || window.pageYOffset || 0) / alto));
  }

  function medir() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return false;
    anchoAct = w; altoAct = h;
    var dpr = Math.min(window.devicePixelRatio || 1, MOVIL ? 1.5 : 2);
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    lienzo.style.width = w + 'px';
    lienzo.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /* Donde estamos: que sala, cuanto de la siguiente, y con
     cuanta calma. Lo comparten los dos motores.             */
  var lugar = { j: 0, u: 0, mira: 0, calma: 0, amp: 1, metraje: 0 };
  function situar() {
    var j = 0;
    while (j < SALAS.length - 2 && p >= SALAS[j + 1].p) j++;
    var A = SALAS[j], B = SALAS[j + 1];
    var u = Math.min(1, Math.max(0, (p - A.p) / Math.max(0.0001, B.p - A.p)));
    lugar.j = j;
    lugar.u = u;
    lugar.mira = A.mira + (B.mira - A.mira) * u;
    lugar.calma = A.calma + (B.calma - A.calma) * u;
    lugar.amp = A.amp || 1;
    // fraccion del metraje, ya repartida segun el terreno
    var a0 = (A.t0 === undefined) ? j / (SALAS.length - 1) : A.t0;
    var b0 = (B.t0 === undefined) ? (j + 1) / (SALAS.length - 1) : B.t0;
    lugar.metraje = a0 + (b0 - a0) * u;
  }

  /* =========================================================
     LAS IMAGENES
     ---------------------------------------------------------
     Se cargan por orden y bajo demanda: las dos primeras de
     inmediato, porque son las que se ven antes de que nadie
     toque la rueda, y cada siguiente cuando el lector se acerca
     a ella. Nadie deberia pagar la descarga del mirador por
     mirar el hero tres segundos y marcharse.
     ========================================================= */
  var SUFIJO = MOVIL ? '-p.webp' : '.webp';
  var fotos = SALAS.map(function () { return null; });
  var pedidas = SALAS.map(function () { return false; });

  function pedir(i) {
    if (i < 0 || i >= SALAS.length || pedidas[i]) return;
    pedidas[i] = true;
    var im = new Image();
    im.decoding = 'async';
    im.src = 'mundo/' + SALAS[i].img + SUFIJO;
    im.onload = function () { fotos[i] = im; };
  }
  pedir(0); pedir(1);

  /* Encaje "cover" con avance de camara y desvio lateral.
     El desvio manda la fuga al lado contrario al panel de
     texto: los bloques de servicio alternan izquierda y
     derecha, y asi el peso de la composicion no se acumula
     nunca en el mismo sitio.                                */
  function dibujar(im, escala, alfa, desvio) {
    if (!im || !im.width) return;
    var w = anchoAct, h = altoAct;
    var r = Math.max(w / im.width, h / im.height) * escala;
    var dw = im.width * r, dh = im.height * r;
    var margen = Math.max(0, (dw - w) / 2);
    var lado = Math.max(-0.92, Math.min(0.92, desvio)) * margen;
    var dx = (w - dw) / 2 + lado;
    var dy = (h - dh) / 2;
    ctx.globalAlpha = alfa;
    ctx.drawImage(im, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }

  /* El avance por sala. R es cuanto crece la imagen mientras se
     recorre una sala; el truco de continuidad es que la sala
     que entra empieza en 1 y termina en R, y la que sale
     empieza justo en R. Asi, en el instante del relevo, ambas
     estan en la misma escala y el paso no se ve.            */
  var R = 1.46;

  function pintarEstancias() {
    var j = lugar.j, u = lugar.u;
    pedir(j + 1); pedir(j + 2);

    var vida = REDUCIDO ? 0 : performance.now() * 0.001;
    // Respiracion: por debajo del umbral de percepcion. No se
    // ve, se nota. Impide que la imagen se congele cuando el
    // lector deja de desplazarse.
    var alienta = 1 + Math.sin(vida * 0.21) * 0.004;
    /* El barrido lateral y el avance crecen con el terreno que
       cubre la sala. Una sala larga se recorre entera, no se
       queda quieta esperando a la siguiente. */
    /* El presupuesto de la sala se reparte entre avanzar y barrer.
       El barrido es el que salva los tramos largos: ampliar mas una
       fotografia de 1920px la ablanda, mientras que cruzarla de lado
       a lado no cuesta un solo pixel de nitidez.                  */
    var deriva = lugar.mira * 0.5
               + (u - 0.5) * 1.6
               + Math.sin(vida * 0.17) * 0.04;
    var Rj = 1 + (R - 1) * Math.min(lugar.amp, 2.2);

    ctx.fillStyle = '#EEF3FA';
    ctx.fillRect(0, 0, anchoAct, altoAct);

    // Detras, la sala que llega
    dibujar(fotos[j + 1] || fotos[j], Math.pow(Rj, u) * alienta, 1, deriva);

    /* Delante, la sala que se deja atras: sigue creciendo y se
       disuelve. La disolvencia cae entre el 22% y el 80% del
       tramo, que es exactamente el aire que hay entre dos
       secciones de la pagina. El relevo ocurre donde no hay
       nada que leer.                                        */
    var f = Math.min(1, Math.max(0, (u - 0.22) / 0.58));
    var alfa = 1 - f * f * (3 - 2 * f);
    if (alfa > 0.004) {
      dibujar(fotos[j], Math.pow(Rj, 1 + u) * alienta, alfa, deriva);
    }
  }

  /* =========================================================
     EL VIDEO
     ---------------------------------------------------------
     El metraje son diez salas encadenadas, cinco segundos por
     sala. La sala i empieza en el segundo i*5. Buscar el
     segundo (j+u)*5 es, literalmente, situar la camara donde
     esta el lector.
     ========================================================= */
  var videoListo = false, mezcla = 0, fallos = 0;

  function prepararVideo() {
    if (!video || MOVIL || REDUCIDO) return;
    /* Una conexion lenta o un ahorro de datos activo no
       merecen ocho megas de fondo decorativo. Las diez
       fotografias ya cuentan la misma historia por menos de
       una decima parte del peso.                            */
    var con = navigator.connection;
    if (con && (con.saveData || /^([23]g|slow-2g)$/.test(con.effectiveType || ''))) return;

    video.addEventListener('loadedmetadata', function () {
      // Si el metraje no dura lo que este archivo cree, manda
      // el archivo: el reparto se recalcula sobre su duracion.
      if (video.duration && isFinite(video.duration)) {
        TRAMO = video.duration / (SALAS.length - 1);
      }
    });
    video.addEventListener('canplay', function () {
      videoListo = true;
      motor = 'recorrido';
    });
    video.addEventListener('error', function () { videoListo = false; motor = 'estancias'; });
    video.src = video.dataset.src;
    video.load();
  }

  function pintarRecorrido(dt) {
    // Fundido de un motor al otro. Nunca un cambio seco: el
    // lector no tiene por que enterarse de que por debajo ha
    // cambiado la maquinaria.
    mezcla = Math.min(1, mezcla + dt * 0.9);

    var dur = (video.duration && isFinite(video.duration))
      ? video.duration : TRAMO * (SALAS.length - 1);
    var t = Math.min(lugar.metraje * dur, dur - 0.05);

    /* La comparacion es contra el tiempo REAL del video, no
       contra el que se pidio la ultima vez. Parece lo mismo y no
       lo es: si una busqueda no llega a aplicarse, apuntar la
       intencion daria por hecho que si, y el fondo se quedaria
       clavado en el primer fotograma para siempre. Comparando
       contra la realidad, cada fotograma vuelve a intentarlo.  */
    var real = video.currentTime;
    if (Math.abs(t - real) > 0.05 && !video.seeking) {
      try { video.currentTime = t; } catch (e) { /* aun no busca */ }
    }

    /* Y si el video sencillamente NO se puede buscar —un
       servidor que no responde a peticiones por rango, un
       formato que el navegador no rebobina— no tiene sentido
       insistir: se veria un fotograma fijo haciendose pasar por
       un recorrido. A los dos segundos de terquedad se cede a
       las fotografias, que si obedecen al scroll.            */
    if (Math.abs(t) > 0.4 && Math.abs(real) < 0.02) {
      if (++fallos > 120) {
        motor = 'estancias';
        videoListo = false;
        video.style.opacity = 0;
        video.removeAttribute('src');
        console.info('[sede] el video no admite busqueda; mandan las fotografias.');
      }
    } else {
      fallos = 0;
    }
    video.style.opacity = mezcla;
    video.style.transform = 'translate3d(' + (lugar.mira * 1.4).toFixed(2) + '%,0,0) scale(1.05)';
    if (mezcla < 1) pintarEstancias();
  }

  /* =========================================================
     EL CICLO
     ========================================================= */
  function pintar(ts) {
    /* El lienzo se compara con la ventana en cada fotograma:
       cubre el caso en que resize no llega —una pestana que
       abre oculta y se muestra despues—. La tolerancia en alto
       evita reasignar el buffer mientras la barra del
       navegador movil sube y baja al desplazarse.           */
    if (anchoAct !== window.innerWidth || Math.abs(altoAct - window.innerHeight) > 60) {
      if (!medir()) return;
    }
    if (!anchoAct) return;

    var dt = ultimo ? Math.min((ts - ultimo) / 1000, 0.05) : 0.016;
    ultimo = ts;

    // Amortiguacion independiente de la tasa de refresco: a 120
    // Hz tiene que sentirse igual que a 60.
    p += (pObj - p) * (REDUCIDO ? 1 : 1 - Math.exp(-dt * 5.0));
    situar();

    if (motor === 'recorrido' && videoListo) pintarRecorrido(dt);
    else pintarEstancias();

    /* La calma de la sala gobierna cuanto se retira el fondo.
       Al llegar a cifras, equipo y clientes —donde hay parrafos
       largos y credenciales que leer— la sede se apaga casi
       hasta el papel: sigue avanzando, sigue estando, pero deja
       de pedir la vista. Es la misma decision que toma un
       director de fotografia cuando baja una luz porque el
       actor ha empezado a hablar.                            */
    if (Math.abs(lugar.calma - calmaAct) > 0.004) {
      calmaAct = lugar.calma;
      document.documentElement.style.setProperty('--calma', calmaAct.toFixed(3));
    }

    if (vivo) raf = requestAnimationFrame(pintar);
  }

  function encender() {
    if (vivo) return;
    vivo = true; ultimo = 0;
    raf = requestAnimationFrame(pintar);
  }
  function apagar() {
    vivo = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  medir();
  anclar();
  leerScroll();
  p = pObj;

  /* El muro de clientes y las tipograficas llegan despues del
     primer render y mueven el alto del documento. Sin volver a
     anclar, el reparto quedaria calculado sobre una pagina que
     ya no existe.                                            */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(anclar);
  window.addEventListener('load', function () { anclar(); leerScroll(); prepararVideo(); });
  setTimeout(function () { anclar(); leerScroll(); }, 1200);

  window.addEventListener('scroll', leerScroll, { passive: true });
  /* Con movimiento reducido NO hay bucle que reanudar. Sin esta
     guarda, volver a la pestana encendia el ciclo continuo justo
     en el navegador de quien habia pedido que nada se moviera
     solo, que es precisamente lo contrario de lo pedido.      */
  if (!REDUCIDO) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) apagar(); else encender();
    });
  }

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      medir(); anclar(); leerScroll();
      if (!vivo) requestAnimationFrame(pintar);
    }, 180);
  }, { passive: true });

  if (REDUCIDO) {
    /* Sin movimiento: la sede sigue ahi y sigue diciendo en que
       departamento esta el lector, pero solo se redibuja cuando
       el scroll cambia. Nada se mueve solo.                  */
    var pend = false;
    requestAnimationFrame(pintar);
    window.addEventListener('scroll', function () {
      if (pend) return;
      pend = true;
      requestAnimationFrame(function (ts) { pend = false; leerScroll(); p = pObj; situar(); pintar(ts); });
    }, { passive: true });
  } else {
    encender();
  }

  document.documentElement.classList.add('con-mundo');
})();
