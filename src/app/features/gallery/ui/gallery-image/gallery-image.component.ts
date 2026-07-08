import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';

/**
 * Компонент изображения галереи с ленивой загрузкой и плейсхолдером.
 *
 * Показывает shimmer-скелетон до тех пор, пока изображение не загрузится,
 * затем плавно отображает картинку.
 */
@Component({
    selector: 'app-gallery-image',
    standalone: true,
    templateUrl: './gallery-image.component.html',
    styleUrl: './gallery-image.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryImageComponent {
    /**
     * URL изображения для отображения.
     */
    public readonly src = input.required<string>();

    /**
     * Альтернативный текст изображения.
     */
    public readonly alt = input.required<string>();

    /**
     * Признак того, что изображение загружено.
     */
    protected readonly loaded = signal(false);

    /**
     * Обрабатывает успешную загрузку изображения.
     */
    protected onImageLoad(): void {
        this.loaded.set(true);
    }
}
