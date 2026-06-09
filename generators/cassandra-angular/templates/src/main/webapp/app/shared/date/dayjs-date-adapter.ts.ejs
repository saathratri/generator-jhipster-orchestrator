import { Injectable } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import dayjs, { Dayjs } from 'dayjs';

@Injectable()
export class DayjsDateAdapter extends DateAdapter<Dayjs> {
  override parse(value: any, parseFormat: any): Dayjs | null {
    if (value && typeof value === 'string') {
      return dayjs(value, parseFormat);
    } else if (value instanceof Date) {
      return dayjs(value);
    }
    return null;
  }

  override format(date: Dayjs, displayFormat: string): string {
    return date.format(displayFormat);
  }

  override addCalendarDays(date: Dayjs, days: number): Dayjs {
    return date.add(days, 'day');
  }

  override addCalendarMonths(date: Dayjs, months: number): Dayjs {
    return date.add(months, 'month');
  }

  override addCalendarYears(date: Dayjs, years: number): Dayjs {
    return date.add(years, 'year');
  }

  override toIso8601(date: Dayjs): string {
    return date.toISOString();
  }

  override isDateInstance(obj: any): boolean {
    return dayjs.isDayjs(obj);
  }

  override isValid(date: Dayjs): boolean {
    return date.isValid();
  }

  override invalid(): Dayjs {
    // Create an explicitly invalid dayjs object
    return dayjs('invalid-date');
  }

  override getYear(date: Dayjs): number {
    return date.year();
  }

  override getMonth(date: Dayjs): number {
    return date.month();
  }

  override getDate(date: Dayjs): number {
    return date.date();
  }

  override getDayOfWeek(date: Dayjs): number {
    return date.day();
  }

  override getFirstDayOfWeek(): number {
    return 0; // Assuming Sunday is the first day of the week
  }

  override getNumDaysInMonth(date: Dayjs): number {
    return date.daysInMonth();
  }

  override clone(date: Dayjs): Dayjs {
    return date.clone();
  }

  override today(): Dayjs {
    return dayjs();
  }

  override createDate(year: number, month: number, date: number): Dayjs {
    return dayjs(new Date(year, month, date));
  }

  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    const format = style === 'long' ? 'MMMM' : style === 'short' ? 'MMM' : 'M';
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(dayjs().month(i).format(format));
    }
    return months;
  }

  override getDateNames(): string[] {
    return Array.from({ length: 31 }, (_, i) => String(i + 1));
  }

  override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    const format = style === 'long' ? 'dddd' : style === 'short' ? 'ddd' : 'dd';
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(dayjs().day(i).format(format));
    }
    return days;
  }

  override getYearName(date: Dayjs): string {
    return String(date.year());
  }

  override clampDate(date: Dayjs, min: Dayjs | null, max: Dayjs | null): Dayjs {
    if (min && date.isBefore(min)) {
      return min;
    }
    if (max && date.isAfter(max)) {
      return max;
    }
    return date;
  }
}
