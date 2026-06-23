import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, map } from 'rxjs';
import { environment } from '@core/config/environments/environment';
import {
    CreateUploadUrlsRequest,
    CreateUploadUrlsResponse,
    UploadPurpose,
    UploadTarget,
} from '../model/media.types';

/**
 * Сервис для загрузки медиафайлов через presigned URLs.
 *
 * Работает в два этапа:
 * 1. Получает подписанные цели через API (`POST /v1/media/upload-urls`).
 * 2. Загружает файл напрямую в S3-совместимое хранилище по полученной ссылке.
 *
 * Загрузка на `post_url` выполняется через `fetch` без Authorization-заголовка,
 * так как авторизация происходит через подпись в полях формы.
 */
@Injectable({
    providedIn: 'root',
})
export class MediaService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API.
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Таймаут загрузки одного файла в S3 (мс).
     */
    private readonly uploadTimeoutMs = 60_000;

    /**
     * Получает presigned-цели для загрузки файлов.
     *
     * @param request Параметры запроса: назначение, количество и MIME-тип.
     * @returns Observable со списком целей для загрузки.
     */
    public createUploadUrls$(request: CreateUploadUrlsRequest): Observable<UploadTarget[]> {
        return this.http
            .post<CreateUploadUrlsResponse>(`${this.baseUrl}/media/upload-urls`, request)
            .pipe(map((response) => response.targets));
    }

    /**
     * Загружает один файл и возвращает его публичный URL.
     *
     * @param file Файл для загрузки.
     * @param purpose Назначение файла.
     * @returns Observable с публичным URL загруженного файла.
     */
    public uploadFile$(file: File, purpose: UploadPurpose): Observable<string> {
        return from(this.uploadFile(file, purpose));
    }

    /**
     * Загружает несколько файлов и возвращает их публичные URL.
     *
     * @param files Список файлов для загрузки.
     * @param purpose Назначение файлов.
     * @returns Observable с массивом публичных URL в том же порядке.
     */
    public uploadFiles$(files: File[], purpose: UploadPurpose): Observable<string[]> {
        return from(this.uploadFiles(files, purpose));
    }

    /**
     * Загружает один файл и возвращает его публичный URL.
     *
     * @param file Файл для загрузки.
     * @param purpose Назначение файла.
     * @returns Promise с публичным URL загруженного файла.
     */
    public async uploadFile(file: File, purpose: UploadPurpose): Promise<string> {
        const targets = await this.createUploadUrls$(
            this.buildRequest([file], purpose)
        ).toPromise();

        if (!targets || targets.length === 0) {
            throw new Error('MediaService: сервер не вернул цели для загрузки');
        }

        const target = targets[0];
        await this.executeUpload(file, target);

        return target.public_url;
    }

    /**
     * Загружает несколько файлов и возвращает их публичные URL.
     *
     * @param files Список файлов для загрузки.
     * @param purpose Назначение файлов.
     * @returns Promise с массивом публичных URL в том же порядке.
     */
    public async uploadFiles(files: File[], purpose: UploadPurpose): Promise<string[]> {
        if (files.length === 0) {
            return [];
        }

        const targets = await this.createUploadUrls$(
            this.buildRequest(files, purpose)
        ).toPromise();

        if (!targets || targets.length !== files.length) {
            throw new Error(
                `MediaService: несоответствие количества целей (${targets?.length}) и файлов (${files.length})`
            );
        }

        await Promise.all(
            files.map((file, i) => this.executeUpload(file, targets[i]))
        );

        return targets.map((target) => target.public_url);
    }

    /**
     * Формирует запрос на получение presigned-целей.
     *
     * @param files Список файлов для определения MIME-типа.
     * @param purpose Назначение файлов.
     * @returns Объект запроса для `createUploadUrls$`.
     */
    private buildRequest(
        files: File[],
        purpose: UploadPurpose
    ): CreateUploadUrlsRequest {
        return {
            purpose,
            count: files.length,
        };
    }

    /**
     * Выполняет загрузку файла через multipart/form-data на presigned URL.
     *
     * @param file Файл для загрузки.
     * @param target Presigned-цель с `post_url`, `fields` и `public_url`.
     * @returns Promise, который разрешается после успешной загрузки.
     */
    private async executeUpload(file: File, target: UploadTarget): Promise<void> {
        const form = new FormData();

        for (const [key, value] of Object.entries(target.fields)) {
            form.append(key, value);
        }

        form.append('file', file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.uploadTimeoutMs);

        try {
            const response = await fetch(target.post_url, {
                method: 'POST',
                body: form,
                signal: controller.signal,
            });

            if (response.status !== 204) {
                const errorText = await response.text();
                throw new Error(
                    `MediaService: ошибка загрузки файла "${file.name}" на ${target.post_url} (${response.status}): ${errorText}`
                );
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(
                    `MediaService: превышен таймаут (${this.uploadTimeoutMs} мс) загрузки файла "${file.name}" на ${target.post_url}`
                );
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
