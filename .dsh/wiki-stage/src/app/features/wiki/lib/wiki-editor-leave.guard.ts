import { CanDeactivateFn } from '@angular/router';
import type { WikiEditorPageComponent } from '../ui/wiki-editor-page/wiki-editor-page.component';

/**
 * Не даёт уйти из редактора статьи с несохранёнными правками без подтверждения.
 */
export const wikiEditorLeaveGuard: CanDeactivateFn<WikiEditorPageComponent> = (component) => component.canLeave();
