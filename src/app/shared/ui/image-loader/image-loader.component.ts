import { ChangeDetectionStrategy, Component, input, InputSignal, signal } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * Компонент загрузки изображения с плейсхолдером.
 *
 * Показывает анимированный скелетон, пока картинка загружается,
 * и плавно проявляет изображение после загрузки.
 */
@Component({
    selector: 'app-image-loader',
    imports: [NgClass],
    templateUrl: './image-loader.component.html',
    styleUrl: './image-loader.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageLoaderComponent {
    /**
     * URL изображения.
     */
    public src: InputSignal<string> = input.required<string>();

    /**
     * Альтернативный текст изображения.
     */
    public alt: InputSignal<string> = input.required<string>();

    /**
     * Способ заполнения контейнера изображением.
     */
    public objectFit: InputSignal<'cover' | 'contain'> = input<'cover' | 'contain'>('cover');

    /**
     * Дополнительные CSS-классы для тега img.
     */
    public imageClass: InputSignal<string> = input<string>('');

    /**
     * Дополнительные CSS-классы для контейнера загрузчика.
     */
    public containerClass: InputSignal<string> = input<string>('');

    /**
     * Изображение находится на первом экране.
     *
     * По умолчанию картинки грузятся лениво (`loading="lazy"`): в списках
     * поселений и в галерее их десятки, и одновременная загрузка забивает
     * канал. Для картинки над сгибом ленивая загрузка вредна — она
     * задерживает LCP, поэтому такие помечаются `eager`.
     */
    public eager: InputSignal<boolean> = input<boolean>(false);

    /**
     * Признак завершения загрузки изображения.
     */
    protected readonly loaded = signal(false);
}
