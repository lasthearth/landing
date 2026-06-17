import { Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '../../ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '../../ui/rule-link/rule-link.component';

/**
 * Базовый компонент правил сервера.
 */
@Component({
    selector: 'app-base',
    templateUrl: './base.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class BaseComponent {
    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo: OutputEmitterRef<string> = output<string>();

    /**
     * Обрабатывает событие прокрутки.
     */
    protected onScrollTo(elementId: string): void {
        this.scrollTo.emit(elementId);
    }
}
