import { Component, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RuleParagraphComponent } from '@app/features/rules/ui/rule-paragraph/rule-paragraph.component';
import { RuleLinkComponent } from '@app/features/rules/ui/rule-link/rule-link.component';

@Component({
    selector: 'app-colonization',
    templateUrl: './colonization.component.html',
    imports: [RuleParagraphComponent, RuleLinkComponent, TranslatePipe],
})
export class ColonizationComponent {
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
