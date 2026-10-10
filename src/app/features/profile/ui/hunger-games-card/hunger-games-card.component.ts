import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, defaultIfEmpty, of, switchMap, take } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { HungerGamesService, ISeasonInfo } from '@features/hunger-games/api/hunger-games.service';
import { UserService } from '@entities/user';
import { TranslatePipe } from '@core/i18n';

/**
 * Карточка «Голодных игр» в разделе «Статистика» профиля:
 * переключатель сезонов и результаты текущего игрока (ELO, победы, убийства, место).
 * Раньше жила в шапке профиля и растягивала её по высоте.
 */
@Component({
    selector: 'app-hunger-games-card',
    templateUrl: './hunger-games-card.component.html',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HungerGamesCardComponent {
    /**
     * Сервис «Голодных игр».
     */
    private readonly hungerGamesService = inject(HungerGamesService);

    /**
     * Сервис пользователя — id игрока для запроса статистики.
     */
    private readonly userService = inject(UserService);

    /**
     * Все сезоны, по возрастанию номера.
     */
    protected readonly seasons = signal<ISeasonInfo[]>([]);

    /**
     * Индекс выбранного сезона.
     */
    protected readonly index = signal(0);

    /**
     * Выбранный сезон.
     */
    protected readonly season = computed(() => this.seasons()[this.index()] ?? null);

    /**
     * Можно ли перейти к предыдущему сезону.
     */
    protected readonly canPrev = computed(() => this.index() > 0);

    /**
     * Можно ли перейти к следующему сезону.
     */
    protected readonly canNext = computed(() => this.index() < this.seasons().length - 1);

    /**
     * Есть ли незавершённый сезон.
     */
    protected readonly hasActiveSeason = computed(() => this.seasons().some((s) => !s.ended_at));

    /**
     * Результаты игрока в выбранном сезоне (null — нет данных).
     */
    protected readonly stats = toSignal(
        toObservable(this.season).pipe(
            switchMap((season) =>
                season && this.userService.userId
                    ? this.hungerGamesService
                          .getPlayerSeasonStats$(season.id, this.userService.userId)
                          .pipe(catchError(() => of(null)), defaultIfEmpty(null))
                    : of(null)
            )
        ),
        { initialValue: null }
    );

    /**
     * Загружает сезоны и выбирает активный (или последний).
     */
    public constructor() {
        this.hungerGamesService
            .getSeasons$()
            .pipe(take(1))
            .subscribe((seasons) => {
                const sorted = [...seasons].sort((a, b) => a.number - b.number);
                this.seasons.set(sorted);
                const active = sorted.findIndex((s) => !s.ended_at);
                this.index.set(active >= 0 ? active : Math.max(0, sorted.length - 1));
            });
    }

    /**
     * Переключает на предыдущий сезон.
     */
    protected prev(): void {
        this.index.update((i) => Math.max(0, i - 1));
    }

    /**
     * Переключает на следующий сезон.
     */
    protected next(): void {
        this.index.update((i) => Math.min(this.seasons().length - 1, i + 1));
    }
}
