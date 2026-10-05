import { NewsEditorAction } from './news-editor-action';

/**
 * Кнопка панели форматирования.
 */
export interface NewsEditorButton {
    /**
     * Выполняемое действие.
     */
    action: NewsEditorAction;

    /**
     * Иконка Taiga UI.
     */
    icon: string;

    /**
     * Ключ перевода подписи (подсказка и aria-label).
     */
    labelKey: string;

    /**
     * Сочетание клавиш для подсказки, если есть.
     */
    hotkey?: string;
}
