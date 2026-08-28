import { DiplomacyOption } from '../model/diplomacy-option';

/**
 * Дипломатические курсы, доступные администратору.
 *
 * `value` — строка, которую хранит бэкенд: `diplomacy` в контракте свободная
 * строка, а `getDiplomacyTone` и подписи типа селения сопоставляются именно
 * с этими русскими литералами. `labelKey` — ключ перевода из словаря админки:
 * на роуте `/profile/admin` словарь поселений не подгружается.
 */
export const DIPLOMACY_OPTIONS: readonly DiplomacyOption[] = [
    { value: 'Миролюбивый', labelKey: 'admin.settlementAdmin.diplomacy.peaceful' },
    { value: 'Нейтральный', labelKey: 'admin.settlementAdmin.diplomacy.neutral' },
    { value: 'Агрессивный', labelKey: 'admin.settlementAdmin.diplomacy.aggressive' },
];
