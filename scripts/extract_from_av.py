#!/usr/bin/env python3
"""
Extract employees + their availability from worker_templates/av.xlsx
and write them into the canonical templates:
    - worker_templates/employees.xlsx
    - worker_templates/employee_availability.xlsx

av.xlsx layout (Hebrew, RTL):
  row 1: empty
  row 2: dates header in col 4..   (DD/MM)
  row 3: 'מקצוע' | 'שם מלא' | day-of-week labels
  rows 4..29: 26 employees. Profession appears in col 2 only on the
              first employee of each group; subsequent employees in
              the same group have None.

Availability cells are Hebrew status words. Mapped as follows:
  Present           → V   ('נוכח', 'נוכח - פתיחת צו', 'התארגנות',
                            'סגירת צו', 'סבב א', 'סבב ב', 'יום ראשון',
                            holiday names)
  Absent / on duty  → X   ('בית', 'אילוץ', 'צו סגור',
                            'אילוץ - צו סגור', '-')
  Names of other employees (substitution notes) → V (working that day)
  empty cell         → V (default — assume available)
"""

from datetime import date, timedelta
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "worker_templates"
SRC = TEMPLATES / "av.xlsx"
EMPLOYEES_DST = TEMPLATES / "employees.xlsx"
AVAILABILITY_DST = TEMPLATES / "employee_availability.xlsx"

# Project's canonical date range for availability
START = date(2026, 5, 1)
END   = date(2026, 7, 12)

# ----- helpers -----

ABSENT = {
    "בית", "אילוץ", "צו סגור", "אילוץ - צו סגור", "-",
}
PRESENT = {
    "נוכח", "נוכח - פתיחת צו", "התארגנות", "סגירת צו",
    "סבב א", "סבב ב", "יום ראשון",
}

def classify(value) -> str:
    """Return 'V' (available) or 'X' (unavailable) for an av.xlsx cell."""
    if value is None:
        return "V"
    s = str(value).strip()
    if not s:
        return "V"
    if s in ABSENT:
        return "X"
    # Anything else is treated as available (present, holiday names,
    # names of other employees as substitution notes, etc.).
    return "V"


# ----- read av.xlsx -----

def read_av():
    wb = openpyxl.load_workbook(SRC)
    ws = wb["גיליון1"]

    # Build date column index: column number -> date
    date_cols = {}
    for c in range(4, ws.max_column + 1):
        h = ws.cell(row=2, column=c).value
        if h is None:
            continue
        try:
            dd, mm = str(h).strip().split("/")
            d = date(2026, int(mm), int(dd))
            date_cols[c] = d
        except Exception:
            pass

    employees = []          # list of {number, name, profession_name, availability: dict[date]->'V'|'X'}
    next_num  = 2000
    current_profession = None

    for r in range(4, 30):  # employees only on rows 4..29
        prof_cell = ws.cell(row=r, column=2).value
        name_cell = ws.cell(row=r, column=3).value

        if prof_cell:
            current_profession = str(prof_cell).strip()
        if not name_cell or not str(name_cell).strip():
            continue

        availability = {}
        for c, d in date_cols.items():
            if d < START or d > END:
                continue
            availability[d] = classify(ws.cell(row=r, column=c).value)

        employees.append({
            "number":          next_num,
            "name":            str(name_cell).strip(),
            "profession":      current_profession,
            "availability":    availability,
        })
        next_num += 1

    return employees


# ----- write employees.xlsx -----

HEADER_FONT  = Font(bold=True, size=12)
HEADER_FILL  = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
HEADER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)

def style_header(ws, ncols):
    for col in range(1, ncols + 1):
        cell = ws.cell(row=1, column=col)
        cell.font  = HEADER_FONT
        cell.fill  = HEADER_FILL
        cell.alignment = HEADER_ALIGN
    ws.row_dimensions[1].height = 28

def add_instructions(wb, lines):
    ws = wb.create_sheet("הוראות")
    ws.sheet_view.rightToLeft = True
    ws.column_dimensions["A"].width = 110
    ws["A1"] = "הוראות מילוי"
    ws["A1"].font = Font(bold=True, size=14)
    for i, line in enumerate(lines, start=3):
        cell = ws.cell(row=i, column=1, value=line)
        cell.alignment = Alignment(wrap_text=True, vertical="top")

def write_employees(employees):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "data"
    ws.sheet_view.rightToLeft = True

    headers = ["מספר עובד", "שם", "טלפון", "מקצוע", "הרשאה"]
    ws.append(headers)
    style_header(ws, len(headers))

    for emp in employees:
        # Phone: "1234" + number (e.g., 12342000)
        phone = f"1234{emp['number']}"
        ws.append([emp["number"], emp["name"], phone, emp["profession"], "technician"])

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 16

    add_instructions(wb, [
        "טבלת עובדים — חולץ מתוך av.xlsx (רשימת אנשי מקצוע + זמינות).",
        "",
        "עמודות:",
        "  • מספר עובד — מספר רץ החל מ-2000 (הערך האמיתי יוחלף בעתיד).",
        "  • שם — שם מלא, חולץ מ-av.xlsx.",
        "  • טלפון — placeholder בפורמט 1234<מס׳ עובד> עד שיגיעו מספרים אמיתיים.",
        "  • מקצוע — קבוצת המקצוע מ-av.xlsx (קצינים, מכונאות, בק״ש, חשמל, צריח, חילוץ, רכב, נשק, א.נ.ם).",
        "  • הרשאה — כל העובדים סווגו זמנית כ-technician. נעדכן ידנית למנהל/מחסנאי בעתיד.",
    ])

    wb.save(EMPLOYEES_DST)
    print(f"✓ employees.xlsx: {len(employees)} עובדים")


# ----- write employee_availability.xlsx -----

def write_availability(employees):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "data"
    ws.sheet_view.rightToLeft = True

    days = []
    cur = START
    while cur <= END:
        days.append(cur)
        cur += timedelta(days=1)

    headers = ["מספר עובד", "שם עובד"] + [d.strftime("%d/%m") for d in days]
    ws.append(headers)
    style_header(ws, len(headers))

    for emp in employees:
        row = [emp["number"], emp["name"]]
        for d in days:
            row.append(emp["availability"].get(d, "V"))
        ws.append(row)

    # Column widths
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 22
    for col in range(3, 3 + len(days)):
        ws.column_dimensions[get_column_letter(col)].width = 7
    ws.freeze_panes = "C2"

    add_instructions(wb, [
        "טבלת זמינות — חולצה מתוך av.xlsx.",
        "",
        "עמודות:",
        "  • מספר עובד / שם עובד — מתאים לערכים ב-employees.xlsx.",
        "  • כל יום בטווח 01/05/2026 עד 12/07/2026 = עמודה משלו.",
        "",
        "ערכים בתאים:",
        "  • V = העובד זמין באותו יום.",
        "  • X = העובד לא זמין.",
        "",
        "מיפוי המקור (av.xlsx → V/X):",
        "  • 'נוכח' / 'התארגנות' / 'סבב' / שם של עובד אחר / חג / תא ריק → V",
        "  • 'בית' / 'אילוץ' / 'צו סגור' / 'אילוץ - צו סגור' / '-' → X",
    ])

    wb.save(AVAILABILITY_DST)
    print(f"✓ employee_availability.xlsx: {len(employees)} עובדים × {len(days)} ימים")


# ----- main -----

def main():
    if not SRC.exists():
        raise SystemExit(f"לא נמצא קובץ מקור: {SRC}")
    employees = read_av()
    if not employees:
        raise SystemExit("לא נמצאו עובדים ב-av.xlsx")
    write_employees(employees)
    write_availability(employees)
    print()
    print("=== סיכום ===")
    by_prof = {}
    for e in employees:
        by_prof.setdefault(e["profession"], []).append(e["name"])
    for prof, names in by_prof.items():
        print(f"  {prof}: {len(names)} עובדים — {', '.join(names)}")


if __name__ == "__main__":
    main()
