import {
    ChangeDetectorRef,
    Component,
    computed,
    ElementRef,
    inject,
    signal,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserService } from '@entities/user';
import { IUser } from '@entities/user';
import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import { TuiButton, TuiDialogContext, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent, PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import { HowToBuyComponent } from '@features/market/components/how-to-buy/how-to-buy.component';
import { RouterLink, RouterOutlet } from '@angular/router';
import { VerificationService, VerificationSubmission } from '@features/verification';
import { PlayerVerificationFormComponent } from './player-verification-form/player-verification-form.component';
import {
    catchError,
    combineLatest,
    defaultIfEmpty,
    map,
    merge,
    Observable,
    of,
    shareReplay,
    startWith,
    Subject,
    switchMap,
    take,
    tap,
} from 'rxjs';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { ChangeUsernameComponent } from './change-username/change-username.component';
import { ProfileSkeletonComponent } from '@shared/ui/skeletons';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { DonateService } from '@entities/donate';
import { ServerInformationService } from '@core/services/server-information.service';
import {
    SettlementService,
    isGuildSettlement,
    getSettlementTypeByKey,
    getSettlementTypeTone,
    getDiplomacyTone,
    isOwner,
    ISettlement,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementDisplayNamePipe,
} from '@entities/settlement';
import { HungerGamesService, ISeasonInfo } from '@features/hunger-games/api/hunger-games.service';
import { NewcomerPathComponent } from '@features/onboarding';
import { PlayerBadgesComponent, PlayerProfile, PlayerProfileService } from '@features/player';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { PendingInviteBannerComponent } from '@features/settlements/join-by-invite';
import { ApplicationCardComponent, ApplicationState } from './ui/application-card/application-card.component';
import { ProfileWaitingComponent } from './ui/profile-waiting/profile-waiting.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
    standalone: true,
    imports: [
        TuiIcon,
        RouterOutlet,
        AsyncPipe,
        PolymorpheusOutlet,
        TuiPreview,
        TuiButton,
        DecimalPipe,
        ProfileSkeletonComponent,
        ImageLoaderComponent,
        TranslatePipe,
        SettlementBadgeComponent,
        SettlementDisplayNamePipe,
        NewcomerPathComponent,
        RouterLink,
        ApplicationCardComponent,
        ProfileWaitingComponent,
        PlayerBadgesComponent,
        ShareButtonComponent,
        PendingInviteBannerComponent,
    ],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css',
})
export class ProfileComponent {
    protected readonly userService = inject(UserService);

    private readonly donateService = inject(DonateService);

    private readonly serverInfoService = inject(ServerInformationService);

    protected readonly settlementService = inject(SettlementService);

    private readonly hungerGamesService = inject(HungerGamesService);

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly dialogs = inject(TuiDialogService);

    /**
     * Открывает диалог "Как приобрести".
     *
     * Используется как временная заглушка для кнопки пополнения баланса.
     */
    protected howToBuy(): void {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }

    private readonly verificationService = inject(VerificationService);

    private readonly playerProfiles = inject(PlayerProfileService);

    /**
     * Перезапрос статуса анкеты по кнопке «Обновить статус».
     */
    private readonly refreshDetails$ = new Subject<void>();

    /**
     * Анкета, отправленная с этого браузера: дата и ник для карточки.
     */
    protected readonly submission = signal<VerificationSubmission | null>(this.verificationService.lastSubmission());

    /**
     * Код верификации текущего пользователя.
     * При ошибке возвращает null, чтобы не ломать UI.
     */
    protected readonly code$ = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth) {
                return of(null);
            }

            return this.verificationService.getCode().pipe(
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        })
    );

    /**
     * Детали верификации текущего пользователя.
     * При отсутствии заявки на верификацию (404) возвращает null,
     * чтобы не блокировать загрузку профиля.
     */
    protected readonly details$ = combineLatest([
        this.userService.authState$,
        merge(this.refreshDetails$, this.verificationService.submitted$).pipe(startWith(undefined)),
    ]).pipe(
        switchMap(([isAuth]) => {
            if (!isAuth) {
                return of(null);
            }

            return this.verificationService.getDetails().pipe(
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    protected readonly player$ = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth || !this.isVerifiedUser() || !this.userService.userId) {
                return of(null);
            }
            return this.userService.getPlayer$(this.userService.userId).pipe(
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        })
    );

    protected readonly userGameName$ = this.player$.pipe(
        map((data) => data?.user_game_name ?? ''),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    /**
     * Публичный профиль игрока: места в рейтинге и значки.
     * Грузится отдельно и не задерживает показ профиля.
     */
    protected readonly selfProfile$: Observable<PlayerProfile | null> = this.userGameName$.pipe(
        switchMap((name) =>
            name
                ? this.playerProfiles.load(name).pipe(
                      catchError(() => of(null)),
                      startWith(null)
                  )
                : of(null)
        )
    );

    protected readonly isOnline$ = this.player$.pipe(map((data) => data?.is_online ?? false));

    /**
     * Баланс Осколков Искры текущего пользователя.
     */
    protected readonly balance$: Observable<string | null> = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth || !this.isVerifiedUser()) {
                return of(null);
            }
            return this.donateService.getMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        })
    );

    /**
     * Индивидуальная статистика игрока (смерти, убийства, часы).
     */
    protected readonly playerStats$ = this.userGameName$.pipe(
        switchMap((name) => {
            if (!name) {
                return of(null);
            }
            return this.serverInfoService.getPlayerStats$(name).pipe(
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        })
    );

    /**
     * Поселение текущего пользователя.
     */
    protected readonly settlement$ = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth || !this.isVerifiedUser() || !this.userService.userId) {
                return of(null);
            }
            return this.settlementService
                .getSettlementInfo(this.userService.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
                .pipe(
                    catchError(() => of(null)),
                    defaultIfEmpty(null)
                );
        })
    );

    /**
     * Количество онлайн-участников селения текущего пользователя.
     */
    protected readonly settlementMembersOnline$ = this.settlement$.pipe(
        switchMap((settlement) => {
            if (!settlement?.members?.length) {
                return of(0);
            }
            return this.userService
                .getPlayersBatch$(settlement.members.map((member) => member.user_id))
                .pipe(map((players) => players.filter((player) => player?.is_online).length));
        }),
        catchError(() => of(0))
    );

    /**
     * Список всех сезонов голодных игр.
     */
    protected readonly hgSeasonsList = signal<ISeasonInfo[]>([]);

    /**
     * Индекс выбранного сезона в списке.
     */
    protected readonly selectedHgIndex = signal<number>(0);

    /**
     * Выбранный сезон голодных игр.
     */
    protected readonly hungerGamesSeason = computed(() => {
        const list = this.hgSeasonsList();
        const idx = this.selectedHgIndex();
        return list[idx] ?? null;
    });

    /**
     * Можно ли перейти к предыдущему сезону.
     */
    protected readonly canPrevHgSeason$ = toObservable(this.selectedHgIndex).pipe(map((idx) => idx > 0));

    /**
     * Можно ли перейти к следующему сезону.
     */
    protected readonly canNextHgSeason$ = combineLatest([
        toObservable(this.hgSeasonsList),
        toObservable(this.selectedHgIndex),
    ]).pipe(map(([list, idx]) => idx < list.length - 1));

    /**
     * Есть ли активный (не завершённый) сезон в списке.
     */
    protected readonly hasActiveSeason = computed(() => this.hgSeasonsList().some((s) => !s.ended_at));

    /**
     * Статистика игрока в выбранном сезоне голодных игр.
     */
    protected readonly hungerGamesStats$ = toObservable(this.hungerGamesSeason).pipe(
        switchMap((season) => {
            if (!season || !this.userService.userId || !this.isVerifiedUser()) {
                return of(null);
            }
            return this.hungerGamesService.getPlayerSeasonStats$(season.id, this.userService.userId).pipe(
                catchError(() => of(null)),
                defaultIfEmpty(null)
            );
        })
    );

    /**
     * Признак первоначальной загрузки данных профиля.
     */
    protected readonly isLoading$ = combineLatest([
        this.userGameName$,
        this.balance$,
        this.playerStats$,
        this.settlement$,
        this.hungerGamesStats$,
        this.details$,
    ]).pipe(
        map(() => false),
        startWith(true)
    );

    /**
     * Переключает на предыдущий сезон.
     */
    protected prevHgSeason(): void {
        this.selectedHgIndex.update((i) => Math.max(0, i - 1));
    }

    /**
     * Переключает на следующий сезон.
     */
    protected nextHgSeason(): void {
        this.selectedHgIndex.update((i) => {
            const max = this.hgSeasonsList().length - 1;
            return Math.min(max, i + 1);
        });
    }

    /**
     * Описание изображения открытого в предпросмотре.
     */
    protected previewDesc: string | null = null;

    /**
     * Ссылка на элемент в шаблоне.
     */
    @ViewChild('preview')
    protected readonly preview?: TemplateRef<TuiDialogContext>;

    /**
     * Содержание предпросмотра.
     */
    protected previewContent: PolymorpheusContent;

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис предпросмотра.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * ChangeDetectorRef для принудительного обновления представления.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    /**
     * Загружает список сезонов «Голодных игр» и выбирает активный.
     */
    constructor() {
        this.verificationService.submitted$
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.submission.set(this.verificationService.lastSubmission()));

        this.hungerGamesService
            .getSeasons$()
            .pipe(take(1))
            .subscribe((seasons) => {
                const sorted = [...seasons].sort((a, b) => a.number - b.number);
                this.hgSeasonsList.set(sorted);
                const activeIdx = sorted.findIndex((s) => !s.ended_at);
                this.selectedHgIndex.set(activeIdx >= 0 ? activeIdx : sorted.length - 1);
            });
    }

    protected getRoleName() {
        if (this.userService.roles.includes('admin')) {
            return 'profile.role.admin';
        }

        if (this.userService.roles.includes('player')) {
            return 'profile.role.player';
        }

        return 'profile.role.unverified';
    }

    /**
     * Проверяет, прошёл ли текущий пользователь верификацию.
     * Верифицированными считаются пользователи с ролью admin или player.
     */
    private isVerifiedUser(): boolean {
        return this.userService.roles.includes('admin') || this.userService.roles.includes('player');
    }

    /**
     * Состояние анкеты для бейджа в шапке.
     *
     * @param status Статус анкеты с сервера.
     * @returns Состояние.
     */
    protected applicationState(status: string | null | undefined): ApplicationState {
        switch (status) {
            case 'pending':
            case 'rejected':
                return status;
            case 'approved':
            case 'verified':
                return 'approved';
            default:
                return 'none';
        }
    }

    /**
     * Перезапрашивает статус анкеты.
     */
    protected refreshApplication(): void {
        this.refreshDetails$.next();
    }

    /**
     * Повторный вход: после одобрения токен должен получить роль игрока.
     */
    protected relogin(): void {
        this.userService.signIn();
    }

    protected verification() {
        this.dialogs.open(new PolymorpheusComponent(PlayerVerificationFormComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Открывает диалоговое окно изменения игрового никнейма пользователя
     */
    protected openDialogChangeUsername(): void {
        this.dialogs.open(new PolymorpheusComponent(ChangeUsernameComponent), { size: 'auto' }).subscribe();
    }

    triggerFileInput() {
        this.fileInputRef.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            if (file.size > 3145728) {
                this.requestStatusService.showError(this.i18n.translate('profile.errors.fileTooLarge'));
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                const dataUrl = reader.result as string;

                this.userService
                    .setProfileImage$(file)
                    .pipe(
                        this.requestStatusService.handleError(this.i18n.translate('profile.errors.imageDimensions')),
                        tap(() => {
                            this.userService.userImage = dataUrl;
                            this.userData.image = dataUrl;

                            this.cdr.detectChanges();
                        }),
                        this.requestStatusService.handleSuccess(this.i18n.translate('profile.success.imageUpdated'))
                    )
                    .subscribe({
                        error: () => {},
                    });
            };

            reader.readAsDataURL(file);
        }
    }

    /**
     *  Открывает изображение в окне предпросмотра.
     *
     * @param url Ссылка на изображение.
     * @param desc Описание изображения.
     */
    protected show(url: string, desc: string): void {
        this.previewContent = url;
        this.previewDesc = desc;
        this.previewService.open(this.preview || '').subscribe();
    }

    /**
     * Возвращает отображаемый тип селения.
     *
     * Для гильдий возвращает "Гильдия".
     *
     * @param settlement Поселение.
     * @returns Локализованное название типа.
     */
    protected getSettlementTypeLabel(settlement: ISettlement): string {
        if (isGuildSettlement(settlement)) {
            return this.i18n.translate('settlements.types.guild');
        }

        return getSettlementTypeByKey(settlement.type);
    }

    /**
     * Возвращает тон бейджа типа селения.
     *
     * @param settlement Поселение.
     * @returns Тон бейджа.
     */
    protected getSettlementTypeTone(settlement: ISettlement): SettlementBadgeTone {
        return getSettlementTypeTone(settlement);
    }

    /**
     * Проверяет, является ли текущий пользователь владельцем (owner) поселения.
     *
     * @param settlement Поселение.
     * @returns true, если текущий пользователь — owner.
     */
    protected isSettlementOwner(settlement: ISettlement): boolean {
        return isOwner(settlement, this.userService.userId);
    }

    /**
     * Возвращает тон бейджа дипломатии.
     *
     * @param diplomacy Статус дипломатии.
     * @returns Тон бейджа.
     */
    protected getDiplomacyTone(diplomacy: string | undefined): SettlementBadgeTone {
        return getDiplomacyTone(diplomacy);
    }
}
