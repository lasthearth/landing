import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@core/config/environments/environment';
import { UploadTarget } from '../model/media.types';
import { MediaService } from './media.service';

/**
 * Адрес запроса presigned-целей.
 */
const UPLOAD_URLS = `${environment.apiUrl}/media/upload-urls`;

/**
 * Кодирует политику S3 в base64 так же, как её отдаёт бэкенд.
 *
 * @param policy Объект политики.
 * @returns Base64-строка для поля `policy`.
 */
function encodePolicy(policy: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(policy));

    return btoa(String.fromCharCode(...bytes));
}

/**
 * Собирает presigned-цель с заданным ограничением размера.
 *
 * @param range Границы размера в байтах или null, если условия размера в политике нет.
 * @returns Presigned-цель для проверок.
 */
function makeTarget(range: [number, number] | null): UploadTarget {
    const conditions: unknown[] = [{ bucket: 'last-hearth' }];

    if (range !== null) {
        conditions.push(['content-length-range', range[0], range[1]]);
    }

    return {
        post_url: 'https://storage.lasthearth.test/upload',
        fields: {
            key: 'settlement/uuid/image.webp',
            policy: encodePolicy({ expiration: '2026-01-01T00:00:00Z', conditions }),
            signature: 'sig-1',
        },
        public_url: 'https://cdn.lasthearth.test/image.webp',
    };
}

/**
 * Создаёт файл заданного размера.
 *
 * @param size Размер файла в байтах.
 * @param name Имя файла.
 * @returns Файл указанного размера.
 */
function makeFile(size: number, name: string): File {
    return new File([new Uint8Array(size)], name, { type: 'image/webp' });
}

describe('MediaService: размер файла против политики хранилища', () => {
    let service: MediaService;
    let http: HttpTestingController;
    let fetchSpy: jasmine.Spy<typeof globalThis.fetch>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(MediaService);
        http = TestBed.inject(HttpTestingController);
        fetchSpy = spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        http.verify();
    });

    it('бросает ошибку до fetch, если файл больше верхней границы', async () => {
        const upload = service.uploadFile(makeFile(30, 'big.webp'), 'UPLOAD_PURPOSE_SETTLEMENT');

        http.expectOne(UPLOAD_URLS).flush({ targets: [makeTarget([10, 20])] });

        await expectAsync(upload).toBeRejectedWithError(
            Error,
            'MediaService: размер файла "big.webp" (30 байт) вне диапазона политики хранилища: 10..20 байт'
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('бросает ошибку до fetch, если файл меньше нижней границы', async () => {
        const upload = service.uploadFile(makeFile(5, 'small.webp'), 'UPLOAD_PURPOSE_SETTLEMENT');

        http.expectOne(UPLOAD_URLS).flush({ targets: [makeTarget([10, 20])] });

        await expectAsync(upload).toBeRejectedWithError(
            Error,
            'MediaService: размер файла "small.webp" (5 байт) вне диапазона политики хранилища: 10..20 байт'
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('отправляет файл в хранилище, если политика размер не ограничивает', async () => {
        fetchSpy.and.resolveTo(new Response(null, { status: 204 }));

        const upload = service.uploadFile(makeFile(30, 'image.webp'), 'UPLOAD_PURPOSE_SETTLEMENT');

        http.expectOne(UPLOAD_URLS).flush({ targets: [makeTarget(null)] });

        await expectAsync(upload).toBeResolvedTo('https://cdn.lasthearth.test/image.webp');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
