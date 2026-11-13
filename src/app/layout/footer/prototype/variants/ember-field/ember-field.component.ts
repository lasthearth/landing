import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/** Ограничение числа частиц: контракт прототипа, строка «Canvas». */
const MAX_EMBERS = 120;

/** Интервал перерисовки ASCII-строки огня, секунды. */
const ASCII_INTERVAL = 0.11;

/** Путь к спрайту уголька: 96×96 с радиальным спадом до прозрачного. */
const EMBER_SPRITE_SRC = '/footer-assets/ember.png';

/** Минимальная сторона спрайта в кадре, CSS px. */
const SPRITE_MIN = 8;

/** Максимальная сторона спрайта в кадре, CSS px. */
const SPRITE_MAX = 22;

/**
 * Набор символов ASCII-строки огня, от частых и тусклых к редким и жарким.
 * Индекс выбирается равномерно, поэтому «искры» появляются реже «пепла».
 */
const FIRE_CHARS = ['·', '·', '·', '.', ':', ':', '+', '*', '^', 'o', '%', '#', 'O', '@', '█'];

/** Радиус действия «ветра» от указателя, px. */
const POINTER_RADIUS = 150;

/**
 * Частица-уголёк на canvas.
 */
interface Ember {
    /** Горизонтальная позиция, px. */
    x: number;

    /** Вертикальная позиция, px; 0 — верх холста. */
    y: number;

    /** Горизонтальная скорость, px/с. */
    vx: number;

    /** Скорость подъёма, px/с. */
    vy: number;

    /** Прожитое время, с. */
    life: number;

    /** Полный срок жизни, с. */
    maxLife: number;

    /** Радиус, px. */
    size: number;

    /** Фаза покачивания и мерцания, рад. */
    phase: number;

    /** Цвет частицы: [r, g, b] 0..255. */
    color: readonly [number, number, number];

    /** Постоянный поворот спрайта, рад. */
    spin: number;

    /** Сторона спрайта в CSS px, от `SPRITE_MIN` до `SPRITE_MAX`. */
    spriteSize: number;
}

/**
 * Преобразует шестнадцатеричный цвет в тройку каналов.
 *
 * @param hex Цвет вида `#rgb` или `#rrggbb`.
 * @returns Тройка [r, g, b] либо `null`, если разбор не удался.
 */
function hexToRgb(hex: string): readonly [number, number, number] | null {
    const clean = hex.replace('#', '');
    const full =
        clean.length === 3
            ? clean
                  .split('')
                  .map((char) => char + char)
                  .join('')
            : clean;

    if (full.length !== 6) {
        return null;
    }

    const value = Number.parseInt(full, 16);

    if (Number.isNaN(value)) {
        return null;
    }

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Строит детерминированную стартовую ASCII-строку.
 *
 * Один и тот же результат на сервере и в браузере нужен, чтобы гидратация
 * не расходилась с пререндером.
 *
 * @param count Число символов в строке.
 * @returns Массив символов строки.
 */
function buildStaticAscii(count: number): string[] {
    let seed = 20260111;

    return Array.from({ length: count }, () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;

        return FIRE_CHARS[Math.floor((seed / 2147483648) * FIRE_CHARS.length)] ?? '·';
    });
}

/**
 * Вариант подвала «Угольки».
 *
 * Canvas 2D над верхней кромкой подвала: частицы-угольки поднимаются
 * от кромки вверх, указатель подмешивает лёгкий «ветер». Над кромкой —
 * ASCII-строка огня, мерцающая символами. При `prefers-reduced-motion`
 * рисуется один статичный кадр без движения.
 */
@Component({
    standalone: true,
    selector: 'app-footer-ember-field',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent],
    templateUrl: './ember-field.component.html',
    styleUrl: './ember-field.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmberFieldComponent {
    /**
     * Данные подвала из общего сервиса прототипа.
     */
    protected readonly state = inject(FooterPrototypeState);

    /**
     * Символы ASCII-строки огня. Стартовое значение детерминированное:
     * его рисует и пререндер.
     */
    protected readonly asciiChars = signal<string[]>(buildStaticAscii(64));

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('emberCanvas');

    private readonly destroyRef = inject(DestroyRef);

    /** Контекст холста; `null` до инициализации или без поддержки 2D. */
    private context: CanvasRenderingContext2D | null = null;

    /** Живые частицы. */
    private embers: Ember[] = [];

    /** Спрайт уголька; `null`, пока файл не загружен или отсутствует. */
    private sprite: HTMLImageElement | null = null;

    /** Спрайт загружен и готов к отрисовке. */
    private isSpriteReady = false;

    /** Запрошенное изображение спрайта: нужно, чтобы снять обработчики при уничтожении. */
    private pendingSprite: HTMLImageElement | null = null;

    /** Палитра угольков, прочитанная из токенов `--lh-*`. */
    private palette: readonly (readonly [number, number, number])[] = [
        [195, 90, 23],
        [255, 121, 32],
        [255, 170, 92],
    ];

    /** Идентификатор кадра rAF; 0 — цикл остановлен. */
    private frameId = 0;

    /** Момент предыдущего кадра, мс. */
    private lastTime = 0;

    /** Накопитель интервала ASCII-строки, с. */
    private asciiTimer = 0;

    /** Счётчик времени с начала цикла, с. */
    private clock = 0;

    /** Подвал во вьюпорте. */
    private isVisible = false;

    /** Движение разрешено системной настройкой. */
    private isMotionAllowed = true;

    /** Позиция указателя в координатах клиента; `null` — указатель не двигался. */
    private pointerClient: { x: number; y: number } | null = null;

    /** Логические размеры холста, px без учёта dpr. */
    private width = 0;

    private height = 0;

    /** Наблюдатель размера подвала. */
    private resizeObserver?: ResizeObserver;

    /** Наблюдатель видимости подвала. */
    private visibilityObserver?: IntersectionObserver;

    /** Запрос системной настройки движения. */
    private motionQuery?: MediaQueryList;

    constructor() {
        afterNextRender(() => this.init());

        this.destroyRef.onDestroy(() => this.teardown());
    }

    /**
     * Инициализирует холст, наблюдателей и обработчики указателя.
     * Вызывается один раз в браузере после первого кадра.
     */
    private init(): void {
        const canvasElement = this.canvas()?.nativeElement;

        if (!canvasElement) {
            return;
        }

        this.context = canvasElement.getContext('2d');

        if (!this.context) {
            return;
        }

        this.palette = this.readPalette();
        this.loadSprite();

        this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isMotionAllowed = !this.motionQuery.matches;
        this.motionQuery.addEventListener('change', this.onMotionChange);

        this.resize();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.host.nativeElement);

        this.visibilityObserver = new IntersectionObserver(this.onVisibilityChange, {
            rootMargin: '160px 0px',
            threshold: 0,
        });
        this.visibilityObserver.observe(this.host.nativeElement);

        window.addEventListener('pointermove', this.onPointerMove, { passive: true });

        if (this.isMotionAllowed) {
            return;
        }

        // Без движения: один статичный кадр и вечная строка из пререндера.
        this.renderStaticFrame();
    }

    /**
     * Освобождает наблюдателей, слушателей и останавливает цикл кадров.
     */
    private teardown(): void {
        this.stopLoop();
        this.disposeSprite();
        this.resizeObserver?.disconnect();
        this.visibilityObserver?.disconnect();
        this.motionQuery?.removeEventListener('change', this.onMotionChange);
        window.removeEventListener('pointermove', this.onPointerMove);
    }

    /**
     * Читает цвета угольков из дизайн-токенов корня документа.
     *
     * @returns Палитра из разобранных токенов; запасные значения, если токены пусты.
     */
    private readPalette(): readonly (readonly [number, number, number])[] {
        const style = getComputedStyle(document.documentElement);
        const tokens = ['--lh-brand', '--lh-accent', '--lh-accent-soft', '--lh-brand-lit-2'];
        const colors = tokens
            .map((token) => hexToRgb(style.getPropertyValue(token).trim()))
            .filter((color): color is readonly [number, number, number] => color !== null);

        return colors.length > 0 ? colors : this.palette;
    }

    /**
     * Загружает спрайт уголька один раз, в браузере.
     *
     * Пока файл не загружен или его нет (404), кадр рисует прежний радиальный
     * градиент: `onload` и `onerror` не бросают, цикл не останавливается.
     */
    private loadSprite(): void {
        const image = new Image();

        this.pendingSprite = image;

        image.onload = () => {
            this.sprite = image;
            this.isSpriteReady = true;

            // Статичный кадр без движения рисуется один раз: после загрузки его надо повторить.
            if (!this.isMotionAllowed) {
                this.renderStaticFrame();
            }
        };

        image.onerror = () => {
            this.sprite = null;
            this.isSpriteReady = false;
        };

        image.src = EMBER_SPRITE_SRC;
    }

    /**
     * Снимает обработчики спрайта и сбрасывает ссылки при уничтожении компонента.
     */
    private disposeSprite(): void {
        const image = this.pendingSprite;

        if (image) {
            image.onload = null;
            image.onerror = null;
            this.pendingSprite = null;
        }

        this.sprite = null;
        this.isSpriteReady = false;
    }

    /**
     * Пересчитывает физические размеры холста под devicePixelRatio
     * и перестраивает пул частиц и длину ASCII-строки.
     */
    private resize(): void {
        const canvasElement = this.canvas()?.nativeElement;

        if (!canvasElement || !this.context) {
            return;
        }

        const rect = canvasElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.width = rect.width;
        this.height = rect.height;
        canvasElement.width = Math.round(rect.width * dpr);
        canvasElement.height = Math.round(rect.height * dpr);
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = Math.min(MAX_EMBERS, Math.max(24, Math.floor(rect.width / 9)));
        this.embers = Array.from({ length: target }, () => this.makeEmber(true));

        const asciiCount = Math.min(140, Math.max(24, Math.floor(rect.width / 10)));

        if (asciiCount !== this.asciiChars().length) {
            this.asciiChars.set(buildStaticAscii(asciiCount));
        }

        if (!this.isMotionAllowed) {
            this.renderStaticFrame();
        }
    }

    /**
     * Создаёт частицу-уголёк.
     *
     * @param anywhere true — распределить по всей высоте (статичный кадр), false — родить у кромки.
     * @returns Новая частица.
     */
    private makeEmber(anywhere: boolean): Ember {
        const color = this.palette[Math.floor(Math.random() * this.palette.length)] ?? [255, 121, 32];

        return {
            x: Math.random() * this.width,
            y: anywhere ? Math.random() * this.height : this.height + Math.random() * 8,
            vx: (Math.random() - 0.5) * 6,
            vy: 14 + Math.random() * 26,
            life: anywhere ? Math.random() * 4 : 0,
            maxLife: 2.5 + Math.random() * 3,
            size: 0.8 + Math.random() * 1.8,
            phase: Math.random() * Math.PI * 2,
            color,
            spin: Math.random() * Math.PI * 2,
            spriteSize: SPRITE_MIN + Math.random() * (SPRITE_MAX - SPRITE_MIN),
        };
    }

    /**
     * Перерождает частицу у верхней кромки подвала.
     *
     * @param ember Частица, исчерпавшая срок жизни или ушедшая за холст.
     */
    private respawn(ember: Ember): void {
        const fresh = this.makeEmber(false);
        Object.assign(ember, fresh, { life: 0 });
    }

    /** Реакция на смену системной настройки движения. */
    private readonly onMotionChange = (): void => {
        this.isMotionAllowed = !this.motionQuery?.matches;

        if (this.isMotionAllowed) {
            this.updateLoopState();

            return;
        }

        this.stopLoop();
        this.renderStaticFrame();
    };

    /** Реакция на вход и выход подвала из вьюпорта. */
    private readonly onVisibilityChange = (entries: IntersectionObserverEntry[]): void => {
        this.isVisible = entries.some((entry) => entry.isIntersecting);
        this.updateLoopState();
    };

    /** Запоминает позицию указателя в координатах клиента. */
    private readonly onPointerMove = (event: PointerEvent): void => {
        this.pointerClient = { x: event.clientX, y: event.clientY };
    };

    /**
     * Запускает или останавливает цикл кадров по видимости и настройке движения.
     */
    private updateLoopState(): void {
        if (this.isVisible && this.isMotionAllowed) {
            this.startLoop();

            return;
        }

        this.stopLoop();
    }

    /** Запускает цикл rAF, если он ещё не идёт. */
    private startLoop(): void {
        if (this.frameId !== 0) {
            return;
        }

        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this.onFrame);
    }

    /** Останавливает цикл rAF. */
    private stopLoop(): void {
        if (this.frameId !== 0) {
            cancelAnimationFrame(this.frameId);
            this.frameId = 0;
        }
    }

    /**
     * Кадр цикла: шаг физики, перерисовка и мерцание ASCII-строки.
     *
     * @param time Метка времени кадра, мс.
     */
    private readonly onFrame = (time: number): void => {
        this.frameId = requestAnimationFrame(this.onFrame);

        const dt = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;
        this.clock += dt;

        this.step(dt);
        this.draw();

        this.asciiTimer += dt;

        if (this.asciiTimer >= ASCII_INTERVAL) {
            this.asciiTimer = 0;
            this.flickAscii();
        }
    };

    /**
     * Шаг физики частиц: подъём, покачивание и «ветер» от указателя.
     *
     * @param dt Длительность шага, с.
     */
    private step(dt: number): void {
        const canvasElement = this.canvas()?.nativeElement;
        const rect = canvasElement?.getBoundingClientRect();
        const pointer =
            rect && this.pointerClient
                ? { x: this.pointerClient.x - rect.left, y: this.pointerClient.y - rect.top }
                : null;

        for (const ember of this.embers) {
            ember.life += dt;

            if (ember.life > ember.maxLife || ember.y < -8) {
                this.respawn(ember);
                continue;
            }

            ember.vy *= 1 + 0.15 * dt;
            ember.y -= ember.vy * dt;
            ember.x += Math.sin(this.clock * 1.3 + ember.phase) * 6 * dt;

            if (pointer) {
                const dx = ember.x - pointer.x;
                const dy = ember.y - pointer.y;
                const distance = Math.hypot(dx, dy);

                if (distance > 0.001 && distance < POINTER_RADIUS) {
                    const force = (1 - distance / POINTER_RADIUS) * 36;
                    ember.vx += (dx / distance) * force * dt;
                }
            }

            ember.x += ember.vx * dt;
            ember.vx *= Math.max(0, 1 - 1.2 * dt);

            // Уголёк, снесённый ветром за край, возвращается к кромке.
            if (ember.x < -8 || ember.x > this.width + 8) {
                this.respawn(ember);
            }
        }
    }

    /**
     * Рисует частицы в режиме сложения света.
     */
    private draw(): void {
        const context = this.context;

        if (!context) {
            return;
        }

        context.clearRect(0, 0, this.width, this.height);
        context.globalCompositeOperation = 'lighter';

        for (const ember of this.embers) {
            const progress = Math.min(1, ember.life / ember.maxLife);
            const fade = Math.sin(Math.PI * progress);
            const flicker = 0.75 + 0.25 * Math.sin(this.clock * 7 + ember.phase);
            const alpha = Math.max(0, fade * flicker);

            // Спрайт есть — рисуем его; нет — прежний радиальный градиент.
            if (this.isSpriteReady && this.sprite) {
                this.drawSprite(ember, alpha);

                continue;
            }

            const radius = ember.size * (1 + progress * 0.4);
            const [r, g, b] = ember.color;

            context.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
            context.beginPath();
            context.arc(ember.x, ember.y, radius, 0, Math.PI * 2);
            context.fill();

            if (ember.size > 1.6) {
                context.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha * 1.4).toFixed(3)})`;
                context.beginPath();
                context.arc(ember.x, ember.y, radius * 0.45, 0, Math.PI * 2);
                context.fill();
            }
        }

        context.globalCompositeOperation = 'source-over';
    }

    /**
     * Рисует частицу спрайтом уголька: поворот и размер случайны на частицу,
     * сторона держится в диапазоне `SPRITE_MIN`..`SPRITE_MAX`.
     *
     * Размер задан в CSS px: масштаб холста уже содержит devicePixelRatio
     * из `resize()`, поэтому спрайт 96×96 ложится на сетку без размытия.
     *
     * @param ember Частица.
     * @param alpha Непрозрачность кадра, 0..1.
     */
    private drawSprite(ember: Ember, alpha: number): void {
        const context = this.context;
        const sprite = this.sprite;

        if (!context || !sprite) {
            return;
        }

        const side = ember.spriteSize;
        const half = side / 2;

        context.save();
        context.globalAlpha = alpha;
        context.translate(ember.x, ember.y);
        context.rotate(ember.spin + this.clock * 0.35);
        context.drawImage(sprite, -half, -half, side, side);
        context.restore();
    }

    /**
     * Рисует один статичный кадр: частицы распределены по высоте без движения.
     * Используется при `prefers-reduced-motion: reduce`.
     */
    private renderStaticFrame(): void {
        const context = this.context;

        if (!context) {
            return;
        }

        context.clearRect(0, 0, this.width, this.height);
        context.globalCompositeOperation = 'lighter';

        for (const ember of this.embers) {
            const heightFactor = 1 - Math.min(1, Math.max(0, ember.y / Math.max(1, this.height)));
            const alpha = 0.12 + 0.5 * heightFactor;

            if (this.isSpriteReady && this.sprite) {
                this.drawSprite(ember, alpha);

                continue;
            }

            const [r, g, b] = ember.color;

            context.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
            context.beginPath();
            context.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
            context.fill();
        }

        context.globalCompositeOperation = 'source-over';
    }

    /**
     * Обновляет ASCII-строку: новые случайные символы огня.
     * Края строки спокойнее середины — так читаются языки пламени.
     */
    private flickAscii(): void {
        const current = this.asciiChars();
        const next = current.map((_, index) => {
            const edgeDistance = Math.min(index, current.length - 1 - index) / Math.max(1, current.length / 2);
            const limit = Math.round(FIRE_CHARS.length * (0.45 + 0.55 * edgeDistance));

            return FIRE_CHARS[Math.floor(Math.random() * Math.max(4, limit))] ?? '·';
        });

        this.asciiChars.set(next);
    }
}
