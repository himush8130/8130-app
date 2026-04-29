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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
*ממתין לקלט מהמשתמש*

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
