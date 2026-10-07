import { MarkupEditorButton } from './markup-editor-button';

/**
 * Группы кнопок панели форматирования: текст, блоки, вставки.
 */
export const MARKUP_EDITOR_TOOLBAR: readonly (readonly MarkupEditorButton[])[] = [
    [
        { action: 'bold', icon: '@tui.bold', labelKey: 'news.editor.bold', hotkey: 'Ctrl+B' },
        { action: 'italic', icon: '@tui.italic', labelKey: 'news.editor.italic', hotkey: 'Ctrl+I' },
        { action: 'underline', icon: '@tui.underline', labelKey: 'news.editor.underline', hotkey: 'Ctrl+U' },
        { action: 'strike', icon: '@tui.strikethrough', labelKey: 'news.editor.strike' },
        { action: 'spoiler', icon: '@tui.eye-off', labelKey: 'news.editor.spoiler' },
    ],
    [
        { action: 'heading', icon: '@tui.heading', labelKey: 'news.editor.heading' },
        { action: 'list', icon: '@tui.list', labelKey: 'news.editor.list' },
        { action: 'orderedList', icon: '@tui.list-ordered', labelKey: 'news.editor.orderedList' },
        { action: 'quote', icon: '@tui.quote', labelKey: 'news.editor.quote' },
    ],
    [
        { action: 'link', icon: '@tui.link', labelKey: 'news.editor.link', hotkey: 'Ctrl+K' },
        { action: 'image', icon: '@tui.image', labelKey: 'news.editor.image' },
        { action: 'divider', icon: '@tui.minus', labelKey: 'news.editor.divider' },
    ],
];
