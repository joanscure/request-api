## Alta prioridad (muy útiles en un HTTP client)

1. Copy as cURL / Import from cURL

Probablemente lo más pedido en esta categoría de herramientas. Copiar la request actual como curl -X POST ... o pegar un comando cURL y que se autocomplete el formulario. Es la forma más común de compartir requests entre devs.

2. Export / Import de colecciones

Guardar una colección como .json y poder importarla. Hoy todo queda atado al localStorage de esa máquina. Sin esto no podés hacer backup ni compartir tu set de requests.

3. Múltiples tabs de request

En vez de perder el request activo al cargar otro, tener pestañas abiertas en simultáneo (como el browser). Cambia bastante la UX del día a día.

---
## Mediana prioridad (nice to have)

4. Assertions / tests básicos

Un mini-panel donde definís reglas sobre la respuesta: status === 200, body.data.length > 0, headers["content-type"] contains "json". Muy útil para smoke testing de APIs.

5. Response diff

Ejecutás la misma request dos veces (o contra dos entornos) y comparás los JSONs. Útil cuando querés ver qué cambió entre deploys.

6. Repeat / rate tester

Enviar la misma request N veces o cada X segundos y ver resultados agregados (tiempos min/max/avg, % de errores). Load testing básico sin salir de la app.
