import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

@Component({
    selector: 'app-admin-rights',
    templateUrl: './admin-rights.component.html',
    imports: [RuleParagraphComponent, TranslatePipe],
})
export class AdminRightsComponent {
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
