import { FormGroup } from '@angular/forms';
import { Subject, switchMap, Observable } from 'rxjs';
import { processFileUpload } from './process-file-upload.function';

/**
 * Создаёт объект статусов для файлов формы.
 * Позволяет отслеживать, какие файлы загружаются, успешно загружены или произошла ошибка.
 *
 * @param fileFields - массив ключей файлов (например, fileFieldsVillage)
 * @param form - FormGroup с полями файлов
 * @returns объект с тремя ключами:
 *  - loading: Record<string, Subject<File | null>> - эмитит, когда файл в процессе загрузки
 *  - failed: Record<string, Subject<File | null>> - эмитит, если загрузка файла не удалась
 *  - loaded: Record<string, Observable<File | null>> - эмитит успешный результат загрузки файла
 */
export function getFileStatuses(
    fileFields: string[],
    form: FormGroup
): {
    loading: Record<string, Subject<File | null>>;
    failed: Record<string, Subject<File | null>>;
    loaded: Record<string, Observable<File | null>>;
} {
    return fileFields.reduce(
        (acc, key) => {
            acc.loading[key] = new Subject<File | null>();
            acc.failed[key] = new Subject<File | null>();
            acc.loaded[key] = form.controls[key].valueChanges.pipe(
                switchMap((file) => processFileUpload(file, acc.loading[key], acc.failed[key]))
            );
            return acc;
        },
        {
            loading: {} as Record<string, Subject<File | null>>,
            failed: {} as Record<string, Subject<File | null>>,
            loaded: {} as Record<string, Observable<File | null>>,
        }
    );
}
