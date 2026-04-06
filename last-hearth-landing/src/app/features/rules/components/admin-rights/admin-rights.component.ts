import { Component, output } from '@angular/core';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

@Component({
    selector: 'app-admin-rights',
    templateUrl: './admin-rights.component.html',
    imports: [RuleParagraphComponent],
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
