import { Subject, Observable, of, timer, map, finalize } from 'rxjs';

/**
 * Обрабатывает "загрузку" файла с имитацией асинхронного процесса.
 * Используется для UI статусов (loading, failed) в форме.
 *
 * @param file - файл для загрузки
 * @param loading$ - Subject, который эмитит файл, когда он в процессе загрузки
 * @param failed$ - Subject, который эмитит файл, если загрузка не удалась
 * @returns Observable<File | null> - эмитит файл после "загрузки" или null
 */
export function processFileUpload(
    file: File | null,
    loading$: Subject<File | null>,
    failed$: Subject<File | null>
): Observable<File | null> {
    failed$.next(null);

    if (!file) {
        return of(null);
    }

    const maxSizeBytes = 10 * 1024 * 1024;

    if (file.size && file.size > maxSizeBytes) {
        failed$.next(file);
        return of(null);
    }

    loading$.next(file);

    return timer(300).pipe(
        map(() => file),
        finalize(() => loading$.next(null))
    );
}
