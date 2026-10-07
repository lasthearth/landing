import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import {
    getSettlementDisplayName,
    getSettlementTypeByKey,
    isGuildSettlement,
    ISettlement,
    SettlementService,
} from '@entities/settlement';
import { UserService } from '@entities/user';
import { parseDateInput } from '@shared/lib/relative-time';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { scoreSettlement } from './score-settlement.function';
import { FinderActivity, FinderAnswers, FinderMatch, FinderSize, FinderStyle } from './settlement-finder.model';

/**
 * Сколько поселений показать в итоге.
 */
const RESULTS = 3;

/**
 * Вопрос подбора.
 */
interface FinderQuestion<K extends keyof FinderAnswers> {
    key: K;
    options: { value: FinderAnswers[K]; icon: string }[];
}

/**
 * «Подбери поселение»: три вопроса — и три подходящих поселения.
 *
 * Открывается диалогом. Считает по открытым данным: дипломатии, числу жителей,
 * кто сейчас в игре и как давно поселение обновлялось.
 */
@Component({
    selector: 'app-settlement-finder',
    templateUrl: './settlement-finder.component.html',
    styleUrl: './settlement-finder.component.less',
    imports: [TuiIcon, TranslatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementFinderComponent {
    private readonly context = inject<TuiDialogContext<void>>(POLYMORPHEUS_CONTEXT);
    private readonly i18n = inject(I18nService);
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);

    /**
     * Вопросы по порядку.
     */
    protected readonly questions = [
        {
            key: 'style',
            options: [
                { value: 'peace' as FinderStyle, icon: '@tui.wheat' },
                { value: 'neutral' as FinderStyle, icon: '@tui.scale' },
                { value: 'war' as FinderStyle, icon: '@tui.swords' },
                { value: 'any' as FinderStyle, icon: '@tui.shuffle' },
            ],
        } satisfies FinderQuestion<'style'>,
        {
            key: 'size',
            options: [
                { value: 'small' as FinderSize, icon: '@tui.user' },
                { value: 'medium' as FinderSize, icon: '@tui.users' },
                { value: 'large' as FinderSize, icon: '@tui.castle' },
                { value: 'any' as FinderSize, icon: '@tui.shuffle' },
            ],
        } satisfies FinderQuestion<'size'>,
        {
            key: 'activity',
            options: [
                { value: 'online' as FinderActivity, icon: '@tui.radio' },
                { value: 'any' as FinderActivity, icon: '@tui.moon' },
            ],
        } satisfies FinderQuestion<'activity'>,
    ];

    /**
     * Номер текущего вопроса; равен числу вопросов — показаны итоги.
     */
    protected readonly step = signal(0);

    /**
     * Ответы.
     */
    protected readonly answers = signal<Partial<FinderAnswers>>({});

    /**
     * Итоги: `null` — считаем, массив — готово.
     */
    protected readonly matches = signal<FinderMatch[] | null>(null);

    /**
     * Не удалось загрузить поселения.
     */
    protected readonly failed = signal(false);

    /**
     * Текущий вопрос.
     */
    protected readonly question = computed(() => this.questions[this.step()] ?? null);

    /**
     * Поселения с числом игроков онлайн (загружаются один раз при первом показе итогов).
     */
    private data$?: Observable<Array<{ settlement: ISettlement; online: number }>>;

    /**
     * Выбирает ответ и переходит дальше.
     *
     * @param key Вопрос.
     * @param value Ответ.
     */
    protected choose(key: keyof FinderAnswers, value: string): void {
        this.answers.update((answers) => ({ ...answers, [key]: value }));
        this.step.update((step) => step + 1);

        if (this.step() === this.questions.length) {
            this.calculate();
        }
    }

    /**
     * Шаг назад.
     */
    protected back(): void {
        this.step.update((step) => Math.max(0, step - 1));
        this.matches.set(null);
    }

    /**
     * Начать заново.
     */
    protected restart(): void {
        this.answers.set({});
        this.matches.set(null);
        this.step.set(0);
    }

    /**
     * Закрывает диалог (после перехода по ссылке на поселение).
     */
    protected close(): void {
        this.context.completeWith();
    }

    /**
     * Считает итоги.
     */
    private calculate(): void {
        const answers = this.answers() as FinderAnswers;
        this.failed.set(false);
        this.matches.set(null);

        this.data$ ??= this.settlementService.getSettlements().pipe(
            switchMap((settlements) => {
                const ids = [...new Set(settlements.flatMap((item) => item.members?.map((m) => m.user_id) ?? []))];

                if (ids.length === 0) {
                    return of(settlements.map((settlement) => ({ settlement, online: 0 })));
                }

                return this.userService.getPlayersBatch$(ids).pipe(
                    catchError(() => of([])),
                    map((players) => {
                        const online = new Set(players.filter((p) => p?.is_online).map((p) => p.user_id));
                        return settlements.map((settlement) => ({
                            settlement,
                            online: settlement.members?.filter((m) => online.has(m.user_id)).length ?? 0,
                        }));
                    })
                );
            })
        );

        this.data$.subscribe({
            next: (data) => {
                const now = Date.now();
                const ranked = data
                    .map(({ settlement, online }) => {
                        const members = settlement.members?.length ?? 0;
                        return {
                            id: settlement.id,
                            name: getSettlementDisplayName(settlement),
                            typeLabel: isGuildSettlement(settlement)
                                ? this.i18n.translate('settlements.types.guild')
                                : getSettlementTypeByKey(settlement.type),
                            diplomacy: settlement.diplomacy,
                            members,
                            online,
                            percent: scoreSettlement(
                                answers,
                                {
                                    diplomacy: settlement.diplomacy,
                                    members,
                                    online,
                                    updatedAt: parseDateInput(settlement.updated_at)?.getTime() ?? null,
                                },
                                now
                            ),
                        } satisfies FinderMatch;
                    })
                    .sort((a, b) => b.percent - a.percent || b.online - a.online || b.members - a.members);

                this.matches.set(ranked.slice(0, RESULTS));
            },
            error: () => {
                this.data$ = undefined;
                this.failed.set(true);
                this.matches.set([]);
            },
        });
    }
}
