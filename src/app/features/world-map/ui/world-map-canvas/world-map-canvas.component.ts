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
import {
    WorldMapCourse,
    settlementCourse,
    settlementGlyph,
    settlementTier,
    washRadius,
} from '../../lib/settlement-mark';

/**
 * Начертание подписи: как на старых картах, крупное надел подписано
 * разрядкой прописными, мелкое — строчными и тоньше.
 */
type LabelStyle = 'major' | 'middle' | 'minor';

/**
 * Надел, пересчитанное в пиксели текущего вида.
 */
interface ScreenMark {
    point: WorldMapPoint;
    x: number;
    y: number;
    wash: number;
    glyph: string;
    course: WorldMapCourse;
    labelStyle: LabelStyle;
    labelVisible: boolean;
    /** Подпись слева от знака: справа она ушла бы за рамку. */
    labelLeft: boolean;
}

/**
 * Линия сетки с подписью у рамки.
 */
interface GridLine {
    value: number;
    position: number;
    label: string;
    origin: boolean;
}

/**
 * Отрезок градусной рамки: старые карты размечали поля чередованием
 * залитых и пустых делений, здесь деление — шаг сетки.
 */
interface FrameSegment {
    from: number;
    to: number;
}

/**
 * Половина луча розы ветров: одна сторона залита тушью, другая — бумагой.
 */
interface RoseHalf {
    d: string;
    dark: boolean;
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

/** Масштаб, до которого карта приближается к выбранному наделу, если сейчас она мельче. */
const FOCUS_SCALE = 0.09;

/** Длина анимации перелёта, мс. */
const FLY_DURATION = 420;

/** Длины линейки масштаба в блоках. */
const SCALE_BAR_STEPS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];

/** Внешняя рамка: отступ от края листа, пиксели. */
const FRAME_INSET = 10;

/** Ширина градусной полосы между внешней и внутренней рамкой, пиксели. */
const FRAME_BAND = 7;

/** Радиус розы ветров вокруг Очага, пиксели; на узком экране — ROSE_RADIUS_NARROW. */
const ROSE_RADIUS = 44;

/** Радиус розы ветров на телефоне: большая роза закрывала бы ближние к Очагу надела. */
const ROSE_RADIUS_NARROW = 30;

/** Ширина карты, начиная с которой роза ветров рисуется полного размера. */
const ROSE_WIDE_FROM = 560;

/** Отступ кнопок масштаба и картуша от края карты, пиксели (1.75rem). */
const OVERLAY_INSET = 28;

/** Радиус знака надела вместе с полем вокруг, пиксели: сюда не ложатся чужие подписи. */
const MARK_RADIUS = 11;

/** Расстояние от центра знака до подписи, пиксели. */
const LABEL_OFFSET = 13;

/** Высота подписи наделы, пиксели. */
const LABEL_HEIGHT = 18;

/** Средняя ширина буквы для оценки длины подписи, по начертаниям. */
const LETTER_WIDTH: Record<LabelStyle, number> = { major: 10.2, middle: 7.8, minor: 6.9 };

/**
 * Карта земель в манере старинной гравированной карты: лист бумаги в двойной
 * рамке с градусной разметкой, роза ветров вокруг Очага и румбы от неё,
 * условные знаки тушью и акварельная заливка курса под ними.
 *
 * Знаки и подписи рисуются в пикселях экрана, поэтому при приближении не растут:
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

    /** Наделы на карте. */
    public readonly points = input.required<readonly WorldMapPoint[]>();

    /** Выбранное надел. */
    public readonly selectedId = input<string | null>(null);

    /** Щелчок по наделу; null — щелчок по пустому месту. */
    public readonly selectedChange = output<string | null>();

    protected readonly size = signal<MapSize>(DEFAULT_SIZE);

    /**
     * Вид, который выбрал человек. Пока он карту не трогал — null, и карта
     * показывает все наделы: так и при серверном рендере, и после загрузки данных.
     */
    private readonly manualView = signal<MapView | null>(null);

    protected readonly view = computed<MapView>(
        () => this.manualView() ?? fitView(this.worldPoints(), this.size(), this.fitPadding())
    );

    protected readonly hoveredId = signal<string | null>(null);
    protected readonly cursor = signal<{ x: number; z: number } | null>(null);
    protected readonly wheelHint = signal(false);
    protected readonly dragging = signal(false);

    /** Радиус розы ветров для текущей ширины карты. */
    protected readonly roseRadius = computed(() =>
        this.size().width < ROSE_WIDE_FROM ? ROSE_RADIUS_NARROW : ROSE_RADIUS
    );

    /** Лучи розы ветров: четыре главных стороны, четыре промежуточных и восемь малых. */
    protected readonly rose = computed(() => buildRose(this.roseRadius()));

    protected readonly canZoomIn = computed(() => this.view().scale < MAX_SCALE * 0.999);
    protected readonly canZoomOut = computed(() => this.view().scale > MIN_SCALE * 1.001);

    /** Внутренняя рамка: всё содержимое карты обрезается по ней. */
    protected readonly inner = computed(() => {
        const offset = FRAME_INSET + FRAME_BAND;
        const { width, height } = this.size();

        return { x: offset, y: offset, width: width - offset * 2, height: height - offset * 2 };
    });

    protected readonly frame = computed(() => {
        const { width, height } = this.size();

        return {
            inset: FRAME_INSET,
            band: FRAME_BAND,
            width: width - FRAME_INSET * 2,
            height: height - FRAME_INSET * 2,
        };
    });

    /** Где на экране Очаг. */
    protected readonly hearth = computed<ScreenPoint>(() => worldToScreen(this.view(), this.size(), { x: 0, z: 0 }));

    /** Румбы: тонкие линии от розы ветров, как на портуланах. */
    protected readonly rhumbs = computed(() => {
        const { x, y } = this.hearth();
        const radius = this.roseRadius();
        const length = Math.hypot(this.size().width, this.size().height) * 2;

        return Array.from({ length: 16 }, (_, index) => {
            const radians = (index * 22.5 * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            return {
                major: index % 4 === 0,
                x1: x + cos * radius,
                y1: y + sin * radius,
                x2: x + cos * length,
                y2: y + sin * length,
            };
        });
    });

    /** Шаг сетки в блоках. */
    private readonly step = computed(() => gridStep(this.view().scale));

    /** Сетка координат с подписями у рамки. */
    protected readonly grid = computed(() => {
        const view = this.view();
        const size = this.size();
        const inner = this.inner();
        const lines = gridLines(view, size, this.step());
        const toLine = (value: number, position: number): GridLine => ({
            value,
            position,
            label: this.formatCoordinate(value),
            origin: value === 0,
        });

        return {
            xs: lines.xs.map((value) => toLine(value, worldToScreen(view, size, { x: value, z: 0 }).x)),
            zs: lines.zs.map((value) => toLine(value, worldToScreen(view, size, { x: 0, z: value }).y)),
            // Подписи не лезут в угол, где сходятся две линейки, и под кнопки масштаба.
            xLabels: lines.xs
                .map((value) => toLine(value, worldToScreen(view, size, { x: value, z: 0 }).x))
                .filter((line) => line.position > inner.x + 48 && line.position < inner.x + inner.width - 60),
            zLabels: lines.zs
                .map((value) => toLine(value, worldToScreen(view, size, { x: 0, z: value }).y))
                .filter((line) => line.position > inner.y + 28 && line.position < inner.y + inner.height - 6),
        };
    });

    /** Залитые деления градусной рамки по горизонтали и вертикали. */
    protected readonly frameMarks = computed(() => {
        const view = this.view();
        const size = this.size();
        const step = this.step();
        const start = FRAME_INSET;

        return {
            xs: this.frameSegments(
                (value) => worldToScreen(view, size, { x: value, z: 0 }).x,
                screenToWorld(view, size, { x: start, y: 0 }).x,
                screenToWorld(view, size, { x: size.width - start, y: 0 }).x,
                step,
                start,
                size.width - start
            ),
            zs: this.frameSegments(
                (value) => worldToScreen(view, size, { x: 0, z: value }).y,
                screenToWorld(view, size, { x: 0, y: start }).z,
                screenToWorld(view, size, { x: 0, y: size.height - start }).z,
                step,
                start,
                size.height - start
            ),
        };
    });

    /** Наделы в пикселях с решением, чью подпись показать. */
    protected readonly marks = computed<ScreenMark[]>(() => {
        const view = this.view();
        const size = this.size();
        const inner = this.inner();
        const forced = new Set([this.selectedId(), this.hoveredId()]);

        const marks = this.points().map((point): ScreenMark => {
            const screen = worldToScreen(view, size, { x: point.herald.x, z: point.herald.z });
            const labelStyle = this.labelStyle(point);
            const width = this.labelWidth(point.name, labelStyle);

            return {
                point,
                x: screen.x,
                y: screen.y,
                wash: washRadius(point.type),
                glyph: settlementGlyph(point.type),
                course: settlementCourse(point.diplomacy),
                labelStyle,
                labelVisible: false,
                labelLeft: screen.x + LABEL_OFFSET + width > inner.x + inner.width - 6,
            };
        });

        const hearth = this.hearth();
        const rose = this.roseRadius();
        // Подписи не ложатся на знаки, розу ветров, кнопки и картуш.
        const obstacles = [
            { x: hearth.x - rose, y: hearth.y - rose - 14, width: rose * 2, height: rose * 2 + 36 },
            ...this.overlayBoxes(),
            ...marks.map((mark) => ({
                x: mark.x - MARK_RADIUS,
                y: mark.y - MARK_RADIUS,
                width: MARK_RADIUS * 2,
                height: MARK_RADIUS * 2,
            })),
        ];
        const chosen = placeLabels(
            marks.map((mark) => {
                const width = this.labelWidth(mark.point.name, mark.labelStyle);
                const y = mark.y - LABEL_HEIGHT / 2;
                const right = { x: mark.x + LABEL_OFFSET, y, side: 'right' as const };
                const left = { x: mark.x - LABEL_OFFSET - width, y, side: 'left' as const };

                return {
                    id: mark.point.id,
                    // Справа от знака, а у правого края или при тесноте — слева;
                    // за рамку подпись не выходит ни с какой стороны.
                    positions: (mark.labelLeft ? [left] : [right, left]).filter(
                        (position) => position.x >= inner.x + 4 && position.x + width <= inner.x + inner.width - 4
                    ),
                    width,
                    height: LABEL_HEIGHT,
                    priority:
                        (forced.has(mark.point.id) ? 100 : 0) +
                        settlementTier(mark.point.type) * 10 +
                        (mark.point.membersCount ?? 0) / 100,
                };
            }),
            obstacles
        );

        // Сначала рисуем мелкие и невыбранные: выбранное надел всегда сверху.
        return marks
            .map((mark) => {
                const side = chosen.get(mark.point.id)?.side;

                return {
                    ...mark,
                    labelVisible: side !== undefined,
                    labelLeft: side === 'left',
                };
            })
            .sort((a, b) => Number(forced.has(a.point.id)) - Number(forced.has(b.point.id)));
    });

    /** Линейка масштаба: круглое число блоков длиной 60–150 пикселей, в четыре деления. */
    protected readonly scaleBar = computed(() => {
        const scale = this.view().scale;
        const blocks =
            SCALE_BAR_STEPS.find((step) => step * scale >= 60) ?? SCALE_BAR_STEPS[SCALE_BAR_STEPS.length - 1];

        return { width: Math.round(blocks * scale), label: this.formatNumber(blocks) };
    });

    /** Координаты под курсором, как в игре. */
    protected readonly cursorLabel = computed(() => {
        const cursor = this.cursor();

        return cursor
            ? { x: this.formatCoordinate(Math.round(cursor.x)), z: this.formatCoordinate(Math.round(cursor.z)) }
            : null;
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
     * Показывает все наделы и Очаг.
     */
    public fit(): void {
        this.flyTo(fitView(this.worldPoints(), this.size(), this.fitPadding()));
    }

    /**
     * Перелетает к наделу и при необходимости приближает.
     *
     * @param point Надел.
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

        // Захват — только когда началось перетаскивание: иначе щелчок по знаку
        // достался бы карте, а не знаку.
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

    /**
     * Начертание подписи по типу: провинция и город — разрядкой прописными,
     * хутор — мельче и светлее.
     */
    private labelStyle(point: WorldMapPoint): LabelStyle {
        const tier = settlementTier(point.type);

        if (tier >= 4) {
            return 'major';
        }

        return tier === 0 ? 'minor' : 'middle';
    }

    /**
     * Ширина подписи по числу букв: точнее не нужно, важно лишь не наложить соседей.
     */
    private labelWidth(name: string, style: LabelStyle): number {
        return Math.round(name.length * LETTER_WIDTH[style] + 4);
    }

    /**
     * Места, занятые кнопками масштаба и картушем: подписи туда не кладутся.
     * Размеры — с запасом по вёрстке из world-map-canvas.component.less.
     */
    private overlayBoxes(): { x: number; y: number; width: number; height: number }[] {
        const { width, height } = this.size();
        const narrow = width < 768;
        const controls = { x: width - OVERLAY_INSET - 42, y: OVERLAY_INSET, width: 42, height: 124 };
        const cartouche = narrow
            ? { x: 24, y: height - 24 - 62, width: 140, height: 62 }
            : { x: width - OVERLAY_INSET - 150, y: height - OVERLAY_INSET - 66, width: 150, height: 66 };

        return [controls, cartouche];
    }

    private formatNumber(value: number): string {
        return new Intl.NumberFormat(this.i18n.language() === 'en' ? 'en-US' : 'ru-RU').format(value);
    }

    /**
     * Подпись координаты: со знаком, как в игре; минус — типографский.
     */
    private formatCoordinate(value: number): string {
        // Шаг сетки считается в дробях: ноль приходил как −0,0000001 и подписывался «−0».
        // `|| 0` убирает −0: Intl печатает его как «-0».
        const rounded = Math.round(value) || 0;
        return rounded < 0 ? '−' + this.formatNumber(-rounded) : this.formatNumber(rounded);
    }

    /**
     * Залитые деления градусной рамки вдоль одной стороны: каждое второе
     * деление между линиями сетки, обрезанное по рамке.
     */
    private frameSegments(
        toScreen: (value: number) => number,
        worldFrom: number,
        worldTo: number,
        step: number,
        min: number,
        max: number
    ): FrameSegment[] {
        const segments: FrameSegment[] = [];
        let value = Math.floor(worldFrom / step) * step;

        while (value < worldTo && segments.length < 200) {
            if (Math.abs(Math.round(value / step)) % 2 === 0) {
                const from = Math.max(min, toScreen(value));
                const to = Math.min(max, toScreen(value + step));

                if (to > from) {
                    segments.push({ from, to });
                }
            }

            value += step;
        }

        return segments;
    }

    /**
     * Отступ при «Показать всё»: на телефоне 72 пикселя с каждой стороны съели бы
     * почти половину ширины, и наделы сбились бы в кучу посередине.
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
        this.flyTo(zoomAt(this.view(), size, { x: size.width / 2, y: size.height / 2 }, factor));
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
            zoomAt(
                panBy(view, midAfter.x - midBefore.x, midAfter.y - midBefore.y),
                this.size(),
                midAfter,
                distanceAfter / distanceBefore
            )
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
     * вписывает все наделы; потом при изменении размера центр остаётся на месте.
     */
    private observeSize(): void {
        const element = this.stage().nativeElement;

        const measure = (): void => {
            const width = Math.round(element.clientWidth);
            const height = Math.round(element.clientHeight);

            if (width > 0 && height > 0) {
                this.size.set({ width, height });
            }
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

/**
 * Строит лучи розы ветров с центром в нуле: у каждого луча тёмная и светлая
 * половины, как на гравюрах. Север — вверх (отрицательная Z в игре).
 *
 * @param radius Длина главных лучей, пиксели.
 * @returns Половины лучей: сначала мелкие, главные поверх.
 */
function buildRose(radius: number): RoseHalf[] {
    const rays: { angle: number; length: number; width: number }[] = [];

    for (let index = 0; index < 16; index++) {
        const angle = index * 22.5;
        const kind = index % 4 === 0 ? 'main' : index % 2 === 0 ? 'half' : 'minor';
        rays.push({
            angle,
            length: kind === 'main' ? radius : kind === 'half' ? radius * 0.62 : radius * 0.38,
            width: (kind === 'main' ? 6 : kind === 'half' ? 4.5 : 3) * (radius / ROSE_RADIUS),
        });
    }

    // Мелкие лучи рисуются первыми, главные ложатся поверх.
    rays.sort((a, b) => a.length - b.length);

    const point = (angle: number, radius: number): string => {
        const radians = (angle * Math.PI) / 180;

        return `${(Math.sin(radians) * radius).toFixed(2)} ${(-Math.cos(radians) * radius).toFixed(2)}`;
    };

    return rays.flatMap((ray) => {
        const tip = point(ray.angle, ray.length);
        const left = point(ray.angle - 90, ray.width);
        const right = point(ray.angle + 90, ray.width);

        return [
            { d: `M0 0L${left}L${tip}Z`, dark: true },
            { d: `M0 0L${right}L${tip}Z`, dark: false },
        ];
    });
}
