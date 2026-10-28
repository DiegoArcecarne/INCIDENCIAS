/**
 * Codigo.gs
 * Servidor: lectura y escritura en el Sheet, fotos en Drive, avisos por correo
 * e importación del Excel GR-01.
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
// Página y menú
// ---------------------------------------------------------------------------

function doGet() {
  var plantilla = HtmlService.createTemplateFromFile('Index');
  return plantilla.evaluate()
    .setTitle('Incidencias Arcecarne')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Menú «Incidencias» en el Google Sheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Incidencias')
    .addItem('Importar GR-01', 'importarGR01')
    .addItem('Preparar hojas', 'prepararTodo')
    .addToUi();
}

/** Incluye otro archivo HTML del proyecto: <?!= incluir('Estilos') ?> */
function incluir(nombre) {
  return HtmlService.createTemplateFromFile(nombre).evaluate().getContent();
}

/** Listas que necesita la página. Se insertan en App.html al cargar. */
function listasParaPagina_() {
  var datos = {
    estados: CONFIG.ESTADOS,
    gravedades: CONFIG.GRAVEDADES,
    tipos: CONFIG.TIPOS,
    departamentos: CONFIG.DEPARTAMENTOS,
    destinos: CONFIG.DESTINOS,
    informadoPor: CONFIG.SUGERENCIAS_INFORMADO_POR,
    asignadoA: CONFIG.SUGERENCIAS_ASIGNADO_A,
    quienHaFallado: CONFIG.SUGERENCIAS_QUIEN_HA_FALLADO,
    soluciones: CONFIG.SUGERENCIAS_SOLUCION,
    origenApp: CONFIG.ORIGEN_APP,
    origenGR01: CONFIG.ORIGEN_GR01,
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
// Hojas
// ---------------------------------------------------------------------------

/**
 * Devuelve la pestaña de incidencias. Si no existe, la crea con las cabeceras.
 * Si existe con la estructura de la primera prueba (sin «Gravedad»), la renombra
 * para conservarla y crea una nueva.
 * Si existe pero le falta alguna cabecera, la añade al final.
 */
function prepararHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(CONFIG.HOJA);

  if (hoja && hoja.getLastRow() > 0) {
    var previas = leerCabeceras_(hoja);
    if (!('Gravedad' in previas) && ('Comercial' in previas)) {
      hoja.setName(CONFIG.HOJA + ' (primera prueba)');
      hoja = null;
    }
  }
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

/** Pestaña donde se pega el Excel GR-01. Se crea en formato texto para que las fechas no cambien. */
function prepararHojaImportar_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(CONFIG.HOJA_IMPORTAR);
  if (!hoja) {
    hoja = libro.insertSheet(CONFIG.HOJA_IMPORTAR);
    hoja.getRange(1, 1, hoja.getMaxRows(), hoja.getMaxColumns()).setNumberFormat('@');
  }
  return hoja;
}

/** Prepara las dos pestañas. Se puede ejecutar desde el editor o desde el menú. */
function prepararTodo() {
  prepararHoja();
  prepararHojaImportar_();
}

/** { 'ID': 1, 'Nº GR-01': 2, ... } con columnas empezando en 1. */
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

/** Escribe una fila (objeto por cabecera) en la posición numFila, como texto. */
function escribirFila_(hoja, cabeceras, numFila, fila) {
  var ancho = hoja.getLastColumn();
  var valores = [];
  for (var c = 0; c < ancho; c++) valores.push('');
  Object.keys(fila).forEach(function (nombre) {
    if (cabeceras[nombre]) valores[cabeceras[nombre] - 1] = fila[nombre];
  });
  hoja.getRange(numFila, 1, 1, ancho).setNumberFormat('@').setValues([valores]);
}

// ---------------------------------------------------------------------------
// Registrar
// ---------------------------------------------------------------------------

/**
 * datos = {
 *   id, fechaCreacion, registradoPor, cliente, codigoCliente, apertura, gravedad,
 *   tipo, descripcion, articulo, lote, unidades, departamento, informadoPor,
 *   asignadoA, quienHaFallado, comentarios, solucion, destino, estado,
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
    apertura: texto_(datos.apertura, 16).replace('T', ' '),
    gravedad: texto_(datos.gravedad),
    tipo: texto_(datos.tipo),
    descripcion: texto_(datos.descripcion, 3000),
    articulo: texto_(datos.articulo, 60),
    lote: texto_(datos.lote, 100),
    unidades: texto_(datos.unidades, 100),
    departamento: texto_(datos.departamento),
    informadoPor: texto_(datos.informadoPor, 80),
    asignadoA: texto_(datos.asignadoA, 80),
    quienHaFallado: texto_(datos.quienHaFallado, 80),
    comentarios: texto_(datos.comentarios, 3000),
    solucion: texto_(datos.solucion, 500),
    destino: texto_(datos.destino),
    estado: texto_(datos.estado) || 'Abierta'
  };

  if (!/^INC-\d{6}-\d{6}-\d{3}$/.test(d.id)) return errorDatos_('El ID de la incidencia no es válido.');

  var faltan = [];
  if (!d.cliente) faltan.push('cliente');
  if (!d.apertura) faltan.push('fecha');
  if (!d.gravedad) faltan.push('gravedad');
  if (!d.tipo) faltan.push('tipo');
  if (!d.descripcion) faltan.push('descripción');
  if (!d.informadoPor) faltan.push('informado por');
  if (faltan.length) return errorDatos_('Faltan datos obligatorios: ' + faltan.join(', ') + '.');

  if (!esFecha_(d.apertura)) return errorDatos_('La fecha de apertura no es válida.');
  if (!esFecha_(d.fechaCreacion)) d.fechaCreacion = '';

  if (CONFIG.GRAVEDADES.indexOf(d.gravedad) < 0) return errorDatos_('Gravedad no válida.');
  if (CONFIG.TIPOS.indexOf(d.tipo) < 0) return errorDatos_('Tipo de incidencia no válido.');
  if (CONFIG.ESTADOS.indexOf(d.estado) < 0) return errorDatos_('Estado no válido.');
  if (d.departamento && CONFIG.DEPARTAMENTOS.indexOf(d.departamento) < 0) return errorDatos_('Departamento no válido.');
  if (d.destino && CONFIG.DESTINOS.indexOf(d.destino) < 0) return errorDatos_('Destino no válido.');
  if (d.estado === 'Resuelta' && !d.solucion) return errorDatos_('Para registrarla como resuelta, escribe la solución.');

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
      'Nº GR-01': '',
      'Origen': CONFIG.ORIGEN_APP,
      'Fecha registro': registro,
      'Fecha creación en móvil': d.fechaCreacion,
      'Registrado por': d.registradoPor,
      'Estado': d.estado,
      'Gravedad': d.gravedad,
      'Artículo': d.articulo,
      'Descripción': d.descripcion,
      'Tipo incidencia': d.tipo,
      'Lote': d.lote,
      'Unidades / peso': d.unidades,
      'Código cliente': d.codigoCliente,
      'Cliente': d.cliente,
      'Departamento': d.departamento,
      'Apertura': d.apertura,
      'Informado por': d.informadoPor,
      'Asignado a': d.asignadoA,
      'Quién ha fallado': d.quienHaFallado,
      'Resolución': d.estado === 'Resuelta' ? registro : '',
      'Comentarios': d.comentarios,
      'Solución': d.solucion,
      'Destino': d.destino,
      'Foto 1': enlaces[0] || '',
      'Foto 2': enlaces[1] || '',
      'Foto 3': enlaces[2] || ''
    };

    escribirFila_(hoja, cabeceras, hoja.getLastRow() + 1, fila);
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
// Actualizar (cerrar o reabrir). Solo incidencias registradas en la aplicación.
// ---------------------------------------------------------------------------

/** cambios = { estado, solucion, comentarios, destino, quienHaFallado } */
function actualizarIncidencia(clave, id, cambios) {
  if (!claveCorrecta_(clave)) return errorClave_();
  cambios = cambios || {};
  var estado = texto_(cambios.estado);
  var solucion = texto_(cambios.solucion, 500);
  var comentarios = texto_(cambios.comentarios, 3000);
  var destino = texto_(cambios.destino);
  var quienHaFallado = texto_(cambios.quienHaFallado, 80);

  if (CONFIG.ESTADOS.indexOf(estado) < 0) return errorDatos_('Estado no válido.');
  if (destino && CONFIG.DESTINOS.indexOf(destino) < 0) return errorDatos_('Destino no válido.');
  if (estado === 'Resuelta' && !solucion) return errorDatos_('Escribe la solución antes de marcarla como resuelta.');

  var cerrojo = bloquear_();
  try {
    var hoja = prepararHoja();
    var cabeceras = leerCabeceras_(hoja);
    var numFila = buscarFila_(hoja, cabeceras, texto_(id));
    if (!numFila) return errorDatos_('No se encuentra la incidencia ' + id + '.');

    var antes = filaComoObjeto_(hoja, cabeceras, numFila);
    if (antes['Origen'] === CONFIG.ORIGEN_GR01) {
      return errorDatos_('Esta incidencia viene del Excel GR-01. Se cambia en el Excel y se vuelve a importar.');
    }

    var resolucion = '';
    if (estado === 'Resuelta') {
      resolucion = antes['Estado'] === 'Resuelta' && antes['Resolución'] ? antes['Resolución'] : ahora_();
    }

    var escribir = {
      'Estado': estado,
      'Solución': solucion,
      'Comentarios': comentarios,
      'Destino': destino,
      'Quién ha fallado': quienHaFallado,
      'Resolución': resolucion
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
// Importar el Excel GR-01
// ---------------------------------------------------------------------------

/** Cabecera del GR-01 (normalizada) -> columna de la pestaña Incidencias. */
var COLUMNAS_GR01_ = {
  'N': 'Nº GR-01',
  'ESTADO': 'Estado',
  'GRAVEDAD': 'Gravedad',
  'ARTICULO': 'Artículo',
  'DESCRIPCION': 'Descripción',
  'TIPO INCIDENCIA': 'Tipo incidencia',
  'LOTE': 'Lote',
  'UNIDADES / PESO': 'Unidades / peso',
  'CODIGO CLIENTE': 'Código cliente',
  'CLIENTE': 'Cliente',
  'DEPARTAMENTO': 'Departamento',
  'APERTURA': 'Apertura',
  'INFORMADO POR': 'Informado por',
  'ASIGNADO A': 'Asignado a',
  'QUIEN HA FALLADO': 'Quién ha fallado',
  'RESOLUCION': 'Resolución',
  'COMENTARIOS': 'Comentarios',
  'SOLUCION': 'Solución',
  'DESTINO': 'Destino'
};

function normalizarCabecera_(t) {
  t = String(t || '').toUpperCase().replace(/[:.]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/[ÁÀ]/g, 'A').replace(/[ÉÈ]/g, 'E').replace(/[ÍÌ]/g, 'I').replace(/[ÓÒ]/g, 'O').replace(/[ÚÙÜ]/g, 'U');
  if (/^N[ºª°O]?$/.test(t)) return 'N';
  return t;
}

/** Fecha del Excel (Date, número de serie o texto dd/MM/yyyy) -> 'yyyy-MM-dd'. */
function fechaGR01_(v, zona) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, zona, 'yyyy-MM-dd');
  }
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return '';
    var ms = Math.round((v - 25569) * 86400000);
    return Utilities.formatDate(new Date(ms), 'UTC', 'yyyy-MM-dd');
  }
  var t = String(v).trim();
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
  if (m) {
    var anio = m[3].length === 2 ? '20' + m[3] : m[3];
    return anio + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return '';
}

/** Texto del Excel: «---» y vacíos se guardan vacíos. */
function textoGR01_(v) {
  if (v === null || v === undefined) return '';
  var t = String(v).replace(/\s+/g, ' ').trim();
  return /^-+$/.test(t) ? '' : t;
}

/**
 * Lee la pestaña «Importar GR-01» (el Excel pegado tal cual) y lo vuelca en «Incidencias».
 * - Cada fila del Excel tiene un ID fijo: GR01-<Nº>. Si el Nº se repite, GR01-<Nº>-2, -3...
 * - Si el ID ya existe, se actualiza con lo que diga el Excel. Si no, se añade.
 * - Las incidencias registradas en la aplicación no se tocan.
 */
function importarGR01() {
  var resultado = importarGR01_();
  var texto = resultado.mensaje;
  try {
    SpreadsheetApp.getUi().alert(texto);
  } catch (e) {
    console.log(texto);
  }
  return resultado;
}

function importarGR01_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var origen = libro.getSheetByName(CONFIG.HOJA_IMPORTAR);
  if (!origen || origen.getLastRow() < 2) {
    prepararHojaImportar_();
    return {
      ok: false,
      mensaje: 'La pestaña «' + CONFIG.HOJA_IMPORTAR + '» está vacía. Copia el Excel GR-01 entero, ' +
        'pégalo en la celda A1 de esa pestaña con Ctrl+Mayús+V (solo valores) y vuelve a importar.'
    };
  }

  var zona = libro.getSpreadsheetTimeZone() || CONFIG.ZONA;
  var valores = origen.getRange(1, 1, origen.getLastRow(), origen.getLastColumn()).getValues();

  // Busca la fila de cabeceras (la que tiene ESTADO y CLIENTE).
  var filaCab = -1;
  var columnas = {};
  for (var r = 0; r < Math.min(valores.length, 20) && filaCab < 0; r++) {
    var normal = valores[r].map(normalizarCabecera_);
    if (normal.indexOf('ESTADO') >= 0 && normal.indexOf('CLIENTE') >= 0) {
      filaCab = r;
      normal.forEach(function (n, c) {
        if (COLUMNAS_GR01_[n] && !(COLUMNAS_GR01_[n] in columnas)) columnas[COLUMNAS_GR01_[n]] = c;
      });
    }
  }
  if (filaCab < 0) {
    return { ok: false, mensaje: 'No encuentro la fila de cabeceras del GR-01 (con ESTADO y CLIENTE) en las primeras 20 filas.' };
  }
  if (!('Nº GR-01' in columnas)) {
    return { ok: false, mensaje: 'No encuentro la columna del número (Nº) en el GR-01.' };
  }

  // Convierte cada fila del Excel en una fila de Incidencias.
  var vistos = {};
  var nuevas = [];
  for (var i = filaCab + 1; i < valores.length; i++) {
    var v = valores[i];
    var leer = function (col) { return col in columnas ? v[columnas[col]] : ''; };
    var cliente = textoGR01_(leer('Cliente'));
    var descripcion = textoGR01_(leer('Descripción'));
    var apertura = fechaGR01_(leer('Apertura'), zona);
    if (!cliente && !descripcion && !apertura) continue;

    var num = String(leer('Nº GR-01')).replace(/[.\s]/g, '');
    if (typeof leer('Nº GR-01') === 'number') num = String(Math.round(leer('Nº GR-01')));
    if (!num) continue;
    vistos[num] = (vistos[num] || 0) + 1;
    var id = 'GR01-' + ('000' + num).slice(-4) + (vistos[num] > 1 ? '-' + vistos[num] : '');

    var resolucion = fechaGR01_(leer('Resolución'), zona);
    var estadoTexto = textoGR01_(leer('Estado'));
    var resuelta = /resuel/i.test(estadoTexto) || !!resolucion;

    nuevas.push({
      'ID': id,
      'Nº GR-01': num,
      'Origen': CONFIG.ORIGEN_GR01,
      'Estado': resuelta ? 'Resuelta' : 'Abierta',
      'Gravedad': textoGR01_(leer('Gravedad')),
      'Artículo': textoGR01_(leer('Artículo')),
      'Descripción': descripcion,
      'Tipo incidencia': textoGR01_(leer('Tipo incidencia')),
      'Lote': textoGR01_(leer('Lote')),
      'Unidades / peso': textoGR01_(leer('Unidades / peso')),
      'Código cliente': textoGR01_(leer('Código cliente')),
      'Cliente': cliente,
      'Departamento': textoGR01_(leer('Departamento')),
      'Apertura': apertura,
      'Informado por': textoGR01_(leer('Informado por')),
      'Asignado a': textoGR01_(leer('Asignado a')),
      'Quién ha fallado': textoGR01_(leer('Quién ha fallado')),
      'Resolución': resolucion,
      'Comentarios': textoGR01_(leer('Comentarios')),
      'Solución': textoGR01_(leer('Solución')),
      'Destino': textoGR01_(leer('Destino'))
    });
  }

  // Vuelca en Incidencias: actualiza las que ya están y añade las nuevas.
  var cerrojo = bloquear_();
  try {
    var hoja = prepararHoja();
    var cabeceras = leerCabeceras_(hoja);
    var ancho = hoja.getLastColumn();
    var ultimaFila = hoja.getLastRow();
    var actuales = ultimaFila > 1 ? hoja.getRange(2, 1, ultimaFila - 1, ancho).getDisplayValues() : [];
    var filaDeId = {};
    actuales.forEach(function (f, idx) { filaDeId[f[cabeceras['ID'] - 1]] = idx; });

    var registro = ahora_();
    var anadidas = 0;
    var actualizadas = 0;
    var iguales = 0;

    nuevas.forEach(function (obj) {
      var idx = filaDeId[obj['ID']];
      if (idx === undefined) {
        obj['Fecha registro'] = registro;
        obj['Registrado por'] = 'Importación GR-01';
        var fila = [];
        for (var c = 0; c < ancho; c++) fila.push('');
        Object.keys(obj).forEach(function (n) { if (cabeceras[n]) fila[cabeceras[n] - 1] = obj[n]; });
        filaDeId[obj['ID']] = actuales.length;
        actuales.push(fila);
        anadidas++;
        return;
      }
      var actual = actuales[idx];
      var cambia = false;
      Object.keys(obj).forEach(function (n) {
        if (!cabeceras[n]) return;
        if (String(actual[cabeceras[n] - 1]) !== String(obj[n])) {
          actual[cabeceras[n] - 1] = obj[n];
          cambia = true;
        }
      });
      if (cambia) actualizadas++; else iguales++;
    });

    if (actuales.length) {
      hoja.getRange(2, 1, actuales.length, ancho).setNumberFormat('@').setValues(actuales);
    }
    SpreadsheetApp.flush();

    return {
      ok: true,
      anadidas: anadidas,
      actualizadas: actualizadas,
      iguales: iguales,
      mensaje: 'Importación del GR-01 terminada: ' + anadidas + ' nuevas, ' + actualizadas +
        ' actualizadas y ' + iguales + ' sin cambios.'
    };
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
    var delAsignado = CONFIG.CORREOS_ASIGNADO_A[fila['Asignado a']];
    if (delAsignado) destinos.push(delAsignado);
    (CONFIG.RESPONSABLES || []).forEach(function (c) { if (c) destinos.push(c); });
    destinos = destinos
      .map(function (c) { return String(c).trim().toLowerCase(); })
      .filter(function (c, i, a) { return c && a.indexOf(c) === i; });

    if (!destinos.length) {
      console.error('Aviso no enviado para ' + fila['ID'] + ': no hay correos configurados en Config.gs.');
      return;
    }

    var campos = [
      'ID', 'Apertura', 'Gravedad', 'Cliente', 'Código cliente', 'Tipo incidencia',
      'Artículo', 'Descripción', 'Lote', 'Unidades / peso', 'Departamento',
      'Informado por', 'Asignado a', 'Quién ha fallado', 'Comentarios', 'Solución',
      'Destino', 'Estado', 'Registrado por'
    ];
    var filas = campos.filter(function (c) { return fila[c]; }).map(function (c) {
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
      '<b>Nueva incidencia</b> · ' + esc_(fila['Gravedad']) + ' · ' + esc_(fila['Cliente']) +
      ' · ' + esc_(fila['Tipo incidencia']) + '</p>' +
      '<table style="border-collapse:collapse">' + filas + '</table>' +
      (fotos ? '<p>Fotos: ' + fotos + '</p>' : '') +
      (url ? '<p><a href="' + esc_(url) + '">Abrir el registro de incidencias</a></p>' : '') +
      '</div>';

    MailApp.sendEmail({
      to: destinos.join(','),
      subject: 'Incidencia ' + fila['Gravedad'] + ' · ' + fila['Cliente'] + ' · ' + fila['Tipo incidencia'],
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
