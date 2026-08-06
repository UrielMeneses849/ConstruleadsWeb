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
- Licitaciones reutiliza la misma transición de entrada de las vistas de Proyectos, respetando reducción de movimiento.
- ESLint de los archivos nuevos/modificados de Licitaciones y shell: aprobado.
- Build de producción: aprobado.

## Bloqueo de comparación visual

La superficie de Browser requerida para capturar y comparar el mismo viewport no está disponible en esta sesión. No se realizó una afirmación de paridad visual basada únicamente en el build.

final result: blocked
