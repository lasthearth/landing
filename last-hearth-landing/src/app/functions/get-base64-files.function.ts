import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { convertTuiFileLikeToBase64 } from './convert-file-to-base64.function';

/**
 * Получает массив Observable<string | null> для всех файлов в форме.
 * Используется для дальнейшего объединения через forkJoin или других RxJS операторов.
 *
 * @param fileFields - массив ключей файлов (например, fileFieldsVillage)
 * @param form - объект FormGroup с файлами
 * @returns Observable<string | null>[] - массив Observable для каждого файла
 */
export function getBase64Files(fileFields: string[], form: FormGroup) {
    const values = form.value;

    return fileFields.map((key) => {
        const file = values[key];
        if (file) {
            return convertTuiFileLikeToBase64(file);
        }
        return of(null);
    });
}
