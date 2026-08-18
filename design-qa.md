# Design QA — Hotfix navegación y tablas

## Referencia

- Capturas proporcionadas por el usuario para la navegación de dos niveles.
- Vistas actuales de Proyectos/Resultados y Licitaciones en modos claro y oscuro.

## Verificaciones realizadas

- La barra principal renderiza únicamente Proyectos y Licitaciones.
- La subnavegación Mapa, Resultados y Gráficas sólo pertenece a Proyectos.
- La subnavegación ocupa únicamente el panel derecho; el sidebar conserva su altura completa.
- Encabezados de Resultados alineados a la izquierda.
- Encabezados de Licitaciones con filtro emergente y orden ascendente/descendente.
- Sidebar de Licitaciones con un solo acordeón abierto y posibilidad de cerrar todos.
- Favoritos con contraste independiente del modo de color.
- Columna Acciones sticky y botón de ojo homologado con Resultados.
- La columna Acciones recorta contenido subyacente y conserva un ancho fijo al desplazarse.
- Los filtros de columnas listan valores del dataset, permiten búsqueda y selección múltiple, y cierran con clic exterior o Escape.
- Las filas favoritas usan una mezcla sólida con la superficie y no transparentan contenido bajo columnas sticky.
- La paginación de Licitaciones sigue el patrón inferior de Resultados.
- Los filtros de Resultados incorporan acciones persistentes Limpiar y Listo.
- Licitaciones reutiliza en memoria la respuesta normalizada por usuario y sesión al alternar módulos.
- Los paneles de resumen de Proyectos y Licitaciones comparten la misma línea base fija y el mismo margen inferior.
- Ambos sidebars ocupan toda la altura útil hasta el padding exterior mínimo de la aplicación.
- El contenido de Proyectos queda separado de la subnavegación por un único espacio compacto de 4 px.
- El mapa reserva la altura completa del panel inferior para evitar cualquier superposición.
- Gráficas elimina el encabezado redundante y conserva la selección actual en un indicador compacto.
- La selección actual de Gráficas vive exclusivamente en una tarjeta naranja diferenciada del panel inferior y se actualiza con los cruces gráficos.
- Proyectos y Licitaciones comparten una retícula de seis columnas con anchos idénticos y la misma coordenada de origen inferior.
- Gráficas usa una retícula compacta de seis columnas que antepone Selección actual sin desplazar los anchos semánticos de Proyectos, Inversión, Estados, Superficie y Fecha.
- El mapa impide zoom mundial, restringe la cámara al territorio operativo y descarta coordenadas geográficas fuera de México antes del clustering.
- Licitaciones reutiliza la misma transición de entrada de las vistas de Proyectos, respetando reducción de movimiento.
- ESLint de los archivos nuevos/modificados de Licitaciones y shell: aprobado.
- Build de producción: aprobado.

## Bloqueo de comparación visual

La superficie de Browser requerida para capturar y comparar el mismo viewport no está disponible en esta sesión. No se realizó una afirmación de paridad visual basada únicamente en el build.

---

# Design QA — módulo Compañías (propuesta)

## Comparación prevista

- Fuente visual: captura de la propuesta de compañías adjunta por el usuario (vista de escritorio, tabla a la izquierda y mapa a la derecha).
- Implementación: `/construleads/companias`, con el mismo estado de filtros y dataset de proyectos.
- Viewport objetivo: escritorio 1920 × 1270 CSS px, contenido de aplicación sin chrome del navegador.
- Densidad: 1×; la referencia no incluye un archivo local para normalizar densidad.

## Revisión de implementación realizada

- Tipografía y contenido: se mantiene Poppins y la jerarquía de la aplicación; el texto de propuesta aclara que RFC y clave dependen del próximo WS.
- Retícula y espaciado: tabla y mapa usan dos paneles equivalentes con encabezado oscuro, fila de totales y resumen inferior; bajo 1120 px se apilan para evitar recortes.
- Tokens de color: conserva el naranja de Construleads, las superficies claras y la codificación por sector del mapa.
- Interacciones: los filtros existentes se aplican antes de agrupar, una fila filtra/restaura sus proyectos en el mapa, los marcadores se agrupan y el CSV se descarga localmente.
- Rendimiento: la vista se carga bajo demanda; el primer resultado usa el lote preliminar o la caché de proyectos existente; la agrupación se memoiza y los marcadores se reutilizan, se añaden por lotes y se cancelan cuando cambian los datos.
- Comprobaciones técnicas: lint de los archivos modificados y build de producción aprobados; prueba de agregación de compañías aprobada.

## Bloqueo de comparación visual

No hay una superficie Browser disponible en esta sesión para abrir la ruta autenticada, capturarla y compararla lado a lado con la referencia. Por ello no existe una captura renderizada ni evidencia de consola para declarar la paridad visual; queda pendiente una pasada visual en navegador.

---

# Design QA — detalle modal de Compañías

## Comparación prevista

- Fuente visual: las dos capturas de propuesta compartidas por el usuario; contienen tabla de compañías con contactos LinkedIn y un detalle lateral de empresa.
- Implementación: modal centrado desde la columna **Detalle** de `/construleads/companias`.
- Estado revisado en código: compañía con distribución de proyectos, identificación, contactos de dataset y contactos LinkedIn.

## Revisión de implementación realizada

- La tabla incorpora los campos faltantes de la propuesta: RFC, clave, compañía, proyectos, inversión, estados, contador LinkedIn y acción de detalle.
- El detalle evita el sidebar solicitado y concentra el contenido en un modal de altura acotada: encabezado, cuatro KPIs, dos distribuciones, pipeline, proyectos principales, perfil y ambas fuentes de contacto en la misma pantalla de escritorio.
- Los contactos reales se normalizan y deduplican por compañía. El parser ya soporta aliases habituales de nombre, cargo, correo, teléfonos, sitio web y LinkedIn para recibirlos sin rediseñar al llegar el WS.
- Para el dataset actual, que no incluye personas ni perfiles de LinkedIn, el modal comunica la ausencia de datos explícitamente en vez de fabricar contactos.
- Interacciones previstas: botón de ojo abre el modal; clic fuera, botón de cierre y Escape lo cierran; correos/teléfonos/perfiles enlazados son accionables cuando existen.
- Validación técnica: lint de los archivos modificados, build de producción y prueba de deduplicación de contactos aprobados.

## Iteración: lista completa de proyectos

- Se sustituyó el bloque limitado de “Proyectos de mayor inversión” por **Todos los proyectos**: cada proyecto de la compañía se conserva en el DOM, ordenado por inversión, con contador de resultados y búsqueda por nombre, clave, estado, región o género.
- El scroll quedó acotado al listado de proyectos; el modal no crece ni desplaza sus KPIs, gráficas o contactos.
- Se eliminaron los campos duplicados “Ubicación” y “Dirección”; el perfil usa un único campo de domicilio con dirección disponible y, como respaldo, estado.
- Prueba funcional de agregación: una compañía con 169 registros conserva los 169 proyectos en su perfil.

## Bloqueo de comparación visual

No se dispone de la superficie Browser para abrir el estado autenticado, capturar el modal y compararlo visualmente con las referencias. Falta esa pasada antes de declarar paridad visual.

final result: blocked
