import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { WorldMapApiService } from '../../api/world-map-api.service';
import { WorldMapPoint, WorldMapSettlementType } from '../../model/world-map-point.interface';
import { compassDirection, distanceFromHearth, roundDistance } from '../../lib/compass';
import { WorldMapCourse, settlementCourse, settlementGlyph } from '../../lib/settlement-mark';
import { WorldMapCanvasComponent } from '../world-map-canvas/world-map-canvas.component';

/**
 * Поселение со всеми подписями для списка и карточки.
 */
interface WorldMapEntry {
    point: WorldMapPoint;
    course: WorldMapCourse;
    glyph: string;
    distance: string;
    directionKey: string | null;
}

/** Типы в порядке легенды: от лагеря до провинции. */
const LEGEND_TYPES: readonly WorldMapSettlementType[] = ['CAMP', 'VILLAGE', 'TOWNSHIP', 'CITY', 'PROVINCE'];

/** Курсы в порядке легенды. */
const LEGEND_COURSES: readonly WorldMapCourse[] = ['peace', 'neutral', 'danger'];

/**
 * Страница «Карта земель» `/map`.
 *
 * Поселения стоят там, где их главы поставили блок-глашатай: позицию пишет
 * сервер, поэтому она совпадает с миром, в отличие от координат из заявки.
 * Под картой — легенда и список поселений по удалённости от Очага: по нему
 * карту можно пройти без мыши, а на телефоне — без точных касаний.
 */
@Component({
    standalone: true,
    selector: 'app-world-map-page',
    imports: [PageHeaderComponent, EmptyStateComponent, WorldMapCanvasComponent, RouterLink, TuiIcon, TranslatePipe],
    templateUrl: './world-map-page.component.html',
    styleUrl: './world-map-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapPageComponent {
    private readonly api = inject(WorldMapApiService);
    private readonly i18n = inject(I18nService);
    private readonly canvas = viewChild(WorldMapCanvasComponent);

    protected readonly legendTypes = LEGEND_TYPES;
    protected readonly legendCourses = LEGEND_COURSES;
    protected readonly glyph = settlementGlyph;

    private readonly data = toSignal(this.api.load(), { initialValue: { points: [], demo: false } });

    protected readonly points = computed(() => this.data().points);
    protected readonly demo = computed(() => this.data().demo);
    protected readonly selectedId = signal<string | null>(null);

    /** Поселения от ближнего к Очагу до дальнего. */
    protected readonly entries = computed<WorldMapEntry[]>(() => {
        const format = new Intl.NumberFormat(this.i18n.language() === 'en' ? 'en-US' : 'ru-RU');

        return this.points()
            .map((point) => {
                const blocks = distanceFromHearth(point.herald.x, point.herald.z);
                const direction = compassDirection(point.herald.x, point.herald.z);

                return {
                    point,
                    blocks,
                    course: settlementCourse(point.diplomacy),
                    glyph: settlementGlyph(point.type),
                    distance: format.format(roundDistance(blocks)),
                    directionKey: direction ? 'worldMap.direction.' + direction : null,
                };
            })
            .sort((a, b) => a.blocks - b.blocks)
            .map(({ blocks: _blocks, ...entry }) => entry);
    });

    protected readonly selected = computed(
        () => this.entries().find((entry) => entry.point.id === this.selectedId()) ?? null
    );

    protected select(id: string | null): void {
        this.selectedId.set(id);
    }

    /**
     * Выбор из списка: карта перелетает к поселению.
     */
    protected show(entry: WorldMapEntry): void {
        this.selectedId.set(entry.point.id);
        this.canvas()?.focusOn(entry.point);
    }

    protected typeKey(type: WorldMapSettlementType): string {
        return 'worldMap.types.' + type;
    }

    protected courseKey(course: WorldMapCourse): string {
        return 'worldMap.course.' + course;
    }

    protected formatCoordinate(value: number): string {
        const format = new Intl.NumberFormat(this.i18n.language() === 'en' ? 'en-US' : 'ru-RU');

        return value < 0 ? '−' + format.format(-value) : format.format(value);
    }
}
