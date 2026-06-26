import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Количество искр на фоне.
 */
const PARTICLE_COUNT = 24;

/**
 * Параметры одной искры.
 */
interface ParticleStyle {
    /**
     * Горизонтальная позиция в процентах.
     */
    left: string;

    /**
     * Задержка начала анимации.
     */
    delay: string;

    /**
     * Длительность анимации.
     */
    duration: string;

    /**
     * Ширина искры.
     */
    width: string;

    /**
     * Высота искры.
     */
    height: string;

    /**
     * Угол поворота искры.
     */
    rotate: string;

    /**
     * Цвет искры (background + shadow).
     */
    color: string;

    /**
     * Горизонтальное смещение при подъёме.
     */
    drift: string;

    /**
     * Длина хвоста искры относительно размера.
     */
    tailLength: string;
}

/**
 * Компонент фоновых искр на чистом CSS.
 *
 * Использует DOM-элементы вместо canvas, чтобы избежать проблем
 * с композитингом и z-index на фоне layout.
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
     * Генерирует параметры для заданного количества искр.
     *
     * @returns Массив стилевых параметров частиц.
     */
    private generateParticles(): ParticleStyle[] {
        const colors = ['#ffcc00', '#ffaa33', '#ff8800', '#ff6600', '#ff4422'];

        return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
            const size = 5 + Math.random() * 7;

            return {
                left: `${(index / PARTICLE_COUNT) * 100 + Math.random() * 6 - 3}%`,
                delay: `${Math.random() * 3}s`,
                duration: `${5 + Math.random() * 6}s`,
                width: `${size * (0.25 + Math.random() * 0.2)}px`,
                height: `${size * (1.6 + Math.random() * 0.8)}px`,
                rotate: `${-35 + Math.random() * 70}deg`,
                color: colors[Math.floor(Math.random() * colors.length)],
                drift: `${-25 + Math.random() * 50}px`,
                tailLength: `${1.5 + Math.random() * 1.5}`,
            };
        });
    }
}
