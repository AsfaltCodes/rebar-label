const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Generate an auto-name like "Mar 5 — Job 1".
 * Counts how many existing jobs were created on the same calendar day and increments.
 */
export function generateJobName(
  date: Date,
  existingJobs: { created_at: string }[]
): string {
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const datePrefix = `${month} ${day}`;

  const sameDayCount = existingJobs.filter(j => {
    const d = new Date(j.created_at);
    return d.getFullYear() === date.getFullYear()
      && d.getMonth() === date.getMonth()
      && d.getDate() === date.getDate();
  }).length;

  return `${datePrefix} — Job ${sameDayCount + 1}`;
}
