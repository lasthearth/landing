import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Плашка «Моды сервера» рядом с адресом сервера.
 *
 * Частая беда новичка: игра не пустила на сервер, потому что не скачались
 * обязательные моды, а где их взять — непонятно. Плашка стоит там, где игрок
 * подключается (инструкция в профиле, путь новичка), и ведёт на `/mods`.
 *
 * `compact` — одна строка без пояснения, для узких мест.
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
}
