import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Пайп для безопасной генерации embed-URL YouTube.
 */
@Pipe({
    name: 'safeUrl',
    standalone: true,
})
export class SafeUrlPipe implements PipeTransform {
    /**
     * Санитайзер URL.
     */
    private readonly sanitizer = inject(DomSanitizer);

    /**
     * Преобразует строку URL в безопасный ресурсный URL.
     *
     * @param url Исходный URL.
     * @returns Безопасный ресурсный URL.
     */
    public transform(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
