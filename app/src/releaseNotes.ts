// =====================================================================
// 8130 APP — Latest release note
// =====================================================================
// Bumped manually with each meaningful change. Displayed in the footer
// of the manager home page so the team knows what's new since they last
// opened the app. Build time below is injected automatically by Vite.
// =====================================================================

export const LATEST_NOTE = 'תוקן באג: טכנאי טנק התמחות חשמל ראה קריאות עם specialties=מכונאות. הסינון הורחב: בקריאות טנק עם specialties — נדרשת התאמה של specialty של הטכנאי (כמו ב-useCallContacts). בדף "טכנאי - חדש": צבע ייחודי לכל פלוגה (אינדקס סדור על פלטה של 16 גוונים במקום hash שהתנגש). מצב הניווט (פלוגה+טנק נבחרים) נשמר ב-URL כך שלחיצה על "חזור" מקריאה משחזרת בדיוק את המסך שממנו יצאת.'

export const BUILD_TIME = __BUILD_TIME__  // ISO string injected at build
