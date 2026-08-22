import { ChangeDetectionStrategy, Component, computed, input, InputSignal, Signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { SettlementBadgeTone } from '../../model/settlement-badge-tone';

/**
 * Классы фона и текста для каждого тона бейджа.
 */
const TONE_CLASSES: Record<SettlementBadgeTone, string> = {
    leader: 'bg-lh-leader/15 text-leader-ink',
    peace: 'bg-peace/15 text-peace',
    neutral: 'bg-neutral-status/15 text-neutral-status',
    danger: 'bg-lh-danger/15 text-danger-ink',
    gold: 'bg-gold/15 text-warning-ink border border-gold/40',
    iron: 'bg-rank-iron/15 text-rank-iron',
    silver: 'bg-rank-silver/15 text-rank-silver',
    medal: 'bg-medal-gold/15 text-medal-gold',
    line: 'bg-line-strong/15 text-ink-2',
    accent: 'bg-lh-accent/25 text-ink-2',
};

/**
 * Бейдж поселения.
 *
 * Единый визуальный элемент для типа селения, населения, онлайна и дипломатии
 * на всех поверхностях: список селений, страница селения, профиль.
 */
@Component({
    standalone: true,
    selector: 'app-settlement-badge',
    imports: [TuiIcon],
    template: `
        <span [class]="classes()">
            @if (icon()) {
                <tui-icon [icon]="icon()!" class="size-4!" />
            }
            <ng-content />
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementBadgeComponent {
    /**
     * Цветовой тон бейджа.
     */
    public readonly tone: InputSignal<SettlementBadgeTone> = input<SettlementBadgeTone>('line');

    /**
     * Признак отображения текста заглавными буквами.
     */
    public readonly uppercase: InputSignal<boolean> = input<boolean>(false);

    /**
     * Иконка Taiga UI перед текстом (например, `@tui.pin`).
     */
    public readonly icon: InputSignal<string | null> = input<string | null>(null);

    /**
     * Итоговый набор CSS-классов бейджа.
     */
    protected readonly classes: Signal<string> = computed(
        () =>
            'inline-flex items-center gap-1 font-bold text-base px-2 py-0.5 rounded-lg ' +
            (this.uppercase() ? 'uppercase ' : '') +
            TONE_CLASSES[this.tone()]
    );
}
