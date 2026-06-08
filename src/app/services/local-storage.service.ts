import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {

    // Сохранить данные
    setItem(key: string, value: any): void {
        try {
            const stringValue = JSON.stringify(value);
            localStorage.setItem(key, stringValue);
        } catch (error) {
            console.error('Error saving to localStorage', error);
        }
    }

    // Получить данные
    getItem<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error getting data from localStorage', error);
            return null;
        }
    }

    // Удалить данные
    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing data from localStorage', error);
        }
    }

    // Очистить все данные
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage', error);
        }
    }

    // Проверить наличие ключа
    hasKey(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

}
