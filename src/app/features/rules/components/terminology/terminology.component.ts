import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '../../ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '../../ui/rule-link/rule-link.component';

/**
 * Компонент терминов и определений правил сервера.
 */
@Component({
    selector: 'app-terminology',
    templateUrl: './terminology.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class TerminologyComponent {
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
