import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
    Signal,
} from '@angular/core';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    getDiplomacyTone,
    getMemberRoleNames,
    getOwnerIds,
    getSettlementTypeByKey,
    getSettlementTypeTone,
    IRole,
    isGuildSettlement,
    isOwner,
    ISettlement,
    ISettlementInvitation,
    IUpdateAttachment,
    memberHasPermission,
    Permission,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementDisplayNamePipe,
    SettlementService,
    SettlementsTypes,
} from '@entities/settlement';
import { IPlayer, PlayerChipComponent, UserService } from '@entities/user';
import { SettlementTagComponent, SettlementTagStore } from '@entities/settlement-tag';
import { MediaService } from '@entities/media';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { NotificationService } from '@core/services/notification.service';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { SettlementDetailSkeletonComponent } from '@shared/ui/skeletons';
import { compressImage } from '@shared/lib/compress-image.function';
import { CreateSettlementFormComponent } from '@app/features/profile/create-settlement-from/create-settlement-from.component';
import {
    MemberRolesDialogComponent,
    MemberRolesDialogData,
    RoleFormDialogComponent,
    RoleFormResult,
    RolesMatrixComponent,
} from '../settlement-roles';
import { JoinRequestsPanelComponent } from '../settlement-join-requests';
import {
    TransferOwnershipDialogComponent,
    TransferOwnershipDialogData,
} from '../settlement-ownership';
import { ContactInfoDialogComponent } from '../settlement-contact-info';
import { InvitationCardComponent } from '../settlement-invitation';
import { PlayerInviteComponent } from '../player-invite/player-invite.component';

/**
 * Страница управления собственным поселением.
 *
 * Все данные держатся в сигналах: мутации ролей, владения и контактов
 * возвращают обновлённое поселение, и страница перерисовывается из ответа —
 * эндпоинтов `GET .../roles` и `GET .../members` не существует, дозапрос
 * `getSettlementInfo` после каждой правки был бы лишним.
 *
 * Запросы, доступные не всем (отправленные приглашения, статус заявки на
 * основание, заявки на вступление), помечены `SKIP_ERROR_ALERT` и вдобавок
 * закрыты гейтом по праву: одного гейта мало — при смене владельца гонка
 * всё равно даст 403.
 */
@Component({
    standalone: true,
    selector: 'app-settlement',
    imports: [
        TuiIcon,
        TuiLoader,
        SettlementBadgeComponent,
        SettlementTagComponent,
        SettlementDetailSkeletonComponent,
        ImageLoaderComponent,
        TranslatePipe,
        SettlementDisplayNamePipe,
        PlayerChipComponent,
        RolesMatrixComponent,
        JoinRequestsPanelComponent,
        InvitationCardComponent,
    ],
    providers: [DatePipe],
    templateUrl: './settlement.component.html',
    styleUrl: './settlement.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementComponent {
    /**
     * Сервис диалогов.
     */
    private readonly dialogs: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис данных о пользователе.
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Идентификатор текущего пользователя.
     */
    protected readonly userId: string = this.userService.userId;

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис уведомлений — источник входящих приглашений.
     */
    private readonly notificationService: NotificationService = inject(NotificationService);

    /**
     * Пайп форматирования дат.
     */
    private readonly datePipe: DatePipe = inject(DatePipe);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Хранилище тегов поселений.
     */
    protected readonly tagStore: SettlementTagStore = inject(SettlementTagStore);

    /**
     * Сервис загрузки медиафайлов.
     */
    private readonly mediaService: MediaService = inject(MediaService);

    /**
     * Сервис уведомлений о результате запроса.
     */
    private readonly requestStatus: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Поселение пользователя.
     * `null` — данные ещё загружаются, `undefined` — поселения нет.
     */
    protected readonly settlement = signal<ISettlement | null | undefined>(null);

    /**
     * Профили участников поселения, загруженные одним батчем.
     */
    protected readonly players = signal<IPlayer[]>([]);

    /**
     * Входящие приглашения в поселения.
     */
    protected readonly invitations = signal<ISettlementInvitation[]>([]);

    /**
     * Статус заявки на основание поселения либо `null`, если заявки нет.
     */
    protected readonly requestStatusInfo = signal<{ status: string; rejection_reason: string } | null>(
        null
    );

    /**
     * Отправленные приглашения поселения.
     */
    protected readonly sentInvitations = signal<ISettlementInvitation[]>([]);

    /**
     * Игровые имена приглашённых игроков по идентификатору пользователя.
     */
    private readonly invitedNames = signal<Record<string, string>>({});

    /**
     * Признак загрузки изображения селения.
     */
    protected readonly isImageUploading = signal(false);

    /**
     * Признак выполняющейся мутации ролей, владения или контактов.
     */
    protected readonly busy = signal(false);

    /**
     * Идентификаторы владельцев поселения.
     */
    private readonly ownerIds: Signal<string[]> = computed(() => {
        const settlement = this.settlement();

        return settlement ? getOwnerIds(settlement) : [];
    });

    /**
     * Владельцы поселения. Их может быть несколько.
     */
    protected readonly leaders: Signal<IPlayer[]> = computed(() =>
        this.players().filter((player) => this.ownerIds().includes(player.user_id))
    );

    /**
     * Участники поселения без владельцев.
     */
    protected readonly users: Signal<IPlayer[]> = computed(() =>
        this.players().filter((player) => !this.ownerIds().includes(player.user_id))
    );

    /**
     * Ссылка на изображение селения с заглушкой.
     * У части селений массив вложений пуст, и шаблон падал на чтении `.url`.
     */
    protected readonly imageUrl: Signal<string> = computed(
        () => this.settlement()?.attachments?.[0]?.url || '/images/screenshots/screen_1.png'
    );

    /**
     * Признак того, что текущий пользователь — владелец поселения.
     */
    protected readonly isCurrentOwner: Signal<boolean> = computed(() => {
        const settlement = this.settlement();

        return !!settlement && isOwner(settlement, this.userId);
    });

    /**
     * Признак права приглашать игроков (владелец или роль с этим правом).
     */
    protected readonly canInvite: Signal<boolean> = computed(() => {
        const settlement = this.settlement();

        return !!settlement && memberHasPermission(settlement, this.userId, Permission.InviteMember);
    });

    /**
     * Признак права рассматривать заявки на вступление.
     */
    protected readonly canReviewJoinRequests: Signal<boolean> = computed(() => {
        const settlement = this.settlement();

        return (
            !!settlement && memberHasPermission(settlement, this.userId, Permission.ReviewJoinRequest)
        );
    });

    /**
     * Признак возможности исключать участников.
     *
     * Право не выражается через `Permission`: по спеке
     * `DELETE /settlements/{id}/members/{user_id}` требует владельца
     * либо scope `settlements:manage` (администратор).
     */
    protected readonly canRemoveMember: Signal<boolean> = computed(
        () => this.isCurrentOwner() || this.userService.roles.includes('admin')
    );

    /**
     * Признак возможности покинуть поселение.
     * Последний владелец выйти не может — сначала нужно передать владение.
     */
    protected readonly canLeave: Signal<boolean> = computed(
        () => !this.isCurrentOwner() || this.ownerIds().length > 1
    );

    constructor() {
        this.tagStore.loadTags$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

        this.notificationService.invitations$
            .pipe(
                catchError(() => of([] as ISettlementInvitation[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((invitations) => this.invitations.set(invitations ?? []));

        this.loadSettlement();
    }

    /**
     * Возвращает имена ролей участника для бейджей.
     * ВНИМАНИЕ (XSS): имена выводить только через интерполяцию `{{ }}`.
     *
     * @param settlement Поселение.
     * @param targetUserId Идентификатор участника.
     * @returns Массив имён ролей.
     */
    protected roleNamesOf(settlement: ISettlement, targetUserId: string): string[] {
        return getMemberRoleNames(settlement, targetUserId);
    }

    /**
     * Возвращает игровое имя приглашённого игрока.
     *
     * @param userId Идентификатор пользователя.
     * @returns Игровое имя или подпись загрузки.
     */
    protected invitedNameOf(userId: string): string {
        return this.invitedNames()[userId] ?? this.i18n.translate('settlements.settlement.loading');
    }

    /**
     * Возвращает локализованный тип селения.
     * Для гильдий — «Гильдия» вместо бэкенд-типа «Лагерь».
     *
     * @param settlement Селение.
     * @returns Название типа.
     */
    protected getSettlementType(settlement: ISettlement): string {
        return isGuildSettlement(settlement)
            ? this.i18n.translate('settlements.types.guild')
            : getSettlementTypeByKey(settlement.type);
    }

    /**
     * Возвращает отображаемый статус дипломатии.
     *
     * @param settlement Селение.
     * @returns Локализованное название дипломатии.
     */
    protected getDiplomacyLabel(settlement: ISettlement): string {
        return isGuildSettlement(settlement) && settlement.diplomacy === 'Миролюбивый'
            ? this.i18n.translate('settlements.diplomacy.guild')
            : settlement.diplomacy;
    }

    /**
     * Возвращает тон бейджа типа селения.
     *
     * @param settlement Селение.
     * @returns Тон бейджа.
     */
    protected getSettlementTypeTone(settlement: ISettlement): SettlementBadgeTone {
        return getSettlementTypeTone(settlement);
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

    /**
     * Проверяет, является ли селение гильдией.
     *
     * @param settlement Селение.
     * @returns true, если селение содержит маркер гильдии.
     */
    protected isGuild(settlement: ISettlement): boolean {
        return isGuildSettlement(settlement);
    }

    /**
     * Возвращает тег по идентификатору.
     *
     * @param tagId Идентификатор тега.
     */
    protected getTag(tagId: string) {
        return this.tagStore.getTagById(tagId);
    }

    /**
     * Открывает диалог основания поселения.
     */
    protected createSettlement(): void {
        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), {
                data: { level: SettlementsTypes.initial },
            })
            .subscribe();
    }

    /**
     * Открывает диалог основания гильдии.
     */
    protected createGuild(): void {
        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), {
                data: { level: SettlementsTypes.guild },
            })
            .subscribe();
    }

    /**
     * Открывает диалог повышения уровня поселения.
     *
     * @param currentType Текущий тип поселения.
     */
    protected levelUp(currentType: string | number): void {
        const type =
            typeof currentType === 'number' ? currentType : this.getSettlementsTypeEnumByKey(currentType);

        this.dialogs
            .open(new PolymorpheusComponent(CreateSettlementFormComponent), { data: { level: type } })
            .subscribe();
    }

    /**
     * Открывает диалог приглашения игрока.
     *
     * @param settlement Поселение.
     */
    protected invitePlayer(settlement: ISettlement): void {
        this.dialogs
            .open(new PolymorpheusComponent(PlayerInviteComponent), {
                data: { settlementId: settlement.id },
            })
            .subscribe({ complete: () => this.loadSentInvitations(settlement) });
    }

    /**
     * Перезагружает данные страницы после принятия или отклонения приглашения.
     */
    protected onInvitationResolved(): void {
        this.notificationService.updateAllNotification$.next();
        this.loadSettlement();
    }

    /**
     * Открывает диалог создания роли.
     */
    protected createRole(): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        this.dialogs
            .open<RoleFormResult | null>(new PolymorpheusComponent(RoleFormDialogComponent), {
                size: 'auto',
                data: { role: null },
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.runMutation(
                    this.settlementService.createRole$(settlement.id, result.name, result.permissions),
                    'settlements.roles.created',
                    'settlements.roles.createError'
                );
            });
    }

    /**
     * Открывает диалог переименования роли и правки её прав.
     *
     * @param role Редактируемая роль.
     */
    protected editRole(role: IRole): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        this.dialogs
            .open<RoleFormResult | null>(new PolymorpheusComponent(RoleFormDialogComponent), {
                size: 'auto',
                data: { role },
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.runMutation(
                    this.settlementService.updateRole$(settlement.id, role.id, {
                        name: result.name,
                        permissions: result.permissions,
                    }),
                    'settlements.roles.updated',
                    'settlements.roles.updateError'
                );
            });
    }

    /**
     * Удаляет роль после подтверждения. Роль снимается со всех участников.
     *
     * @param role Удаляемая роль.
     */
    protected deleteRole(role: IRole): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        this.confirmDialog
            .open({
                title: this.i18n.translate('settlements.roles.confirm.deleteTitle'),
                text: this.i18n.translate('settlements.roles.confirm.deleteText'),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.runMutation(
                    this.settlementService.deleteRole$(settlement.id, role.id),
                    'settlements.roles.deleted',
                    'settlements.roles.deleteError'
                );
            });
    }

    /**
     * Выдаёт или снимает право у роли.
     *
     * @param change Роль, право и целевое состояние отметки.
     */
    protected togglePermission(change: { role: IRole; permission: Permission; granted: boolean }): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        const current = change.role.permissions ?? [];
        const permissions = change.granted
            ? [...current, change.permission]
            : current.filter((item) => item !== change.permission);

        this.runMutation(
            this.settlementService.updateRole$(settlement.id, change.role.id, { permissions }),
            'settlements.roles.updated',
            'settlements.roles.updateError'
        );
    }

    /**
     * Открывает диалог управления ролями участника.
     *
     * @param targetUserId Идентификатор участника.
     */
    protected openMemberRoles(targetUserId: string): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        const player = this.players().find((item) => item.user_id === targetUserId);

        const data: MemberRolesDialogData = {
            settlement,
            userId: targetUserId,
            memberName: player?.user_game_name ?? '',
            toggle: (roleId, granted) =>
                (granted
                    ? this.settlementService.assignMemberRole$(settlement.id, targetUserId, roleId)
                    : this.settlementService.removeMemberRole$(settlement.id, targetUserId, roleId)
                ).pipe(
                    tap((updated) => this.settlement.set(updated)),
                    catchError((error: HttpErrorResponse) => {
                        this.requestStatus.showError(
                            this.i18n.translate('settlements.roles.member.assignError')
                        );

                        throw error;
                    })
                ),
        };

        this.dialogs
            .open(new PolymorpheusComponent(MemberRolesDialogComponent), { size: 'auto', data })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Открывает диалог передачи владения и подтверждает необратимость.
     */
    protected transferOwnership(): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        const data: TransferOwnershipDialogData = { settlement, players: this.players() };

        this.dialogs
            .open<string | null>(new PolymorpheusComponent(TransferOwnershipDialogComponent), {
                size: 'auto',
                data,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((toUserId) => {
                if (!toUserId) {
                    return;
                }

                this.confirmDialog
                    .open({
                        title: this.i18n.translate('settlements.ownership.confirm.title'),
                        text: this.i18n.translate('settlements.ownership.confirm.text'),
                    })
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe((confirmed) => {
                        if (!confirmed) {
                            return;
                        }

                        this.runMutation(
                            this.settlementService.transferOwnership$(settlement.id, toUserId),
                            'settlements.ownership.transferred',
                            'settlements.ownership.transferError'
                        );
                    });
            });
    }

    /**
     * Открывает диалог редактирования контактной информации.
     */
    protected editContactInfo(): void {
        const settlement = this.settlement();

        if (!settlement) {
            return;
        }

        this.dialogs
            .open<string | null>(new PolymorpheusComponent(ContactInfoDialogComponent), {
                size: 'auto',
                data: { contactInfo: settlement.contact_info ?? '' },
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((contactInfo) => {
                if (contactInfo === null) {
                    return;
                }

                this.runMutation(
                    this.settlementService.updateContactInfo$(settlement.id, contactInfo),
                    'settlements.contactInfo.saved',
                    'settlements.contactInfo.saveError'
                );
            });
    }

    /**
     * Исключает участника из поселения либо выходит из него самому.
     *
     * @param settlementId Идентификатор поселения.
     * @param targetUserId Идентификатор участника.
     */
    protected settlementLeave(settlementId: string, targetUserId: string): void {
        const isSelfLeave = targetUserId === this.userId;

        if (isSelfLeave && !this.canLeave()) {
            this.requestStatus.showError(this.i18n.translate('settlements.ownership.lastOwnerLeave'));

            return;
        }

        this.confirmDialog
            .open({
                title: this.i18n.translate(
                    isSelfLeave
                        ? 'settlements.settlement.confirm.leaveTitle'
                        : 'settlements.settlement.confirm.removeMemberTitle'
                ),
                text: this.i18n.translate(
                    isSelfLeave
                        ? 'settlements.settlement.confirm.leaveText'
                        : 'settlements.settlement.confirm.removeMemberText'
                ),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                if (isSelfLeave) {
                    this.settlementService
                        .leaveSettlement$(settlementId)
                        .pipe(
                            catchError((error: HttpErrorResponse) => {
                                this.requestStatus.showError(
                                    this.i18n.translate(
                                        error.status === 400
                                            ? 'settlements.ownership.lastOwnerLeave'
                                            : 'settlements.settlement.leaveError'
                                    )
                                );

                                return of(null);
                            }),
                            takeUntilDestroyed(this.destroyRef)
                        )
                        .subscribe((result) => {
                            if (result !== null) {
                                this.settlement.set(undefined);
                                this.players.set([]);
                                this.loadRequestStatus();
                            }
                        });

                    return;
                }

                this.settlementService
                    .settlementLeave$(settlementId, targetUserId)
                    .pipe(
                        catchError(() => {
                            this.requestStatus.showError(
                                this.i18n.translate('settlements.settlement.removeMemberError')
                            );

                            return of(null);
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe((result) => {
                        if (result !== null) {
                            this.loadSettlement();
                        }
                    });
            });
    }

    /**
     * Отзывает отправленное приглашение.
     *
     * @param settlementId Идентификатор поселения.
     * @param invitationId Идентификатор приглашения.
     */
    protected revokeInvitation(settlementId: string, invitationId: string): void {
        this.confirmDialog
            .open({
                title: this.i18n.translate('settlements.settlement.confirm.revokeTitle'),
                text: this.i18n.translate('settlements.settlement.confirm.revokeText'),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.settlementService
                    .revokeInvitation(settlementId, invitationId)
                    .pipe(
                        catchError(() => {
                            this.requestStatus.showError(
                                this.i18n.translate('settlements.settlement.revokeError')
                            );

                            return of(null);
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe((remaining) => {
                        if (remaining === null) {
                            return;
                        }

                        // Ответ отдаёт актуальный список приглашений — дозапрос не нужен.
                        this.sentInvitations.set(
                            this.sentInvitations().filter((invitation) =>
                                remaining.includes(invitation.id)
                            )
                        );
                    });
            });
    }

    /**
     * Обрабатывает выбор нового изображения селения.
     *
     * Сжимает файл, загружает через `MediaService` и обновляет вложения.
     * Доступно только владельцу.
     *
     * @param settlement Поселение.
     * @param event Событие выбора файла.
     */
    protected async onSettlementImageSelected(settlement: ISettlement, event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.requestStatus.showError(this.i18n.translate('settlements.settlement.imageNotImage'));
            input.value = '';

            return;
        }

        this.isImageUploading.set(true);

        try {
            const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.92 });
            const url = await this.mediaService.uploadFile(compressed, 'UPLOAD_PURPOSE_SETTLEMENT');
            const currentAttachment = settlement.attachments[0];
            const updatedAttachments: IUpdateAttachment[] = [
                {
                    url,
                    description: currentAttachment?.desc ?? this.i18n.translate('settlements.attachments.preview'),
                },
                ...settlement.attachments.slice(1).map((attachment) => ({
                    url: attachment.url,
                    description: attachment.desc,
                })),
            ];

            this.settlementService
                .updateSettlement$(settlement.id, {
                    name: settlement.name,
                    description: settlement.description,
                    attachments: updatedAttachments,
                })
                .pipe(
                    // Обновление состояния — до хелперов RequestStatusService:
                    // они типизированы как MonoTypeOperatorFunction<unknown>
                    // и дальше по цепочке тип ответа теряется.
                    tap((updated) => this.settlement.set(updated)),
                    this.requestStatus.handleSuccess(this.i18n.translate('settlements.settlement.imageUpdated')),
                    this.requestStatus.handleError(this.i18n.translate('settlements.settlement.imageUpdateError')),
                    finalize(() => {
                        input.value = '';
                        this.isImageUploading.set(false);
                    }),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe({ error: () => undefined });
        } catch {
            this.isImageUploading.set(false);
            input.value = '';
            this.requestStatus.showError(this.i18n.translate('settlements.settlement.imageUpdateError'));
        }
    }

    /**
     * Открывает скрытый input выбора изображения.
     *
     * @param inputRef Ссылка на input-элемент.
     */
    protected triggerImageUpload(inputRef: HTMLInputElement): void {
        inputRef.click();
    }

    /**
     * Форматирует Unix timestamp (в секундах) в локальную дату.
     *
     * @param value Timestamp в виде строки или числа.
     * @returns Строка в формате «dd.MM.yy» или «—».
     */
    protected formatTimestamp(value: string | number | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return '—';
        }

        const timestamp = Number(value);

        if (Number.isNaN(timestamp)) {
            return '—';
        }

        return this.datePipe.transform(timestamp * 1000, 'dd.MM.yy') ?? '—';
    }

    /**
     * Возвращает элемент перечисления типов селения по ключу.
     *
     * @param key Ключ типа селения.
     * @returns Элемент перечисления.
     */
    private getSettlementsTypeEnumByKey(key: string): SettlementsTypes {
        switch (key) {
            case 'VILLAGE':
                return SettlementsTypes.village;
            case 'TOWNSHIP':
                return SettlementsTypes.township;
            case 'CITY':
                return SettlementsTypes.city;
            case 'PROVINCE':
                return SettlementsTypes.region;
            case 'CAMP':
            default:
                return SettlementsTypes.camp;
        }
    }

    /**
     * Загружает поселение пользователя и профили участников.
     *
     * Отсутствие поселения — штатный 404, поэтому запрос помечен
     * `SKIP_ERROR_ALERT`.
     */
    private loadSettlement(): void {
        if (!this.userId) {
            this.settlement.set(undefined);

            return;
        }

        this.settlementService
            .getSettlementInfo(this.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((settlement) => {
                if (!settlement) {
                    this.settlement.set(undefined);
                    this.loadRequestStatus();

                    return;
                }

                this.settlement.set(settlement);
                this.loadPlayers(settlement);

                if (this.canInvite()) {
                    this.loadSentInvitations(settlement);
                }
            });
    }

    /**
     * Загружает профили участников поселения одним батчем.
     *
     * @param settlement Поселение.
     */
    private loadPlayers(settlement: ISettlement): void {
        this.userService
            .getPlayersBatch$(settlement.members.map((member) => member.user_id))
            .pipe(
                catchError(() => of([] as IPlayer[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) => this.players.set(players));
    }

    /**
     * Загружает отправленные приглашения и игровые имена приглашённых.
     *
     * Эндпоинт доступен только тем, кто может приглашать: обычный житель
     * получал 403 и попап. Запрос закрыт гейтом и `SKIP_ERROR_ALERT`.
     *
     * @param settlement Поселение.
     */
    private loadSentInvitations(settlement: ISettlement): void {
        this.settlementService
            .getSentInvitations(settlement.id, new HttpContext().set(SKIP_ERROR_ALERT, true))
            .pipe(
                catchError(() => of([] as ISettlementInvitation[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((invitations) => {
                this.sentInvitations.set(invitations);

                if (invitations.length === 0) {
                    return;
                }

                this.userService
                    .getPlayersBatch$(invitations.map((invitation) => invitation.user_id))
                    .pipe(
                        catchError(() => of([] as IPlayer[])),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe((players) =>
                        this.invitedNames.set(
                            Object.fromEntries(
                                players.map((player) => [player.user_id, player.user_game_name])
                            )
                        )
                    );
            });
    }

    /**
     * Загружает статус заявки на основание поселения.
     *
     * У игрока, который заявку не подавал, эндпоинт отвечает 404 — это
     * штатный ответ, поэтому алерт подавляется.
     */
    private loadRequestStatus(): void {
        if (!this.userId) {
            return;
        }

        this.settlementService
            .getRequestSettlementStatus$(this.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((status) => this.requestStatusInfo.set(status));
    }

    /**
     * Выполняет мутацию, возвращающую обновлённое поселение.
     *
     * Страница перерисовывается из ответа: отдельных эндпоинтов для ролей и
     * участников нет, а `getSettlementInfo` вернул бы те же данные лишним
     * запросом.
     *
     * @param request Запрос мутации.
     * @param successKey Ключ перевода уведомления об успехе.
     * @param errorKey Ключ перевода уведомления об ошибке.
     */
    private runMutation(
        request: Observable<ISettlement>,
        successKey: string,
        errorKey: string
    ): void {
        this.busy.set(true);

        request
            .pipe(
                tap((settlement) => {
                    this.settlement.set(settlement);
                    this.loadPlayers(settlement);
                    this.requestStatus.showSuccess(this.i18n.translate(successKey));
                }),
                catchError(() => {
                    this.requestStatus.showError(this.i18n.translate(errorKey));

                    return of(null);
                }),
                finalize(() => this.busy.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }
}
