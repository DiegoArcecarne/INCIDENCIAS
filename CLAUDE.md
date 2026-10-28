# Registro de incidencias de Arcecarne (prueba con Google Apps Script)

## Qué es

Una página interna para registrar y seguir incidencias en pedidos de clientes de hostelería de Arcecarne (cárnica de Burgos). La usan sala, comerciales y atención al cliente, sobre todo desde el móvil. Objetivo: saber qué tipo de incidencias se repiten, con qué clientes, en qué zona y cuánto se tarda en resolverlas.

Es una prueba. Prioridad: que funcione bien y sea fácil de instalar pegando archivos en el editor de Apps Script, sin terminal.

## Cómo se trabaja en este proyecto

* El usuario no usa la terminal. No propongas `clasp`, npm ni comandos. Entrega archivos completos listos para copiar y pegar en el editor de Apps Script.
* Avanza por fases. Al terminar cada fase, di qué archivos han cambiado y cómo probarlo.
* Cuando se tome una decisión nueva, añádela a la sección «Decisiones» de este archivo.
* Textos de la interfaz en español de España, claros y cortos. No uses las palabras: premium, gourmet, gastronómico, real, reales.

## Tecnología

* Google Apps Script como aplicación web (`doGet` + `HtmlService`), vinculado a un Google Sheet.
* Comunicación página ↔ servidor solo con `google.script.run`. Nada de `fetch` a URLs externas.
* Sin librerías externas ni CDN. HTML, CSS y JavaScript propios.
* Archivos del proyecto:
  * `Codigo.gs`: servidor (lectura y escritura en el Sheet, Drive y correo).
  * `Config.gs`: listas cerradas, nombres de pestañas y columnas.
  * `Index.html`: estructura de la página.
  * `Estilos.html`: CSS, incluido con `<?!= incluir('Estilos') ?>`.
  * `App.html`: JavaScript de la página, incluido igual.
* `doGet` debe devolver la página con `setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` para poder incrustarla en la web de Arcecarne, y con la etiqueta viewport para móvil.

## Referencia de diseño

`incidencias.html` (en esta carpeta) es un prototipo funcional del formulario y del panel. Reutiliza su estructura, campos, estilos y lógica del panel, adaptando las llamadas `fetch` a `google.script.run`. Colores de marca: dorado `#CE9816`, negro `#111111`. Fuente Arial.

## Acceso

* Clave común guardada en Propiedades del script (`CLAVE_ACCESO`), nunca en el código.
* Cada función de servidor llamada desde la página recibe la clave y la comprueba antes de hacer nada. Si no coincide, devuelve error.
* La página pide nombre y clave la primera vez y los recuerda en el navegador (envuelto en try/catch).

## Datos

Google Sheet con una pestaña `Incidencias`. Fila 1 = cabeceras exactas, en este orden:

ID · Fecha registro · Fecha creación en móvil · Fecha incidencia · Registrado por · Cliente · Código cliente · Comercial · Pedido o albarán · Tipo · Categoría · Clasificación · Pieza o producto · Cantidad afectada · Descripción · Detectada por · Afecta al servicio · Solución · Estado · Fecha resolución · Nota resolución · Foto 1 · Foto 2 · Foto 3

Reglas:

* `ID`: `INC-AAMMDD-HHMMSS-NNN`, generado en el móvil al pulsar «Registrar», no en el servidor. Así una incidencia que se reintenta varias veces conserva siempre el mismo ID.
* `Fecha creación en móvil`: cuándo se rellenó. `Fecha registro`: cuándo llegó al Sheet. Si hubo falta de cobertura, no coinciden.
* Fechas como texto `yyyy-MM-dd HH:mm` en zona `Europe/Madrid` (usar `Utilities.formatDate`), para que el Sheet no las reformatee.
* Escribir con `LockService` para evitar choques si dos personas registran a la vez.
* Leer y escribir por nombre de cabecera, no por posición fija.
* Si la pestaña no existe, crearla con las cabeceras (función `prepararHoja`).

## Listas cerradas (Config.gs)

* Comerciales: Rosana, Iban, Pitu, Alex, Óscar, Nico, Germán, Aitor, Joserra, Manu, Sin asignar.
* Tipo: Toma o interpretación del pedido · Preparación en sala · Cantidades o pesos · Calidad · Envío o transporte · Otro.
* Categoría: Classic · Deluxe nacional · Deluxe europea · Aldea / Royal nacional · Aldea / Royal europea · Wagyu Europeo · Angus · Ternera · Cordero lechal · Cochinillo · Ibérico · Cecina · Hamburguesas · Elaborados y cocinados · Varios productos · No aplica.
* Clasificación (solo para Classic, Deluxe, Aldea / Royal, Wagyu Europeo y Angus): Extra · Select · Top · Top+ · No lo sé. En el resto se guarda «No aplica».
* Detectada por: Cliente · Comercial · Sala · Reparto · Atención al cliente.
* Afecta al servicio: Sí · No · No se sabe.
* Solución: Pendiente · Reposición · Abono · Cambio de producto · Descuento en el próximo pedido · Explicación al cliente · Sin acción.
* Estado: Abierta · Resuelta.
* Correos de aviso por comercial y lista de responsables: en Config.gs, vacíos por defecto.

Terminología: «cochinillo», nunca «lechón». «Aldea» es un sistema de ganadería, no una raza.

## Funciones de servidor

* `registrarIncidencia(clave, datos)`: valida obligatorios (cliente, comercial, fecha, tipo, descripción). Si ya existe una fila con ese ID, no hace nada más y devuelve éxito con `duplicada: true` (evita duplicados al reintentar). Si no existe, guarda las fotos, añade la fila, envía el aviso y devuelve el ID.
* `obtenerIncidencias(clave)`: devuelve todas las filas como objetos.
* `actualizarIncidencia(clave, id, cambios)`: cambia Estado, Solución y Nota resolución; pone o borra Fecha resolución según el estado.

## Fotos

* Hasta 3 fotos por incidencia. Cada una con su botón para hacerla o elegirla, miniatura y opción de quitarla.
* La página reduce cada foto a 1600 px de lado mayor, JPEG calidad 0,8, y la envía en base64.
* El servidor las guarda en la carpeta de Drive `ID_CARPETA_FOTOS` (Propiedades del script) como `ID-1.jpg`, `ID-2.jpg`, `ID-3.jpg` y escribe los enlaces en Foto 1, Foto 2 y Foto 3.
* Rechazar archivos que no sean imagen o que superen 5 MB.
* Si ya existe en Drive una foto con ese nombre (reintento), no se sube otra vez.

## Sin cobertura: cola de pendientes

Objetivo: no perder nunca una incidencia por falta de cobertura en sala o cámara.

* Al pulsar «Registrar», la incidencia (datos y fotos ya reducidas) se guarda primero en IndexedDB del navegador, con su ID y estado `pendiente`. Después se intenta enviar.
* Si el envío va bien, se borra de la cola y se muestra «Incidencia registrada».
* Si falla (sin conexión, error o más de 30 s de espera), se queda en la cola y se muestra «Guardada en el teléfono. Se enviará cuando haya cobertura». El formulario se limpia para registrar la siguiente.
* Aviso fijo arriba mientras haya pendientes: «N incidencias pendientes de enviar», con botón «Reintentar ahora» y la lista de pendientes (cliente, tipo, hora).
* Envío automático de la cola: al abrir la página, al recuperar conexión (evento `online`) y cada 60 s mientras haya pendientes y la página esté abierta. Se envían de una en una, en orden.
* Si una pendiente falla por clave incorrecta o datos no válidos, no se reintenta sola: se marca con error y se puede corregir o descartar.
* Descartar una pendiente pide confirmación.
* Si IndexedDB no está disponible, se envía directamente y, si falla, se conserva el formulario relleno con su botón «Reintentar».
* Todas las operaciones con IndexedDB van en try/catch.

Límites que la interfaz debe explicar en la ayuda (no se pueden resolver en Apps Script):

* La página tiene que haberse abierto con conexión. Sin cobertura se puede rellenar y guardar, pero no abrir la aplicación desde cero.
* Las pendientes solo se envían con la página abierta. Si se cierra, se envían la próxima vez que se abra.
* Las pendientes viven en ese teléfono y ese navegador. Si se borran los datos del navegador, se pierden.

## Avisos

* Correo con `MailApp.sendEmail` (HTML) al comercial de la zona y a los responsables.
* Si el envío falla o no hay correos configurados, la incidencia se guarda igualmente y se registra el error con `console.error`.

## Panel

Igual que el prototipo: filtros por periodo, comercial, tipo y estado; total, abiertas, clientes afectados y días medios hasta resolver; desglose por tipo, comercial, producto, día de la semana y quién la detecta; clientes con más de una incidencia; lista con detalle y cierre de cada incidencia. Cálculos en el navegador con los datos de `obtenerIncidencias`.

## Comprobaciones antes de dar una fase por terminada

* Clave incorrecta: no deja entrar ni registrar.
* Faltan campos obligatorios: avisa y no envía.
* Alta sin foto, con 1 y con 3 fotos: fila correcta, enlaces que abren.
* Modo avión (desde las herramientas del navegador, sin conexión): registrar 2 incidencias con fotos, ver el aviso de pendientes, recuperar conexión y comprobar que llegan solas, una vez cada una y sin duplicar fotos.
* Reintentar una incidencia que ya llegó al Sheet: no se duplica.
* Cerrar y reabrir una incidencia: cambian estado y fecha de resolución.
* Panel con 0 incidencias y con varias: sin errores en consola.
* Se ve bien a 390 px de ancho.

## Decisiones

* Prueba en Google Apps Script en lugar de módulo de PrestaShop o n8n.
* Uso desde el móvil como acceso directo en la pantalla de inicio.
* Hasta 3 fotos por incidencia.
* Cola de pendientes en el teléfono con envío automático al recuperar cobertura y botón «Reintentar ahora».
* El prototipo `incidencias.html` no estaba en el repositorio ni en Drive al empezar la fase 1. La interfaz se construyó desde esta especificación. Si aparece, se revisa contra él.
* El límite de 5 MB se aplica a la foto ya reducida (la página y el servidor lo comprueban). Las fotos originales del móvil suelen pasar de 5 MB y se aceptan porque se reducen antes de enviar.
* Las funciones de servidor devuelven `{ ok: false, codigo: 'CLAVE' | 'DATOS' }` para los errores que no deben reintentarse solos. Cualquier otro fallo (excepción, sin conexión, más de 30 s) deja la incidencia en la cola.
* «Fecha incidencia» se pide con fecha y hora (por defecto, el momento actual) y se guarda como `yyyy-MM-dd HH:mm`. La fecha de creación en móvil usa la hora del teléfono.
* «Producto» en el panel se desglosa por Categoría (lista cerrada); «Pieza o producto» es texto libre y no sirve para agrupar.
* Días medios hasta resolver = de «Fecha incidencia» a «Fecha resolución», solo en las resueltas.
* Para cerrar una incidencia hay que elegir una solución distinta de «Pendiente».
* Clientes afectados y repetidos se agrupan por código cliente; si no hay código, por el nombre.
* Si la clave guardada deja de valer, la página vuelve a pedirla. Al entrar con la clave buena, las pendientes que fallaron por clave vuelven solas a la cola.
* Las fotos no se comparten automáticamente: quien tenga que abrir los enlaces necesita acceso a la carpeta de Drive (se comparte una vez la carpeta).
* Además de los momentos de la especificación, la cola se intenta enviar al volver a la página (cambio de pestaña o de aplicación en el móvil).
