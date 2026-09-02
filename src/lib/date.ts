/**
 * Chalega India
 * Local date/time helpers
 */

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatLocalDate(
  date: Date | string
): string {
  const value =
    typeof date === 'string'
      ? new Date(date)
      : date;

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLocalDateTime(
  date: Date | string
): string {
  const value =
    typeof date === 'string'
      ? new Date(date)
      : date;

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getDailyMissionsKey(): string {
  return `chalega_daily_missions_${getLocalDateKey()}`;
}

export function getDateKey(date: Date): string {
  return getLocalDateKey(date);
}