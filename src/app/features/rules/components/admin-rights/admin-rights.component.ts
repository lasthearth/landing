import { ChangeDetectionStrategy, Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Раздел «7. Права и обязанности администрации».
 *
 * Текст пунктов — в словаре `rules.i18n.ts` (`rules.content.admin`).
 */
@Component({
    selector: 'app-admin-rights',
    templateUrl: './admin-rights.component.html',
    imports: [RuleParagraphComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRightsComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();
}
