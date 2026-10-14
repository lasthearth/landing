/**
 * Цели воронки новичка.
 *
 * Те же идентификаторы нужно создать в Яндекс.Метрике: «Цели» → «JavaScript-событие».
 * Составная цель «Воронка новичка»: cta_start_game → sign_up_click →
 * verification_submit → server_ip_copy.
 */
export type AnalyticsGoal =
    | 'cta_start_game'
    | 'sign_up_click'
    | 'verification_submit'
    | 'server_ip_copy'
    | 'discord_click'
    | 'wiki_suggest_submit'
    | 'event_join';
