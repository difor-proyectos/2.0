# DIFOR Comercial V28.17

Version local para GitHub y Cloudflare Pages con diseno blanco principal, modo Black opcional, texto de alto contraste, acentos naranjo y Prospectos optimizado para trabajo comercial diario.

## Cambios principales
- Catalogo de precios regenerado solo desde las cinco listas septiembre 2026: Jetour, Soueast, Kaiyi, Karry y Maxus.
- La app fuerza limpieza de precios, listas e historial anteriores al abrir esta version y recarga 284 filas de precio / 104 versiones vigentes.
- Inicio se mantiene como entrada comercial.
- Portafolio muestra caracteristicas solamente y queda cerrado hasta completar marca, modelo y version.
- Sala de Venta muestra los vehiculos seleccionados con valores estilo calculadora y permite editar documentacion por vehiculo.
- Fichas tecnicas reemplaza al comparador y permite guardar PDF o link para compartir.
- Calculadora + usa iconos sutiles para copiar valores y mantiene Cotizar como flujo interno de WhatsApp.
- Prospectos incorpora filtro mensual y registro manual por cliente, sin medir avance.
- Prospectos agrega clasificación rápida de crédito aprobado/no aprobado, auto en parte de pago y venta de seguro.
- Prospectos cambia a una mesa de trabajo compacta con estado editable directo, observaciones autoguardadas y flujo comercial desplegable.
- Prospectos registra BK, Autofin, tipo de compra, pie, parte de pago, precio previa revisión, revisión, precio final revisado, reserva/pago, firma, NC, seguro, preparación, entrega, nota de venta, VIN y patente.
- Panel de control pasa a llamarse Back Office e incluye links, apuntes, recordatorios y planes de accion.
- Back Office muestra los links como botonera ordenada y profesional.
- Dashboard queda como resumen mensual profesional, sin comparativa contra mes anterior, con graficas de creditos, gestiones, embudo comercial y ratios.
- Modo Black queda como segunda apariencia seleccionable desde la barra superior.
- Widget rapido y Cotizar como modulo independiente quedan fuera de la navegacion.
- Modo Venta y Modo Edicion quedan visibles; en Edicion aparece acceso directo para editar la web.
- Inicio abre la pagina oficial de cada marca desde sus botones.
- Prospectos muestra nombre, RUT, auto cotizado y tipo de venta contado/credito.
- Prospectos usa botones de gestion mas sutiles para evitar textos cortados.
- Back Office queda separado por pestanas: Links, Recordatorios, Apuntes y Planes.
- Ajustes responsive para evitar cortes de texto en escritorio, notebook, tablet y celular.
- Inicio corrige la visualización de logos y mantiene acceso a páginas oficiales.
- Prospectos deja las observaciones a la vista en cada tarjeta.
- Calculadora + permite escribir montos largos o con puntos sin cortar la digitación.
- Tarjeta de contacto usa el texto formal fijo de Axel Rojas.
- Sala de Venta muestra precios con y sin flete; documentación queda oculta hasta desplegarla.
- Precio Previa Evaluación mantiene texto oscuro y legible dentro de la hoja blanca aunque la app esté en modo Black.
- Calculadora + conserva correctamente marca, modelo y versión seleccionados, sin volver a X50 al revisar otros valores.
- Portafolio agrega edición directa de información comercial, página oficial, imagen y ficha por versión.
- Inicio móvil compacta reloj, logos y botonera inferior para adaptarse mejor a pantallas de celular.
- Portafolio mejora el ajuste de textos largos en escritorio y pantallas pequeñas.
- Paquete Cloudflare Pages agrega `_worker.js`, `_redirects` y `404.html` para evitar error 404 y habilitar nube entre dispositivos.
- Inicio reemplaza las imágenes parchadas por logos monocromos limpios en las tarjetas oficiales de marca.
- Inicio ajusta la grilla por PC, tablet y celular para evitar botones cortados.
- Prospectos queda más compacto: resumen principal, acciones rápidas, observaciones visibles y detalle desplegable.
- Inicio usa los logos reales enviados por el usuario, procesados en versiones transparentes negras y blancas para que se vean integrados en modo blanco y modo black.
- Botones de marca refinados para evitar el efecto de imagen parchada y mantener proporción correcta en celular, tablet y PC.
- Inicio V28.12 incrusta los logos dentro de `index.html` para evitar fallas de carga y elimina marcas duplicadas o vacias en la pantalla inicial.
- Prospectos V28.13 diferencia visualmente cada cliente, deja observaciones con mas alto de escritura y evita textos cortados al escribir.
- Paquete V28.13 incluye `index.html` y `404.html` en la raiz para evitar error 404 en Cloudflare Pages.
- Precios V28.14 regenerados directamente desde las cinco listas adjuntas y version interna actualizada para limpiar datos antiguos guardados en el navegador.
- Precio de lista queda visible como fila propia en Calculadora +, Sala de Venta y texto formal de WhatsApp.
- Nube V28.17 agrega botón de diagnóstico y sincronización manual desde la app.
- La sincronización inicial sube solo datos vivos de trabajo, no el catálogo completo de precios.
- Si R2 no está conectado, una foto/banner pesado no bloquea la sincronización de prospectos, gestiones, notas y sala.
- Se agrega `_routes.json` para reforzar rutas de Cloudflare Pages y reducir errores 404.
- Fotos, banners y fichas vuelven a poder cargarse en Portafolio y Sala de Venta; para archivos grandes se usa Cloudflare R2.
- Diseño general reduce espacios verticales para trabajar con menos scroll.

## Despliegue
Subir todos los archivos de esta carpeta al proyecto web. Para que un prospecto cargado en PC aparezca en celular, Cloudflare Pages debe publicar tambien `_worker.js`, `_routes.json` y tener D1 vinculado como `DIFOR_DB` o `DB`. Para fotos, banners y PDF grandes, vincular R2 como `DIFOR_FILES` o `BUCKET`.
