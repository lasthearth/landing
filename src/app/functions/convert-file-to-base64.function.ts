import { Observable } from 'rxjs';

/**
 * Конвертирует File (из TUI файлового инпута или обычного HTML Input) в Base64 строку.
 * Возвращает Observable<string>, чтобы удобно использовать с RxJS.
 *
 * @param file - объект File, который нужно конвертировать
 * @returns Observable<string> - поток с Base64 строкой без префикса data:*;base64,*/
export function convertTuiFileLikeToBase64(file: File): Observable<string> {
    return new Observable<string>((observer) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1]; // убираем data:*/*;base64,
            observer.next(base64);
            observer.complete();
        };

        reader.onerror = (err) => {
            observer.error(err);
        };

        reader.readAsDataURL(file);
    });
}
