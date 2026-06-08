import { Component, output } from '@angular/core';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент оборонительных сооружений поселений.
 */
@Component({
    selector: 'app-defensive-structures',
    templateUrl: './defensive-structures.component.html',
    imports: [RuleParagraphComponent],
})
export class DefensiveStructuresComponent {
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
