import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

/**
 * Раздел «4. Вассалы».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.vassals`).
 */
@Component({
    selector: 'app-vassals',
    templateUrl: './vassals.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VassalsComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
