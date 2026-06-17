import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент усадьбы - малого частного поселения.
 */
@Component({
    selector: 'app-homestead',
    templateUrl: './homestead.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class HomesteadComponent {
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
