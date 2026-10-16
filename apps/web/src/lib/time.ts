/** Instants are stored in UTC; these convert to/from the workspace's IANA timezone for display and input. */
function parts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}
export const dayKey = (d: Date | string, tz: string) => { const p = parts(new Date(d), tz); return `${p.year}-${p.month}-${p.day}`; };
export const toInput = (d: Date | string, tz: string) => { const p = parts(new Date(d), tz); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };
const offset = (d: Date, tz: string) => { const p = parts(d, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000; };
/** "YYYY-MM-DDTHH:mm" interpreted in tz -> UTC Date (two passes handle DST edges). */
export function fromInput(local: string, tz: string): Date {
  const guess = new Date(`${local}:00Z`);
  const first = new Date(guess.getTime() - offset(guess, tz));
  return new Date(guess.getTime() - offset(first, tz));
}
export const fmt = (d: Date | string, tz: string) => new Intl.DateTimeFormat(undefined, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
