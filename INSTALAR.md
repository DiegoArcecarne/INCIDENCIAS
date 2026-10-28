# Cómo instalar el registro de incidencias

Sin terminal: todo se hace copiando y pegando en el navegador.

## 1. Hoja y carpeta

1. Crea un Google Sheet nuevo (por ejemplo, «Incidencias Arcecarne»).
2. Crea una carpeta en Drive para las fotos (por ejemplo, «Fotos incidencias»). Ábrela y copia su ID: es la parte de la dirección que va después de `/folders/`.
3. Comparte esa carpeta (solo lectura) con las personas que tengan que ver las fotos desde el panel o el correo.

## 2. Pegar el código

1. En el Sheet: **Extensiones → Apps Script**.
2. Renombra `Código.gs` a `Codigo` y pega dentro el contenido de `Codigo.gs`.
3. Pulsa **+ → Secuencia de comandos**, llámalo `Config` y pega `Config.gs`.
4. Pulsa **+ → HTML** tres veces y crea `Index`, `Estilos` y `App`. Pega en cada uno su archivo (`Index.html`, `Estilos.html`, `App.html`). Borra lo que trae el archivo nuevo antes de pegar.
5. Guarda (icono del disquete).

## 3. Clave y carpeta

**Configuración del proyecto** (rueda dentada) → **Propiedades del script** → **Añadir propiedad**:

| Propiedad | Valor |
|---|---|
| `CLAVE_ACCESO` | la clave común que vais a usar |
| `ID_CARPETA_FOTOS` | el ID de la carpeta del paso 1 |

## 4. Preparar la hoja y dar permisos

1. En el editor, elige la función `prepararTodo` en el desplegable de arriba y pulsa **Ejecutar**.
2. Acepta los permisos (Sheet, Drive y correo). Si sale «Google no ha verificado esta aplicación»: **Configuración avanzada → Ir a … (no seguro)**. Es tu propio script.
3. En el Sheet aparecerán las pestañas `Incidencias` (con las cabeceras) e `Importar GR-01` (vacía). Si ya tenías la pestaña de la primera prueba, se conserva como «Incidencias (primera prueba)».
4. Recarga el Sheet: aparece el menú **Incidencias**.

## 5. Publicar

1. **Implementar → Nueva implementación → Tipo: Aplicación web**.
2. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario** (la clave protege la entrada).
3. Copia la URL que termina en `/exec`. Esa es la dirección de la página.

Cuando cambies el código: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. La URL no cambia.

## 6. Avisos por correo (opcional)

En `Config.gs`, rellena `CORREOS_ASIGNADO_A` y `RESPONSABLES`. Guarda y publica una nueva versión.

## 7. En el móvil

Abre la URL en el navegador del teléfono y usa **Añadir a pantalla de inicio**.

## 8. Cargar el Excel GR-01

Se puede repetir siempre que el Excel cambie: no duplica, actualiza.

1. Abre el Excel GR-01 en SharePoint. Selecciona toda la hoja (Ctrl+A) y cópiala (Ctrl+C).
2. En el Google Sheet, ve a la pestaña **Importar GR-01**. Si tiene algo de antes, bórralo (Ctrl+A y Supr).
3. Haz clic en la celda **A1** y pega **solo los valores** con **Ctrl+Mayús+V** (en Mac, Cmd+Mayús+V). Así las fechas no cambian de formato.
4. Menú **Incidencias → Importar GR-01**. La primera vez pedirá permisos.
5. Sale un aviso con cuántas incidencias se han añadido y actualizado. Abre la aplicación y pulsa «Actualizar» en el panel.

## 9. Pasar de la primera versión a esta

1. Sustituye el contenido de los cinco archivos (`Codigo`, `Config`, `Index`, `Estilos` y `App`).
2. Ejecuta `prepararTodo` (paso 4).
3. Publica una versión nueva: **Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar**.
4. Carga el Excel GR-01 (paso 8).
