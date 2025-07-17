import { DOCUMENT } from '@angular/common';
import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ISeoData } from './interface/i-seo-data';

/**
 * Сервис по работе с SEO данными приложения.
 */
@Injectable({
    providedIn: 'root',
})
export class SeoService {
    /**
     * Сервис устанавливающий заголовок в текущем HTML документе.
     */
    private readonly title: Title = inject(Title);

    /**
     * Сервис управляющий мета-тегами в разметке.
     */
    private readonly meta: Meta = inject(Meta);

    /**
     * Объект {@link Document}, предоставляющий доступ к DOM страницы.
     */
    private readonly document: Document = inject(DOCUMENT);

    /**
     * Объект {@link Document}, предоставляющий доступ к DOM страницы.
     */
    private readonly renderer: Renderer2;

    /**
     * Инициализирует экземпляр класса {@link SeoService}.
     *
     * @param rendererFactory2 Создает и инициализирует Renderer2.
     */
    constructor(rendererFactory2: RendererFactory2) {
        this.renderer = rendererFactory2.createRenderer(null, null);
    }

    public setSeoTags(seoData: ISeoData): void {
        this.title.setTitle(seoData.title);
        this.meta.updateTag({ property: 'og:title', content: seoData.title });

        this.meta.updateTag({ name: 'description', content: seoData.description });
        this.meta.updateTag({ property: 'og:description', content: seoData.description });

        this.meta.updateTag({ name: 'keywords', content: seoData.keywords });

        if (seoData.url) {
            this.meta.updateTag({ property: 'og:url', content: seoData.url });
        }

        if (seoData.robots) {
            this.meta.updateTag({ name: 'robots', content: seoData.robots });
        }

        if (seoData.type) {
            this.meta.updateTag({ property: 'og:type', content: seoData.type });
        }

        if (seoData.siteName) {
            this.meta.updateTag({ property: 'og:site_name', content: seoData.siteName });
        }

        if (seoData.locale) {
            this.meta.updateTag({ property: 'og:locale', content: seoData.locale });
        }
    }
}
