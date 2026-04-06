import { Component, output } from '@angular/core';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

@Component({
    selector: 'app-theft',
    templateUrl: './theft.component.html',
    imports: [RuleParagraphComponent],
})
export class TheftComponent {
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
