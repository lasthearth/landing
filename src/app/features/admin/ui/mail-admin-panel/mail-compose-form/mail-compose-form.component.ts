import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';

import { SettlementService } from '@entities/settlement';
import { ISearchedUser, UserService } from '@entities/user';
import {
    buildComposeMailRequest,
    ComposeMailDraft,
    MailApiService,
    MailAttachment,
    MailItemType,
    MAIL_SCOPES,
} from '@entities/mail';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ISelectedPlayer } from '../../../model/selected-player.model';
import { IConfirmMailSendData } from '../../../model/confirm-mail-send-data.model';
import { describeComposeMailError } from '../../../lib/mail-compose-error.function';
import { ConfirmMailSendComponent } from '../confirm-mail-send/confirm-mail-send.component';

/**
 * Сколько символов ника нужно, чтобы поиск игрока пошёл в сеть.
 */
const SEARCH_MIN_LENGTH = 2;

/**
 * Задержка поиска игрока, мс.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Предел длины заголовка письма, символов.
 */
const TITLE_MAX_LENGTH = 120;

/**
 * Предел длины текста письма, символов.
 */
const BODY_MAX_LENGTH = 2000;

/**
 * Количество единиц позиции: целое от 1 до 9 999 999.
 *
 * Потолок держит значение в пределах int32 из proto-контракта и не даёт
 * отправить опечатку вида `5000000000`.
 */
const QUANTITY_PATTERN = /^[1-9]\d{0,6}$/;

/**
 * Сумма осколков: целое от 1 до 9 999 999 999.
 */
const AMOUNT_PATTERN = /^[1-9]\d{0,9}$/;

/**
 * Пустая выдача поиска: начальное значение сигнала результатов.
 */
const NO_USERS: ISearchedUser[] = [];

/**
 * Значения поля «Тип» позиции.
 */
const ITEM_TYPES: readonly MailItemType[] = ['item', 'block'];

/**
 * Подписи значений поля «Тип».
 */
const ITEM_TYPE_LABEL_KEYS: Record<MailItemType, string> = {
    item: 'mail.compose.typeItem',
    block: 'mail.compose.typeBlock',
};

/**
 * Проверяет, что строка непустая после обрезки пробелов по краям.
 *
 * `Validators.required` пропускает строку из одних пробелов, а сервер считает
 * такое поле пустым и отвечает `400` — ошибку надо показать до отправки.
 *
 * @param control Поле формы.
 * @returns Ошибка `blank` или `null`.
 */
function nonBlankValidator(control: AbstractControl<string>): ValidationErrors | null {
    return control.value.trim().length > 0 ? null : { blank: true };
}

/**
 * Проверяет, что срок жизни письма в будущем.
 *
 * Поле необязательное: пустая строка проверку проходит, потому что
 * «письмо без срока» — законное состояние.
 *
 * @param control Поле формы.
 * @returns Ошибка `past` или `null`.
 */
function futureDateValidator(control: AbstractControl<string>): ValidationErrors | null {
    const value = control.value.trim();

    if (value.length === 0) {
        return null;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time) || time <= Date.now() ? { past: true } : null;
}

/**
 * Форма отправки внутриигрового письма.
 *
 * Адресат — либо один игрок, найденный по нику (письмо уходит на его `user_id`,
 * а не на ник), либо все игроки. Вложения двух родов: позиции (код, количество,
 * тип) и осколки; уходят они элементами repeated oneof `attachments`.
 *
 * Безопасность повтора: ключ идемпотентности создаётся один раз на попытку
 * отправки и живёт до ответа сервера, поэтому двойной клик и повтор после
 * ошибки возвращают то же письмо, а не создают второе. Правка формы после
 * ошибки ключ сбрасывает: изменившееся письмо — другая операция.
 *
 * Форма очищается только после успеха: `mail_id` остаётся на экране, пока
 * администратор не начнёт следующее письмо.
 */
@Component({
    selector: 'app-mail-compose-form',
    imports: [ReactiveFormsModule, TranslatePipe, TuiIcon, TuiLoader, LHInputComponent],
    templateUrl: './mail-compose-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailComposeFormComponent {
    /**
     * API почты.
     */
    private readonly mailApi = inject(MailApiService);

    /**
     * Сервис наделов: поиск игрока по нику.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис пользователя: скоупы текущего администратора.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис диалогов Taiga UI.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Письмо отправлено — родитель перечитывает список отправленных.
     */
    public readonly sent = output<string>();

    /**
     * Есть ли право отправки (`mail:compose`).
     *
     * `computed`, а не снимок: `UserService.scopes` обновляется при silent renew
     * токена, и форма должна появиться без перезагрузки страницы.
     */
    protected readonly canCompose = computed(() => this.userService.hasScope(MAIL_SCOPES.compose));

    /**
     * Показывать состояние «нет прав» вместо формы.
     */
    protected readonly noRights = computed(() => !this.canCompose() || this.denied());

    /**
     * Сервер отказал в праве во время отправки.
     */
    protected readonly denied = signal(false);

    /**
     * Заголовок, текст и срок жизни письма.
     */
    protected readonly form = new FormGroup({
        title: new FormControl<string>('', {
            nonNullable: true,
            validators: [nonBlankValidator, Validators.maxLength(TITLE_MAX_LENGTH)],
        }),
        body: new FormControl<string>('', {
            nonNullable: true,
            validators: [nonBlankValidator, Validators.maxLength(BODY_MAX_LENGTH)],
        }),
        expiresAt: new FormControl<string>('', { nonNullable: true, validators: [futureDateValidator] }),
    });

    /**
     * Строки вложений-позиций.
     */
    protected readonly itemRows = new FormArray<FormGroup<MailItemForm>>([]);

    /**
     * Строки вложений-осколков.
     */
    protected readonly coinsRows = new FormArray<FormGroup<MailCoinsForm>>([]);

    /**
     * Поле поиска игрока по нику.
     */
    protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

    /**
     * Признак письма всем игрокам.
     */
    protected readonly broadcast = signal(false);

    /**
     * Выбранный получатель.
     */
    protected readonly selectedPlayer = signal<ISelectedPlayer | null>(null);

    /**
     * Получатель не выбран, а отправку уже пробовали.
     */
    protected readonly recipientMissing = signal(false);

    /**
     * Признак выполнения запроса отправки.
     */
    protected readonly submitting = signal(false);

    /**
     * Идентификатор отправленного письма; `null`, пока письмо не ушло.
     */
    protected readonly sentMailId = signal<string | null>(null);

    /**
     * Текст ошибки отправки.
     */
    protected readonly fieldError = signal<string | null>(null);

    /**
     * Ключ идемпотентности текущей попытки.
     */
    private readonly idempotencyKey = signal<string | null>(null);

    /**
     * Результаты поиска игрока по нику.
     */
    protected readonly searchResults = toSignal(
        this.searchControl.valueChanges.pipe(
            map((term) => term.trim()),
            debounceTime(SEARCH_DEBOUNCE_MS),
            distinctUntilChanged(),
            switchMap((term) =>
                term.length < SEARCH_MIN_LENGTH
                    ? of(NO_USERS)
                    : this.settlementService
                          .searchUser$(term)
                          .pipe(catchError(() => of({ users: NO_USERS })))
                          .pipe(map((response) => response.users))
            )
        ),
        { initialValue: NO_USERS }
    );

    /**
     * Значения поля «Тип» позиции.
     */
    protected readonly itemTypes: MailItemType[] = [...ITEM_TYPES];

    /**
     * Подпись значения поля «Тип».
     *
     * Стрелка, а не метод: шаблон читает её как свойство и не платит за вызов
     * на каждом цикле обнаружения изменений.
     *
     * @param type Значение типа позиции.
     * @returns Переведённая подпись.
     */
    protected readonly itemTypeLabel = (type: MailItemType): string =>
        this.i18n.translate(ITEM_TYPE_LABEL_KEYS[type]);

    /**
     * Текст адресата для шага подтверждения и для состояния «выбрано».
     */
    protected readonly recipientText = computed(() =>
        this.broadcast()
            ? this.i18n.translate('mail.compose.confirmBroadcast')
            : (this.selectedPlayer()?.playerName ?? this.i18n.translate('mail.compose.recipientEmpty'))
    );

    public constructor() {
        // Правка любого поля делает письмо другим: старый ключ идемпотентности
        // вернул бы письмо с прежним содержимым вместо нового.
        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.idempotencyKey.set(null);
        });
    }

    /**
     * Выбирает получателя из результатов поиска.
     *
     * @param user Пользователь из выдачи `GET /users/search`.
     */
    protected selectPlayer(user: ISearchedUser): void {
        this.selectedPlayer.set({ playerId: user.user_id, playerName: user.user_game_name });
        this.searchControl.setValue('', { emitEvent: false });
        this.recipientMissing.set(false);
    }

    /**
     * Сбрасывает выбранного получателя и возвращает поле поиска.
     */
    protected clearPlayer(): void {
        this.selectedPlayer.set(null);
    }

    /**
     * Переключает «всем игрокам».
     *
     * Рассылка отменяет выбранного игрока: два адресата в одном письме
     * невозможны, и оставленный в форме игрок путал бы шаг подтверждения.
     *
     * @param event Событие изменения флажка.
     */
    protected toggleBroadcast(event: Event): void {
        const input = event.target;

        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        this.broadcast.set(input.checked);

        if (input.checked) {
            this.selectedPlayer.set(null);
            this.recipientMissing.set(false);
        }
    }

    /**
     * Добавляет строку вложения-позиции.
     */
    protected addItem(): void {
        this.itemRows.push(createItemRow());
    }

    /**
     * Добавляет строку вложения-осколков.
     */
    protected addCoins(): void {
        this.coinsRows.push(createCoinsRow());
    }

    /**
     * Удаляет строку вложения-позиции.
     *
     * @param index Позиция строки в списке.
     */
    protected removeItem(index: number): void {
        this.itemRows.removeAt(index);
    }

    /**
     * Удаляет строку вложения-осколков.
     *
     * @param index Позиция строки в списке.
     */
    protected removeCoins(index: number): void {
        this.coinsRows.removeAt(index);
    }

    /**
     * Показывает `mail_id` отправленного письма и очищает форму.
     */
    protected startAnother(): void {
        this.sentMailId.set(null);
    }

    /**
     * Проверяет форму, показывает шаг подтверждения и отправляет письмо.
     *
     * Повторное нажатие во время запроса игнорируется: ключ идемпотентности
     * один на попытку, но второй запрос всё равно был бы лишним.
     */
    protected submit(): void {
        if (this.submitting()) {
            return;
        }

        this.fieldError.set(null);
        this.form.markAllAsTouched();
        this.itemRows.markAllAsTouched();
        this.coinsRows.markAllAsTouched();

        const recipientChosen = this.broadcast() || this.selectedPlayer() !== null;
        this.recipientMissing.set(!recipientChosen);

        if (!recipientChosen || this.form.invalid || this.itemRows.invalid || this.coinsRows.invalid) {
            return;
        }

        this.dialogs
            .open<boolean>(new PolymorpheusComponent(ConfirmMailSendComponent), {
                size: 'auto',
                closeable: false,
                data: this.confirmData(),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.send();
                }
            });
    }

    /**
     * Повторяет отправку после ошибки сервера.
     *
     * Ключ идемпотентности сохраняется, поэтому если первый запрос всё же
     * дошёл, сервер вернёт созданное письмо, а не создаст второе.
     */
    protected retry(): void {
        if (this.submitting()) {
            return;
        }

        this.fieldError.set(null);
        this.send();
    }

    /**
     * Отправляет письмо с текущим ключом идемпотентности.
     */
    private send(): void {
        const key = this.idempotencyKey() ?? crypto.randomUUID();

        this.idempotencyKey.set(key);
        this.submitting.set(true);

        this.mailApi
            .compose$(buildComposeMailRequest(this.draft(key)))
            .pipe(
                finalize(() => this.submitting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => this.handleSent(response.mail_id),
                error: (error: unknown) => this.handleSendError(error),
            });
    }

    /**
     * Показывает результат отправки и очищает форму.
     *
     * @param mailId Идентификатор созданного письма.
     */
    private handleSent(mailId: string): void {
        this.sentMailId.set(mailId);
        this.idempotencyKey.set(null);
        this.reset();
        this.sent.emit(mailId);
    }

    /**
     * Объясняет ошибку отправки в форме.
     *
     * @param error Ошибка запроса.
     */
    private handleSendError(error: unknown): void {
        const result = describeComposeMailError(error, this.i18n);

        this.fieldError.set(result.text);
        this.denied.set(result.denied);
    }

    /**
     * Возвращает форму в исходное состояние.
     */
    private reset(): void {
        this.form.reset();
        this.broadcast.set(false);
        this.selectedPlayer.set(null);
        this.searchControl.setValue('', { emitEvent: false });
        this.itemRows.clear();
        this.coinsRows.clear();
        this.recipientMissing.set(false);
    }

    /**
     * Собирает состояние формы для тела запроса.
     *
     * @param idempotencyKey Ключ идемпотентности текущей попытки.
     * @returns Черновик письма.
     */
    private draft(idempotencyKey: string | null): ComposeMailDraft {
        return {
            userId: this.selectedPlayer()?.playerId ?? null,
            broadcast: this.broadcast(),
            title: this.form.controls.title.value,
            body: this.form.controls.body.value,
            attachments: [...this.itemAttachments(), ...this.coinsAttachments()],
            expiresAt: this.form.controls.expiresAt.value,
            idempotencyKey,
        };
    }

    /**
     * Данные шага подтверждения: то, что администратор проверит перед отправкой.
     *
     * @returns Адресат, заголовок, текст, подписи вложений и срок жизни.
     */
    private confirmData(): IConfirmMailSendData {
        return {
            recipient: this.recipientText(),
            title: this.form.controls.title.value.trim(),
            body: this.form.controls.body.value.trim(),
            attachments: [...this.itemTexts(), ...this.coinsTexts()],
            expiresAt: this.form.controls.expiresAt.value.trim()
                ? this.i18n.translate('mail.compose.confirmExpires', {
                      date: this.form.controls.expiresAt.value,
                  })
                : this.i18n.translate('mail.compose.confirmNoExpiry'),
        };
    }

    /**
     * Вложения-позиции в форме черновика.
     *
     * @returns Позиции в порядке строк.
     */
    private itemAttachments(): MailAttachment[] {
        return this.itemRows.controls.map((row) => ({
            kind: 'item',
            gameCode: row.controls.gameCode.value,
            quantity: row.controls.quantity.value,
            itemType: row.controls.itemType.value,
            amount: '',
        }));
    }

    /**
     * Вложения-осколки в форме черновика.
     *
     * @returns Осколки в порядке строк.
     */
    private coinsAttachments(): MailAttachment[] {
        return this.coinsRows.controls.map((row) => ({
            kind: 'coins',
            gameCode: '',
            quantity: '',
            itemType: 'item',
            amount: row.controls.amount.value,
        }));
    }

    /**
     * Подписи вложений-позиций для шага подтверждения.
     *
     * @returns Строки вида «game:bread × 5».
     */
    private itemTexts(): string[] {
        return this.itemRows.controls.map((row) =>
            this.i18n.translate('mail.compose.itemText', {
                code: row.controls.gameCode.value.trim(),
                quantity: row.controls.quantity.value,
            })
        );
    }

    /**
     * Подписи вложений-осколков для шага подтверждения.
     *
     * @returns Строки вида «3000 осколков».
     */
    private coinsTexts(): string[] {
        return this.coinsRows.controls.map((row) =>
            this.i18n.translate('mail.compose.coinsText', { amount: row.controls.amount.value.trim() })
        );
    }
}

/**
 * Создаёт строку формы вложения-позиции.
 *
 * @returns Пустая строка с проверками кода, количества и типа.
 */
function createItemRow(): FormGroup<MailItemForm> {
    return new FormGroup<MailItemForm>({
        gameCode: new FormControl<string>('', { nonNullable: true, validators: [nonBlankValidator] }),
        quantity: new FormControl<string>('1', {
            nonNullable: true,
            validators: [Validators.pattern(QUANTITY_PATTERN)],
        }),
        itemType: new FormControl<MailItemType>('item', { nonNullable: true }),
    });
}

/**
 * Создаёт строку формы вложения-осколков.
 *
 * @returns Пустая строка с проверкой суммы.
 */
function createCoinsRow(): FormGroup<MailCoinsForm> {
    return new FormGroup<MailCoinsForm>({
        amount: new FormControl<string>('', {
            nonNullable: true,
            validators: [Validators.pattern(AMOUNT_PATTERN)],
        }),
    });
}

/**
 * Тип формы одной строки вложения-позиции.
 */
interface MailItemForm {
    gameCode: FormControl<string>;
    quantity: FormControl<string>;
    itemType: FormControl<MailItemType>;
}

/**
 * Тип формы одной строки вложения-осколков.
 */
interface MailCoinsForm {
    amount: FormControl<string>;
}