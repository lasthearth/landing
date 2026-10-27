import { getNicknameCooldownEnd } from './nickname-cooldown.function';

describe('getNicknameCooldownEnd', () => {
    it('возвращает null, если смены ника не было', () => {
        expect(getNicknameCooldownEnd(undefined)).toBeNull();
        expect(getNicknameCooldownEnd(null)).toBeNull();
        expect(getNicknameCooldownEnd('')).toBeNull();
    });

    it('возвращает null для нулевой даты protobuf', () => {
        expect(getNicknameCooldownEnd('0001-01-01T00:00:00Z')).toBeNull();
    });

    it('возвращает null для неразбираемой даты', () => {
        expect(getNicknameCooldownEnd('не дата')).toBeNull();
    });

    it('прибавляет 6 месяцев к дате последней смены', () => {
        // Ожидаемые значения выводятся из той же даты в той же таймзоне,
        // поэтому тест не зависит от локальной зоны запуска.
        const end = getNicknameCooldownEnd('2026-10-27T12:00:00Z');
        const start = new Date('2026-10-27T12:00:00Z');

        expect(end).not.toBeNull();
        expect(end?.getFullYear()).toBe(start.getFullYear() + 1);
        expect(end?.getMonth()).toBe((start.getMonth() + 6) % 12);
        expect(end?.getDate()).toBe(start.getDate());
    });

    it('переносит день на конец месяца, если такого числа нет', () => {
        // 31 октября + 6 месяцев → 31 апреля не существует → 1 мая.
        // Дата без «Z» разбирается в локальной зоне — результат не зависит от таймзоны.
        const end = getNicknameCooldownEnd('2026-10-31T00:00:00');

        expect(end).not.toBeNull();
        expect(end?.getMonth()).toBe(4); // май
        expect(end?.getDate()).toBe(1);
    });
});
