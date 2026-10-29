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

La estructura sigue el registro de Calidad **GR-01** (Excel «GR-01 Registro Gestión incidencias»), adoptada en la fase 2.

Google Sheet con una pestaña `Incidencias`. Fila 1 = cabeceras exactas, en este orden:

ID · Nº GR-01 · Origen · Fecha registro · Fecha creación en móvil · Registrado por · Estado · Gravedad · Artículo · Descripción · Tipo incidencia · Lote · Unidades / peso · Código cliente · Cliente · Departamento · Apertura · Informado por · Asignado a · Quién ha fallado · Resolución · Comentarios · Solución · Destino · Foto 1 · Foto 2 · Foto 3

Reglas:

* `ID`: en las altas de la aplicación, `INC-AAMMDD-HHMMSS-NNN`, generado en el móvil al pulsar «Registrar», no en el servidor. Así una incidencia que se reintenta varias veces conserva siempre el mismo ID. En las importadas del Excel, `GR01-<Nº>` (con `-2`, `-3`… si el Nº se repite).
* `Origen`: «Aplicación» o «Excel GR-01».
* `Fecha creación en móvil`: cuándo se rellenó. `Fecha registro`: cuándo llegó al Sheet. Si hubo falta de cobertura, no coinciden.
* Fechas como texto en zona `Europe/Madrid` (usar `Utilities.formatDate`), para que el Sheet no las reformatee: `yyyy-MM-dd HH:mm` en las altas de la aplicación y `yyyy-MM-dd` en Apertura y Resolución importadas del Excel.
* «Días abierto» y «mes» del Excel no se guardan: se calculan en el panel.
* Escribir con `LockService` para evitar choques si dos personas registran a la vez.
* Leer y escribir por nombre de cabecera, no por posición fija.
* Si la pestaña no existe, crearla con las cabeceras (función `prepararHoja`).

## Listas (Config.gs)

Sacadas de los valores que aparecen en el GR-01.

* Estado: Abierta · Resuelta.
* Gravedad: Baja · Media · Alta.
* Tipo incidencia: Grabación · Logística · Preparación · Mal estado · Tamaño / Peso · Calidad · Faenado / Corte · Maduración · Poca caducidad · Grasa · Mal sellado · Duro · Cuerpos extraños · Aspecto · Bandejas rotas · Color · Infiltración · Callo · Blanda · Cajas rotas · Temperatura · Otros.
* Departamento: Pedidos · Chuleteros · Hamburguesas · Fileteado · Congelador · Logística · Ovino · Expediciones · Comercial · Despiece · Compras.
* Destino: Ventas · Reproceso · Sandach · Ventas y reproceso · Ventas y sandach · Reproceso y sandach · Devolución proveedor · Showroom (vacío = no aplica).
* Informado por, Asignado a, Quién ha fallado y Solución: texto libre con sugerencias (en el Excel son texto libre).
* Correos de aviso según «Asignado a» y lista de responsables: en Config.gs, vacíos por defecto.

Terminología: «cochinillo», nunca «lechón». «Aldea» es un sistema de ganadería, no una raza.

## Funciones de servidor

* `registrarIncidencia(clave, datos)`: valida obligatorios (cliente, apertura, gravedad, tipo, descripción, informado por). Si ya existe una fila con ese ID, no hace nada más y devuelve éxito con `duplicada: true` (evita duplicados al reintentar). Si no existe, guarda las fotos, añade la fila, envía el aviso y devuelve el ID.
* `obtenerIncidencias(clave)`: devuelve todas las filas como objetos.
* `actualizarIncidencia(clave, id, cambios)`: cambia Estado, Solución, Destino, Quién ha fallado y Comentarios; pone o borra Resolución según el estado. Solo en incidencias con origen «Aplicación».
* `importarGR01()`: lee la pestaña `Importar GR-01` (el Excel pegado tal cual), añade las incidencias nuevas y actualiza las que ya estaban. No toca las altas de la aplicación. Se lanza desde el menú «Incidencias» del Sheet.

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

* Correo con `MailApp.sendEmail` (HTML) al correo configurado para «Asignado a» y a los responsables.
* Si el envío falla o no hay correos configurados, la incidencia se guarda igualmente y se registra el error con `console.error`.

## Panel

Es la pantalla de inicio. Cálculos en el navegador con los datos de `obtenerIncidencias`.

* Barra de filtros siempre visible (plegable en el móvil): periodo (con «Este mes», «Mes anterior» y «Personalizado» con desde y hasta), estado, gravedad, tipo, departamento, asignado a, quién ha fallado, informado por, destino, origen y buscador (cliente, código, artículo, lote, descripción, comentarios, Nº). Cada desplegable muestra cuántas hay de cada valor. Los filtros activos aparecen como etiquetas que se quitan al tocarlas.
* Indicadores: total, abiertas, gravedad alta, clientes afectados, días medios hasta resolver y abiertas hace más de 7 días. «Abiertas» y «Gravedad alta» filtran al tocarlos.
* Tres subpestañas: «¿Mejoramos?» (la primera y principal), «Gráficos» y «Listado».
* ¿Mejoramos?: compara dos periodos (último mes, últimos 3, 4 o 6 meses frente a los anteriores, o meses elegidos) por día laborable o en total. Indicadores: incidencias, días medios hasta resolver, % resueltas en 2 días o menos y % con gravedad media o alta, cada uno con «Mejora», «Empeora» o «Igual». «Por sección» enseña qué departamentos, tipos, etc. mejoran o empeoran, en gráfico de diferencia, antes y ahora, mapa de calor mes a mes o tabla. «Todo el histórico, mes a mes» enseña cada indicador por mes en columnas, línea o tabla.
* Gráficos: evolución (columnas o línea; automático, por día, semana o mes), gráfico a medida (eliges qué ver, tipo y cuántos), abiertas y resueltas, un desglose por gravedad, tipo, departamento, quién ha fallado, asignado a, informado por, destino y día de la semana, cada uno con su desplegable de tipo (barras, columnas, circular o tabla), y tablas de clientes y artículos con más de una incidencia.
* Listado: estado en botones (todas, abiertas, resueltas), ordenar (recientes, antiguas, gravedad, días abierta, cliente, Nº), por página (25, 50, 100), vista en tabla o tarjetas y paginación. El detalle y el cierre se abren en una ventana encima.

## Comprobaciones antes de dar una fase por terminada

* Clave incorrecta: no deja entrar ni registrar.
* Faltan campos obligatorios: avisa y no envía.
* Alta sin foto, con 1 y con 3 fotos: fila correcta, enlaces que abren.
* Modo avión (desde las herramientas del navegador, sin conexión): registrar 2 incidencias con fotos, ver el aviso de pendientes, recuperar conexión y comprobar que llegan solas, una vez cada una y sin duplicar fotos.
* Reintentar una incidencia que ya llegó al Sheet: no se duplica.
* Cerrar y reabrir una incidencia: cambian estado y fecha de resolución.
* Importar el GR-01 dos veces: la segunda no añade nada.
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
* «Apertura» se pide con fecha y hora (por defecto, el momento actual) y se guarda como `yyyy-MM-dd HH:mm`. La fecha de creación en móvil usa la hora del teléfono.
* Clientes afectados y repetidos se agrupan por código cliente; si no hay código, por el nombre.
* Si la clave guardada deja de valer, la página vuelve a pedirla. Al entrar con la clave buena, las pendientes que fallaron por clave vuelven solas a la cola.
* Las fotos no se comparten automáticamente: quien tenga que abrir los enlaces necesita acceso a la carpeta de Drive (se comparte una vez la carpeta).
* Además de los momentos de la especificación, la cola se intenta enviar al volver a la página (cambio de pestaña o de aplicación en el móvil).
* La pantalla de inicio es el panel. Tiene un botón «+ Añadir incidencia» que abre el formulario y una pestaña «Añadir» con el mismo destino. Después de registrar (o de guardar en el teléfono) se vuelve al panel con el mensaje arriba.
* Gráfico de evolución: por día en 7 y 30 días, por semana en 90 días, por mes en «Este año» y «Todo».
* Tocar una barra del panel filtra por ese valor; tocarla otra vez quita el filtro. Tocar un cliente repetido filtra por ese cliente.
* Gráficos hechos con HTML y CSS propios, sin librerías, en un solo color (dorado). Abiertas en dorado y resueltas en verde, siempre con texto y número al lado.
* Fase 2: la aplicación adopta la estructura del GR-01 de Calidad (gravedad, 22 tipos, departamento, artículo, lote, informado por, asignado a, quién ha fallado, destino). Se quitan Comercial, Categoría, Clasificación, Detectada por y Afecta al servicio, que no existen en el GR-01. La pestaña de la primera prueba se conserva renombrada como «Incidencias (primera prueba)».
* El Excel GR-01 se sigue usando en paralelo. Se importa pegándolo en la pestaña «Importar GR-01» (Ctrl+Mayús+V) y con el menú Incidencias → Importar GR-01. Se puede repetir: lo que ya está se actualiza, lo nuevo se añade.
* Mientras el Excel siga en uso, manda el Excel: las incidencias importadas solo se ven en la aplicación y no se pueden cerrar desde ella, para que una importación posterior no pise cambios.
* Al importar, una fila se considera resuelta si ESTADO dice «Resuelto» o si tiene fecha de resolución (28 filas del Excel tienen fecha de resolución y ESTADO vacío). Las filas numeradas sin ningún dato no se importan. Los «---» se guardan vacíos.
* Días hasta resolver = días naturales entre Apertura y Resolución, igual que la columna DIAS ABIERTO del Excel.
* Para cerrar una incidencia hay que escribir la solución (sustituye a la regla de «solución distinta de Pendiente»).
* El periodo por defecto del panel es «Este año», para que se vean los datos del GR-01.
* Panel rehecho (fase 3): filtros siempre a la vista, subpestañas «Gráficos» y «Listado», tipo de gráfico elegible en cada tarjeta y listado con orden, paginación y tabla o tarjetas.
* Cada desglose se calcula sin su propio filtro y resalta el valor elegido, para que al filtrar por un valor el gráfico siga enseñando los demás para comparar.
* Barras, columnas y tablas enseñan los 10 primeros valores (o los que se elijan) con «Ver todos» y una nota con lo que no se muestra. El circular enseña los 5 primeros y junta el resto en «Otros».
* Colores del circular, en este orden: dorado #CE9816, azul #2a78d6, rojo #e34948, violeta #6250d6, verde agua #1baf7a; «Otros» en gris #9a9890. Validados para daltonismo; siempre con leyenda, número y porcentaje al lado.
* Las preferencias de vista (tipo de cada gráfico, gráfico a medida, orden, vista y número por página del listado, subpestaña) se recuerdan en el navegador de cada persona.
* En el móvil, los filtros empiezan plegados y el listado se ve en tarjetas; en pantallas grandes, en tabla.
* Fase 4: «¿Mejoramos?» es la métrica principal del panel y su primera subpestaña. Usa todos los filtros menos el periodo.
* «Mejora» o «Empeora» solo si el cambio es de un 10 % o más (3 puntos o más en los porcentajes). Con menos de 6 incidencias entre los dos periodos (10 por cada valor de una sección), «Pocos datos».
* Para comparar periodos de distinta duración, por defecto se cuenta por día laborable (lunes a viernes, sin festivos). Si el último dato registrado es anterior al final del periodo, el periodo se cuenta solo hasta ese día.
* No se mide la tasa de incidencias por pedido porque el número de pedidos no está en el registro. Si se consigue, sería la mejor forma de saber si se mejora.
* Colores de «¿Mejoramos?»: verde para mejora y rojo para empeora, siempre con flecha y texto («▼ Mejora», «▲ Empeora»); gris para igual y para «Antes»; dorado para «Ahora».
