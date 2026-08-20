import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.css',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {
    protected readonly environment = environment;

    /**
     * Последнее скопированное значение.
     * Используется для показа состояния "Скопировано" у нужной кнопки.
     */
    protected readonly copied = signal<string | null>(null);

    /**
     * Копирует значение в буфер обмена и на 2 секунды помечает его как скопированное.
     * @param value Строка для копирования.
     */
    protected copy(value: string): void {
        navigator.clipboard.writeText(value).then(() => {
            this.copied.set(value);
            setTimeout(() => this.copied.set(null), 2000);
        });
    }
}
