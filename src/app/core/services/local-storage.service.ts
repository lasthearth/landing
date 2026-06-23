import { Injectable } from '@angular/core';

/**
 * Сервис для работы с localStorage.
 *
 * Все методы защищены от обращения в серверном окружении (SSR/prerender),
 * где `localStorage` не определён.
 */
@Injectable({
    providedIn: 'root',
})
export class LocalStorageService {
    /**
     * Проверяет, доступен ли localStorage в текущем окружении.
     *
     * @returns true, если localStorage определён и доступен.
     */
    private isAvailable(): boolean {
        return typeof localStorage !== 'undefined';
    }

    /**
     * Сохраняет значение в localStorage.
     *
     * @param key Ключ.
     * @param value Значение для сохранения.
     */
    public setItem(key: string, value: any): void {
        if (!this.isAvailable()) {
            return;
        }

        try {
            const stringValue = JSON.stringify(value);
            localStorage.setItem(key, stringValue);
        } catch (error) {
            console.error('Error saving to localStorage', error);
        }
    }

    /**
     * Получает значение из localStorage.
     *
     * @param key Ключ.
     * @returns Сохранённое значение или null.
     */
    public getItem<T>(key: string): T | null {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error getting data from localStorage', error);
            return null;
        }
    }

    /**
     * Удаляет значение из localStorage.
     *
     * @param key Ключ.
     */
    public removeItem(key: string): void {
        if (!this.isAvailable()) {
            return;
        }

        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing data from localStorage', error);
        }
    }

    /**
     * Очищает localStorage.
     */
    public clear(): void {
        if (!this.isAvailable()) {
            return;
        }

        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage', error);
        }
    }

    /**
     * Проверяет наличие ключа в localStorage.
     *
     * @param key Ключ.
     * @returns true, если ключ существует.
     */
    public hasKey(key: string): boolean {
        if (!this.isAvailable()) {
            return false;
        }

        return localStorage.getItem(key) !== null;
    }
}
