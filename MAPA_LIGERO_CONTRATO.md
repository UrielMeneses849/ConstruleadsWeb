# Contrato: endpoint ligero de mapa

Objetivo: que el mapa pinte los clústeres de una primera visita en menos de 2 segundos, sin esperar el XML detallado de `ws_cl_obras`.

## Endpoint

`POST /ws_new_cl/ws_cl.asmx/ws_cl_obras_mapa`

Recibe el mismo formulario que `ws_cl_obras`:

```text
sId_usuario=<usuario>
sId_session=<sesión>
sTk=<token>
```

Debe responder `application/json` comprimido (`br` o `gzip`) y no depender de que el cliente descargue el XML completo antes de enviar la respuesta.

## Respuesta

```json
{
  "obras": [
    {
      "clave": "OC318949-1",
      "origen": "Construleads",
      "proyecto": "Edificio en 5 niveles",
      "lat": 19.404859,
      "lng": -99.166088,
      "region": "Centro",
      "estado": "Ciudad de Mexico",
      "genero": "Vivienda",
      "subgenero": "Lujo",
      "tipoObra": "Condominios de Lujo",
      "tipoDesarrollo": "Obra Nueva",
      "tipoProyecto": "Proyecto contratado",
      "etapa": "Inicio",
      "sector": "Privado",
      "inversion": 62695800,
      "superficie": 2196,
      "fechaPublicacion": "05/03/2026",
      "fechaInicio": "27/10/2025",
      "fechaTermino": "27/10/2027"
    }
  ]
}
```

Los campos de filtro se incluyen para que el mapa respete el sidebar desde el primer pintado. El endpoint no necesita contactos, descripción, compañías ni campos de ficha: esos siguen llegando mediante `ws_cl_obras` en segundo plano.

## Rendimiento requerido

- P95 de tiempo hasta primer byte: **< 500 ms**.
- P95 de respuesta completa para 10,000 coordenadas: **< 1.5 s**.
- Cachear por usuario/permisos y versión de datos durante 5–15 minutos.
- Enviar el cuerpo progresivamente; no serializar todo el catálogo antes del primer `flush`.

## Activación frontend

Configurar en el build:

```text
VITE_MAP_OBRAS_ENDPOINT=/bimsa-ws/ws_cl_obras_mapa
```

En producción puede ser una URL HTTPS del mismo dominio. La app detecta la variable, precarga el endpoint al validar el acceso y lo consume en paralelo a `ws_cl_obras`; si falta o falla, el flujo actual funciona como fallback.
