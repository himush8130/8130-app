// =====================================================================
// 8130 APP — Component registry for the feedback system
// =====================================================================
// Single source of truth mapping numeric component IDs to human names.
//
// Adding a new tagged component:
//   1. Pick the next free ID in the appropriate range below.
//   2. Add the entry to COMPONENTS.
//   3. Render <ComponentBadge id={NNNN} /> at the top of the component.
//
// ID ranges:
//   1xxx — global / shared
//   2xxx — login
//   3xxx — manager
//   4xxx — warehouse
//   5xxx — call detail
//   6xxx — technician
//   7xxx — vehicle history
//   8xxx — feedback / notes
// =====================================================================

export const COMPONENTS: Record<number, string> = {
  // 1xxx — global / shared
  1001: 'APP_HEADER',
  1002: 'BTN_LOGOUT',
  1003: 'BTN_FEEDBACK_TOGGLE',
  1004: 'BTN_OPEN_NOTES',

  // 2xxx — login
  2001: 'LOGIN_FORM',

  // 3xxx — manager
  3001: 'MGR_HOME',
  3002: 'STAT_OPEN_CALLS',
  3003: 'STAT_ANOMALIES',
  3004: 'STAT_LOW_STOCK',
  3005: 'PROFESSION_LOAD_TABLE',
  3006: 'STATUS_DIST_LIST',
  3007: 'ANOMALY_QUEUE',
  3008: 'ANOMALY_RESOLVER',
  3009: 'BTN_FIX_VEHICLE',
  3010: 'BTN_SET_PROFESSION',
  3011: 'BTN_CANCEL_CALL',
  3012: 'ALL_CALLS_LIST',
  3013: 'ALL_CALLS_FILTERS',
  3014: 'BTN_OPEN_SETTINGS',
  3015: 'SETTINGS_PROFESSIONS',
  3016: 'BTN_ADD_PROFESSION',
  3017: 'BTN_EDIT_PROFESSION',
  3018: 'BTN_DELETE_PROFESSION',
  3019: 'TANK_READINESS_TABLE',
  3020: 'BTN_ROLE_SWITCH',
  3021: 'VEHICLES_BOOK_PAGE',
  3022: 'VEHICLE_PICKER',
  3023: 'CAR_READINESS_TABLE',
  3024: 'RELEASE_NOTE_FOOTER',

  // 4xxx — warehouse
  4001: 'WHS_HOME',
  4002: 'PARTS_CATALOG',
  4003: 'PENDING_ACTIONS',
  4004: 'BTN_DEC_QTY',
  4005: 'BTN_INC_QTY',
  4006: 'BTN_EDIT_PART',
  4007: 'PART_EDIT_FORM',
  4008: 'REJECTED_PARTS_TABLE',
  4009: 'LOW_STOCK_TABLE',
  4010: 'BLOCKED_SKU_TABLE',

  // 5xxx — call detail
  5001: 'CALL_DETAIL',
  5002: 'CALL_ACTIONS',
  5003: 'BTN_CLOSE_CALL',
  5004: 'BTN_REOPEN_CALL',
  5005: 'CALL_PARTS',
  5006: 'BTN_ADD_REQUIRED_PART',
  5007: 'BTN_RECORD_WITHDRAWAL',
  5008: 'COMMENTS_LIST',
  5009: 'ADD_COMMENT_FORM',
  5010: 'CALL_CONTACTS',
  5011: 'CONTACT_ITEM',
  5012: 'BTN_CALL_PHONE',
  5013: 'BTN_WHATSAPP',
  5014: 'BTN_COPY_CALL_SUMMARY',
  5015: 'EDIT_CALL_FORM',
  5016: 'BTN_EDIT_CALL',
  5017: 'BTN_DELETE_CALL',
  5018: 'BTN_DELETE_REQUIRED_PART',

  // 6xxx — technician
  6001: 'TECH_HOME',
  6002: 'CALL_CARD',
  6010: 'NEW_CALL_FORM',
  6011: 'BTN_OPEN_NEW_CALL',

  // 7xxx — vehicle history
  7001: 'VEHICLE_HISTORY',

  // 8xxx — feedback
  8001: 'FEEDBACK_BAR',
  8002: 'NOTES_PAGE',
  8003: 'NOTE_ITEM',
  8004: 'BTN_TOGGLE_NOTE_STATUS',
  8005: 'BTN_DELETE_DONE_NOTES',
}

export function componentName(id: number): string | undefined {
  return COMPONENTS[id]
}
