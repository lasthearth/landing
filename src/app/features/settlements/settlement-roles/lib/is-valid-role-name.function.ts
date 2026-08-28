import { ROLE_NAME_MAX_LENGTH } from '../config/role-name-max-length.constant';

/**
 * Проверяет корректность имени роли поселения.
 *
 * Ограничения повторяют бэкенд: 1–64 символа. Символы `<` и `>` запрещены
 * дополнительно — сервер хранит имя как есть и не экранирует его при выдаче,
 * поэтому угловые скобки не должны попадать в базу.
 *
 * @param name Введённое имя роли.
 * @returns true, если имя можно отправлять на сервер.
 */
export function isValidRoleName(name: string): boolean {
    const trimmed = name.trim();

    return trimmed.length > 0 && trimmed.length <= ROLE_NAME_MAX_LENGTH && !/[<>]/.test(trimmed);
}
