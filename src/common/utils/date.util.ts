export class DateUtil {
  static startOfMonth(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfMonth(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static daysInMonth(date: Date = new Date()): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  static subDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
  }

  static formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }

  static parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('-').map(Number);
    // Note: Month is 0-indexed in JS Date
    return new Date(year, month - 1, day);
  }
}
