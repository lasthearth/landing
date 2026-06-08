import { InjectionToken, Signal } from '@angular/core';

/**
 * InjectionToken для передачи ID секции через DI.
 *
 * Используется RuleSectionComponent для провайдинга своего sectionId
 * дочерним компонентам (RuleParagraphComponent, ScrollAnchorDirective).
 *
 * @example
 * ```ts
 * // В секции:
 * @Component({
 *     providers: [
 *         { provide: SECTION_ID, useValue: computed(() => this.sectionId()) }
 *     ]
 * })
 *
 * // В дочернем компоненте:
 * const sectionId = inject(SECTION_ID);
 * ```
 */
export const SECTION_ID = new InjectionToken<Signal<string>>('SECTION_ID');
