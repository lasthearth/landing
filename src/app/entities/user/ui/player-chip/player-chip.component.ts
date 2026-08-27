import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { TuiHint, TuiIcon } from '@taiga-ui/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { TranslatePipe } from '@core/i18n';
import { IPlayer } from '../../model/i-player';
import { IPlayerStats } from '../../model/i-player-stats';
import { UserService } from '../../api/user.service';

/**
 * Чип игрока для списков населения поселения.
 *
 * Показывает аватар, статус онлайна и игровое имя. Лидер помечается
 * иконкой короны. При наведении разворачивает тултип с расширенной
 * информацией об игроке (статистика подгружается лениво, один раз).
 *
 * Заменяет три дублировавшихся блока разметки в карточке селения,
 * диалоге деталей и странице управления селением.
 */
@Component({
    selector: 'app-player-chip',
    standalone: true,
    templateUrl: './player-chip.component.html',
    styleUrl: './player-chip.component.less',
    imports: [TuiHint, TuiIcon, DecimalPipe, ImageLoaderComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChipComponent {
    /**
     * Сервис пользователя — источник ленивой статистики игрока.
     */
    private readonly userService = inject(UserService);

    /**
     * Ссылка на DestroyRef для завершения подписок при уничтожении.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Данные игрока (имя, аватар, статус онлайна).
     */
    public readonly player = input.required<IPlayer>();

    /**
     * Признак лидера (владельца) селения — влияет на бейдж короны и тон чипа.
     */
    public readonly isLeader = input<boolean>(false);

    /**
     * Показывать ли кнопку исключения игрока (только на странице управления).
     */
    public readonly removable = input<boolean>(false);

    /**
     * Запрос на исключение игрока из селения.
     * Эмитит `user_id` игрока при клике на кнопку исключения.
     */
    public readonly remove = output<string>();

    /**
     * Загруженная статистика игрока или `null`, если сервер её не отдал.
     */
    protected readonly stats = signal<IPlayerStats | null>(null);

    /**
     * Признак процесса загрузки статистики (для скелетона в тултипе).
     */
    protected readonly statsLoading = signal(false);

    /**
     * Признак того, что запрос статистики уже был выполнен.
     * Предотвращает повторные запросы при каждом наведении.
     */
    private statsRequested = false;

    /**
     * URL аватара игрока в разрешении 48px с запасными вариантами.
     * Для маленького чипа.
     */
    protected readonly avatarUrl = computed(() => {
        const avatar = this.player().avatar;

        return avatar?.x48 || avatar?.x96 || avatar?.original || '/default-avatar.webp';
    });

    /**
     * URL аватара для тултипа — крупный (original/x96), с запасными вариантами.
     */
    protected readonly tooltipAvatarUrl = computed(() => {
        const avatar = this.player().avatar;

        return avatar?.original || avatar?.x96 || avatar?.x48 || '/default-avatar.webp';
    });

    /**
     * Реагирует на показ/скрытие тултипа.
     * При первом показе инициирует ленивую загрузку статистики игрока.
     *
     * @param visible Признак видимости тултипа.
     */
    protected onHintVisible(visible: boolean): void {
        if (!visible || this.statsRequested) {
            return;
        }

        this.statsRequested = true;
        this.statsLoading.set(true);

        this.userService
            .getPlayerStats$(this.player().user_game_name)
            .pipe(
                tap((stats) => this.stats.set(stats)),
                catchError(() => of(null)),
                finalize(() => this.statsLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Эмитит запрос на исключение игрока.
     */
    protected onRemove(): void {
        this.remove.emit(this.player().user_id);
    }
}
