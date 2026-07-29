import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@core/i18n';
import { ISettlement } from '../../model/i-settlement';
import { isGuildSettlement } from '../../lib/is-guild-settlement.function';

/**
 * Бейдж "Гильдия".
 *
 * Отображает маркер гильдии, если поселение содержит скрытый маркер
 * в названии. Используется как костыль для отображения гильдий без
 * отдельного типа на бэкенде.
 */
@Component({
    selector: 'app-guild-badge',
    standalone: true,
    template: `
        @if (isGuild()) {
            <span class="inline-flex items-center bg-[#8b5a2b]/15 text-[#8b5a2b] uppercase font-bold text-base px-2 py-0.5 rounded-lg">
                {{ badgeLabel() }}
            </span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuildBadgeComponent {
    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Поселение, для которого отображается бейдж.
     */
    public readonly settlement = input.required<ISettlement>();

    /**
     * Текст бейджа.
     */
    public readonly label = input<string>('');

    /**
     * Возвращает текст бейджа.
     */
    protected badgeLabel(): string {
        return this.label() || this.i18n.translate('settlements.types.guild');
    }

    /**
     * Проверяет, является ли поселение гильдией.
     */
    protected isGuild(): boolean {
        return isGuildSettlement(this.settlement());
    }
}
