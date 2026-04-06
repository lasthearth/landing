import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ScrollService } from '../../services/scroll.service';

/**
 * Компонент ссылки на элемент правила.
 *
 * Использует scrollToAnchor вместо scrollToElement,
 * чтобы автоматически раскрывать секцию с целевым элементом.
 */
@Component({
    selector: 'app-rule-link',
    standalone: true,
    templateUrl: './rule-link.component.html',
    styleUrls: ['../../styles/rules.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleLinkComponent {
    private readonly scrollService = inject(ScrollService);

    /**
     * Идентификатор целевого элемента (якоря).
     */
    public target = input.required<string>();

    /**
     * Обрабатывает клик по ссылке.
     *
     * Использует scrollToAnchor, который автоматически раскрывает
     * родительскую секцию через зарегистрированные якори.
     */
    protected onClick(): void {
        this.scrollService.scrollToAnchor(this.target());
    }
}
