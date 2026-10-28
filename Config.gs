/**
 * Config.gs
 * Listas cerradas, nombres de pestañas y columnas.
 * Cambia aquí las listas o los correos; no hace falta tocar Codigo.gs.
 */

var CONFIG = {
  // Pestaña del Google Sheet donde se guardan las incidencias.
  HOJA: 'Incidencias',

  // Zona horaria para todas las fechas.
  ZONA: 'Europe/Madrid',
  FORMATO_FECHA: 'yyyy-MM-dd HH:mm',

  // Cabeceras exactas de la fila 1, en este orden.
  CABECERAS: [
    'ID',
    'Fecha registro',
    'Fecha creación en móvil',
    'Fecha incidencia',
    'Registrado por',
    'Cliente',
    'Código cliente',
    'Comercial',
    'Pedido o albarán',
    'Tipo',
    'Categoría',
    'Clasificación',
    'Pieza o producto',
    'Cantidad afectada',
    'Descripción',
    'Detectada por',
    'Afecta al servicio',
    'Solución',
    'Estado',
    'Fecha resolución',
    'Nota resolución',
    'Foto 1',
    'Foto 2',
    'Foto 3'
  ],

  COMERCIALES: [
    'Rosana', 'Iban', 'Pitu', 'Alex', 'Óscar', 'Nico',
    'Germán', 'Aitor', 'Joserra', 'Manu', 'Sin asignar'
  ],

  TIPOS: [
    'Toma o interpretación del pedido',
    'Preparación en sala',
    'Cantidades o pesos',
    'Calidad',
    'Envío o transporte',
    'Otro'
  ],

  CATEGORIAS: [
    'Classic',
    'Deluxe nacional',
    'Deluxe europea',
    'Aldea / Royal nacional',
    'Aldea / Royal europea',
    'Wagyu Europeo',
    'Angus',
    'Ternera',
    'Cordero lechal',
    'Cochinillo',
    'Ibérico',
    'Cecina',
    'Hamburguesas',
    'Elaborados y cocinados',
    'Varios productos',
    'No aplica'
  ],

  // Categorías que llevan clasificación. En el resto se guarda «No aplica».
  CATEGORIAS_CON_CLASIFICACION: [
    'Classic',
    'Deluxe nacional',
    'Deluxe europea',
    'Aldea / Royal nacional',
    'Aldea / Royal europea',
    'Wagyu Europeo',
    'Angus'
  ],

  CLASIFICACIONES: ['Extra', 'Select', 'Top', 'Top+', 'No lo sé'],

  DETECTADA_POR: ['Cliente', 'Comercial', 'Sala', 'Reparto', 'Atención al cliente'],

  AFECTA_SERVICIO: ['Sí', 'No', 'No se sabe'],

  SOLUCIONES: [
    'Pendiente',
    'Reposición',
    'Abono',
    'Cambio de producto',
    'Descuento en el próximo pedido',
    'Explicación al cliente',
    'Sin acción'
  ],

  ESTADOS: ['Abierta', 'Resuelta'],

  // Correo de aviso de cada comercial. Vacío = no se le avisa.
  CORREOS_COMERCIALES: {
    'Rosana': '',
    'Iban': '',
    'Pitu': '',
    'Alex': '',
    'Óscar': '',
    'Nico': '',
    'Germán': '',
    'Aitor': '',
    'Joserra': '',
    'Manu': '',
    'Sin asignar': ''
  },

  // Responsables que reciben todos los avisos. Ejemplo: ['persona@arcecarne.com']
  RESPONSABLES: [],

  // Fotos
  MAX_FOTOS: 3,
  MAX_BYTES_FOTO: 5 * 1024 * 1024
};
