# ⚜️ Iconic Boutique HN - Manual de Despliegue y Configuración

¡Bienvenido al repositorio de **Iconic Boutique HN**! Esta es una plataforma web premium de alta gama desarrollada con **React, Vite, Express, Tailwind CSS y TypeScript**, diseñada para simplificar la importación de fragancias, la cotización automatizada mediante WhatsApp, el escaneo inteligente de facturas de perfumes usando Inteligencia Artificial, y la sincronización con **Supabase** como base de datos en la nube.

Este manual didáctico te guiará paso a paso para desplegar el proyecto en **GitHub y Vercel**, conectar la API gratuita de **Gemini**, configurar alertas en tiempo real de **Telegram** para tus vendedores y activar la base de datos relacional de **Supabase**.

---

## 📌 Índice de Contenidos
1. [Subir el Proyecto a GitHub](#1-subir-el-proyecto-a-github)
2. [Configuración de Supabase (Base de Datos)](#2-configuración-de-supabase-base-de-datos)
3. [Integración de la API Gratuita de Gemini](#3-integración-de-la-api-gratuita-de-gemini)
4. [Configuración de Alertas en Telegram para Vendedores](#4-configuración-de-alertas-en-telegram-para-vendedores)
5. [Despliegue en Producción (Vercel + Backend)](#5-despliegue-en-producción-vercel--backend)
6. [Actualizar y Sincronizar el Inventario](#6-actualizar-y-sincronizar-el-inventario)

---

## 1. Subir el Proyecto a GitHub

Sigue estos comandos sencillos en tu terminal para crear tu repositorio e iniciar el control de versiones:

### Paso 1: Inicializar Git Local
Si el proyecto aún no tiene Git inicializado, abre la terminal en la carpeta raíz y ejecuta:
```bash
git init
```

### Paso 2: Crear el Archivo `.gitignore`
Asegúrate de que tus credenciales secretas no se suban a la nube. El archivo `.gitignore` debe contener al menos:
```env
node_modules
dist
.env
server-db.json
.DS_Store
```

### Paso 3: Agregar los Archivos y Hacer tu Primer Commit
```bash
git add .
git commit -m "feat: configuracion premium de Iconic Boutique HN con formula de cambio L27 y Supabase SQL"
```

### Paso 4: Vincular con GitHub
1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio vacío llamado `iconic-boutique-hn`.
2. Copia la URL de tu repositorio de GitHub (ejemplo: `https://github.com/tu-usuario/iconic-boutique-hn.git`).
3. Ejecuta los siguientes comandos para renombrar la rama principal y subir el código:
```bash
git branch -M main
git remote add origin https://github.com/tu-usuario/iconic-boutique-hn.git
git push -u origin main
```

---

## 2. Configuración de Supabase (Base de Datos)

**Supabase** actuará como el backend permanente en la nube para guardar tu catálogo, el registro de tus 3 roles de usuario autenticados (`usuario`, `vendedor`, `dueño`) y las órdenes recibidas.

### Paso 1: Crear el Proyecto
1. Registrate en [Supabase](https://supabase.com) de forma gratuita.
2. Haz clic en **New Project**, asígnale el nombre `Iconic Boutique HN`, define una contraseña segura para tu base de datos y selecciona la región más cercana a Honduras (ejemplo: *East US*).

### Paso 2: Ejecutar el Script SQL Generador de Tablas y Roles
1. Una vez creado tu proyecto de Supabase, ve al menú lateral izquierdo y selecciona **SQL Editor** (el icono de `>_`).
2. Haz clic en **New Query**.
3. Abre el **Administrador de Inventario** de la aplicación local, presiona el botón **"Exportar a Supabase (SQL)"**, y copia el script completo generado. El script incluye:
   * **Tabla `profiles`:** Controla la autenticación obligatoria para los tres roles permitidos (`usuario`, `vendedor`, `dueño`).
   * **Tabla `products`:** Estructura con campos detallados, códigos de barra y políticas de seguridad RLS.
   * **Vista Segura `secure_catalog`:** Oculta automáticamente los costos de importación y el precio VIP (mayoreo) a personas no registradas (público general).
   * **Tabla `orders` y `order_items`:** Registros detallados de cotizaciones con validación obligatoria de nombre y teléfono del cliente.
   * **Tabla `favorites`:** Permite a los usuarios registrados seguir perfumes agotados.
   * **Trigger `on_auth_user_created`:** Sincroniza automáticamente los registros creados en Supabase Auth con la tabla de perfiles.
   * **Sembrado (Seeding) automático:** Inserta los perfumes cargados en tu inventario actual directo a la nube.
4. Pega el script copiado en la consola de Supabase y presiona el botón **Run**. ¡Listo! Tus tablas se habrán creado con políticas de seguridad RLS aplicadas.

---

## 3. Integración de la API Gratuita de Gemini

La inteligencia artificial se utiliza para escanear facturas en formato PDF que te envían tus proveedores de Estados Unidos (como *Perfume Price*). El sistema lee el documento en dólares, detecta las marcas, cantidades y aplica la **fórmula de costo nacional de Honduras de L. 27** de manera automática.

### Paso 1: Obtener tu Clave API Gratuita
1. Ingresa a [Google AI Studio](https://aistudio.google.com/).
2. Inicia sesión con cualquier cuenta de Google (Gmail).
3. Haz clic en el botón superior izquierdo **Get API Key**.
4. Haz clic en **Create API Key** y guárdala de forma segura.

### Paso 2: Vincularla a tu Entorno Local
1. En la raíz de tu proyecto, asegúrate de tener un archivo llamado `.env` (puedes crearlo copiando el `.env.example`).
2. Agrega tu clave de la siguiente forma:
```env
GEMINI_API_KEY=tu_clave_secreta_de_gemini_aqui
```

---

## 4. Configuración de Alertas en Telegram para Vendedores

Para que tus vendedoras y vendedores reciban una notificación instantánea en su celular cada vez que un cliente cotiza un perfume y puedan editarla o aprobarla de inmediato:

### Paso 1: Crear un Bot de Telegram con "BotFather"
1. Abre la aplicación de Telegram en tu celular o computadora y busca el chat de **BotFather** (el bot oficial verificado con insignia azul).
2. Envía el comando: `/newbot`
3. Dale un nombre elegante a tu bot, por ejemplo: `Iconic Boutique Alertas`.
4. Define un nombre de usuario único que termine en "bot", por ejemplo: `IconicHN_Alerts_bot`.
5. BotFather te responderá felicitándote y te entregará el **HTTP API TOKEN** (ejemplo: `738192837:AAFlv7u_...`). Cópialo de inmediato.

### Paso 2: Obtener el ID del Grupo o Chat de Ventas
1. Si deseas recibir alertas en un grupo junto con tus vendedores:
   * Crea un grupo de Telegram llamado **"Ventas Iconic Boutique"** y añade a tu nuevo bot como miembro.
   * Escribe un mensaje de prueba en el grupo (por ejemplo: `hola bot`).
   * Para obtener el ID del grupo, añade el bot público `@RawDataBot` al grupo de manera temporal; este bot te responderá de inmediato con un JSON que contiene el `"chat": { "id": -100xxxxxxxxxx }`. Copia ese número entero (incluyendo el signo menos `-`).
2. Si deseas recibir las alertas únicamente en tu chat privado:
   * Inicia chat con tu bot recién creado y presiona **Iniciar / Start**.
   * Escribe cualquier texto.
   * Visita la siguiente dirección en tu navegador reemplazando tu token de bot:
     `https://api.telegram.org/bot<TU_TOKEN_DE_BOT>/getUpdates`
   * Busca en el texto de respuesta el campo `"chat":{"id":123456789}`. Ese número de 9 o 10 dígitos es tu ID personal de Telegram.

### Paso 3: Configurar en el Panel de Iconic Boutique HN
1. Entra a la aplicación como **Dueño / Administrador**.
2. Ve a la pestaña **"Configuración Telegram"** en el menú de navegación superior.
3. Introduce el **Token de Bot** y el **Chat ID** que obtuviste.
4. Presiona **Guardar Configuración**. El sistema enviará una alerta de prueba instantánea. ¡A partir de ese momento, cada orden de compra disparará un mensaje con el detalle del pedido, total en Lempiras y un enlace directo de WhatsApp para contactar al cliente!

---

## 5. Despliegue en Producción (Vercel + Backend)

El proyecto cuenta con un backend en Node.js/Express (`server.ts`) y un frontend React/Vite. Vercel es excelente para alojar la aplicación web.

### Despliegue en Vercel
Para albergar una SPA de React con enrutador y backend en Vercel de manera integrada:
1. Crea una cuenta gratuita en [Vercel](https://vercel.com).
2. Conecta tu cuenta de GitHub.
3. Selecciona **Import Project** e importa tu repositorio `iconic-boutique-hn`.
4. **Configuración del proyecto:**
   * **Framework Preset:** Vite (o déjalo en *Other*).
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. **Variables de Entorno (Environment Variables):**
   Añade las siguientes variables de producción en el panel de Vercel antes de desplegar:
   * `GEMINI_API_KEY`: Tu API Key obtenida en Google AI Studio.
   * `NODE_ENV`: `production`
6. Presiona **Deploy**. Vercel construirá la interfaz de usuario de alto rendimiento en cuestión de segundos.

*(Nota: Para arquitecturas de producción donde el backend Express mantenga operaciones complejas en segundo plano las 24/7 de forma continua, se recomienda hospedar el archivo `server.ts` compilado en **Render.com** o **Railway.app** de manera complementaria, y apuntar la URL del cliente de producción a ese servidor).*

---

## 6. Sincronización y Actualizaciones en el Inventario

### La Fórmula de Costo Hondureña de L. 27
El sistema tiene preconfigurada la lógica financiera de Iconic Boutique HN:
* **Fórmula aplicada:** `Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27`
* **Regla de Aproximación:** Los costos generados por el escáner IA se aproximan automáticamente al múltiplo de **5 Lempiras más cercano** (por ejemplo: L. 513 se convierte en L. 515; L. 811 se convierte en L. 810).
* **Ausencia de Costos en Documentos de Clientes:** Al exportar el catálogo mediante el botón **"Exportar Excel"** o al abrir el **PDF Imprimible**, el sistema **excluye por completo la columna de costos de compra**, permitiéndote compartir listas de precios de 3 columnas (Nombre, Tamaño, Detalle y Mayoreo) con total tranquilidad de que tu margen se mantendrá privado.

### Actualizar la Base de Datos desde el Sistema
1. Entra como **Dueño** o **Vendedor**.
2. Dirígete al **Administrador de Inventario**.
3. Sube un PDF de factura para procesarlo con Inteligencia Artificial.
4. El sistema te mostrará una vista previa con los precios sugeridos de público y mayoreo calculados. Podrás ajustar los precios finales de venta antes de confirmar.
5. Al hacer clic en **"Confirmar y Cargar al Inventario"**, los productos se registrarán automáticamente.
6. Si deseas replicar los cambios de nuevo en Supabase, simplemente haz clic en **"Exportar a Supabase (SQL)"** en cualquier momento para obtener el script sincronizado con los nuevos artículos agregados.

---

### Desarrollado con Excelencia Premium para Iconic Boutique HN 🇭🇳
*Este software ha sido diseñado con interfaces limpias, tipografía responsiva y optimizado para una alta tasa de conversión en smartphones, garantizando un flujo ágil desde tus historias de Instagram directas a WhatsApp.*
