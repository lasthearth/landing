import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { SERVER_MODS, ServerMod } from '../../config/server-mods.constant';

/**
 * Страница «Моды сервера».
 *
 * Показывает список модов, которые нужны для игры на сервере: имя, версию,
 * пометку «обязательный»/«по желанию», описание и ссылку. Данные — статическая
 * константа `SERVER_MODS`, её заполняет владелец.
 *
 * Раскладка: на широком экране — таблица, на телефоне — карточки в одну колонку
 * (обе разметки рисуются сразу, переключает их CSS: состояние раскладки нужно
 * серверному рендеру, а JS-медиазапрос его не знает).
 *
 * Кнопка «Скопировать список» кладёт в буфер обмена имена и версии — этот текст
 * игрок вставляет в лаунчер, поэтому описания и ссылки в него не попадают.
 */
@Component({
    standalone: true,
    selector: 'app-mods-page',
    imports: [PageHeaderComponent, EmptyStateComponent, TuiIcon, TranslatePipe],
    templateUrl: './mods-page.component.html',
    styleUrl: './mods-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsPageComponent {
    /**
     * Признак выполнения в браузере: в буфер обмена пишет только клиент.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Моды сервера в порядке показа.
     */
    protected readonly mods: readonly ServerMod[] = SERVER_MODS;

    /**
     * Список уже скопирован (кнопка показывает «Скопировано» 2 секунды).
     */
    protected readonly copied = signal(false);

    /**
     * Текст для буфера обмена: имена и версии, по строке на мод.
     */
    protected readonly copyText = computed(() =>
        this.mods.map((mod) => `${mod.name} — ${mod.version}`).join('\n')
    );

    /**
     * Ключ перевода подписи кнопки копирования.
     */
    protected readonly copyLabelKey = computed(() => (this.copied() ? 'mods.copied' : 'mods.copy'));

    /**
     * Копирует имена и версии модов в буфер обмена.
     */
    protected copyList(): void {
        if (!this.isBrowser) {
            return;
        }

        void navigator.clipboard?.writeText(this.copyText()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }
}
