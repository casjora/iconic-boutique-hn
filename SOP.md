# 📄 Manual de Procedimientos Operativos (SOP) — Iconic Boutique HN

**Documento Operativo Estándar para Dueños y Vendedores**  
*Plataforma Web de Gestión de Fragancias, Inventario, Clientes y Ventas*

---

## 📌 1. Introducción y Propósito

Este **Manual de Procedimientos Operativos (SOP)** tiene como objetivo guiar al equipo de trabajo (**Dueño y Vendedores**) en el uso eficiente y seguro de la plataforma **Iconic Boutique HN**. 

Aquí encontrarás el paso a paso detallado de cómo atender pedidos, registrar ventas físicas en mostrador, aprobar nuevos clientes con tarifas VIP, cargar inventarios con Inteligencia Artificial, imprimir códigos de barras y monitorear las métricas de la boutique.

---

## 👥 2. Matriz de Roles y Permisos

| Función / Módulo | Cliente / Público | Vendedor 🛍️ | Dueño 👑 |
| :--- | :---: | :---: | :---: |
| Ver Catálogo y Precios según su nivel | ✅ | ✅ | ✅ |
| Crear Carrito y Enviar Pedidos | ✅ | ✅ | ✅ |
| Alertas Flotantes de Pedidos y Clientes | ❌ | ✅ | ✅ |
| Aprobación de Pedidos (`/orders`) | ❌ | ✅ | ✅ |
| Gestión de Clientes y Asignación de Tarifas (`/customers`) | ❌ | ✅ | ✅ |
| Carga de Inventario y Carga Masiva con IA (`/inventory`) | ❌ | ✅ | ✅ |
| Impresión y Lectura de Códigos de Barras (`/barcodes`) | ❌ | ✅ | ✅ |
| Reportes y Métricas (`/dashboard`) | ❌ | ✅ | ✅ |
| Ajustes de Telegram, Bancos y Negocio (`/config`) | ❌ | ❌ | ✅ |

---

## 🔔 3. Sistema de Alertas y Notificaciones en Tiempo Real

El sistema está diseñado para que **nunca pierdas una venta o un cliente nuevo**.

### 📱 A. Alerta en Telegram
* Cada vez que un cliente realiza un pedido en la web, el bot de **Telegram** envía de inmediato un mensaje al grupo del equipo con el resumen de productos, total y contacto del cliente.

### 💻 B. Alertas Flotantes en la Web (Notis-Stack)
* Si estás en la laptop o tablet con la sesión abierta (en segundo plano o navegando), aparecerá una **tarjeta emergente animada** en la esquina inferior derecha notificando:
  * 🛍️ **Nuevo Pedido Recibido**: Indica la cantidad de órdenes pendientes. Haz clic en *"Revisar Pedidos"* para ir directo al panel.
  * 👤 **Nuevo Registro de Cliente**: Notifica que un nuevo cliente creó cuenta. Haz clic en *"Asignar Tarifas"* para calificarlo.
* En el menú superior (**Navbar**), los botones de **Pedidos** y **Clientes** mostrarán un contador en rojo/dorado parpadeante mientras existan solicitudes pendientes.

---

## 📦 4. Procedimiento 1: Gestión de Inventario y Productos

### A. Carga Manual de un Producto
1. Dirígete a la pestaña **Inventario**.
2. Haz clic en el botón **"Nuevo Producto"**.
3. Completa los campos solicitados:
   * **Nombre y Marca** (ej. *Club de Nuit Intense - Armaf*).
   * **Categoría y Tipo** (Caballero, Dama, Unisex / Eau de Parfum, Extrait, etc.).
   * **Precios:** Ingresa el costo, precio sugerido para cliente final (detalle) y el precio especial para distribuidores VIP (mayoreo).
   * **Stock disponible** y **Código de Barras**.
   * **Imagen del Producto** (Subir imagen o pegar URL).
4. Haz clic en **"Guardar Producto"**.

### B. Carga Masiva con Inteligencia Artificial (PDF / Excel / Imágenes) 🤖
1. En **Inventario**, selecciona la opción **"Cargar con IA (PDF / Lista)"**.
2. Sube la lista de precios o factura digital que te envió el proveedor.
3. La IA de **Gemini** procesará el documento automáticamente, extrayendo nombres, marcas, precios y cantidades.
4. Revisa la vista previa generada y confirma la importación masiva.

### C. Impresión y Escaneo de Códigos de Barras 🏷️
1. Ingresa a la sección **Códigos de Barras**.
2. Selecciona las fragancias que vas a etiquetar en tienda.
3. Elige la cantidad de etiquetas e imprime directamente en tu impresora de etiquetas o papel adhesivo.
4. Para venta física en el mostrador, utiliza el escáner USB o la cámara integrada para buscar el producto de forma instantánea.

---

## 👤 5. Procedimiento 2: Aprobación de Clientes y Tarifas VIP

Cuando un cliente crea su cuenta en la plataforma, ingresa automáticamente con rol **Cliente General**.

### Paso a paso para habilitar tarifas especiales:
1. Al recibir la alerta de *"Nuevo Registro"*, dirígete a la sección **Clientes**.
2. Ubica al cliente en la pestaña de **"Pendientes de Verificación"**.
3. Revisa su información de contacto (Nombre, Teléfono, Ciudad).
4. Selecciona el **Nivel de Tarifa / Rol**:
   * **Cliente Regular:** Ve los precios normales de venta al público.
   * **Distribuidor / VIP:** Habilita automáticamente los precios de mayoreo/distribuidor en toda la tienda cuando el usuario inicie sesión.
   * **Vendedor / Staff:** Otorga permisos de acceso al panel administrativo.
5. Haz clic en **"Guardar Cambios"**. El cliente verá sus nuevos precios inmediatamente.

---

## 📋 6. Procedimiento 3: Procesamiento de Pedidos y Ventas de Mostrador

### A. Gestión de Pedidos en Línea
1. Dirígete al panel de **Pedidos**.
2. Verás los pedidos ordenados cronológicamente con las siguientes pestañas de estado:
   * **Pendiente:** Pedido recién ingresado.
   * **En Proceso / Pagado:** Pago verificado o en preparación.
   * **Despachado:** Guía enviada o entregado al repartidor.
   * **Completado:** Venta finalizada con éxito.
3. **Acciones recomendadas:**
   * Haz clic en el ícono de **WhatsApp** junto al pedido para abrir un chat directo con el cliente con el mensaje de confirmación pre-redactado.
   * Si el cliente paga por transferencia o Tigo Money, verifica la foto del comprobante y cambia el estado a **"En Proceso"**.
   * Una vez entregado el perfume, marca la orden como **"Completado"**.

### B. Registro de Venta Física (Mostrador) 🛍️
Para compras directas realizadas por clientes presenciales en la boutique:
1. En la pestaña de **Pedidos**, haz clic en el botón negro **"+ Registrar Venta Física"**.
2. Elige un cliente genérico o específico y digita su teléfono si es necesario.
3. **Selección de la Tarifa Aplicable:**
   * Utiliza el control de casilla **"¿Es venta al mayoreo?"** (Checkbox).
   * Si la casilla está **marcada**, se aplicará automáticamente el **Precio Mayorista VIP** a todas las fragancias agregadas.
   * Si la casilla está **desmarcada**, se aplicará la tarifa normal de **Precio Detalle** (Venta al Público).
4. Busca y añade los perfumes por código de barras o escribiendo su nombre de la lista desplegable.
5. Haz clic en **"Registrar Venta Directa"**. La venta se creará en estado **ENTREGADO** y descontará automáticamente el stock físico correspondiente.

### C. Edición de Órdenes y Vista Adaptada 🖥️
* Si necesitas modificar una orden, haz clic en el botón **"Editar"** del historial.
* La ventana de edición y la de registro físico han sido optimizadas para expandirse con scroll vertical completo de manera natural (`overflow-y-auto` sobre el fondo del modal). Esto garantiza que el botón de **Cerrar (X)** y el footer de guardar queden siempre accesibles sin importar el tamaño de pantalla del dispositivo o la cantidad de ítems en el pedido.

---

## 🛡️ 7. Reglas de Validación de Precios (Seguridad Anti-Errores)

La plataforma cuenta con un robusto motor de seguridad que valida los precios unitarios al momento de registrar o editar un pedido. Estas reglas previenen pérdidas económicas y fraudes:

1. **Clientes de Detalle (Venta Regular):**
   * El precio cobrado por cada fragancia **no puede ser menor al precio de mayoreo** configurado para ese producto en el catálogo.
   * *Ejemplo:* Si una fragancia tiene precio público de L. 2,800 y precio mayorista de L. 2,100, no se permitirá cambiar su precio a menos de L. 2,100 para ventas de detalle.
2. **Clientes de Mayoreo (VIP/Distribuidor):**
   * El precio cobrado **no puede ser menor al costo de adquisición** del producto.
   * *Ejemplo:* Si el costo del perfume es de L. 1,400, no se permitirá venderlo a un distribuidor a menos de L. 1,400, protegiendo siempre el margen base de recuperación.

> ⚠️ **Nota:** Intentar saltarse estas validaciones en la pantalla resultará en una advertencia de color rojo y la base de datos (**Supabase**) bloqueará la transacción de manera definitiva.

---

## 📊 8. Procedimiento 4: Monitoreo de Métricas (Dashboard)

1. Ingresa a la sección **Dashboard**.
2. Revisa diariamente los indicadores principales:
   * **Ventas Totales ($ / Lps)** acumuladas del mes.
   * **Ganancia Neta Estimada**.
   * **Total de Pedidos** procesados.
   * **Top Fragancias Más Vendidas** (útil para saber qué perfumes reabastecer con proveedores).
   * **Clientes Más Activos**.

---

## ⚙️ 9. Procedimiento 5: Configuración del Sistema (Solo Dueño)

1. Ingresa a la pestaña **Configuración** (`/config`).
2. **Integración de Telegram:**
   * Introduce el `Bot Token` y `Chat ID` para mantener activas las notificaciones automáticas en el celular.
3. **Cuentas Bancarias y Métodos de Pago:**
   * Mantén actualizados los números de cuenta bancarios (BAC, Ficohsa, Atlántida, Tigo Money) que se le muestran al cliente en el checkout del carrito.
4. **Datos del Negocio:**
   * Actualiza el número oficial de WhatsApp de la boutique y la dirección física.

---

## 🔒 10. Buenas Prácticas y Consejos de Seguridad

1. **Cierre de Sesión:** Siempre cierra sesión o bloquea el equipo si vas a ausentarte del mostrador o laptop principal.
2. **Contraseñas Seguras:** Utiliza contraseñas fuertes para la cuenta con rol *Dueño* o *Vendedor*.
3. **Base de Datos Protegida:** La base de datos cuenta con políticas **Supabase RLS**, lo que garantiza que los usuarios no puedan alterar precios o roles de forma fraudulenta desde el navegador.

---
*Manual elaborado para Iconic Boutique HN — Última actualización: Agosto 2026*
