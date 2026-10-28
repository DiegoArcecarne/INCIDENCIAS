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

1. En el editor, elige la función `prepararHoja` en el desplegable de arriba y pulsa **Ejecutar**.
2. Acepta los permisos (Sheet, Drive y correo). Si sale «Google no ha verificado esta aplicación»: **Configuración avanzada → Ir a … (no seguro)**. Es tu propio script.
3. En el Sheet aparecerá la pestaña `Incidencias` con las cabeceras.

## 5. Publicar

1. **Implementar → Nueva implementación → Tipo: Aplicación web**.
2. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario** (la clave protege la entrada).
3. Copia la URL que termina en `/exec`. Esa es la dirección de la página.

Cuando cambies el código: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. La URL no cambia.

## 6. Avisos por correo (opcional)

En `Config.gs`, rellena `CORREOS_COMERCIALES` y `RESPONSABLES`. Guarda y publica una nueva versión.

## 7. En el móvil

Abre la URL en el navegador del teléfono y usa **Añadir a pantalla de inicio**.
