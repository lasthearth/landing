import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { formatCost } from '../../lib/format-cost.function';
import { textKeyOf } from '../../lib/text-key-of.function';
import { UpgradeCost } from '../../model/upgrade-cost.interface';
import { KeyPointScheme } from '../../model/key-point-scheme.interface';
import { UpgradeNode } from '../../model/upgrade-node.interface';
import { UpgradeNodeState } from '../../model/upgrade-node-state.type';

/**
 * Панель подробностей выбранного узла схемы.
 *
 * Показывает бонус, стоимость, требования и что узел открывает. Требования
 * и открываемые узлы — кнопки: по ним можно идти по схеме, не целясь в медальоны.
 * Внизу — действие планировщика: отметить узел построенным или снять отметку.
 */
@Component({
    selector: 'app-upgrade-node-details',
    imports: [TranslatePipe, TuiIcon],
    templateUrl: './upgrade-node-details.component.html',
    styleUrl: './upgrade-node-details.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradeNodeDetailsComponent {
    private readonly i18n = inject(I18nService);

    /**
     * Схема точки.
     */
    public readonly scheme = input.required<KeyPointScheme>();

    /**
     * Выбранный узел.
     */
    public readonly node = input.required<UpgradeNode>();

    /**
     * Состояние узла в плане.
     */
    public readonly state = input.required<UpgradeNodeState>();

    /**
     * Построенные узлы точки — для отметок у требований.
     */
    public readonly built = input.required<ReadonlySet<string>>();

    /**
     * Просьба выбрать другой узел (переход по требованию или по открываемому узлу).
     */
    public readonly selectNode = output<string>();

    /**
     * Просьба отметить узел построенным или снять отметку.
     */
    public readonly toggle = output<void>();

    /**
     * Префикс ключей словаря точки.
     */
    protected readonly pointKey = computed(() => textKeyOf(this.scheme()));

    /**
     * Узлы, которые открываются сразу после выбранного.
     */
    protected readonly unlocks = computed(() => {
        const id = this.node().id;
        return this.scheme().nodes.filter((node) => [...node.requires, ...(node.requiresAny ?? [])].includes(id));
    });

    /**
     * Ключ подписи кнопки действия по состоянию узла.
     */
    protected readonly actionKey = computed(() =>
        this.node().automatic ? 'keyPoints.details.action.automatic' : `keyPoints.details.action.${this.state()}`
    );

    /**
     * Стоимость текстом: «1 дукат 10 серебряных» или кратко «1 зол. 10 сер.».
     *
     * @param cost Строка стоимости.
     * @param short Краткая форма — для бирки под узлом.
     * @returns Текст стоимости.
     */
    protected costText(cost: UpgradeCost, short = false): string {
        return formatCost(cost, this.i18n.language(), (key) => this.i18n.translate(key), short);
    }
}
