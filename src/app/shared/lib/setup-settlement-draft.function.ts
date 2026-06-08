import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';

/**
 * Настраивает автосохранение черновика формы селения в localStorage.
 * Загружает существующий черновик при открытии, сохраняет изменения с debounce,
 * игнорируя файловые поля (File нельзя сериализовать).
 *
 * @param form Форма для отслеживания.
 * @param fileFields Ключи файловых полей, которые нужно исключить из черновика.
 * @param draftKey Ключ в localStorage.
 * @param destroyRef Ссылка для автоотписки.
 * @param localStorageService Сервис локального хранилища.
 */
export function setupSettlementDraft(
    form: FormGroup,
    fileFields: readonly string[],
    draftKey: string,
    destroyRef: DestroyRef,
    localStorageService: LocalStorageService
): void {
    const draft = localStorageService.getItem<Record<string, unknown>>(draftKey);

    if (draft) {
        const patch: Record<string, unknown> = {};

        Object.keys(draft).forEach((key) => {
            if (!fileFields.includes(key)) {
                patch[key] = draft[key];
            }
        });

        form.patchValue(patch, { emitEvent: false });
    }

    form.valueChanges
        .pipe(debounceTime(300), takeUntilDestroyed(destroyRef))
        .subscribe((value) => {
            const draftValue: Record<string, unknown> = {};

            Object.keys(value).forEach((key) => {
                if (!fileFields.includes(key)) {
                    draftValue[key] = value[key];
                }
            });

            localStorageService.setItem(draftKey, draftValue);
        });
}

/**
 * Очищает черновик селения из localStorage.
 *
 * @param draftKey Ключ в localStorage.
 * @param localStorageService Сервис локального хранилища.
 */
export function clearSettlementDraft(
    draftKey: string,
    localStorageService: LocalStorageService
): void {
    localStorageService.removeItem(draftKey);
}
