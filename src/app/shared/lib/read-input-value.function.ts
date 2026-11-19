/**
 * Достаёт текст из события ввода `<input>` или `<textarea>`.
 *
 * Шаблон не подсказывает тип цели события, поэтому `$any($event.target)`
 * протаскивал в разметку нетипизированное значение. Проверка `instanceof`
 * даёт тот же текст и убирает `any` из шаблонов.
 *
 * @param event Событие ввода из шаблона.
 * @returns Введённый текст; пустая строка для чужой цели.
 */
export function readInputValue(event: Event): string {
    const target = event.target;

    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target.value : '';
}
