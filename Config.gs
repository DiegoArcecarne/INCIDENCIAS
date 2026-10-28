/**
 * Config.gs
 * Listas, nombres de pestañas y columnas. Estructura del registro GR-01 de Calidad.
 * Cambia aquí las listas o los correos; no hace falta tocar Codigo.gs.
 */

var CONFIG = {
  // Pestaña del Google Sheet donde se guardan las incidencias.
  HOJA: 'Incidencias',

  // Pestaña donde se pega el Excel GR-01 para importarlo.
  HOJA_IMPORTAR: 'Importar GR-01',

  // Zona horaria para todas las fechas.
  ZONA: 'Europe/Madrid',
  FORMATO_FECHA: 'yyyy-MM-dd HH:mm',

  // Cabeceras exactas de la fila 1, en este orden.
  CABECERAS: [
    'ID',
    'Nº GR-01',
    'Origen',
    'Fecha registro',
    'Fecha creación en móvil',
    'Registrado por',
    'Estado',
    'Gravedad',
    'Artículo',
    'Descripción',
    'Tipo incidencia',
    'Lote',
    'Unidades / peso',
    'Código cliente',
    'Cliente',
    'Departamento',
    'Apertura',
    'Informado por',
    'Asignado a',
    'Quién ha fallado',
    'Resolución',
    'Comentarios',
    'Solución',
    'Destino',
    'Foto 1',
    'Foto 2',
    'Foto 3'
  ],

  // Valores de la columna Origen.
  ORIGEN_APP: 'Aplicación',
  ORIGEN_GR01: 'Excel GR-01',

  ESTADOS: ['Abierta', 'Resuelta'],

  GRAVEDADES: ['Baja', 'Media', 'Alta'],

  TIPOS: [
    'Grabación',
    'Logística',
    'Preparación',
    'Mal estado',
    'Tamaño / Peso',
    'Calidad',
    'Faenado / Corte',
    'Maduración',
    'Poca caducidad',
    'Grasa',
    'Mal sellado',
    'Duro',
    'Cuerpos extraños',
    'Aspecto',
    'Bandejas rotas',
    'Color',
    'Infiltración',
    'Callo',
    'Blanda',
    'Cajas rotas',
    'Temperatura',
    'Otros'
  ],

  DEPARTAMENTOS: [
    'Pedidos',
    'Chuleteros',
    'Hamburguesas',
    'Fileteado',
    'Congelador',
    'Logística',
    'Ovino',
    'Expediciones',
    'Comercial',
    'Despiece',
    'Compras'
  ],

  DESTINOS: [
    'Ventas',
    'Reproceso',
    'Sandach',
    'Ventas y reproceso',
    'Ventas y sandach',
    'Reproceso y sandach',
    'Devolución proveedor',
    'Showroom'
  ],

  // Sugerencias al escribir (se puede poner otro valor).
  SUGERENCIAS_INFORMADO_POR: [
    'Natalia', 'Iban', 'Rocío', 'Viky', 'Yoli', 'Rosana', 'Joserra', 'Laura',
    'Andrés', 'Pitu', 'Aitor', 'Nicolás', 'Germán', 'Óscar', 'Expediciones',
    'Comercial', 'Cliente'
  ],
  SUGERENCIAS_ASIGNADO_A: [
    'Expediciones', 'Comercial', 'Calidad', 'Chuleteros', 'Fileteado', 'Compras',
    'Pedidos', 'Congelador', 'Hamburguesas', 'Ovino', 'Logística', 'Producción'
  ],
  SUGERENCIAS_QUIEN_HA_FALLADO: [
    'Comercial', 'Expediciones', 'Pedidos', 'Chuleteros', 'Agencia', 'Congelador',
    'Fileteado', 'Hamburguesas', 'Ovino', 'Despiece', 'Reparto', 'Transporte',
    'Entradas', 'Cliente'
  ],
  SUGERENCIAS_SOLUCION: [
    'Abono',
    'Abono hecho comercial',
    'Albarán modificado',
    'Calidad pasa respuesta',
    'Compensación de precio',
    'Abono y envío de nuevo producto',
    'Reclamación a la agencia de transporte',
    'Solo reclamación'
  ],

  // Correo de aviso según «Asignado a». Vacío = no se avisa.
  // Ejemplo: 'Calidad': 'calidad@arcecarne.es'
  CORREOS_ASIGNADO_A: {
    'Expediciones': '',
    'Comercial': '',
    'Calidad': '',
    'Compras': ''
  },

  // Responsables que reciben todos los avisos. Ejemplo: ['persona@arcecarne.es']
  RESPONSABLES: [],

  // Fotos
  MAX_FOTOS: 3,
  MAX_BYTES_FOTO: 5 * 1024 * 1024
};
