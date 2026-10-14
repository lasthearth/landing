import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Ключ localStorage: игрок скрыл плашку. Тот же ключ читает ранний скрипт index.html.
 */
const STORAGE_KEY = 'lh-mods-notice-hidden';

/**
 * Класс на <html>, по которому styles.css прячет плашку и её обёртки.
 */
const HIDDEN_CLASS = 'lh-mods-notice-hidden';

/**
 * Плашка «Моды сервера» рядом с адресом сервера.
 *
 * Частая беда новичка: игра не пустила на сервер, потому что не скачались
 * обязательные моды, а где их взять — непонятно. Плашка стоит там, где игрок
 * подключается (инструкция в профиле, путь новичка), и ведёт на `/mods`.
 *
 * `compact` — одна строка без пояснения, для узких мест.
 *
 * Кнопка «×» прячет плашку везде и навсегда (в этом браузере): выбор лежит
 * в localStorage, а класс на <html> ставит ранний скрипт index.html, чтобы
 * плашка не мелькала до загрузки приложения. Пункт «Моды» в меню остаётся.
 */
@Component({
    standalone: true,
    selector: 'app-mods-notice',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    templateUrl: './mods-notice.component.html',
    styleUrl: './mods-notice.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsNoticeComponent {
    /**
     * Короткий вид: заголовок и ссылка без пояснения.
     */
    public readonly compact = input(false);

    private readonly document = inject(DOCUMENT);

    /**
     * Скрывает плашку на всех страницах и запоминает выбор.
     */
    protected dismiss(): void {
        this.document.documentElement.classList.add(HIDDEN_CLASS);

        try {
            this.document.defaultView?.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // Хранилище недоступно (приватный режим): скрыто до перезагрузки.
        }
    }
}
