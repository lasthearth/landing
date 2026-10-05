/**
 * Режим предпросмотра новости в форме создания:
 * - `featured` — главная новость на главной странице;
 * - `compact` — карточка в сетке под главной;
 * - `page` — страница новости `/news/:id`.
 */
export type NewsPreviewMode = 'featured' | 'compact' | 'page';
