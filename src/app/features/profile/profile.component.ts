import { ChangeDetectorRef, Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { UserService } from '@entities/user';
import { IUser } from '@entities/user';
import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import { TuiButton, TuiDialogContext, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent, PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import { RouterOutlet } from '@angular/router';
import { VerificationService } from '@features/verification';
import { PlayerVerificationFormComponent } from './player-verification-form/player-verification-form.component';
import { catchError, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { RequestStatusService } from '@core/services/request-status.service';
import { ChangeUsernameComponent } from './change-username/change-username.component';
import { DonateService } from '@entities/donate';
import { ServerInformationService } from '@core/services/server-information.service';
import { SettlementService } from '@entities/settlement';
import { HungerGamesService } from '@features/hunger-games/api/hunger-games.service';
@Component({
    standalone: true,
    imports: [TuiIcon, NgIf, RouterOutlet, AsyncPipe, PolymorpheusOutlet, TuiPreview, TuiButton, DecimalPipe],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
})
export class ProfileComponent {
    protected readonly userService = inject(UserService);

    private readonly donateService = inject(DonateService);

    private readonly serverInfoService = inject(ServerInformationService);

    protected readonly settlementService = inject(SettlementService);

    private readonly hungerGamesService = inject(HungerGamesService);

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly dialogs = inject(TuiDialogService);

    private readonly verificationService = inject(VerificationService);

    protected readonly code$ = this.verificationService.getCode();

    protected readonly details$ = this.verificationService.getDetails();

    protected readonly player$ = this.userService
        .getPlayer$(this.userService.userId)
        .pipe(catchError(() => of(null)));

    protected readonly userGameName$ = this.player$.pipe(
        map((data) => data?.user_game_name ?? '')
    );

    protected readonly isOnline$ = this.player$.pipe(
        map((data) => data?.is_online ?? false)
    );

    /**
     * Баланс Осколков Искры текущего пользователя.
     */
    protected readonly balance$: Observable<string | null> = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth) {
                return of(null);
            }
            return this.donateService.getMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(null))
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
            return this.serverInfoService.getPlayerStats$(name).pipe(catchError(() => of(null)));
        })
    );

    /**
     * История покупок текущего пользователя.
     */
    protected readonly purchases$ = this.donateService.getMyPurchases$().pipe(catchError(() => of([])));

    /**
     * Поселение текущего пользователя.
     */
    protected readonly settlement$ = this.settlementService
        .getSettlementInfo(this.userService.userId)
        .pipe(catchError(() => of(null)));

    /**
     * Количество онлайн-участников селения текущего пользователя.
     */
    protected readonly settlementMembersOnline$ = this.settlement$.pipe(
        switchMap((settlement) => {
            if (!settlement?.members?.length) {
                return of(0);
            }
            const requests = settlement.members.map((member) =>
                this.userService.getPlayer$(member.user_id).pipe(
                    map((player) => player?.is_online ?? false),
                    catchError(() => of(false))
                )
            );
            return forkJoin(requests).pipe(map((results) => results.filter(Boolean).length));
        }),
        catchError(() => of(0))
    );

    /**
     * Текущий сезон голодных игр.
     */
    protected readonly hungerGamesSeason$ = this.hungerGamesService.getCurrentSeason$().pipe(
        catchError(() => of(null))
    );

    /**
     * Статистика игрока в текущем сезоне голодных игр.
     */
    protected readonly hungerGamesStats$ = this.hungerGamesSeason$.pipe(
        switchMap((season) => {
            if (!season) {
                return of(null);
            }
            return this.hungerGamesService
                .getPlayerSeasonStats$(season.id, this.userService.userId)
                .pipe(catchError(() => of(null)));
        })
    );

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
     * Сервис предпросмотра.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * ChangeDetectorRef для принудительного обновления представления.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    /**
     *
     */
    constructor() {
        this.userService.checkAuthTrigger$.next(false);
    }

    protected getRoleName() {
        if (this.userService.roles.includes('admin')) {
            return 'Администратор';
        }

        if (this.userService.roles.includes('player')) {
            return 'Игрок';
        }

        return 'Неверифицирован';
    }

    protected verification() {
        this.dialogs.open(new PolymorpheusComponent(PlayerVerificationFormComponent), { size: 'l' }).subscribe();
    }

    /**
     * Открывает диалоговое окно изменения игрового никнейма пользователя
     */
    protected openDialogChangeUsername(): void {
        this.dialogs.open(new PolymorpheusComponent(ChangeUsernameComponent), { size: 'l' }).subscribe();
    }

    triggerFileInput() {
        this.fileInputRef.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            if (file.size > 3145728) {
                this.requestStatusService.showError('Файл превышает 3МБ!');
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                const dataUrl = reader.result as string;

                this.userService
                    .setProfileImage$(base64)
                    .pipe(
                        this.requestStatusService.handleError('Файл не должен превышать 512х512!'),
                        tap(() => {
                            this.userService.userImage = dataUrl;
                            this.userData.image = dataUrl;

                            this.cdr.detectChanges();
                        }),
                        this.requestStatusService.handleSuccess('Изображение обновлено!')
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
}
