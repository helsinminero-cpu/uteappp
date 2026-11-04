/**
 * CONFIGURACIÓN CENTRAL DE SUPABASE PARA LA NUBE (UTEA PPP)
 * 
 * Si deseas que tu página web en Cloudflare Pages (uteapracticas.pages.dev)
 * se conecte a la nube automáticamente para TODOS los usuarios sin necesidad
 * de configurar variables de entorno en Cloudflare ni pedir claves a los alumnos:
 * 
 * 1. Pega tu URL de Supabase en 'url'.
 * 2. Pega tu clave pública anon en 'anonKey'.
 * 3. Haz commit y push a GitHub.
 * 
 * ¡Listo! Cualquier computadora o celular que visite la web se conectará
 * directamente a la base de datos en la nube.
 */

export const DEFAULT_SUPABASE_CONFIG = {
  // Ejemplo: 'https://mbzldtqygryqevgoyekc.supabase.co'
  url: '',

  // Ejemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  anonKey: '',
};
