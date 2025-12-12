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
}
