import { ChangeDetectionStrategy, Component, computed, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Кнопка «Поделиться».
 *
 * На телефонах открывает системное меню «Поделиться», на компьютере копирует
 * ссылку в буфер обмена и на пару секунд показывает «Ссылка скопирована».
 * Относительный путь (`/news/123`) дополняется адресом сайта.
 */
@Component({
    standalone: true,
    selector: 'app-share-button',
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './share-button.component.html',
    styleUrl: './share-button.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareButtonComponent {
    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Ссылка: абсолютная или путь на сайте.
     */
    public readonly url = input.required<string>();

    /**
     * Заголовок для системного меню «Поделиться».
     */
    public readonly title = input<string>('');

    /**
     * Только иконка, без подписи (подпись остаётся в aria-label и подсказке).
     */
    public readonly iconOnly = input<boolean>(false);

    /**
     * Оформление: `outline` — рамка в цвет текста, `overlay` — круглая
     * полупрозрачная кнопка для тёмного фона (просмотрщик картинок).
     */
    public readonly appearance = input<'outline' | 'overlay'>('outline');

    /**
     * Ссылка скопирована.
     */
    protected readonly copied = signal(false);

    /**
     * Ключ перевода подписи.
     */
    protected readonly labelKey = computed(() => (this.copied() ? 'shared.share.copied' : 'shared.share.share'));

    /**
     * Делится ссылкой.
     *
     * @param event Клик — не всплывает, чтобы не сработала ссылка карточки под кнопкой.
     */
    protected async share(event: MouseEvent): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        if (!this.isBrowser) {
            return;
        }

        const raw = this.url();
        const url = raw.startsWith('/') ? `${window.location.origin}${raw}` : raw;

        if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
            try {
                await navigator.share({ title: this.title() || document.title, url });
            } catch {
                // Меню закрыто пользователем.
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        } catch {
            this.copied.set(false);
        }
    }
}
