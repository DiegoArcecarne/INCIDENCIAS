/**
 * Codigo.gs
 * Servidor: lectura y escritura en el Sheet, fotos en Drive y avisos por correo.
 *
 * Propiedades del script necesarias (Configuración del proyecto > Propiedades del script):
 *   CLAVE_ACCESO      clave común para entrar
 *   ID_CARPETA_FOTOS  ID de la carpeta de Drive donde se guardan las fotos
 *
 * Las funciones llamadas desde la página devuelven siempre un objeto:
 *   { ok: true, ... }                       todo bien
 *   { ok: false, codigo: 'CLAVE', mensaje }  clave incorrecta (no se reintenta sola)
 *   { ok: false, codigo: 'DATOS', mensaje }  datos no válidos (no se reintenta sola)
 * Cualquier otro fallo lanza una excepción y la página lo trata como «reintentar más tarde».
 */

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

function doGet() {
  var plantilla = HtmlService.createTemplateFromFile('Index');
  return plantilla.evaluate()
    .setTitle('Incidencias Arcecarne')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Incluye otro archivo HTML del proyecto: <?!= incluir('Estilos') ?> */
function incluir(nombre) {
  return HtmlService.createTemplateFromFile(nombre).evaluate().getContent();
}

/** Listas que necesita la página. Se insertan en App.html al cargar. */
function listasParaPagina_() {
  var datos = {
    comerciales: CONFIG.COMERCIALES,
    tipos: CONFIG.TIPOS,
    categorias: CONFIG.CATEGORIAS,
    categoriasConClasificacion: CONFIG.CATEGORIAS_CON_CLASIFICACION,
    clasificaciones: CONFIG.CLASIFICACIONES,
    detectadaPor: CONFIG.DETECTADA_POR,
    afectaServicio: CONFIG.AFECTA_SERVICIO,
    soluciones: CONFIG.SOLUCIONES,
    estados: CONFIG.ESTADOS,
    maxFotos: CONFIG.MAX_FOTOS,
    maxBytesFoto: CONFIG.MAX_BYTES_FOTO
  };
  // Evita que un «</script>» dentro de un texto cierre la etiqueta.
  return JSON.stringify(datos).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------

function claveCorrecta_(clave) {
  var guardada = PropertiesService.getScriptProperties().getProperty('CLAVE_ACCESO');
  if (!guardada) {
    throw new Error('Falta configurar CLAVE_ACCESO en las Propiedades del script.');
  }
  return typeof clave === 'string' && clave === guardada;
}

function errorClave_() {
  return { ok: false, codigo: 'CLAVE', mensaje: 'Clave incorrecta.' };
}

function errorDatos_(mensaje) {
  return { ok: false, codigo: 'DATOS', mensaje: mensaje };
}

/** Comprueba la clave en la pantalla de entrada. */
function comprobarAcceso(clave) {
  if (!claveCorrecta_(clave)) return errorClave_();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Hoja
// ---------------------------------------------------------------------------

/**
 * Devuelve la pestaña de incidencias. Si no existe, la crea con las cabeceras.
 * Si existe pero le falta alguna cabecera, la añade al final.
 * Se puede ejecutar a mano desde el editor la primera vez.
 */
function prepararHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(CONFIG.HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(CONFIG.HOJA);
  }
  var total = CONFIG.CABECERAS.length;
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, total).setValues([CONFIG.CABECERAS]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, hoja.getMaxRows(), total).setNumberFormat('@');
    return hoja;
  }
  var actuales = leerCabeceras_(hoja);
  var faltan = CONFIG.CABECERAS.filter(function (c) { return !(c in actuales); });
  if (faltan.length) {
    var desde = hoja.getLastColumn() + 1;
    hoja.getRange(1, desde, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  }
  return hoja;
}

/** { 'ID': 1, 'Fecha registro': 2, ... } con columnas empezando en 1. */
function leerCabeceras_(hoja) {
  var ultima = hoja.getLastColumn();
  var mapa = {};
  if (ultima === 0) return mapa;
  var fila = hoja.getRange(1, 1, 1, ultima).getDisplayValues()[0];
  for (var i = 0; i < fila.length; i++) {
    var nombre = String(fila[i]).trim();
    if (nombre) mapa[nombre] = i + 1;
  }
  return mapa;
}

/** Número de fila con ese ID, o 0 si no existe. */
function buscarFila_(hoja, cabeceras, id) {
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return 0;
  var rango = hoja.getRange(2, cabeceras['ID'], ultimaFila - 1, 1);
  var celda = rango.createTextFinder(id).matchEntireCell(true).matchCase(true).findNext();
  return celda ? celda.getRow() : 0;
}

function filaComoObjeto_(hoja, cabeceras, numFila) {
  var valores = hoja.getRange(numFila, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  Object.keys(cabeceras).forEach(function (nombre) {
    obj[nombre] = valores[cabeceras[nombre] - 1];
  });
  return obj;
}

function ahora_() {
  return Utilities.formatDate(new Date(), CONFIG.ZONA, CONFIG.FORMATO_FECHA);
}

function texto_(valor, max) {
  if (valor === null || valor === undefined) return '';
  var t = String(valor).trim();
  return max ? t.slice(0, max) : t;
}

function esFecha_(t) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t);
}

function bloquear_() {
  var cerrojo = LockService.getScriptLock();
  if (!cerrojo.tryLock(20000)) {
    throw new Error('El servidor está ocupado. Se volverá a intentar.');
  }
  return cerrojo;
}

// ---------------------------------------------------------------------------
// Registrar
// ---------------------------------------------------------------------------

/**
 * datos = {
 *   id, fechaCreacion, registradoPor, cliente, codigoCliente, comercial, pedido,
 *   fechaIncidencia, tipo, categoria, clasificacion, pieza, cantidad, descripcion,
 *   detectadaPor, afectaServicio, solucion, estado,
 *   fotos: [{ base64, tipo }]
 * }
 */
function registrarIncidencia(clave, datos) {
  if (!claveCorrecta_(clave)) return errorClave_();
  if (!datos || typeof datos !== 'object') return errorDatos_('No han llegado los datos.');

  // --- Validación ---
  var d = {
    id: texto_(datos.id, 40),
    fechaCreacion: texto_(datos.fechaCreacion, 16),
    registradoPor: texto_(datos.registradoPor, 80),
    cliente: texto_(datos.cliente, 150),
    codigoCliente: texto_(datos.codigoCliente, 40),
    comercial: texto_(datos.comercial),
    pedido: texto_(datos.pedido, 60),
    fechaIncidencia: texto_(datos.fechaIncidencia, 16).replace('T', ' '),
    tipo: texto_(datos.tipo),
    categoria: texto_(datos.categoria) || 'No aplica',
    clasificacion: texto_(datos.clasificacion),
    pieza: texto_(datos.pieza, 150),
    cantidad: texto_(datos.cantidad, 60),
    descripcion: texto_(datos.descripcion, 3000),
    detectadaPor: texto_(datos.detectadaPor),
    afectaServicio: texto_(datos.afectaServicio),
    solucion: texto_(datos.solucion) || 'Pendiente',
    estado: texto_(datos.estado) || 'Abierta'
  };

  if (!/^INC-\d{6}-\d{6}-\d{3}$/.test(d.id)) return errorDatos_('El ID de la incidencia no es válido.');

  var faltan = [];
  if (!d.cliente) faltan.push('cliente');
  if (!d.comercial) faltan.push('comercial');
  if (!d.fechaIncidencia) faltan.push('fecha');
  if (!d.tipo) faltan.push('tipo');
  if (!d.descripcion) faltan.push('descripción');
  if (faltan.length) return errorDatos_('Faltan datos obligatorios: ' + faltan.join(', ') + '.');

  if (!esFecha_(d.fechaIncidencia)) return errorDatos_('La fecha de la incidencia no es válida.');
  if (!esFecha_(d.fechaCreacion)) d.fechaCreacion = '';

  if (CONFIG.COMERCIALES.indexOf(d.comercial) < 0) return errorDatos_('Comercial no válido.');
  if (CONFIG.TIPOS.indexOf(d.tipo) < 0) return errorDatos_('Tipo no válido.');
  if (CONFIG.CATEGORIAS.indexOf(d.categoria) < 0) return errorDatos_('Categoría no válida.');
  if (CONFIG.SOLUCIONES.indexOf(d.solucion) < 0) return errorDatos_('Solución no válida.');
  if (CONFIG.ESTADOS.indexOf(d.estado) < 0) return errorDatos_('Estado no válido.');
  if (d.detectadaPor && CONFIG.DETECTADA_POR.indexOf(d.detectadaPor) < 0) return errorDatos_('«Detectada por» no válido.');
  if (d.afectaServicio && CONFIG.AFECTA_SERVICIO.indexOf(d.afectaServicio) < 0) return errorDatos_('«Afecta al servicio» no válido.');

  if (CONFIG.CATEGORIAS_CON_CLASIFICACION.indexOf(d.categoria) >= 0) {
    if (!d.clasificacion) d.clasificacion = 'No lo sé';
    if (CONFIG.CLASIFICACIONES.indexOf(d.clasificacion) < 0) return errorDatos_('Clasificación no válida.');
  } else {
    d.clasificacion = 'No aplica';
  }

  var fotos = Array.isArray(datos.fotos) ? datos.fotos.filter(Boolean) : [];
  if (fotos.length > CONFIG.MAX_FOTOS) return errorDatos_('Máximo ' + CONFIG.MAX_FOTOS + ' fotos.');
  var blobsFotos = [];
  for (var i = 0; i < fotos.length; i++) {
    var f = fotos[i];
    var tipo = texto_(f.tipo) || 'image/jpeg';
    if (tipo.indexOf('image/') !== 0) return errorDatos_('La foto ' + (i + 1) + ' no es una imagen.');
    var bytes;
    try {
      bytes = Utilities.base64Decode(String(f.base64 || ''));
    } catch (e) {
      return errorDatos_('La foto ' + (i + 1) + ' no se puede leer.');
    }
    if (!bytes.length) return errorDatos_('La foto ' + (i + 1) + ' está vacía.');
    if (bytes.length > CONFIG.MAX_BYTES_FOTO) return errorDatos_('La foto ' + (i + 1) + ' supera 5 MB.');
    blobsFotos.push({ bytes: bytes, tipo: tipo });
  }

  // --- Escritura ---
  var cerrojo = bloquear_();
  var fila;
  try {
    var hoja = prepararHoja();
    var cabeceras = leerCabeceras_(hoja);

    // Reintento de una incidencia que ya llegó: no se duplica.
    if (buscarFila_(hoja, cabeceras, d.id)) {
      return { ok: true, id: d.id, duplicada: true };
    }

    var enlaces = guardarFotos_(d.id, blobsFotos);
    var registro = ahora_();

    fila = {
      'ID': d.id,
      'Fecha registro': registro,
      'Fecha creación en móvil': d.fechaCreacion,
      'Fecha incidencia': d.fechaIncidencia,
      'Registrado por': d.registradoPor,
      'Cliente': d.cliente,
      'Código cliente': d.codigoCliente,
      'Comercial': d.comercial,
      'Pedido o albarán': d.pedido,
      'Tipo': d.tipo,
      'Categoría': d.categoria,
      'Clasificación': d.clasificacion,
      'Pieza o producto': d.pieza,
      'Cantidad afectada': d.cantidad,
      'Descripción': d.descripcion,
      'Detectada por': d.detectadaPor,
      'Afecta al servicio': d.afectaServicio,
      'Solución': d.solucion,
      'Estado': d.estado,
      'Fecha resolución': d.estado === 'Resuelta' ? registro : '',
      'Nota resolución': '',
      'Foto 1': enlaces[0] || '',
      'Foto 2': enlaces[1] || '',
      'Foto 3': enlaces[2] || ''
    };

    var ancho = hoja.getLastColumn();
    var valores = [];
    for (var c = 0; c < ancho; c++) valores.push('');
    Object.keys(fila).forEach(function (nombre) {
      if (cabeceras[nombre]) valores[cabeceras[nombre] - 1] = fila[nombre];
    });

    var numFila = hoja.getLastRow() + 1;
    hoja.getRange(numFila, 1, 1, ancho).setNumberFormat('@').setValues([valores]);
    SpreadsheetApp.flush();
  } finally {
    cerrojo.releaseLock();
  }

  enviarAviso_(fila);
  return { ok: true, id: d.id, duplicada: false };
}

/** Guarda las fotos en Drive como ID-1.jpg, ID-2.jpg... Si ya existen, reutiliza el enlace. */
function guardarFotos_(id, blobsFotos) {
  if (!blobsFotos.length) return [];
  var idCarpeta = PropertiesService.getScriptProperties().getProperty('ID_CARPETA_FOTOS');
  if (!idCarpeta) {
    throw new Error('Falta configurar ID_CARPETA_FOTOS en las Propiedades del script.');
  }
  var carpeta = DriveApp.getFolderById(idCarpeta);
  return blobsFotos.map(function (foto, i) {
    var nombre = id + '-' + (i + 1) + '.jpg';
    var existentes = carpeta.getFilesByName(nombre);
    if (existentes.hasNext()) return existentes.next().getUrl();
    var blob = Utilities.newBlob(foto.bytes, foto.tipo, nombre);
    return carpeta.createFile(blob).getUrl();
  });
}

// ---------------------------------------------------------------------------
// Leer
// ---------------------------------------------------------------------------

function obtenerIncidencias(clave) {
  if (!claveCorrecta_(clave)) return errorClave_();
  var hoja = prepararHoja();
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return { ok: true, incidencias: [] };

  var cabeceras = leerCabeceras_(hoja);
  var nombres = Object.keys(cabeceras);
  var valores = hoja.getRange(2, 1, ultimaFila - 1, hoja.getLastColumn()).getDisplayValues();
  var lista = [];
  valores.forEach(function (fila) {
    var obj = {};
    nombres.forEach(function (n) { obj[n] = fila[cabeceras[n] - 1]; });
    if (obj['ID']) lista.push(obj);
  });
  return { ok: true, incidencias: lista };
}

// ---------------------------------------------------------------------------
// Actualizar (cerrar o reabrir)
// ---------------------------------------------------------------------------

/** cambios = { estado, solucion, nota } */
function actualizarIncidencia(clave, id, cambios) {
  if (!claveCorrecta_(clave)) return errorClave_();
  cambios = cambios || {};
  var estado = texto_(cambios.estado);
  var solucion = texto_(cambios.solucion);
  var nota = texto_(cambios.nota, 3000);

  if (CONFIG.ESTADOS.indexOf(estado) < 0) return errorDatos_('Estado no válido.');
  if (CONFIG.SOLUCIONES.indexOf(solucion) < 0) return errorDatos_('Solución no válida.');

  var cerrojo = bloquear_();
  try {
    var hoja = prepararHoja();
    var cabeceras = leerCabeceras_(hoja);
    var numFila = buscarFila_(hoja, cabeceras, texto_(id));
    if (!numFila) return errorDatos_('No se encuentra la incidencia ' + id + '.');

    var antes = filaComoObjeto_(hoja, cabeceras, numFila);
    var fechaResolucion = '';
    if (estado === 'Resuelta') {
      fechaResolucion = antes['Estado'] === 'Resuelta' && antes['Fecha resolución']
        ? antes['Fecha resolución']
        : ahora_();
    }

    var escribir = {
      'Estado': estado,
      'Solución': solucion,
      'Nota resolución': nota,
      'Fecha resolución': fechaResolucion
    };
    Object.keys(escribir).forEach(function (nombre) {
      if (cabeceras[nombre]) {
        hoja.getRange(numFila, cabeceras[nombre]).setNumberFormat('@').setValue(escribir[nombre]);
      }
    });
    SpreadsheetApp.flush();
    return { ok: true, incidencia: filaComoObjeto_(hoja, cabeceras, numFila) };
  } finally {
    cerrojo.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Avisos por correo
// ---------------------------------------------------------------------------

function enviarAviso_(fila) {
  try {
    var destinos = [];
    var delComercial = CONFIG.CORREOS_COMERCIALES[fila['Comercial']];
    if (delComercial) destinos.push(delComercial);
    (CONFIG.RESPONSABLES || []).forEach(function (c) { if (c) destinos.push(c); });
    destinos = destinos
      .map(function (c) { return String(c).trim().toLowerCase(); })
      .filter(function (c, i, a) { return c && a.indexOf(c) === i; });

    if (!destinos.length) {
      console.error('Aviso no enviado para ' + fila['ID'] + ': no hay correos configurados en Config.gs.');
      return;
    }

    var campos = [
      'ID', 'Fecha incidencia', 'Registrado por', 'Cliente', 'Código cliente', 'Comercial',
      'Pedido o albarán', 'Tipo', 'Categoría', 'Clasificación', 'Pieza o producto',
      'Cantidad afectada', 'Descripción', 'Detectada por', 'Afecta al servicio',
      'Solución', 'Estado'
    ];
    var filas = campos.map(function (c) {
      return '<tr><td style="padding:4px 10px 4px 0;color:#666;vertical-align:top">' + esc_(c) +
        '</td><td style="padding:4px 0">' + esc_(fila[c]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');

    var fotos = ['Foto 1', 'Foto 2', 'Foto 3']
      .filter(function (c) { return fila[c]; })
      .map(function (c) { return '<a href="' + esc_(fila[c]) + '">' + esc_(c) + '</a>'; })
      .join(' · ');

    var url = '';
    try { url = ScriptApp.getService().getUrl(); } catch (e) { url = ''; }

    var html =
      '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">' +
      '<p style="border-left:4px solid #CE9816;padding-left:10px;font-size:16px">' +
      '<b>Nueva incidencia</b> · ' + esc_(fila['Cliente']) + ' · ' + esc_(fila['Tipo']) + '</p>' +
      '<table style="border-collapse:collapse">' + filas + '</table>' +
      (fotos ? '<p>Fotos: ' + fotos + '</p>' : '') +
      (url ? '<p><a href="' + esc_(url) + '">Abrir el registro de incidencias</a></p>' : '') +
      '</div>';

    MailApp.sendEmail({
      to: destinos.join(','),
      subject: 'Incidencia ' + fila['ID'] + ' · ' + fila['Cliente'] + ' · ' + fila['Tipo'],
      htmlBody: html
    });
  } catch (e) {
    console.error('Error al enviar el aviso de ' + (fila && fila['ID']) + ': ' + e);
  }
}

function esc_(t) {
  return String(t === undefined || t === null ? '' : t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
