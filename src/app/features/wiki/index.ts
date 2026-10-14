/**
 * Публичный API фичи «Вики».
 *
 * Отдаёт вкладку «Вики» для админки, полноэкранный редактор, страницы вики
 * и гвард несохранённых правок.
 *
 * Тяжёлые страницы (редактор) здесь намеренно НЕ экспортируются: статический
 * импорт барабана затягивает их в начальный бандл (проверено: +214 kB, выход
 * за бюджет initial). Редактор роут грузит динамическим импортом по прямому
 * пути — см. src/app/routes/app.routes.ts.
 */

export { WikiAdminPanelComponent } from './ui/wiki-admin-panel/wiki-admin-panel.component';
export { WikiListPageComponent } from './ui/wiki-pages/wiki-list-page/wiki-list-page.component';
export { WikiArticlePageComponent } from './ui/wiki-pages/wiki-article-page/wiki-article-page.component';
export { WikiSectionPageComponent } from './ui/wiki-pages/wiki-section-page/wiki-section-page.component';
export { MySuggestionsComponent } from './ui/my-suggestions/my-suggestions.component';
export { wikiEditorLeaveGuard } from './lib/wiki-editor-leave.guard';
