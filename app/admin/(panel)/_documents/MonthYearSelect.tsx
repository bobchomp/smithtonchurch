import { MONTH_NAMES } from "@/lib/document-types";

// Month and year dropdowns that together give a YYYY-MM value (sent as "month" and "year").
export default function MonthYearSelect({ defaultValue }: { defaultValue: string }) {
  const [year, month] = defaultValue.split("-");
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 2015 + 2 }, (_, i) => thisYear + 1 - i);
  return (
    <div className="admin-month-year">
      <label>
        Month
        <select name="month" defaultValue={month}>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Year
        <select name="year" defaultValue={year}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
