import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@core/i18n';
import { LfgApiService } from '@entities/lfg';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Состояние контакта: скрыт, загружается, показан, не удалось.
 */
type ContactState = 'hidden' | 'loading' | 'shown' | 'error';

/**
 * Контакт автора объявления: скрыт до нажатия «Показать контакт», чтобы его не
 * собирали с публичной доски. Гостю предлагает войти.
 */
@Component({
    selector: 'app-lfg-contact',
    templateUrl: './lfg-contact.component.html',
    styleUrl: './lfg-contact.component.less',
    imports: [TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgContactComponent {
    private readonly api = inject(LfgApiService);
    private readonly destroyRef = inject(DestroyRef);

    public readonly postId = input.required<string>();
    /**
     * Вошёл ли пользователь (контакт видят только вошедшие).
     */
    public readonly authed = input.required<boolean>();
    /**
     * Акцентная кнопка — у поиска напарника контакт и есть главное действие.
     */
    public readonly primary = input(false);

    public readonly signIn = output<void>();

    protected readonly state = signal<ContactState>('hidden');
    protected readonly contact = signal('');
    protected readonly copied = signal(false);

    /**
     * Загружает контакт.
     */
    protected reveal(): void {
        if (this.state() === 'loading') {
            return;
        }
        this.state.set('loading');
        this.api
            .contact(this.postId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (contact) => {
                    this.contact.set(contact);
                    this.state.set('shown');
                },
                error: () => this.state.set('error'),
            });
    }

    /**
     * Копирует контакт в буфер обмена.
     */
    protected async copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.contact());
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        } catch {
            // Буфер недоступен (http, запрет браузера) — контакт и так виден.
        }
    }
}
