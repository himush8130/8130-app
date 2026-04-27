# 8130 APP

מערכת פנימית לניהול מערך טכנאים, רכבים, חלקי חילוף וקריאות שירות. מקבלת טפסי דיווח תקלה מאפליקציה חיצונית בפלטפורמת **Base44** דרך Webhook.

## מבנה המאגר

```
8130 APP/
├── app/                    React + TypeScript + Vite (PWA)
├── supabase/
│   ├── migrations/         גרסאות סכמת ה-DB
│   ├── functions/          Edge Functions (Webhook)
│   └── seed.sql
├── simulator/              סימולטור טופס Base44 (templates + send script)
├── docs/
│   └── SPEC.md             מסמך אפיון מלא
├── .claude/
│   └── agents/             סוכני AI מומחים לפיתוח
└── README.md (קובץ זה)
```

## דרישות תשתית

- Node.js 20+
- npm או pnpm
- חשבון Supabase (Free tier)
- חשבון GitHub
- חשבון Vercel (אופציונלי, לשלב הפריסה)

## התחלה מהירה

```bash
# התקנת dependencies של ה-Frontend
cd app && npm install

# הרצת ה-dev server
npm run dev

# הרצת הסימולטור (טופס בודד)
cd ../simulator && npx tsx send.ts --template basic.json

# הרצת הסימולטור (טופס רנדומלי)
npx tsx send.ts --random
```

## משתני סביבה

ראה `.env.example` עבור רשימת המשתנים הנדרשים.
**לעולם אל תתחייב את `.env.local` ל-Git** — הקובץ ב-`.gitignore`.

## עקרונות הפרויקט

1. **אין שדות חוסמים** בשום מקום במערכת — כל הקלט מתקבל; חריגות מסומנות, לא חוסמות.
2. **קומפוננטות קטנות וניתנות לבדיקה** — כל קומפוננטה ≤ 150 שורות, אחריות אחת.
3. **שפה**: עברית בלבד עם RTL מלא.
4. **בטיחות**: RLS דלוק כברירת מחדל בכל הטבלאות.

ראה את `docs/SPEC.md` לאפיון מלא.

## פיתוח עם סוכני AI

הפרויקט מכיל 6 סוכני AI מומחים תחת `.claude/agents/`:

| סוכן | תפקיד |
|---|---|
| `project-orchestrator` | תכנון milestones וחלוקת עבודה |
| `db-engineer` | סכמת DB, migrations, RLS policies |
| `backend-engineer` | Edge Functions, Webhooks |
| `frontend-engineer` | קומפוננטות React, מסכים |
| `tester` | בדיקות יחידה ואינטגרציה |
| `code-reviewer` | סקירת קוד מול ה-SPEC |

שימוש בסוכן מתבצע בתוך Claude Code דרך כלי `Agent` (או באופן אוטומטי כש-Claude מזהה התאמה).
