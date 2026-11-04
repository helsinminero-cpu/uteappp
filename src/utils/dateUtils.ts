/**
 * Month names formatted in Spanish per UTEA convention ("setiembre")
 */
const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Formats YYYY-MM-DD into "30 de setiembre del 2026"
 */
export function formatDateSpanish(dateStr?: string): string {
  if (!dateStr) return '';
  
  if (dateStr.includes(' de ') && dateStr.includes(' del ')) {
    return dateStr;
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
    const monthName = SPANISH_MONTHS[month - 1] || '';
    return `${day} de ${monthName} del ${year}`;
  }
  return dateStr;
}

/**
 * Adds 4 months to a given date and returns "DD de setiembre del YYYY"
 */
export function add4MonthsFormatted(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10); // 1-indexed
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

    month += 4;
    while (month > 12) {
      month -= 12;
      year += 1;
    }

    const daysInTargetMonth = new Date(year, month, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);
    const monthName = SPANISH_MONTHS[month - 1];

    return `${targetDay} de ${monthName} del ${year}`;
  }
  return '';
}
