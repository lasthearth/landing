import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Параметры одной искры.
 */
interface ParticleStyle {
    /**
     * Горизонтальная позиция в процентах.
     */
    left: string;

    /**
     * Задержка начала подъёма.
     */
    delay: string;

    /**
     * Длительность подъёма от низа экрана до угасания.
     */
    duration: string;

    /**
     * Длительность одного цикла мерцания.
     * Не зависит от длительности подъёма — угли мерцают
     * со своей частотой независимо от скорости полёта.
     */
    flickerDuration: string;

    /**
     * Задержка начала мерцания, чтобы искры не пульсировали синхронно.
     */
    flickerDelay: string;

    /**
     * Ширина свечения искры.
     */
    width: string;

    /**
     * Высота свечения искры.
     */
    height: string;

    /**
     * Угол поворота искры.
     */
    rotate: string;

    /**
     * Цвет искры (ядро, свечение и хвост через currentColor).
     */
    color: string;

    /**
     * Горизонтальное смещение при подъёме.
     */
    drift: string;

    /**
     * Высота, на которой искра догорает, в vh.
     * Разброс убирает эффект конвейера: часть искр гаснет,
     * не дойдя до верха экрана.
     */
    life: string;

    /**
     * Максимальная непрозрачность искры.
     * Задаёт слой глубины: дальние искры тусклее близких.
     */
    peak: string;

    /**
     * Длина хвоста искры относительно её размера.
     */
    tailLength: string;
}

/**
 * Компонент фоновых искр на чистом CSS.
 *
 * Использует DOM-элементы вместо canvas, чтобы избежать проблем
 * с композитингом и z-index на фоне layout.
 *
 * Искры разбиты на три слоя глубины плюс редкие яркие вспышки.
 * Подъём и мерцание — независимые анимации на разных элементах,
 * свечение рисуется одним радиальным градиентом без box-shadow и blur.
 */
@Component({
    standalone: true,
    selector: 'app-background-particles',
    templateUrl: './background-particles.component.html',
    styleUrl: './background-particles.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundParticlesComponent {
    /**
     * Массив стилей для каждой искры.
     */
    protected readonly particles: ParticleStyle[] = this.generateParticles();

    /**
     * Возвращает случайное число в заданном диапазоне.
     *
     * @param range Диапазон в виде пары [минимум, максимум].
     * @returns Случайное число внутри диапазона.
     */
    private rand(range: readonly number[]): number {
        return range[0] + Math.random() * (range[1] - range[0]);
    }

    /**
     * Генерирует параметры искр по слоям глубины.
     *
     * @returns Массив стилевых параметров частиц.
     */
    private generateParticles(): ParticleStyle[] {
        const colors = ['#ffcc00', '#ffaa33', '#ff8800', '#ff6600', '#ff4422'];

        // Слои глубины: от дальнего (мелкий, медленный, тусклый)
        // к близкому (крупный, быстрый, яркий) и редким вспышкам.
        const layers = [
            { count: 9, core: [2, 3], glowX: 3.2, glowY: 5, rise: [15, 21], flicker: [0.9, 1.6], peak: 0.1, life: [60, 105], drift: 18, tail: [2, 3.5], delay: [0, 14] },
            { count: 9, core: [3, 4.5], glowX: 3, glowY: 4.5, rise: [6, 11], flicker: [0.5, 1], peak: 0.2, life: [35, 100], drift: 35, tail: [1.5, 3], delay: [0, 8] },
            { count: 4, core: [4.5, 6.5], glowX: 2.8, glowY: 4, rise: [4, 6.5], flicker: [0.3, 0.6], peak: 0.3, life: [25, 70], drift: 55, tail: [1.2, 2.2], delay: [0, 5] },
            { count: 2, core: [5, 7], glowX: 3, glowY: 4.2, rise: [5, 7], flicker: [0.25, 0.5], peak: 0.5, life: [70, 110], drift: 45, tail: [2.5, 4], delay: [18, 34] },
        ];

        return layers.flatMap((layer) =>
            Array.from({ length: layer.count }, (_, index) => {
                const core = this.rand(layer.core);

                return {
                    left: `${((index + 0.5) / layer.count) * 100 + Math.random() * 8 - 4}%`,
                    delay: `${this.rand(layer.delay)}s`,
                    duration: `${this.rand(layer.rise)}s`,
                    flickerDuration: `${this.rand(layer.flicker)}s`,
                    flickerDelay: `${-Math.random() * 2}s`,
                    width: `${core * layer.glowX}px`,
                    height: `${core * layer.glowY}px`,
                    rotate: `${-35 + Math.random() * 70}deg`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    drift: `${(Math.random() * 2 - 1) * layer.drift}px`,
                    life: `${this.rand(layer.life)}vh`,
                    peak: `${layer.peak}`,
                    tailLength: `${this.rand(layer.tail)}`,
                };
            }),
        );
    }
}
