export function formatSubmissionDeadline(deadline: string | null, language: 'al' | 'en') {
  if (!deadline) {
    return null;
  }

  return new Intl.DateTimeFormat(language === 'al' ? 'sq-AL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Tirane',
  }).format(new Date(deadline));
}