import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    PLATFORM_ID,
    afterNextRender,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { WorldMapPoint } from '../../model/world-map-point.interface';
import {
    MAX_SCALE,
    MIN_SCALE,
    MapSize,
    MapView,
    ScreenPoint,
    fitView,
    gridLines,
    gridStep,
    panBy,
    screenToWorld,
    worldToScreen,
    zoomAt,
} from '../../lib/map-view';
import { placeLabels } from '../../lib/place-labels';
import { WorldMapCourse, glowRadius, settlementCourse, settlementGlyph, settlementTier } from '../../lib/settlement-mark';

/**
 * Поселение, пересчитанное в пиксели текущего вида.
 */
interface ScreenMark {
    point: WorldMapPoint;
    x: number;
    y: number;
    glow: number;
    glyph: string;
    course: WorldMapCourse;
    labelVisible: boolean;
    /** Подпись слева от метки: справа она ушла бы за край карты. */
    labelLeft: boolean;
}

/**
 * Линия сетки с подписью на краю карты.
 */
interface GridLine {
    value: number;
    position: number;
    label: string;
    origin: boolean;
}

/** Размер до первого замера: при серверном рендере карта рисуется с ним. */
const DEFAULT_SIZE: MapSize = { width: 960, height: 600 };

/** Отступ от краёв при «Показать всё», пиксели; на узком экране — меньше, см. fitPadding(). */
const FIT_PADDING = 72;

/** Насколько приближают кнопки и клавиши. */
const ZOOM_STEP = 1.6;

/** Сдвиг стрелками, пиксели. */
const PAN_STEP = 80;

/** Сколько пикселей нужно протащить, чтобы это считалось перетаскиванием, а не щелчком. */
const DRAG_THRESHOLD = 4;

/** Масштаб, до которого карта приближается к выбранному поселению, если сейчас она мельче. */
const FOCUS_SCALE = 0.09;

/** Длина анимации перелёта, мс. */
const FLY_DURATION = 420;

/** Длины линейки масштаба в блоках. */
const SCALE_BAR_STEPS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];

/** Направления румбов от Очага, градусы. */
const RHUMB_ANGLES = Array.from({ length: 16 }, (_, index) => index * 22.5);

/** Ширина угла, где подписи двух линеек столкнулись бы, пиксели. */
const GRID_LABEL_CORNER = 64;

/** Полоса справа под кнопками масштаба, где подписи сетки не рисуются, пиксели. */
const GRID_LABEL_CONTROLS = 64;

/** Радиус метки вместе с кольцом, пиксели. */
const MARK_RADIUS = 15;

/** Расстояние от центра метки до подписи, пиксели. */
const LABEL_OFFSET = 18;

/** Высота подписи поселения, пиксели. */
const LABEL_HEIGHT = 20;

/**
 * Карта земель: тёмный мир, в котором поселения светятся огнями, а в центре —
 * Очаг, точка появления новичков.
 *
 * Метки и подписи рисуются в пикселях экрана, поэтому при приближении не растут:
 * растут только расстояния. Мышью карту двигают перетаскиванием, масштаб —
 * колёсиком с Ctrl (без Ctrl колёсико прокручивает страницу), на телефоне —
 * одним пальцем и щипком. С клавиатуры: стрелки, «+», «−» и «0».
 */
@Component({
    standalone: true,
    selector: 'app-world-map-canvas',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './world-map-canvas.component.html',
    styleUrl: './world-map-canvas.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapCanvasComponent {
    private readonly i18n = inject(I18nService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

    /** Поселения на карте. */
    public readonly points = input.required<readonly WorldMapPoint[]>();

    /** Выбранное поселение. */
    public readonly selectedId = input<string | null>(null);

    /** Щелчок по поселению; null — щелчок по пустому месту. */
    public readonly selectedChange = output<string | null>();

    protected readonly size = signal<MapSize>(DEFAULT_SIZE);
    /**
     * Вид, который выбрал человек. Пока он карту не трогал — null, и карта
     * показывает все поселения: так и при серверном рендере, и после загрузки данных.
     */
    private readonly manualView = signal<MapView | null>(null);

    protected readonly view = computed<MapView>(
        () => this.manualView() ?? fitView(this.worldPoints(), this.size(), this.fitPadding())
    );
    protected readonly hoveredId = signal<string | null>(null);
    protected readonly cursor = signal<{ x: number; z: number } | null>(null);
    protected readonly wheelHint = signal(false);
    protected readonly dragging = signal(false);

    protected readonly canZoomIn = computed(() => this.view().scale < MAX_SCALE * 0.999);
    protected readonly canZoomOut = computed(() => this.view().scale > MIN_SCALE * 1.001);

    /** Где на экране Очаг. */
    protected readonly hearth = computed<ScreenPoint>(() => worldToScreen(this.view(), this.size(), { x: 0, z: 0 }));

    /** Лучи-румбы от Очага, как на старых морских картах. */
    protected readonly rhumbs = computed(() => {
        const { x, y } = this.hearth();
        const length = Math.hypot(this.size().width, this.size().height) * 2;

        return RHUMB_ANGLES.map((angle) => {
            const radians = (angle * Math.PI) / 180;

            return {
                major: angle % 90 === 0,
                x2: x + Math.cos(radians) * length,
                y2: y + Math.sin(radians) * length,
            };
        });
    });

    /** Сетка координат с подписями по краям. */
    protected readonly grid = computed(() => {
        const view = this.view();
        const size = this.size();
        const step = gridStep(view.scale);
        const lines = gridLines(view, size, step);

        // Подписи не лезут в угол, где сходятся две линейки, и под кнопки масштаба.
        return {
            xs: lines.xs
                .filter((value) => {
                    const x = worldToScreen(view, size, { x: value, z: 0 }).x;

                    return x > GRID_LABEL_CORNER && x < size.width - GRID_LABEL_CONTROLS;
                })
                .map(
                (value): GridLine => ({
                    value,
                    position: worldToScreen(view, size, { x: value, z: 0 }).x,
                    label: this.formatCoordinate(value),
                    origin: value === 0,
                })
            ),
            zs: lines.zs
                .filter((value) => {
                    const y = worldToScreen(view, size, { x: 0, z: value }).y;

                    return y > GRID_LABEL_CORNER / 2 && y < size.height - 8;
                })
                .map(
                (value): GridLine => ({
                    value,
                    position: worldToScreen(view, size, { x: 0, z: value }).y,
                    label: this.formatCoordinate(value),
                    origin: value === 0,
                })
            ),
        };
    });

    /** Поселения в пикселях с решением, чью подпись показать. */
    protected readonly marks = computed<ScreenMark[]>(() => {
        const view = this.view();
        const size = this.size();
        const glowZoom = Math.min(1.5, Math.max(0.75, Math.sqrt(view.scale / 0.04)));
        const forced = new Set([this.selectedId(), this.hoveredId()]);

        const marks = this.points().map((point) => {
            const screen = worldToScreen(view, size, { x: point.herald.x, z: point.herald.z });

            return {
                point,
                x: screen.x,
                y: screen.y,
                glow: glowRadius(point.type) * glowZoom,
                glyph: settlementGlyph(point.type),
                course: settlementCourse(point.diplomacy),
                labelVisible: false,
                labelLeft: screen.x + LABEL_OFFSET + this.labelWidth(point.name) > size.width - 8,
            };
        });

        const hearth = this.hearth();
        // Подписи не ложатся на чужие метки и на Очаг.
        const obstacles = [
            { x: hearth.x - MARK_RADIUS, y: hearth.y - MARK_RADIUS, width: MARK_RADIUS * 2, height: MARK_RADIUS * 2 },
            ...marks.map((mark) => ({
                x: mark.x - MARK_RADIUS,
                y: mark.y - MARK_RADIUS,
                width: MARK_RADIUS * 2,
                height: MARK_RADIUS * 2,
            })),
        ];
        const visible = placeLabels([
            // Подпись Очага занимает место первой.
            { id: '__hearth', x: hearth.x - 30, y: hearth.y + 22, width: 60, height: LABEL_HEIGHT, priority: 1000 },
            ...marks.map((mark) => ({
                id: mark.point.id,
                x: mark.labelLeft ? mark.x - LABEL_OFFSET - this.labelWidth(mark.point.name) : mark.x + LABEL_OFFSET,
                y: mark.y - LABEL_HEIGHT / 2,
                width: this.labelWidth(mark.point.name),
                height: LABEL_HEIGHT,
                priority: (forced.has(mark.point.id) ? 100 : 0) + settlementTier(mark.point.type) * 10 + mark.point.membersCount / 100,
            })),
        ], obstacles);

        // Сначала рисуем мелкие и невыбранные: выбранное поселение всегда сверху.
        return marks
            .map((mark) => ({ ...mark, labelVisible: visible.has(mark.point.id) }))
            .sort((a, b) => Number(forced.has(a.point.id)) - Number(forced.has(b.point.id)));
    });

    /** Линейка масштаба: круглое число блоков длиной 60–150 пикселей. */
    protected readonly scaleBar = computed(() => {
        const scale = this.view().scale;
        const blocks = SCALE_BAR_STEPS.find((step) => step * scale >= 60) ?? SCALE_BAR_STEPS[SCALE_BAR_STEPS.length - 1];

        return { width: Math.round(blocks * scale), label: this.formatNumber(blocks) };
    });

    /** Координаты под курсором, как в игре. */
    protected readonly cursorLabel = computed(() => {
        const cursor = this.cursor();

        return cursor ? { x: this.formatNumber(Math.round(cursor.x)), z: this.formatNumber(Math.round(cursor.z)) } : null;
    });

    private readonly pointers = new Map<number, ScreenPoint>();
    private dragDistance = 0;
    private suppressClick = false;
    private flight = 0;
    private wheelHintTimer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        afterNextRender(() => this.observeSize());

        this.destroyRef.onDestroy(() => {
            this.stopFlight();
            clearTimeout(this.wheelHintTimer);
        });
    }

    /**
     * Показывает все поселения и Очаг.
     */
    public fit(): void {
        this.flyTo(fitView(this.worldPoints(), this.size(), this.fitPadding()));
    }

    /**
     * Перелетает к поселению и при необходимости приближает.
     *
     * @param point Поселение.
     */
    public focusOn(point: WorldMapPoint): void {
        this.flyTo({
            cx: point.herald.x,
            cz: point.herald.z,
            scale: Math.max(this.view().scale, FOCUS_SCALE),
        });
    }

    protected zoomIn(): void {
        this.zoomBy(ZOOM_STEP);
    }

    protected zoomOut(): void {
        this.zoomBy(1 / ZOOM_STEP);
    }

    protected onMarkClick(event: MouseEvent, point: WorldMapPoint): void {
        event.stopPropagation();

        if (this.suppressClick) {
            return;
        }

        this.selectedChange.emit(point.id);
    }

    protected onMarkKeydown(event: KeyboardEvent, point: WorldMapPoint): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.selectedChange.emit(point.id);
        }
    }

    protected onBackgroundClick(): void {
        if (!this.suppressClick) {
            this.selectedChange.emit(null);
        }
    }

    protected onPointerDown(event: PointerEvent): void {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        this.stopFlight();
        this.pointers.set(event.pointerId, this.localPoint(event));
        this.dragDistance = 0;
        this.suppressClick = false;
    }

    protected onPointerMove(event: PointerEvent): void {
        const point = this.localPoint(event);

        if (event.pointerType === 'mouse') {
            this.cursor.set(screenToWorld(this.view(), this.size(), point));
        }

        const previous = this.pointers.get(event.pointerId);

        if (!previous) {
            return;
        }

        if (this.pointers.size >= 2) {
            this.pinch(event.pointerId, point);

            return;
        }

        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        this.dragDistance += Math.hypot(dx, dy);
        this.pointers.set(event.pointerId, point);

        if (this.dragDistance < DRAG_THRESHOLD) {
            return;
        }

        // Захват — только когда началось перетаскивание: иначе щелчок по метке
        // достался бы карте, а не метке.
        const target = event.currentTarget as Element;
        if (!target.hasPointerCapture(event.pointerId)) {
            target.setPointerCapture(event.pointerId);
            this.dragging.set(true);
        }

        this.suppressClick = true;
        this.updateView((view) => panBy(view, dx, dy));
    }

    protected onPointerUp(event: PointerEvent): void {
        this.pointers.delete(event.pointerId);

        if (this.pointers.size === 0) {
            this.dragging.set(false);
        }
    }

    protected onPointerLeave(): void {
        this.cursor.set(null);
    }

    protected onWheel(event: WheelEvent): void {
        // Без Ctrl колёсико прокручивает страницу: карта посреди страницы не должна
        // перехватывать прокрутку. Щипок на тачпаде браузер присылает как колёсико с Ctrl.
        if (!event.ctrlKey && !event.metaKey) {
            this.showWheelHint();

            return;
        }

        event.preventDefault();
        this.stopFlight();
        this.wheelHint.set(false);
        const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025));
        this.updateView((view) => zoomAt(view, this.size(), this.localPoint(event), factor));
    }

    protected onKeydown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'ArrowLeft':
                this.updateView((view) => panBy(view, PAN_STEP, 0));
                break;
            case 'ArrowRight':
                this.updateView((view) => panBy(view, -PAN_STEP, 0));
                break;
            case 'ArrowUp':
                this.updateView((view) => panBy(view, 0, PAN_STEP));
                break;
            case 'ArrowDown':
                this.updateView((view) => panBy(view, 0, -PAN_STEP));
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
            case '_':
                this.zoomOut();
                break;
            case '0':
                this.fit();
                break;
            default:
                return;
        }

        event.preventDefault();
    }

    protected courseKey(course: WorldMapCourse): string {
        return 'worldMap.course.' + course;
    }

    /**
     * Ширина подписи по числу букв: точнее не нужно, важно лишь не наложить соседей.
     */
    private labelWidth(name: string): number {
        return Math.round(name.length * 8.4 + 6);
    }

    private formatNumber(value: number): string {
        return new Intl.NumberFormat(this.i18n.language() === 'en' ? 'en-US' : 'ru-RU').format(value);
    }

    /**
     * Подпись линии сетки: со знаком, как в игре; минус — типографский.
     */
    private formatCoordinate(value: number): string {
        return value < 0 ? '−' + this.formatNumber(-value) : this.formatNumber(value);
    }

    /**
     * Отступ при «Показать всё»: на телефоне 72 пикселя с каждой стороны съели бы
     * почти половину ширины, и поселения сбились бы в кучу посередине.
     */
    private fitPadding(): number {
        return Math.min(FIT_PADDING, Math.round(this.size().width * 0.1));
    }

    private worldPoints(): { x: number; z: number }[] {
        return this.points().map((point) => ({ x: point.herald.x, z: point.herald.z }));
    }

    private updateView(change: (view: MapView) => MapView): void {
        this.manualView.set(change(this.view()));
    }

    private zoomBy(factor: number): void {
        const size = this.size();
        const view = this.view();
        const target = zoomAt(view, size, { x: size.width / 2, y: size.height / 2 }, factor);
        this.flyTo(target);
    }

    private pinch(pointerId: number, point: ScreenPoint): void {
        const [first, second] = [...this.pointers.entries()];
        const before = { a: first[1], b: second[1] };
        this.pointers.set(pointerId, point);
        const after = { a: this.pointers.get(first[0])!, b: this.pointers.get(second[0])! };

        const distanceBefore = Math.hypot(before.a.x - before.b.x, before.a.y - before.b.y);
        const distanceAfter = Math.hypot(after.a.x - after.b.x, after.a.y - after.b.y);
        const midBefore = { x: (before.a.x + before.b.x) / 2, y: (before.a.y + before.b.y) / 2 };
        const midAfter = { x: (after.a.x + after.b.x) / 2, y: (after.a.y + after.b.y) / 2 };

        if (distanceBefore < 1) {
            return;
        }

        this.suppressClick = true;
        this.updateView((view) =>
            zoomAt(panBy(view, midAfter.x - midBefore.x, midAfter.y - midBefore.y), this.size(), midAfter, distanceAfter / distanceBefore)
        );
    }

    /**
     * Прерывает перелёт: человек сам взялся за карту. На сервере анимаций нет.
     */
    private stopFlight(): void {
        if (this.isBrowser) {
            cancelAnimationFrame(this.flight);
        }
    }

    private showWheelHint(): void {
        this.wheelHint.set(true);
        clearTimeout(this.wheelHintTimer);
        this.wheelHintTimer = setTimeout(() => this.wheelHint.set(false), 1600);
    }

    private localPoint(event: MouseEvent): ScreenPoint {
        const rect = this.stage().nativeElement.getBoundingClientRect();

        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /**
     * Плавно переводит карту к виду; без анимации, если человек её отключил.
     */
    private flyTo(target: MapView): void {
        this.stopFlight();

        if (!this.isBrowser || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.manualView.set(target);

            return;
        }

        const from = this.view();
        const startedAt = performance.now();
        // Масштаб меняется по логарифму: иначе приближение в 10 раз выглядит рывком в конце.
        const fromLog = Math.log(from.scale);
        const toLog = Math.log(target.scale);

        const step = (now: number): void => {
            const progress = Math.min(1, (now - startedAt) / FLY_DURATION);
            const eased = 1 - Math.pow(1 - progress, 3);

            this.manualView.set({
                cx: from.cx + (target.cx - from.cx) * eased,
                cz: from.cz + (target.cz - from.cz) * eased,
                scale: Math.exp(fromLog + (toLog - fromLog) * eased),
            });

            if (progress < 1) {
                this.flight = requestAnimationFrame(step);
            }
        };

        this.flight = requestAnimationFrame(step);
    }

    /**
     * Следит за размером карты. Пока человек карту не трогал, она заново
     * вписывает все поселения; потом при изменении размера центр остаётся на месте.
     */
    private observeSize(): void {
        const element = this.stage().nativeElement;

        const measure = (): void => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);

            if (width === 0 || height === 0) {
                return;
            }

            this.size.set({ width, height });
        };

        measure();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        this.destroyRef.onDestroy(() => observer.disconnect());
    }
}
