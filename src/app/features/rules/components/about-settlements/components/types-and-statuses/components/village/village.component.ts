import { Component, output } from '@angular/core';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';

/**
 * Компонент деревни - сельского поселения.
 */
@Component({
    selector: 'app-village',
    templateUrl: './village.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent],
})
export class VillageComponent {
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
