export interface JobSummary {
  id: number;
  name: string;
  client_name: string;
  created_at: string;
  updated_at: string;
  labelCount: number;
}

export interface DayGroup {
  label: string;     // "Today", "Yesterday", "Mar 3", etc.
  dateKey: string;   // "2026-03-05" for sorting/keying
  jobs: JobSummary[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupJobsByDay(jobs: JobSummary[]): DayGroup[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(yesterday);

  const map = new Map<string, JobSummary[]>();

  for (const job of jobs) {
    const key = toDateKey(new Date(job.created_at));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  }

  // Sort each group by updated_at DESC
  for (const arr of map.values()) {
    arr.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  // Build groups sorted by date DESC
  const sortedKeys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  const groups: DayGroup[] = [];

  for (const key of sortedKeys) {
    let label: string;
    if (key === todayKey) {
      label = 'Today';
    } else if (key === yesterdayKey) {
      label = 'Yesterday';
    } else {
      const d = new Date(key + 'T00:00:00');
      label = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
    }
    groups.push({ label, dateKey: key, jobs: map.get(key)! });
  }

  return groups;
}
