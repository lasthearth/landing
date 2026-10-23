import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Подраздел «3.7 Диверсии».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.actions.sabotage`).
 */
@Component({
    selector: 'app-saboteurs',
    templateUrl: './saboteurs.component.html',
    imports: [RuleParagraphComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaboteursComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
