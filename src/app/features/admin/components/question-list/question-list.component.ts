import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, Observable, startWith, Subject, switchMap } from 'rxjs';
import { RuleQuestionApiService, mapDtoToRuleQuestion, RuleQuestion } from '@entities/rule-question';
import { UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { I18nService, TranslatePipe } from '@core/i18n';

/**
 * Компонент списка вопросов правил для администратора.
 *
 * Загружает вопросы из API, отображает их списком
 * и позволяет удалять вопросы.
 */
@Component({
    standalone: true,
    selector: 'app-question-list',
    imports: [TranslatePipe],
    templateUrl: './question-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionListComponent {
    /**
     * API-сервис для работы с вопросами правил.
     */
    private readonly api = inject(RuleQuestionApiService);

    /**
     * Сервис пользователя для получения имён создателей.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка уничтожения компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Subject для принудительного обновления списка.
     */
    private readonly refresh$ = new Subject<void>();

    /**
     * Внешний триггер обновления списка (например, после создания нового вопроса).
     */
    readonly refreshTrigger = input<Observable<void> | null>(null);

    /**
     * Поток вопросов из API.
     */
    readonly questions$ = this.refresh$.pipe(
        startWith(null),
        switchMap(() => this.api.getList()),
        map((list) => list.map(mapDtoToRuleQuestion))
    );

    /**
     * Сигнал с массивом вопросов.
     */
    readonly questions = toSignal(this.questions$, { initialValue: [] as RuleQuestion[] });

    /**
     * Сигнал идентификатора удаляемого вопроса.
     */
    readonly deletingId = signal<string | null>(null);

    /**
     * Карта имён пользователей по их идентификаторам.
     */
    readonly userNames = signal<Record<string, string>>({});

    /**
     * Инициализирует подписки компонента.
     */
    constructor() {
        const trigger = this.refreshTrigger();
        if (trigger) {
            trigger.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
        }

        effect(() => {
            const questions = this.questions();
            const uniqueIds = [
                ...new Set(questions.map((q) => q.createdBy).filter((id): id is string => !!id)),
            ];

            uniqueIds.forEach((id) => {
                if (!this.userNames()[id]) {
                    this.userService
                        .getPlayer$(id)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe((player) => {
                            this.userNames.update((names) => ({
                                ...names,
                                [id]: player.user_game_name,
                            }));
                        });
                }
            });
        });
    }

    /**
     * Удаляет вопрос по идентификатору.
     *
     * Перед удалением показывает диалог подтверждения.
     *
     * @param id Идентификатор вопроса.
     */
    remove(id: string): void {
        this.confirmDialog
            .open({
                title: this.i18n.translate('admin.questions.deleteTitle'),
                text: this.i18n.translate('admin.questions.deleteText'),
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.deletingId.set(id);
                this.api
                    .delete(id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.refresh());
            });
    }

    /**
     * Принудительно обновляет список вопросов.
     */
    refresh(): void {
        this.deletingId.set(null);
        this.refresh$.next();
    }
}
