# Remix Gestor de Trámites PPP - UTEA Filial Cusco

Sistema web interactivo para la gestión y generación automatizada de informes y resoluciones correspondientes a las Prácticas Pre-Profesionales (PPP) de la Escuela Profesional de Ingeniería Civil de la Universidad Tecnológica de los Andes (UTEA) - Filial Cusco.

## 🚀 Características Principales

1. **Registro Único de Estudiantes**
   - Registro con validación de código de estudiante (único), nombres completos (Title Case), institución/empresa (UPPERCASE) y fecha de inicio.
   - Búsqueda y acceso rápido mediante código de estudiante.

2. **Gestión de Trámites de Prácticas Pre-Profesionales**
   - **Designación de Asesor**: Registro de FUT, número de expediente y datos de emisión de informe y resolución de designación.
   - **Reasignación de Asesor**: Gestión de resolución previa, nuevo asesor y sustentación de cambio.
   - **Sustentación de Prácticas**: Solicitud de jurados (Presidente y Miembro), informe de aprobación de asesor y programación de acto de sustentación.
   - **Aprobación de PPP**: Gestión integral con vinculación de antecedentes, actas y emisión de resolución subdirectoral de aprobación.

3. **Motor de Documentos Oficiales (DOCX y PDF)**
   - Plantillas oficiales institucionales de la UTEA con escudos y membretes.
   - Sustitución de etiquetas inteligentes dinámicas con resaltado de variables.
   - Generación y descarga directa en formato Microsoft Word (.docx) mediante `docxtemplater` y `pizzip`.
   - Exportación de alta fidelidad a PDF con `jspdf` y renderizado de contingencia vectorial infalible.
   - Visualizador de documentos en tiempo real con previsualización fidedigna.

4. **Portal Administrativo**
   - Panel de control protegido para supervisión de trámites.
   - Aprobación, asignación de números de resolución, fechas y jurados evaluadores.
   - Filtros por estado (Pendiente, Revisado, Documentos Generados, Enviado) y tipo de trámite.
   - Gestor de plantillas DOCX personalizadas con almacenamiento en IndexedDB y localStorage.

5. **Copias de Seguridad y Sincronización**
   - Respaldo de datos exportable e importable en formato JSON.
   - Sincronización automática y respaldo en la nube con Google Drive y Google Apps Script Webhooks.

## 🛠️ Tecnologías Utilizadas

- **Framework**: React 19 + TypeScript + Vite
- **Estilos**: Tailwind CSS v4
- **Iconos**: Lucide React
- **Manipulación de Documentos**: `docxtemplater`, `pizzip`, `docx-preview`, `jspdf`, `html2canvas-pro`
- **Base de Datos y Tiempo Real (Multi-máquina)**: `@supabase/supabase-js` (PostgreSQL + Realtime WebSockets)
- **Autenticación e Integración**: Firebase SDK

## ⚡ Conexión a Supabase (Sincronización en Tiempo Real para todas las máquinas)

Para que cualquier alumno registrado, trámite emitido o plantilla Word modificada esté disponible instantáneamente para todas las personas en cualquier computadora:

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. En Supabase, ve a **SQL Editor** > **New Query**, pega el script generado por la aplicación (botón **Copiar Script SQL**) y pulsa **Run**.
3. En la aplicación (o en tu archivo `.env`), pulsa el botón **Conectar Supabase** e introduce:
   - **Project URL** (ej: `https://xyz.supabase.co`)
   - **Anon Public Key** (clave pública `eyJhb...`)
4. Haz clic en **Probar y Guardar Conexión**. A partir de ese momento, **cualquier cambio en cualquier máquina se sincroniza al instante para todos mediante WebSockets en tiempo real**.

## ☁️ Despliegue en Cloudflare Pages (Cloudflare Sites)

La aplicación está lista para desplegarse con 1 clic en **Cloudflare Pages**:

### Método 1: Conectando tu repositorio de GitHub (Recomendado)
1. Inicia sesión en tu panel de [Cloudflare](https://dash.cloudflare.com/) y dirígete a **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Selecciona tu repositorio de GitHub.
3. En la configuración de compilación (**Build settings**):
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (dejar en blanco o raíz)
4. (Opcional) En **Environment variables**, añade:
   - `VITE_SUPABASE_URL`: Tu URL del proyecto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Tu clave anónima pública de Supabase.
   *(También puedes conectarlo directamente desde el botón "Conectar Supabase" en la barra superior de la app).*
5. Haz clic en **Save and Deploy**. En menos de 1 minuto tendrás tu dominio activo (ejemplo: `https://tramites-utea.pages.dev`).

### Método 2: Subida Directa (Direct Upload / Wrangler)
1. En tu máquina ejecuta:
   ```bash
   npm run build
   ```
2. En Cloudflare Dashboard: **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
3. Arrastra la carpeta `dist/` generada.

> **Reglas SPA automáticas:** Se incluyó el archivo `public/_redirects` (`/* /index.html 200`), asegurando que la navegación y recargas en Cloudflare Pages funcionen fluidamente sin errores 404.

## 🌐 Despliegue en GitHub Pages

Este proyecto está 100% configurado para ejecutarse de manera estática y autónoma en **GitHub Pages**:

1. En tu repositorio de GitHub, ve a **Settings** (Configuración) > **Pages** (en el menú lateral izquierdo).
2. En la sección **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. Haz un `git push` a tu rama `main` o `master` (o ejecuta el workflow manualmente desde la pestaña **Actions** > **Desplegar en GitHub Pages** > **Run workflow**).
4. En 1-2 minutos tu aplicación estará publicada en:
   `https://<tu-usuario>.github.io/<nombre-repositorio>/`

> **Nota:** La aplicación opera 100% en el navegador (Client-Side). La generación de plantillas Word (.docx), visualización en pantalla y exportación de PDFs vectoriales de alta fidelidad se ejecutan directamente en el navegador del usuario sin requerir servidores externos ni costes de hosting.

