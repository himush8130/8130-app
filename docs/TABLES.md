# 8130 APP — דרישות לטבלאות

מסמך זה מתעד את **המצב הנוכחי** של כל טבלה בעלת ערך עסקי ואת **הדרישות המעודכנות** שמסכמים יחד. בסוף נגזור migrations מהמסמך.

---

## 1. `professions` — מקצועות (גם סוגי רכב, גם ייעוד טכנאי)

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `id` | smallint (sequence) | — | אוטומטי | PK |
| `name` | text | — | — | unique |
| `created_at` | timestamptz | — | now() | |

### דרישות מעודכנות
**אין אקסל ייעודי לעובד.** רשימת המקצועות תיגזר אוטומטית מערכי `profession_name` הייחודיים בקובץ `employees.xlsx` (וב-`vehicles.xlsx` כשנגדיר אותו).

---

## 2. `employees` — עובדים (טכנאים / מנהלים / מחסנאים)

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `employee_number` | int | — | — | PK |
| `name` | text | — | — | |
| `phone` | text | ? | — | |
| `profession_id` | smallint | ? | — | FK → professions.id |
| `role` | enum | — | — | technician / manager / warehouse |
| `created_at` | timestamptz | — | now() | |

### דרישות מעודכנות

**שינוי שם:** `role` → `permissions`
- ערכים אפשריים נשארים: `technician` / `warehouse` / `manager`
- ברירת מחדל חדשה: `technician`

**שינוי שם וסוג:** `profession_id` (smallint, FK) → `profession_name` (text, ללא FK)
- העובד יכתוב את **שם המקצוע** ישירות בעמודה (למשל: "רכב")
- אופציונלי — מנהל/מחסנאי יכולים להישאר ריקים
- במהלך ה-import: ערכים ייחודיים ב-`profession_name` יזרמו אוטומטית לטבלת `professions`

**אקסל לעובד — `employees.xlsx`:**

| כותרת בעברית | מה למלא | דוגמה | חובה? |
|---|---|---|---|
| מספר עובד | מספר ייחודי לכל עובד | 1003 | כן |
| שם | שם מלא | יואב לוי | כן |
| טלפון | מספר טלפון | 050-1234567 | רשות |
| מקצוע | שם מקצוע (טקסט חופשי, יומר אוטומטית לרשימה) | רכב | רשות |
| הרשאה | technician / warehouse / manager | technician | חובה (ברירת מחדל: technician) |

---

## 3. `employee_availability` — חופשות / אי-זמינויות (sparse)

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `employee_number` | int | — | — | FK → employees, חלק מ-PK |
| `date` | date | — | — | חלק מ-PK |
| `reason` | text | ? | — | חופש / מילואים / מחלה |

**מודל:** רק ימי **אי**-זמינות נשמרים; היעדר רשומה = זמין.

### דרישות מעודכנות

**הסכמה ב-DB לא משתנה.** מה שמשתנה הוא **פורמט הקובץ לעובד**.

**אקסל לעובד — `employee_availability.xlsx`:**

לוח שנה רחב — שתי עמודות זיהוי + עמודה לכל יום בטווח **1.5.2026 (1 במאי) עד 12.7.2026** (סה״כ 73 ימים → 73 עמודות תאריך + 2 = 75 עמודות).

| מספר עובד | שם עובד | 01/05 | 02/05 | 03/05 | … | 12/07 |
|---|---|---|---|---|---|---|
| 1003 | יואב לוי | V | X | X | V | X |
| 1004 | שרון ישראלי | V | V | V | V | V |

**כללי מילוי לעובד:**
- שורה לכל עובד מתוך `employees.xlsx`
- כל יום בטווח = עמודה משלו, כותרת `DD/MM`
- **`V`** = העובד **זמין** באותו יום
- **`X`** = העובד **לא זמין** באותו יום
- תא ריק יטופל כ-`V` (זמין) — אבל מומלץ למלא במפורש לטובת בקרה

**במהלך ה-import:** סקריפט יסרוק את הקובץ. לכל תא עם `X` → ייצור שורה ב-`employee_availability` עם `employee_number` ו-`date`. תאי `V` / ריקים לא יוצרים שורות. עמודת `reason` נשארת ריקה בייבוא הזה (מקור החופשה לא נמסר בפורמט).

**הערה:** טווח התאריכים 1.5–12.7 הוא לטעינה הראשונית בלבד. מעבר לזה, חופשות יתווספו דרך ממשק האפליקציה (לא נבנה עדיין).

---

## 4. `vehicles` — רכבים / ציוד שמטופלים

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `vehicle_number` | text | — | — | PK |
| `type_id` | smallint | — | — | FK → professions.id (קובע איזה צוות מטפל) |
| `model` | text | ? | — | |
| `created_at` | timestamptz | — | now() | |

### דרישות מעודכנות

**שינוי שם וסוג:** `type_id` (smallint, FK) → `type_name` (text)
- עקבי עם `employees.profession_name`
- העובד יכתוב שם מקצוע ישירות (למשל "רכב")

**שינוי שם:** `model` → `department`
- שדה הדגם הופך לשדה "מחלקה" (טקסט, אופציונלי)

**אקסל לעובד — `vehicles.xlsx`:**

| כותרת בעברית | מה למלא | דוגמה | חובה? |
|---|---|---|---|
| מספר רכב | מספר/מזהה ייחודי לרכב או ציוד | 705-164 | כן |
| מקצוע | שם המקצוע שאחראי על הרכב הזה | רכב | כן |
| מחלקה | שם המחלקה שהרכב שייך אליה | רכב | רשות |
| תת מחלקה | קטגוריה משנית | סיור / מנהלה / FMTV / וכו' | רשות |

**שינוי סכמה:** נוספה עמודת `vehicles.sub_department` (text, nullable). הקובץ אוכלס בנתונים אמיתיים של מערך הרכב — 25 רכבים (סיור, מנהלה, FMTV, האמר, אמבולנס וכו').

---

## 5. `parts` — קטלוג חלקי חילוף

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `sku` | text | — | — | PK |
| `name` | text | — | — | |
| `quantity` | int | — | 0 | check: quantity ≥ 0 |
| `location` | text | ? | — | מיקום פיזי במחסן |
| `min_threshold` | int | — | 0 | סף התראת מלאי נמוך |
| `supplier` | text | ? | — | |
| `pending_approval` | bool | — | false | חלק שטכנאי הציע, ממתין לאישור |
| `created_at` | timestamptz | — | now() | |

### דרישות מעודכנות

**הסכמה תיגזר מהאקסל שיגיע מהעובד.** העובד יקבל את הקטלוג מוכן עם העמודות שהוא יגדיר לנו. אחרי שנקבל את הקובץ נסכם את הסכמה הסופית ונעדכן את הטבלה בהתאם.

הליבה הקיימת (`sku` כ-PK, `quantity` כשלם, `min_threshold`, `pending_approval`) תישאר; ייתכנו הוספות / שינויים על פי העמודות בקובץ.

---

## 6. `service_calls` — קריאות שירות

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `id` | uuid | — | gen_random_uuid() | PK |
| `display_id` | text | — | טריגר | פורמט `SR-YY-NNNN`, unique |
| `external_id` | text | ? | — | מזהה מבסיס המקור (Base44) |
| `vehicle_name` | text | ? | — | מהטופס |
| `vehicle_number` | text | ? | — | מהטופס; לא FK |
| `reporter_name` | text | ? | — | |
| `reporter_phone` | text | ? | — | |
| `description` | text | ? | — | |
| `status` | enum | — | 'new' | new / in_treatment / waiting_for_parts / closed / cancelled |
| `profession_id` | smallint | ? | — | FK → professions.id |
| `anomaly_flags` | jsonb | — | `[]` | מערך של {code, detail} |
| `created_at` | timestamptz | — | now() | |
| `updated_at` | timestamptz | — | now() | טריגר |
| `closed_at` | timestamptz | ? | — | |
| `closed_by` | int | ? | — | FK → employees |

### דרישות מעודכנות

**שינוי פורמט `display_id`:**

מ-`SR-YY-NNNN` (כמו `SR-26-0001`) ל-`<vehicle>-<DDMM>-<NNNN>`:

- `<vehicle>` = מספר הרכב מהקריאה, ללא תווי מפריד (כל קו מקף ב-`vehicle_number` יוסר). לדוגמה `12-345-67` → `1234567`. לקריאות בלי מספר רכב (חריגה) → `UNKNOWN`.
- `<DDMM>` = יום ב-2 ספרות + חודש ב-2 ספרות, לפי תאריך יצירת הקריאה (Asia/Jerusalem).
- `<NNNN>` = מספר רץ גלובלי, 4 ספרות עם ריפוד אפסים. לא מתאפס מדי שנה.

**דוגמאות:**
- `109-2506-1234` — קריאה לרכב 109, ב-25 ביוני, מספר רץ 1234
- `1234567-0107-0042` — קריאה לרכב 12-345-67, ב-1 ביולי, מספר רץ 42
- `UNKNOWN-2904-0099` — קריאה ללא מספר רכב, ב-29 באפריל, מספר רץ 99

**הערה:** ה-trigger וה-sequence ב-DB יעודכנו לפורמט החדש. הקריאות הקיימות (`SR-26-0001` עד `SR-26-0003`) יישארו כמו שהן (לא נכתוב מחדש היסטוריה); הקריאה הבאה תיווצר בפורמט החדש.

---

## 7. `call_required_parts` — חלקים נדרשים לקריאה

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `id` | uuid | — | gen_random_uuid() | PK |
| `call_id` | uuid | — | — | FK → service_calls |
| `part_sku` | text | — | — | FK → parts |
| `quantity` | int | — | — | check: > 0 |
| `status` | enum | — | 'in_stock' | in_stock / awaiting_order / awaiting_receipt / received / delivered |
| `requested_by` | int | ? | — | FK → employees |
| `requested_at` | timestamptz | — | now() | |

ללא unique constraint — מאפשר כפילויות (פיצול שורה).

### דרישות מעודכנות

**אין שינוי בסכמה. אין אקסל לעובד.** הטבלה מתמלאת בזמן ריצה כשטכנאי מוסיף חלק לקריאה.

---

## 8. `part_withdrawals` — יציאות מהמחסן

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `id` | uuid | — | gen_random_uuid() | PK |
| `call_id` | uuid | — | — | FK → service_calls |
| `part_sku` | text | — | — | FK → parts |
| `quantity` | int | — | — | check: > 0 |
| `withdrawn_by` | int | — | — | FK → employees (טכנאי שלקח) |
| `released_by` | int | — | — | FK → employees (מחסנאי שמסר) |
| `withdrawn_at` | timestamptz | — | now() | |

טריגר מנכה אוטומטית מ-`parts.quantity` בעת insert.

### דרישות מעודכנות

**אין שינוי בסכמה. אין אקסל לעובד.** הטבלה מתמלאת בזמן ריצה כשמחסנאי מוסר חלק לטכנאי.

---

## 9. `call_comments` — הערות בקריאה (יומן כרונולוגי)

### מצב נוכחי

| שדה | סוג | nullable | ברירת מחדל | הערות |
|---|---|---|---|---|
| `id` | uuid | — | gen_random_uuid() | PK |
| `call_id` | uuid | — | — | FK → service_calls |
| `author_employee_number` | int | ? | — | FK → employees |
| `text` | text | — | — | |
| `created_at` | timestamptz | — | now() | |

### דרישות מעודכנות

**אין שינוי בסכמה. אין אקסל לעובד.** הטבלה מתמלאת בזמן ריצה דרך כפתור "הוסף הערה".

---

## ✅ סיכום

### קבצי אקסל שיגיעו לעובד

| קובץ | מקור הסכמה |
|---|---|
| `employees.xlsx` | מוגדר במסמך זה (5 עמודות: מספר עובד, שם, טלפון, מקצוע, הרשאה) |
| `employee_availability.xlsx` | מוגדר במסמך (75 עמודות — 2 זיהוי + 73 תאריכים מ-1.5 עד 12.7, V/X) |
| `vehicles.xlsx` | מוגדר במסמך (3 עמודות: מספר רכב, מקצוע, מחלקה) |
| `parts.xlsx` | יגיע **מהעובד** עם הסכמה שהוא מגדיר; נטמיע אצלנו לפי הקובץ |

### שינויי סכמה ב-DB (יבוצעו ב-migration אחד מקובץ)

1. `employees.role` → `permissions` (שינוי שם של עמודה ושל ה-enum); ברירת מחדל = `technician`
2. `employees.profession_id` (smallint, FK) → `profession_name` (text)
3. `vehicles.type_id` (smallint, FK) → `type_name` (text)
4. `vehicles.model` → `department`
5. `service_calls.display_id` — פורמט חדש: `<vehicle>-<DDMM>-<NNNN>` (היסטוריה לא תיכתב מחדש; הקריאה הבאה תיווצר בפורמט החדש)

### טבלאות שלא משתנות ולא דורשות אקסל

`call_required_parts`, `part_withdrawals`, `call_comments` — runtime, מתמלאות בשימוש.

---

## איך נרשמת דרישה

תאמר בעברית רגילה מה לשנות. אני אכתוב כאן בפורמט הבא:

```
**להוסיף:**
- `<שם>` (<סוג>, <חובה/אופציונלי>, ברירת מחדל: <ערך>) — <הסבר>

**לשנות:**
- `<שם נוכחי>` → <שינוי> — <למה>

**להסיר:**
- `<שם>` — <למה>
```

---

## אחרי השלמת המסמך

1. אכין migrations מקובצים לכל השינויים.
2. אעדכן את `app/src/types/db.ts` לפי הסכמה החדשה.
3. אעדכן את ה-Edge Functions אם נדרשים שדות חדשים בקליטה.
4. אעדכן את ה-UI (טפסים, תצוגות, מסכי ניהול).
