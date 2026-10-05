/**
 * Действие панели форматирования редактора новостей.
 */
export type NewsEditorAction =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strike'
    | 'spoiler'
    | 'heading'
    | 'list'
    | 'orderedList'
    | 'quote'
    | 'link'
    | 'image'
    | 'divider';
