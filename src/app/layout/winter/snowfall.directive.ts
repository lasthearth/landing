import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { WA_WINDOW } from '@ng-web-apis/common';
import { ISnowflake } from './i-snowflake';
import { SnowLayer } from './snow-layer';
import { windAt } from './wind-at';

/**
 * Размер спрайта снежинки в пикселях холста.
 */
const SPRITE_SIZE = 64;

/**
 * Предел шага кадра в секундах: после возврата на вкладку снег
 * не прыгает на расстояние, пройденное за время паузы.
 */
const MAX_FRAME_STEP = 0.05;

/**
 * Скорость ветра в пикселях за секунду при силе 1 и чувствительности 1.
 */
const WIND_SPEED = 46;

/**
 * Снегопад на `<canvas>`, один план из двух (`far` или `near`).
 *
 * Снежинка — спрайт с мягким краем, а не залитый круг. Дальний план мелкий,
 * медленный и идёт за панелями, ближний крупнее и идёт перед ними.
 * Крупных размытых хлопьев «у камеры» нет намеренно: на тёмном фоне
 * в статике они читались серыми пятнами грязи.
 * Ветер общий для планов ({@link windAt}), сносит ближние снежинки сильнее.
 *
 * Работает только в браузере, после первой отрисовки и вне зоны Angular:
 * кадр не запускает обнаружение изменений. Стоит, пока вкладка скрыта,
 * и не запускается при `prefers-reduced-motion`. Цвет — токен `--lh-snow`.
 */
@Directive({
    selector: 'canvas[appSnowfall]',
})
export class SnowfallDirective {
    /**
     * План снегопада.
     */
    public readonly appSnowfall = input.required<SnowLayer>();

    /**
     * Холст, на котором рисуется снег.
     */
    private readonly canvas: HTMLCanvasElement = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;

    /**
     * Окно браузера.
     */
    private readonly window = inject(WA_WINDOW);

    /**
     * Документ страницы.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Зона Angular: анимация работает вне её.
     */
    private readonly zone = inject(NgZone);

    /**
     * Снежинки текущего кадра.
     */
    private flakes: ISnowflake[] = [];

    /**
     * Спрайт снежинки: плотное ядро с коротким мягким краем.
     */
    private sprite: HTMLCanvasElement | null = null;

    /**
     * Идентификатор запрошенного кадра или `null`, если анимация стоит.
     */
    private frame: number | null = null;

    /**
     * Время предыдущего кадра в миллисекундах.
     */
    private lastTime = 0;

    /**
     * Ширина холста в CSS-пикселях.
     */
    private width = 0;

    /**
     * Высота холста в CSS-пикселях.
     */
    private height = 0;

    /**
     * Запускает снегопад после первой отрисовки и останавливает при уничтожении.
     */
    public constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            if (this.window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }

            this.zone.runOutsideAngular(() => {
                const colour =
                    this.window.getComputedStyle(this.canvas).getPropertyValue('--lh-snow').trim() || 'white';

                this.sprite = this.createSprite(colour);
                this.resize();
                this.window.addEventListener('resize', this.resize);
                this.document.addEventListener('visibilitychange', this.onVisibility);
                this.play();
            });

            destroyRef.onDestroy(() => {
                this.pause();
                this.window.removeEventListener('resize', this.resize);
                this.document.removeEventListener('visibilitychange', this.onVisibility);
            });
        });
    }

    /**
     * Подгоняет холст под вьюпорт с учётом плотности пикселей
     * и пересобирает снежинки под новую площадь.
     */
    private readonly resize = (): void => {
        const ratio = Math.min(this.window.devicePixelRatio || 1, 2);

        this.width = this.window.innerWidth;
        this.height = this.window.innerHeight;
        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);

        const area = this.width * this.height;

        if (this.appSnowfall() === 'far') {
            this.flakes = this.spawn(Math.min(220, area / 8000), () => this.createFar());
        } else {
            this.flakes = this.spawn(Math.min(80, area / 22000), () => this.createMid());
        }
    };

    /**
     * Ставит анимацию на паузу, пока вкладка скрыта.
     */
    private readonly onVisibility = (): void => {
        if (this.document.hidden) {
            this.pause();
        } else {
            this.play();
        }
    };

    /**
     * Запускает цикл кадров, если он ещё не идёт.
     */
    private play(): void {
        if (this.frame !== null) {
            return;
        }

        this.lastTime = performance.now();
        this.frame = requestAnimationFrame(this.tick);
    }

    /**
     * Останавливает цикл кадров.
     */
    private pause(): void {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
    }

    /**
     * Один кадр: сносит снежинки ветром, роняет и перерисовывает холст.
     *
     * @param time Время кадра из `requestAnimationFrame`.
     */
    private readonly tick = (time: number): void => {
        const step = Math.min((time - this.lastTime) / 1000, MAX_FRAME_STEP);
        const context = this.canvas.getContext('2d');
        const wind = windAt(time / 1000) * WIND_SPEED;

        this.lastTime = time;
        this.frame = requestAnimationFrame(this.tick);

        if (!context || !this.sprite) {
            return;
        }

        context.clearRect(0, 0, this.width, this.height);

        for (const flake of this.flakes) {
            const margin = flake.radius * 2 + flake.sway;

            flake.y += flake.speed * step;
            flake.x += wind * flake.drift * step;
            flake.phase += step * 0.8;

            if (flake.y - margin > this.height) {
                flake.y = -margin;
                flake.x = Math.random() * this.width;
            }

            if (flake.x < -margin) {
                flake.x += this.width + margin * 2;
            } else if (flake.x > this.width + margin) {
                flake.x -= this.width + margin * 2;
            }

            // Спрайт вдвое шире видимого радиуса: край градиента уходит в ноль.
            const size = flake.radius * 4;

            context.globalAlpha = flake.alpha;
            context.drawImage(
                this.sprite,
                flake.x + Math.sin(flake.phase) * flake.sway - size / 2,
                flake.y - size / 2,
                size,
                size
            );
        }
    };

    /**
     * Создаёт снежинки, разбросанные по всей высоте экрана.
     *
     * @param count Желаемое число снежинок.
     * @param create Фабрика снежинки.
     * @returns Снежинки.
     */
    private spawn(count: number, create: () => ISnowflake): ISnowflake[] {
        return Array.from({ length: Math.round(count) }, () => {
            const flake = create();

            flake.y = Math.random() * this.height;

            return flake;
        });
    }

    /**
     * Дальний план: мелкий медленный снег за панелями.
     *
     * @returns Новая снежинка.
     */
    private createFar(): ISnowflake {
        return this.createFlake(0.5 + Math.random() * 0.7, 12 + Math.random() * 14, 0.35, 0.25 + Math.random() * 0.3);
    }

    /**
     * Ближний план: основной снег перед панелями.
     *
     * @returns Новая снежинка.
     */
    private createMid(): ISnowflake {
        return this.createFlake(1.1 + Math.random() * 1.1, 30 + Math.random() * 24, 0.75, 0.5 + Math.random() * 0.35);
    }

    /**
     * Создаёт снежинку над верхним краем экрана.
     *
     * @param radius Видимый радиус.
     * @param speed Скорость падения.
     * @param drift Чувствительность к ветру.
     * @param alpha Непрозрачность.
     * @returns Новая снежинка.
     */
    private createFlake(radius: number, speed: number, drift: number, alpha: number): ISnowflake {
        return {
            x: Math.random() * this.width,
            y: -radius * 2,
            radius,
            speed,
            drift,
            sway: 4 + Math.random() * 14 * drift,
            phase: Math.random() * Math.PI * 2,
            alpha,
        };
    }

    /**
     * Рисует спрайт снежинки: альфа-маску радиальным градиентом, затем тонирует
     * её цветом снега. Градиент сразу в цвет снега давал бы серую кайму:
     * холст смешивает стопы без предумножения альфы, и `transparent` тянет к чёрному.
     *
     * @param colour Цвет снега.
     * @returns Холст со спрайтом.
     */
    private createSprite(colour: string): HTMLCanvasElement {
        const sprite = this.document.createElement('canvas');
        const context = sprite.getContext('2d');
        const half = SPRITE_SIZE / 2;

        sprite.width = SPRITE_SIZE;
        sprite.height = SPRITE_SIZE;

        if (!context) {
            return sprite;
        }

        // Видимый радиус снежинки — половина радиуса спрайта (см. tick).
        const mask = context.createRadialGradient(half, half, 0, half, half, half);
        const stops: [number, number][] = [
            [0, 1],
            [0.32, 1],
            [0.5, 0.35],
            [0.62, 0],
        ];

        for (const [offset, alpha] of stops) {
            mask.addColorStop(offset, `rgba(0, 0, 0, ${alpha})`);
        }

        context.fillStyle = mask;
        context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = colour;
        context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

        return sprite;
    }
}
