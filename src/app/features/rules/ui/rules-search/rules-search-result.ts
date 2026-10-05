/**
 * Найденный параграф правил.
 */
export interface RulesSearchResult {
    /**
     * Параграф, к которому ведёт результат.
     */
    element: HTMLElement;

    /**
     * Название ближайшей секции — помогает различить одинаковые пункты.
     */
    section: string;

    /**
     * Номер пункта («5.1.1»), если есть.
     */
    number: string | null;

    /**
     * Текст до совпадения.
     */
    before: string;

    /**
     * Совпавший фрагмент.
     */
    match: string;

    /**
     * Текст после совпадения.
     */
    after: string;
}
