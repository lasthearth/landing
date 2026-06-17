import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент оборонительных сооружений поселений.
 */
@Component({
    selector: 'app-defensive-structures',
    templateUrl: './defensive-structures.component.html',
    imports: [RuleParagraphComponent, TranslatePipe],
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
