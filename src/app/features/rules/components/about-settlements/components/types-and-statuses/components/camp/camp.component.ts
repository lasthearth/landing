import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент лагеря - временного поселения.
 */
@Component({
    selector: 'app-camp',
    templateUrl: './camp.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class CampComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo = output<string>();

    /**
     * Обрабатывает событие прокрутки.
     */
    protected onScrollTo(elementId: string): void {
        this.scrollTo.emit(elementId);
    }
}
