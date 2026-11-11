// Settings for the gan gift picker. API_URL = the Apps Script web-app /exec URL.
// While API_URL is empty the site runs on a local mock (browser storage) for testing.
window.CONFIG = {
  // Live server (Miriam's account miryamti@tzlev.com, deployed 8.11.2026, version 1)
  API_URL: 'https://script.google.com/macros/s/AKfycbwYR-cx0emJqE6zTnT1G0nzpis0au9FwsnpYTpSx8mYLTe_1gdOB1TARdjwb8xH7l3YqA/exec',
  DEADLINE_TEXT: 'עד יום ראשון, 22.11',
  DEADLINE_ISO: '2026-11-22T23:59:00+02:00',
  // 11.11: the עו״סית רכזת opens the gan (OPENER_ROLE). מדריכות do not choose a game, they help their staff choose (GUIDE_ROLE).
  ROLES: ['עו״סית רכזת', 'גננת', 'סייעת', 'סייעת ABA', 'קלינאית תקשורת', 'מרפאה בעיסוק', 'פיזיותרפיסטית', 'מטפלת רגשית',
          'מנתחת התנהגות', 'מדריכה', 'אחר'],
  OPENER_ROLE: 'עו״סית רכזת',
  GUIDE_ROLE: 'מדריכה',
  MISSION: 'כל אשת צוות בוחרת משחק אחד לגן שלה, עד 70 ש"ח. צהר הלב מזמינה, ואתן מדליקות את החנוכייה של הגן.'
};
