import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { finalize } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { PlayersApiService } from '@entities/user';
import { GrpcCode } from '@shared/lib/grpc-code.constant';
import { grpcStatusCode } from '@shared/lib/grpc-status-code.function';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ABOUT_MAX_LINES, ABOUT_MAX_SYMBOLS, ABOUT_WARN_SYMBOLS } from '../../config/about-limits.constant';
import { aboutLength } from '../../lib/about-length.function';
import { PlayerProfile } from '../../model/player-profile';

/**
 * Сколько показывать «Сохранено» после удачной записи.
 */
const SAVED_NOTICE_MS = 3000;

/**
 * Блок «О себе» на странице игрока.
 *
 * Владелец правит текст прямо здесь, модератор может скрыть чужое описание
 * с обязательной причиной. Серверный текст выводится только интерполяцией,
 * а счётчик и лимиты считаются в рунах — как на сервере.
 */
@Component({
    selector: 'app-player-about',
    imports: [TranslatePipe, TuiIcon, RelativeTimeComponent],
    templateUrl: './player-about.component.html',
    styleUrl: './player-about.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerAboutComponent {
    private readonly api = inject(PlayersApiService);

    /**
     * Профиль игрока.
     */
    public readonly profile = input.required<PlayerProfile>();

    /**
     * Профиль открыт его владельцем.
     */
    public readonly isOwner = input(false);

    /**
     * У текущего пользователя есть право скрыть чужое описание.
     */
    public readonly canModerate = input(false);

    /**
     * Новый текст описания; пусто — описание удалили.
     */
    public readonly changed = output<string>();

    /**
     * Открыто поле правки.
     */
    protected readonly editing = signal(false);

    /**
     * Текст в поле правки.
     */
    protected readonly draft = signal('');

    /**
     * Идёт запрос на сервер.
     */
    protected readonly busy = signal(false);

    /**
     * Ключ ошибки последнего действия.
     */
    protected readonly errorKey = signal<string | null>(null);

    /**
     * Показать «Сохранено».
     */
    protected readonly saved = signal(false);

    /**
     * Описание скрыл модератор; до перезагрузки блок не показываем.
     */
    protected readonly hidden = signal(false);

    /**
     * Открыто поле причины скрытия.
     */
    protected readonly hiding = signal(false);

    /**
     * Причина скрытия.
     */
    protected readonly reason = signal('');

    /**
     * Текст, сохранённый на сервере в этой сессии: профиль на странице
     * обновляется сигналом, а не перезагрузкой.
     */
    private readonly savedText = signal<string | null>(null);

    /**
     * Таймер показа «Сохранено».
     */
    private savedTimer?: ReturnType<typeof setTimeout>;

    /**
     * Текущий текст описания.
     */
    protected readonly text = computed(() => this.savedText() ?? this.profile().about);

    /**
     * В описании есть что показывать.
     */
    protected readonly hasText = computed(() => this.text().trim().length > 0);

    /**
     * Длина черновика в символах и строках.
     */
    protected readonly length = computed(() => aboutLength(this.draft()));

    /**
     * Черновик длиннее лимита.
     */
    protected readonly tooLong = computed(() => this.length().symbols > ABOUT_MAX_SYMBOLS);

    /**
     * В черновике больше строк, чем допускает лимит.
     */
    protected readonly tooManyLines = computed(() => this.length().lines > ABOUT_MAX_LINES);

    /**
     * Сколько символов нужно убрать, чтобы уложиться в лимит.
     */
    protected readonly excess = computed(() => Math.max(0, this.length().symbols - ABOUT_MAX_SYMBOLS));

    /**
     * Тон счётчика: обычный, предупреждение, ошибка.
     */
    protected readonly counterTone = computed(() => {
        const symbols = this.length().symbols;

        if (symbols > ABOUT_MAX_SYMBOLS) {
            return 'danger';
        }

        return symbols > ABOUT_WARN_SYMBOLS ? 'warning' : 'normal';
    });

    /**
     * Сохранить можно: запрос не идёт, лимиты соблюдены.
     */
    protected readonly canSave = computed(() => !this.busy() && !this.tooLong() && !this.tooManyLines());

    /**
     * Скрыть можно: запрос не идёт и причина заполнена.
     */
    protected readonly canHide = computed(() => !this.busy() && this.reason().trim().length > 0);

    public constructor() {
        // Другой игрок — правка и «Сохранено» прежнего к нему не относятся.
        effect(() => {
            this.profile().userId;
            untracked(() => this.reset());
        });
    }

    /**
     * Открывает правку с текущим текстом.
     */
    protected startEdit(): void {
        this.draft.set(this.text());
        this.errorKey.set(null);
        this.editing.set(true);
    }

    /**
     * Закрывает правку без сохранения.
     */
    protected cancel(): void {
        this.editing.set(false);
        this.errorKey.set(null);
    }

    /**
     * Запоминает введённый текст.
     *
     * @param value Текст из поля.
     */
    protected onInput(value: string): void {
        this.draft.set(value);
        this.errorKey.set(null);
    }

    /**
     * Сохраняет черновик.
     */
    protected save(): void {
        if (this.canSave()) {
            this.persist(this.draft());
        }
    }

    /**
     * Удаляет описание.
     */
    protected remove(): void {
        if (!this.busy()) {
            this.persist('');
        }
    }

    /**
     * Открывает или закрывает поле причины скрытия.
     */
    protected toggleHide(): void {
        this.hiding.update((open) => !open);
        this.reason.set('');
        this.errorKey.set(null);
    }

    /**
     * Запоминает причину скрытия.
     *
     * @param value Текст причины.
     */
    protected onReason(value: string): void {
        this.reason.set(value);
    }

    /**
     * Скрывает чужое описание с причиной.
     */
    protected hide(): void {
        if (!this.canHide()) {
            return;
        }

        this.busy.set(true);
        this.errorKey.set(null);

        this.api
            .hideAbout$(this.profile().userId, this.reason().trim())
            .pipe(finalize(() => this.busy.set(false)))
            .subscribe({
                next: () => {
                    this.hiding.set(false);
                    this.hidden.set(true);
                },
                error: () => this.errorKey.set('player.about.errors.failed'),
            });
    }

    /**
     * Отправляет новое описание на сервер.
     *
     * @param about Текст описания; пусто — удаление.
     */
    private persist(about: string): void {
        this.busy.set(true);
        this.errorKey.set(null);

        this.api
            .updateMyAbout$(about)
            .pipe(finalize(() => this.busy.set(false)))
            .subscribe({
                next: (player) => this.applySaved(player?.about ?? about),
                error: (error: unknown) => this.errorKey.set(this.errorKeyOf(error)),
            });
    }

    /**
     * Показывает сохранённый текст и «Сохранено» на несколько секунд.
     *
     * @param about Текст, который принял сервер.
     */
    private applySaved(about: string): void {
        this.savedText.set(about);
        this.editing.set(false);
        this.saved.set(true);
        this.changed.emit(about);

        if (this.savedTimer) {
            clearTimeout(this.savedTimer);
        }

        this.savedTimer = setTimeout(() => this.saved.set(false), SAVED_NOTICE_MS);
    }

    /**
     * Возвращает состояние блока к исходному.
     */
    private reset(): void {
        this.editing.set(false);
        this.hiding.set(false);
        this.hidden.set(false);
        this.saved.set(false);
        this.savedText.set(null);
        this.reason.set('');
        this.errorKey.set(null);
    }

    /**
     * Подбирает сообщение об ошибке по коду сервера.
     *
     * @param error Ошибка запроса.
     * @returns Ключ перевода.
     */
    private errorKeyOf(error: unknown): string {
        const code = grpcStatusCode(error);

        if (code === GrpcCode.invalidArgument) {
            return 'player.about.errors.invalid';
        }

        if (code === GrpcCode.failedPrecondition) {
            return 'player.about.errors.notVerified';
        }

        return 'player.about.errors.failed';
    }
}
