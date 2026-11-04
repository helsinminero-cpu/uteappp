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
- **Autenticación e Integración**: Firebase SDK

## 🌐 Despliegue en GitHub Pages

Este proyecto está 100% configurado para ejecutarse de manera estática y autónoma en **GitHub Pages**:

1. En tu repositorio de GitHub, ve a **Settings** (Configuración) > **Pages** (en el menú lateral izquierdo).
2. En la sección **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. Haz un `git push` a tu rama `main` o `master` (o ejecuta el workflow manualmente desde la pestaña **Actions** > **Desplegar en GitHub Pages** > **Run workflow**).
4. En 1-2 minutos tu aplicación estará publicada en:
   `https://<tu-usuario>.github.io/<nombre-repositorio>/`

> **Nota:** La aplicación opera 100% en el navegador (Client-Side). La generación de plantillas Word (.docx), visualización en pantalla y exportación de PDFs vectoriales de alta fidelidad se ejecutan directamente en el navegador del usuario sin requerir servidores externos ni costes de hosting.
