import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import { ServerInformationService } from '@core/services/server-information.service';
import { NewcomerPathComponent } from '@features/onboarding';
import { PageHeaderComponent } from '@shared/ui/page-header';

/**
 * Приглашение в Discord сервера.
 */
const DISCORD_INVITE = 'https://discord.com/invite/FZb7SGrSFy';

/**
 * Страница «Начать игру»: путь новичка с отметками и справка о сервере сбоку.
 *
 * Путь отмечает шаги сам (вход, анкета, правила, скопированный адрес) и раскрывает текущий;
 * справа — онлайн и версия сервера, быстрые ссылки на помощь.
 */
@Component({
    standalone: true,
    selector: 'app-start-game',
    imports: [PageHeaderComponent, RouterLink, TuiIcon, TranslatePipe, NewcomerPathComponent],
    templateUrl: './start-game.component.html',
    styleUrl: './start-game.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartGameComponent {
    /**
     * Версия игры на сервере.
     */
    protected readonly gameVersion = environment.gameVersion;

    /**
     * Приглашение в Discord.
     */
    protected readonly discordInvite = DISCORD_INVITE;

    /**
     * Онлайн сервера (`null` — не удалось узнать или ещё грузится; при пререндере не запрашивается).
     */
    protected readonly online = toSignal(
        isPlatformBrowser(inject(PLATFORM_ID))
            ? inject(ServerInformationService)
                  .getOnlinePlayersCount$()
                  .pipe(catchError(() => of(null)))
            : of(null),
        { initialValue: null }
    );
}
