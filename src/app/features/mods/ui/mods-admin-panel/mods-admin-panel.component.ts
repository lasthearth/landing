import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TuiAlertService, TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import {
    ModAudience,
    ModLookup,
    ModRelease,
    ServerMod,
    ServerModApiService,
    UpdateModRequest,
    gameBranch,
    modCompatibility,
} from '@entities/server-mod';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { AdminListSkeletonComponent } from '@shared/ui/skeletons';
import { filter, finalize, switchMap } from 'rxjs';

/**
 * Аудитории в порядке выбора.
 */
const AUDIENCES: readonly ModAudience[] = ['MOD_AUDIENCE_REQUIRED', 'MOD_AUDIENCE_OPTIONAL', 'MOD_AUDIENCE_HIDDEN'];

/**
 * Ключ перевода аудитории.
 */
const AUDIENCE_KEYS: Record<ModAudience, string> = {
    MOD_AUDIENCE_REQUIRED: 'mods.audience.required',
    MOD_AUDIENCE_OPTIONAL: 'mods.audience.optional',
    MOD_AUDIENCE_HIDDEN: 'mods.audience.hidden',
};

/**
 * Пометка модератора не длиннее этого (так проверяет бэкенд).
 */
const NOTE_MAX = 160;

/**
 * Вкладка «Моды» в админке.
 *
 * Модератор вставляет ссылку на мод с ModDB — бэкенд находит мод и его версии.
 * Остаётся выбрать версию (рядом отмечено, подходит ли она к игре сервера),
 * кому мод нужен и пометку по-русски. В списке у каждого мода меняются версия,
 * аудитория, пометка и порядок; «Проверить обновления» перечитывает ModDB.
 *
 * Список виден игрокам на `/mods` сразу после изменения.
 */
@Component({
    standalone: true,
    selector: 'app-mods-admin-panel',
    imports: [
        FormsModule,
        TuiIcon,
        TranslatePipe,
        LHInputComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        AdminListSkeletonComponent,
    ],
    templateUrl: './mods-admin-panel.component.html',
    styleUrl: './mods-admin-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsAdminPanelComponent implements OnInit {
    private readonly api = inject(ServerModApiService);
    private readonly i18n = inject(I18nService);
    private readonly alerts = inject(TuiAlertService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Версия игры сервера.
     */
    protected readonly gameVersion = environment.gameVersion;

    /**
     * Аудитории для выбора.
     */
    protected readonly audiences: ModAudience[] = [...AUDIENCES];

    /**
     * Предел длины пометки.
     */
    protected readonly noteMax = NOTE_MAX;

    /**
     * Моды; `null` — ещё грузятся.
     */
    protected readonly mods = signal<ServerMod[] | null>(null);

    /**
     * Список не загрузился.
     */
    protected readonly loadFailed = signal(false);

    /**
     * Строка поиска мода на ModDB.
     */
    protected readonly link = signal('');

    /**
     * Идёт поиск на ModDB.
     */
    protected readonly looking = signal(false);

    /**
     * Ключ перевода ошибки поиска или добавления.
     */
    protected readonly formError = signal('');

    /**
     * Найденный мод — ещё не добавлен.
     */
    protected readonly found = signal<ModLookup | null>(null);

    /**
     * Выбранная версия найденного мода.
     */
    protected readonly draftRelease = signal<ModRelease | null>(null);

    /**
     * Аудитория найденного мода.
     */
    protected readonly draftAudience = signal<ModAudience>('MOD_AUDIENCE_REQUIRED');

    /**
     * Пометка найденного мода.
     */
    protected readonly draftNote = signal('');

    /**
     * Идёт добавление.
     */
    protected readonly adding = signal(false);

    /**
     * Идёт проверка обновлений; после неё кнопка говорит «Проверено».
     */
    protected readonly refreshState = signal<'idle' | 'busy' | 'done'>('idle');

    /**
     * Моды, у которых сейчас сохраняется изменение.
     */
    protected readonly busy = signal<ReadonlySet<string>>(new Set());

    /**
     * Мод, у которого открыта правка пометки, и черновик пометки.
     */
    protected readonly editingNote = signal<{ id: string; text: string } | null>(null);

    /**
     * Ветка версии игры (1.22) — для подписи «для 1.22.x».
     */
    private readonly branch = gameBranch(environment.gameVersion);

    /**
     * Подпись версии в выпадающем списке: с отметкой совместимости.
     *
     * Стрелочная функция: `lh-input` вызывает её без контекста.
     *
     * @param release Версия мода.
     * @returns Подпись.
     */
    protected readonly releaseLabel = (release: ModRelease): string => {
        const compatibility = modCompatibility(release, this.gameVersion);

        if (compatibility === 'exact') {
            return this.i18n.translate('mods.admin.releaseExact', { version: release.version, game: this.gameVersion });
        }

        const branches = [...new Set(release.gameVersions.map(gameBranch))];

        if (!branches.length) {
            return this.i18n.translate('mods.admin.releaseUnknown', { version: release.version });
        }

        const games = branches
            .slice(0, 3)
            .map((branch) => `${branch}.x`)
            .join(', ');
        const mark = compatibility === 'minor' ? ' ✓' : '';
        return this.i18n.translate('mods.admin.releaseOther', { version: release.version, games }) + mark;
    };

    /**
     * Подпись аудитории в выпадающем списке.
     *
     * @param audience Аудитория.
     * @returns Подпись.
     */
    protected readonly audienceLabel = (audience: ModAudience): string => this.i18n.translate(AUDIENCE_KEYS[audience]);

    /**
     * Найденный мод уже есть в списке.
     */
    protected readonly foundExists = computed(() => {
        const found = this.found();
        return !!found && !!this.mods()?.some((mod) => mod.id === found.mod.id);
    });

    public ngOnInit(): void {
        this.load();
    }

    /**
     * Загружает список.
     */
    protected load(): void {
        this.loadFailed.set(false);
        this.mods.set(null);
        this.api
            .listAdmin()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (mods) => this.mods.set(mods),
                error: () => this.loadFailed.set(true),
            });
    }

    /**
     * Ищет мод на ModDB по ссылке или идентификатору.
     */
    protected find(): void {
        const query = this.link().trim();

        if (!query || this.looking()) {
            return;
        }

        this.looking.set(true);
        this.formError.set('');
        this.found.set(null);

        this.api
            .lookup(query)
            .pipe(
                finalize(() => this.looking.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (found) => {
                    if (!found) {
                        this.formError.set('mods.admin.errors.notFound');
                        return;
                    }

                    this.found.set(found);
                    this.draftRelease.set(this.bestRelease(found.releases));
                    this.draftAudience.set(
                        found.mod.side === 'MOD_SIDE_SERVER' ? 'MOD_AUDIENCE_HIDDEN' : 'MOD_AUDIENCE_REQUIRED'
                    );
                    this.draftNote.set('');
                },
                error: (error: unknown) => this.formError.set(this.errorKey(error)),
            });
    }

    /**
     * Добавляет найденный мод первым в список.
     */
    protected add(): void {
        const found = this.found();
        const release = this.draftRelease();

        if (!found || !release || this.adding()) {
            return;
        }

        this.adding.set(true);
        this.formError.set('');

        this.api
            .add({
                query: found.mod.id,
                version: release.version,
                audience: this.draftAudience(),
                note: this.draftNote().trim(),
            })
            .pipe(
                finalize(() => this.adding.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (mod) => {
                    if (mod) {
                        this.mods.update((list) => [mod, ...(list ?? []).filter((item) => item.id !== mod.id)]);
                    }

                    this.cancel();
                    this.notify('mods.admin.saved');
                },
                error: (error: unknown) => this.formError.set(this.errorKey(error)),
            });
    }

    /**
     * Закрывает найденный мод и очищает поле.
     */
    protected cancel(): void {
        this.found.set(null);
        this.link.set('');
        this.formError.set('');
    }

    /**
     * Меняет версию мода.
     *
     * @param mod Мод.
     * @param release Новая версия.
     */
    protected setRelease(mod: ServerMod, release: ModRelease | null): void {
        if (release && release.version !== mod.release?.version) {
            this.save(mod, { version: release.version });
        }
    }

    /**
     * Переводит мод на последнюю версию с ModDB.
     *
     * @param mod Мод.
     */
    protected applyUpdate(mod: ServerMod): void {
        if (mod.latestVersion) {
            this.save(mod, { version: mod.latestVersion });
        }
    }

    /**
     * Меняет аудиторию мода.
     *
     * @param mod Мод.
     * @param audience Новая аудитория.
     */
    protected setAudience(mod: ServerMod, audience: ModAudience | null): void {
        if (audience && audience !== mod.audience) {
            this.save(mod, { audience });
        }
    }

    /**
     * Открывает правку пометки.
     *
     * @param mod Мод.
     */
    protected editNote(mod: ServerMod): void {
        this.editingNote.set({ id: mod.id, text: mod.note });
    }

    /**
     * Обновляет черновик пометки.
     *
     * @param text Текст.
     */
    protected setNoteDraft(text: string): void {
        this.editingNote.update((draft) => (draft ? { ...draft, text } : draft));
    }

    /**
     * Сохраняет пометку.
     *
     * @param mod Мод.
     */
    protected saveNote(mod: ServerMod): void {
        const draft = this.editingNote();

        if (!draft || draft.id !== mod.id) {
            return;
        }

        this.editingNote.set(null);
        const note = draft.text.trim();

        if (note !== mod.note) {
            this.save(mod, { note });
        }
    }

    /**
     * Сдвигает мод на одну позицию.
     *
     * Порядок меняется сразу, при ошибке возвращается прежний.
     *
     * @param index Позиция мода.
     * @param step `-1` — выше, `1` — ниже.
     */
    protected move(index: number, step: -1 | 1): void {
        const before = this.mods();
        const target = index + step;

        if (!before || target < 0 || target >= before.length) {
            return;
        }

        const next = [...before];
        [next[index], next[target]] = [next[target], next[index]];
        this.mods.set(next);

        this.api
            .reorder(next.map((mod) => mod.id))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (mods) => {
                    if (mods.length) {
                        this.mods.set(mods);
                    }
                },
                error: () => this.mods.set(before),
            });
    }

    /**
     * Убирает мод после подтверждения.
     *
     * @param mod Мод.
     */
    protected remove(mod: ServerMod): void {
        this.confirm
            .open({
                title: this.i18n.translate('mods.admin.remove', { name: mod.name }),
                text: this.i18n.translate('mods.admin.removeConfirm', { name: mod.name }),
            })
            .pipe(
                filter(Boolean),
                switchMap(() => {
                    this.setBusy(mod.id, true);
                    return this.api.delete(mod.id).pipe(finalize(() => this.setBusy(mod.id, false)));
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.mods.update((list) => (list ?? []).filter((item) => item.id !== mod.id)));
    }

    /**
     * Перечитывает моды с ModDB: новые версии, названия, логотипы.
     */
    protected refresh(): void {
        if (this.refreshState() === 'busy') {
            return;
        }

        this.refreshState.set('busy');
        this.api
            .refresh()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (mods) => {
                    this.mods.set(mods);
                    this.refreshState.set('done');
                },
                error: () => this.refreshState.set('idle'),
            });
    }

    /**
     * Версии для выпадающего списка мода: выбранная всегда среди них.
     *
     * @param mod Мод.
     * @returns Версии от новой к старой.
     */
    protected releasesOf(mod: ServerMod): ModRelease[] {
        const current = mod.release;
        return current && !mod.releases.some((release) => release.version === current.version)
            ? [...mod.releases, current]
            : mod.releases;
    }

    /**
     * Выбранная версия мода — тот же объект, что в списке версий.
     *
     * @param mod Мод.
     * @returns Версия или `null`.
     */
    protected currentRelease(mod: ServerMod): ModRelease | null {
        return this.releasesOf(mod).find((release) => release.version === mod.release?.version) ?? null;
    }

    /**
     * Сохраняется ли изменение мода.
     *
     * @param id Идентификатор мода.
     * @returns `true`, пока ждём ответа.
     */
    protected isBusy(id: string): boolean {
        return this.busy().has(id);
    }

    /**
     * Сохраняет изменение мода и подставляет ответ сервера в список.
     *
     * @param mod Мод.
     * @param request Изменённые поля.
     */
    private save(mod: ServerMod, request: UpdateModRequest): void {
        this.setBusy(mod.id, true);
        this.api
            .update(mod.id, request)
            .pipe(
                finalize(() => this.setBusy(mod.id, false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((updated) => {
                if (updated) {
                    // Ответ PATCH без снимка версий: сохраняем тот, что был.
                    const merged = updated.releases.length ? updated : { ...updated, releases: mod.releases };
                    this.mods.update((list) => (list ?? []).map((item) => (item.id === mod.id ? merged : item)));
                }
            });
    }

    /**
     * Отмечает мод занятым или свободным.
     *
     * @param id Идентификатор мода.
     * @param value `true` — занят.
     */
    private setBusy(id: string, value: boolean): void {
        this.busy.update((set) => {
            const next = new Set(set);
            if (value) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }

    /**
     * Версия по умолчанию: самая новая из подходящих к игре сервера, иначе самая новая.
     *
     * @param releases Версии от новой к старой.
     * @returns Версия или `null`.
     */
    private bestRelease(releases: ModRelease[]): ModRelease | null {
        return (
            releases.find((release) => modCompatibility(release, this.gameVersion) === 'exact') ??
            releases.find((release) => modCompatibility(release, this.gameVersion) === 'minor') ??
            releases[0] ??
            null
        );
    }

    /**
     * Ключ перевода ошибки по ответу API.
     *
     * @param error Ошибка запроса.
     * @returns Ключ перевода.
     */
    private errorKey(error: unknown): string {
        const status = error instanceof HttpErrorResponse ? error.status : 0;

        switch (status) {
            case 400:
                return 'mods.admin.errors.invalid';
            case 404:
                return 'mods.admin.errors.notFound';
            case 409:
                return 'mods.admin.errors.exists';
            case 502:
            case 503:
            case 504:
                return 'mods.admin.errors.unavailable';
            default:
                return 'mods.admin.errors.generic';
        }
    }

    /**
     * Короткое уведомление об успехе.
     *
     * @param key Ключ перевода.
     */
    private notify(key: string): void {
        this.alerts.open(this.i18n.translate(key), { appearance: 'positive' }).subscribe();
    }

    /**
     * Ветка версии игры для шаблона.
     *
     * @returns Например, `1.22`.
     */
    protected get gameBranch(): string {
        return this.branch;
    }
}
