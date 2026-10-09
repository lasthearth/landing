import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ImageLoaderComponent } from '@shared/ui/image-loader/image-loader.component';
import { FrameEffectId, ProfileFrameId } from '../../model/player-style';

/**
 * Угольки, поднимающиеся над рамкой: место по горизонтали (%), скорость, задержка.
 */
const EMBERS = [
    { x: 22, duration: 3.2, delay: 0 },
    { x: 48, duration: 2.7, delay: 1.1 },
    { x: 70, duration: 3.6, delay: 2 },
    { x: 84, duration: 3, delay: 0.6 },
    { x: 36, duration: 3.4, delay: 2.6 },
];

/**
 * Искорки инея по углам рамки.
 */
const SPARKLES = [
    { x: 8, y: 10, delay: 0 },
    { x: 94, y: 22, delay: 1.3 },
    { x: 86, y: 92, delay: 2.4 },
    { x: 6, y: 74, delay: 3.1 },
];

/**
 * Аватар игрока в тонкой рамке оформления и с тихой анимацией (жар, ветер,
 * туман, иней, гроза). Размер задаёт родитель через ширину и высоту хоста.
 */
@Component({
    selector: 'app-player-frame',
    template: `
        <span class="pframe" [class]="'pframe pframe--' + frame()" [class.pframe--compact]="compact()">
            @if (effect() !== 'none') {
                <span [class]="'pfx pfx--' + effect()" aria-hidden="true">
                    <span class="pfx__glow"></span>
                    <span class="pfx__ring"></span>
                    @switch (effect()) {
                        @case ('fire') {
                            @for (e of embers; track $index) {
                                <span
                                    class="pfx__ember"
                                    [style.left.%]="e.x"
                                    [style.animationDuration.s]="e.duration"
                                    [style.animationDelay.s]="-e.delay"
                                ></span>
                            }
                        }
                        @case ('wind') {
                            <span class="pfx__gust"></span>
                        }
                        @case ('comet') {
                            <span class="pfx__tail"></span>
                        }
                        @case ('frost') {
                            @for (s of sparkles; track $index) {
                                <span
                                    class="pfx__sparkle"
                                    [style.left.%]="s.x"
                                    [style.top.%]="s.y"
                                    [style.animationDelay.s]="-s.delay"
                                ></span>
                            }
                        }
                        @case ('storm') {
                            <svg class="pfx__bolt" viewBox="0 0 12 24">
                                <path d="M7 0 L2 13 L6 13 L4 24 L10 9 L6 9 Z" />
                            </svg>
                        }
                    }
                </span>
            }
            <span class="pframe__inner">
                @if (src()) {
                    <app-image-loader
                        class="block size-full"
                        [src]="src()"
                        [alt]="alt()"
                        imageClass="h-full w-full object-cover"
                    />
                }
                @if (effect() === 'fog') {
                    <span class="pfx__mist" aria-hidden="true"></span>
                }
            </span>
        </span>
    `,
    styleUrl: './player-frame.component.less',
    imports: [ImageLoaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerFrameComponent {
    public readonly src = input('');
    public readonly alt = input('');
    public readonly frame = input<ProfileFrameId>('none');

    /**
     * Мелкий аватар: рамка в волосок, без свечения.
     */
    public readonly compact = input(false);

    /**
     * Анимация рамки.
     */
    public readonly effect = input<FrameEffectId>('none');

    protected readonly embers = EMBERS;
    protected readonly sparkles = SPARKLES;
}
