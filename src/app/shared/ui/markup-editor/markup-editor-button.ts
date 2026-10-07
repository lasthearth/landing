import { MarkupEditorAction } from './markup-editor-action';

/**
 * Кнопка панели форматирования.
 */
export interface MarkupEditorButton {
    /**
     * Выполняемое действие.
     */
    action: MarkupEditorAction;

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
