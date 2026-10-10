import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PauseOffscreenDirective } from '@shared/lib/directives';
import { BANNER_EFFECTS } from '../../lib/player-style.constant';
import { BannerEffectId, ProfileBanner } from '../../model/player-style';

/**
 * Частица анимации: место, размер, скорость и задержка.
 */
interface Particle {
    readonly x: number;
    readonly y: number;
    readonly width: string;
    /**
     * Высота; `null` — по пропорциям из стилей.
     */
    readonly height: string | null;
    readonly duration: number;
    readonly delay: number;
    readonly drift: number;
    readonly hue: number;
}

type Random = () => number;

/**
 * Сколько частиц у анимации (в миниатюре — треть) и как их разбросать.
 */
const PARTICLES: Partial<Record<BannerEffectId, { count: number; make: (next: Random, scale: number) => Particle }>> = {
    dust: {
        count: 20,
        make: (next, scale) => {
            const size = (2 + next() * 3) * scale;
            return {
                x: next() * 100,
                y: 8 + next() * 84,
                width: `${size}px`,
                height: `${size}px`,
                duration: 10 + next() * 12,
                delay: next() * 22,
                drift: 50 + next() * 130,
                hue: 0,
            };
        },
    },
    clouds: {
        count: 6,
        make: (next) => ({
            x: -45 + next() * 20,
            y: -14 + next() * 26,
            width: `${36 + next() * 30}%`,
            height: null,
            duration: 38 + next() * 30,
            delay: next() * 68,
            drift: 0,
            hue: 0,
        }),
    },
    leaves: {
        count: 9,
        make: (next, scale) => {
            const size = (8 + next() * 7) * scale;
            return {
                x: next() * 100,
                y: -12,
                width: `${size}px`,
                height: `${size}px`,
                duration: 8 + next() * 7,
                delay: next() * 15,
                drift: (next() - 0.5) * 220,
                hue: 10 + next() * 35,
            };
        },
    },
    rain: {
        count: 36,
        make: (next, scale) => ({
            x: -10 + next() * 120,
            y: -25,
            width: `${1.5 * scale}px`,
            height: `${(14 + next() * 14) * scale}px`,
            duration: 0.55 + next() * 0.45,
            delay: next() * 1,
            drift: -40,
            hue: 0,
        }),
    },
    fog: {
        count: 5,
        make: (next) => ({
            x: -30 + next() * 70,
            y: 40 + next() * 40,
            width: `${70 + next() * 45}%`,
            height: null,
            duration: 14 + next() * 12,
            delay: next() * 26,
            drift: 0,
            hue: 0,
        }),
    },
    snow: {
        count: 26,
        make: (next, scale) => {
            const size = (2 + next() * 4) * scale;
            return {
                x: next() * 100,
                y: -10,
                width: `${size}px`,
                height: `${size}px`,
                duration: 6 + next() * 8,
                delay: next() * 14,
                drift: (next() - 0.5) * 120,
                hue: 0,
            };
        },
    },
    fireflies: {
        count: 12,
        make: (next, scale) => {
            const size = (3 + next() * 3) * scale;
            return {
                x: next() * 100,
                y: 35 + next() * 60,
                width: `${size}px`,
                height: `${size}px`,
                duration: 5 + next() * 6,
                delay: next() * 11,
                drift: (next() - 0.5) * 60,
                hue: 55 + next() * 25,
            };
        },
    },
    embers: {
        count: 14,
        make: (next, scale) => {
            const size = (2 + next() * 3) * scale;
            return {
                x: 15 + next() * 70,
                y: 100,
                width: `${size}px`,
                height: `${size}px`,
                duration: 3.5 + next() * 4,
                delay: next() * 7.5,
                drift: (next() - 0.5) * 90,
                hue: 18 + next() * 25,
            };
        },
    },
    // Звездопад: мерцающие звёзды (кометы — отдельно).
    starfall: {
        count: 70,
        make: (next, scale) => {
            const size = (1 + next() * 2.2) * scale;
            return {
                x: next() * 100,
                y: next() * 75,
                width: `${size}px`,
                height: `${size}px`,
                duration: 2.5 + next() * 4,
                delay: next() * 6,
                drift: 0,
                hue: 200 + next() * 60,
            };
        },
    },
    // Сияние: редкие звёзды под полотнами северного сияния.
    aurora: {
        count: 40,
        make: (next, scale) => {
            const size = (1 + next() * 1.6) * scale;
            return {
                x: next() * 100,
                y: next() * 70,
                width: `${size}px`,
                height: `${size}px`,
                duration: 3 + next() * 4,
                delay: next() * 7,
                drift: 0,
                hue: 0,
            };
        },
    },
    // В грозу идёт дождь — те же капли, только реже.
    lightning: {
        count: 22,
        make: (next, scale) => ({
            x: -10 + next() * 120,
            y: -25,
            width: `${1.2 * scale}px`,
            height: `${(14 + next() * 12) * scale}px`,
            duration: 0.5 + next() * 0.4,
            delay: next() * 1,
            drift: -60,
            hue: 0,
        }),
    },
};

/**
 * Детерминированный генератор: одинаковые частицы на сервере и в браузере.
 *
 * @param seed Зерно.
 * @returns Функция, возвращающая числа от 0 до 1.
 */
function random(seed: number): Random {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

/**
 * Баннер профиля: картинка и анимация поверх неё (пыль, облака, дождь, туман,
 * снег, светлячки, искры, гроза). Анимация на CSS, при «уменьшить движение»
 * замирает.
 */
@Component({
    selector: 'app-profile-banner',
    template: `
        <div
            class="pbanner"
            [class]="'pbanner' + (tint() ? ' pbanner--' + tint() : '')"
            [class.pbanner--natural]="natural()"
            [class.pbanner--empty]="!banner().image"
            [style.backgroundImage]="natural() || !banner().image ? null : 'url(' + banner().image + ')'"
            [style.backgroundPosition]="'center ' + banner().focus"
        >
            @if (natural() && banner().image) {
                <img
                    class="pbanner__img"
                    [src]="banner().image"
                    alt=""
                    [style.objectPosition]="'center ' + banner().focus"
                />
            }
            @if (effect() !== 'none') {
                <div [class]="'pbanner__fx pbanner__fx--' + effect()" aria-hidden="true">
                    @switch (effect()) {
                        @case ('dust') {
                            <span class="pbanner__rays"></span>
                        }
                        @case ('fog') {
                            <span class="pbanner__haze"></span>
                        }
                        @case ('starfall') {
                            <span class="pbanner__meteor pbanner__meteor--1"></span>
                            <span class="pbanner__meteor pbanner__meteor--2"></span>
                            <span class="pbanner__meteor pbanner__meteor--3"></span>
                        }
                        @case ('aurora') {
                            <span class="pbanner__aurora pbanner__aurora--1"></span>
                            <span class="pbanner__aurora pbanner__aurora--2"></span>
                            <span class="pbanner__aurora pbanner__aurora--3"></span>
                        }
                        @case ('lightning') {
                            <span class="pbanner__flash"></span>
                            <svg class="pbanner__bolt pbanner__bolt--a" viewBox="0 0 40 100" preserveAspectRatio="none">
                                <path d="M24 0 L15 30 L23 33 L9 62 L18 64 L4 100" />
                                <path d="M15 30 L6 44" />
                            </svg>
                            <svg class="pbanner__bolt pbanner__bolt--b" viewBox="0 0 40 100" preserveAspectRatio="none">
                                <path d="M12 0 L20 26 L12 29 L26 58 L17 60 L30 100" />
                                <path d="M26 58 L36 70" />
                            </svg>
                        }
                    }
                    @for (p of particles(); track $index) {
                        <span
                            class="pbanner__p"
                            [style.left.%]="p.x"
                            [style.top.%]="p.y"
                            [style.width]="p.width"
                            [style.height]="p.height"
                            [style.animationDuration.s]="p.duration"
                            [style.animationDelay.s]="-p.delay"
                            [style.--drift]="p.drift + 'px'"
                            [style.--hue]="p.hue"
                        ></span>
                    }
                </div>
            }
        </div>
    `,
    styleUrl: './profile-banner.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [PauseOffscreenDirective],
})
export class ProfileBannerComponent {
    public readonly banner = input.required<ProfileBanner>();

    /**
     * Анимация поверх картинки.
     */
    public readonly effect = input<BannerEffectId>('none');

    /**
     * Картинка целиком: высоту задаёт родитель, ширина — по пропорциям картинки.
     */
    public readonly natural = input(false);

    /**
     * Миниатюра: меньше частиц.
     */
    public readonly compact = input(false);

    protected readonly tint = computed(() => BANNER_EFFECTS.find((item) => item.id === this.effect())?.tint ?? null);

    protected readonly particles = computed((): Particle[] => {
        const effect = this.effect();
        const spec = PARTICLES[effect];
        if (!spec) {
            return [];
        }

        const next = random(effect.length * 7919 + effect.charCodeAt(0));
        const count = Math.ceil(spec.count / (this.compact() ? 3 : 1));
        const scale = this.compact() ? 0.6 : 1;

        return Array.from({ length: count }, () => spec.make(next, scale));
    });
}
