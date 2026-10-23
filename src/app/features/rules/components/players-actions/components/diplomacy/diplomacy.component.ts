import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

/**
 * Подраздел «3.5 Дипломатия» и виды политических курсов.
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.actions.diplomacy`).
 */
@Component({
    selector: 'app-diplomacy',
    templateUrl: './diplomacy.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiplomacyComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
