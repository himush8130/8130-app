# Base44 Form Simulator

מדמה את שליחת הטופס מ-Base44 ל-Webhook של המערכת.
שימוש לפיתוח — מאפשר לבדוק את הצד שלנו בלי תלות ב-Base44.

## דרישות

- Node.js 20+ (משתמש ב-`fetch` ו-`crypto.randomUUID` הגלובליים)
- `.env.local` במאגר הראשי עם `WEBHOOK_SECRET` ולעיתים `WEBHOOK_TARGET_URL`

## שימוש

```bash
# טופס ספציפי לפי שם
npx tsx send.ts --template basic.json
npx tsx send.ts --template basic           # סיומת .json נוספת אוטומטית

# טופס רנדומלי מהתיקייה
npx tsx send.ts --random

# התאמה אישית של ה-target (עוקפת WEBHOOK_TARGET_URL)
npx tsx send.ts --template basic --target https://gdabgrjgyzdvksrypjko.supabase.co/functions/v1/webhook-base44
```

## תבניות זמינות

| קובץ | תיאור |
|---|---|
| `basic.json` | טופס תקין מלא — שיוך אוטומטי אמור להצליח |
| `unknown_vehicle.json` | מספר רכב שלא קיים — צריך להפעיל חריגה דחופה |
| `missing_phone.json` | חסר טלפון מדווח — חריגה רכה, הקריאה ממשיכה רגיל |

הוספת תבניות חדשות: צור קובץ JSON חדש ב-`templates/`. ה-`external_id` נדרס אוטומטית ל-UUID חדש בכל שליחה.

## מה זה לא עושה

- לא מאמת את התגובה לוגית מעבר לקוד HTTP — רק מציג את גוף התגובה
- לא מבצע retry / load-test (לשלב מאוחר יותר)
- לא בודק idempotency
