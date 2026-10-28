import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, TranslatePipe } from '@core/i18n';
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
    imports: [AmountPipe, TranslatePipe, TuiIcon],
    templateUrl: './upgrade-node-details.component.html',
    styleUrl: './upgrade-node-details.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradeNodeDetailsComponent {
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
    protected readonly pointKey = computed(() => `keyPoints.points.${this.scheme().id}`);

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
    protected readonly actionKey = computed(() => `keyPoints.details.action.${this.state()}`);
}
