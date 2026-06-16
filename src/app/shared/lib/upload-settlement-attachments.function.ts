import { FormGroup } from '@angular/forms';
import { Observable, map, of } from 'rxjs';
import { MediaService } from '@entities/media';

/**
 * Загружает файлы формы поселения через MediaService и формирует attachments.
 *
 * @param fileFields Массив ключей файлов формы.
 * @param form FormGroup с файловыми полями.
 * @param mediaService Сервис загрузки медиафайлов.
 * @param getLabelForKey Функция, возвращающая описание для ключа файла.
 * @returns Observable с массивом attachments { url, description }.
 */
export function uploadSettlementAttachments<T extends string>(
    fileFields: T[],
    form: FormGroup,
    mediaService: MediaService,
    getLabelForKey: (key: T) => string
): Observable<Array<{ url: string; description: string }>> {
    const values = form.value;

    const fileEntries = fileFields
        .map((key) => ({ key, file: values[key] }))
        .filter((entry): entry is { key: T; file: File } => entry.file instanceof File);

    if (fileEntries.length === 0) {
        return of([]);
    }

    return mediaService
        .uploadFiles$(fileEntries.map((entry) => entry.file), 'UPLOAD_PURPOSE_SETTLEMENT')
        .pipe(
            map((urls) => {
                const urlMap = new Map(fileEntries.map((entry, i) => [entry.key, urls[i]]));

                return fileFields.map((key) => ({
                    url: urlMap.get(key) ?? '',
                    description: getLabelForKey(key),
                }));
            })
        );
}
