import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

/**
 * Тип надела «Вотчина».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.settlements.patrimony`).
 */
@Component({
    selector: 'app-patrimony',
    templateUrl: './patrimony.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatrimonyComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
