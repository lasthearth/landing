/**
 * Возвращает наименования типа селения по его ключу.
 *
 * @param key Ключ-типа селения (строка или число из enum).
 */
export function getSettlementTypeByKey(
    key: string | number | undefined
): 'Лагерь' | 'Деревня' | 'Посёлок' | 'Город' | 'Региональная провинция' {
    if (typeof key === 'number') {
        switch (key) {
            case 1:
                return 'Деревня';
            case 2:
                return 'Посёлок';
            case 3:
                return 'Город';
            case 4:
                return 'Региональная провинция';
            case 0:
            default:
                return 'Лагерь';
        }
    }
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
