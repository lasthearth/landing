import { RulesTocItem } from '../model/rules-toc-item.interface';

/**
 * Разделы правил в порядке следования на странице — источник для оглавления.
 * При добавлении раздела в `rules.component.html` дополнить и этот список.
 */
export const RULES_TOC_SECTIONS: readonly RulesTocItem[] = [
    { sectionId: 'terminology', titleKey: 'rules.sections.terminology' },
    { sectionId: 'base', titleKey: 'rules.sections.base' },
    { sectionId: 'settlements', titleKey: 'rules.sections.settlements' },
    { sectionId: 'actions', titleKey: 'rules.sections.actions' },
    { sectionId: 'colonization', titleKey: 'rules.sections.colonization' },
    { sectionId: 'military', titleKey: 'rules.sections.military' },
    { sectionId: 'admin', titleKey: 'rules.sections.admin' },
];
