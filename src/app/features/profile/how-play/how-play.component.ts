import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';
import { RouterLink } from '@angular/router';

/**
 * «Как начать играть»: три шага — купить игру нужной версии, добавить сервер
 * (адрес и пароль копируются одной кнопкой), первые шаги на сервере — и
 * подсказки, если что-то не получилось.
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.css',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {
    protected readonly environment = environment;

    /**
     * Какое поле только что скопировали (`null` — никакое).
     */
    protected readonly copied = signal<'ip' | 'password' | null>(null);

    /**
     * Копирует значение в буфер обмена и на 2 секунды помечает поле как скопированное.
     *
     * @param field Поле.
     * @param value Строка для копирования.
     */
    protected copy(field: 'ip' | 'password', value: string): void {
        navigator.clipboard.writeText(value).then(() => {
            this.copied.set(field);
            setTimeout(() => this.copied.set(null), 2000);
        });
    }
}
