/**
 * Возвращает наименования типа селения по его ключу.
 *
 * @param key Ключ-типа селения.
 */
export function getSettlementTypeByKey(key: string | undefined) {
    switch (key) {
        case 'CAMP':
            return 'Лагерь';
        case 'VILLAGE':
            return 'Деревня';
        case 'TOWNSHIP':
            return 'Посёлок';
        case 'CITY':
            return 'Город';
        case 'PROVINCE':
            return 'Региональная провинция';
        default:
            return 'Лагерь';
    }
}
