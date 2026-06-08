import { Component, output } from '@angular/core';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент региона - крупной административной единицы.
 */
@Component({
    selector: 'app-region',
    templateUrl: './region.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent],
})
export class RegionComponent {
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
