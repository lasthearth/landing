import { afterNextRender, DestroyRef, Directive, ElementRef, inject, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { WA_WINDOW } from '@ng-web-apis/common';
import { ISnowflake } from './i-snowflake';

/**
 * Площадь экрана в квадратных пикселях на одну снежинку.
 */
const AREA_PER_FLAKE = 16000;

/**
 * Верхний предел числа снежинок: на 4K снег не должен превращаться в метель.
 */
const MAX_FLAKES = 140;

/**
 * Предел шага кадра в секундах: после возврата на вкладку снег
 * не прыгает на расстояние, пройденное за время паузы.
 */
const MAX_FRAME_STEP = 0.05;

/**
 * Снегопад на `<canvas>`: редкие мелкие снежинки медленно падают
 * и покачиваются, уходя за нижний край и возвращаясь сверху.
 *
 * Работает только в браузере (после первой отрисовки) и вне зоны Angular:
 * кадр анимации не запускает обнаружение изменений. Анимация стоит,
 * пока вкладка скрыта, и не запускается вовсе при `prefers-reduced-motion`.
 * Цвет снега берётся из CSS-переменной `--festive-snow` холста.
 */
@Directive({
    selector: 'canvas[appSnowfall]',
})
export class SnowfallDirective {
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
     * Цвет снега.
     */
    private colour = '';

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
        this.colour = this.window.getComputedStyle(this.canvas).getPropertyValue('--festive-snow').trim() || 'white';

        const count = Math.min(MAX_FLAKES, Math.round((this.width * this.height) / AREA_PER_FLAKE));
        this.flakes = Array.from({ length: count }, () => this.createFlake(Math.random() * this.height));
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
     * Один кадр: сдвигает снежинки и перерисовывает холст.
     *
     * @param time Время кадра из `requestAnimationFrame`.
     */
    private readonly tick = (time: number): void => {
        const step = Math.min((time - this.lastTime) / 1000, MAX_FRAME_STEP);
        const context = this.canvas.getContext('2d');

        this.lastTime = time;

        if (!context) {
            return;
        }

        context.clearRect(0, 0, this.width, this.height);
        context.fillStyle = this.colour;

        for (let index = 0; index < this.flakes.length; index++) {
            let flake = this.flakes[index];

            flake.y += flake.speed * step;
            flake.phase += step;

            if (flake.y - flake.radius > this.height) {
                flake = this.createFlake(-flake.radius);
                this.flakes[index] = flake;
            }

            context.globalAlpha = flake.alpha;
            context.beginPath();
            context.arc(flake.x + Math.sin(flake.phase) * flake.sway, flake.y, flake.radius, 0, Math.PI * 2);
            context.fill();
        }

        this.frame = requestAnimationFrame(this.tick);
    };

    /**
     * Создаёт снежинку со случайными размером, скоростью и покачиванием.
     * Крупные снежинки падают быстрее и ярче: так снег читается объёмным.
     *
     * @param y Начальное положение по Y.
     * @returns Новая снежинка.
     */
    private createFlake(y: number): ISnowflake {
        const depth = Math.random();

        return {
            x: Math.random() * this.width,
            y,
            radius: 0.8 + depth * 2.2,
            speed: 18 + depth * 42,
            sway: 6 + Math.random() * 18,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.35 + depth * 0.5,
        };
    }
}
