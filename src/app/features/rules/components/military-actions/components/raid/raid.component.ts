import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

/**
 * Подраздел «6.1 Набег».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.military.raid`).
 */
@Component({
    selector: 'app-raid',
    templateUrl: './raid.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaidComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
