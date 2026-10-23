import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

/**
 * Раздел «1. Основы».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.base`).
 */
@Component({
    selector: 'app-base',
    templateUrl: './base.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
