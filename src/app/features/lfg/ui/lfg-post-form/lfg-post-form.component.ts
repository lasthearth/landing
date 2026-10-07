import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService, TranslatePipe } from '@core/i18n';
import {
    CreateLfgPostRequest,
    LFG_ACTIVITIES,
    LFG_EXPERIENCES,
    LFG_PLAY_TIMES,
    LFG_WEEKDAYS,
    LfgActivity,
    LfgApiService,
    LfgExperience,
    LfgKind,
    LfgPlayTime,
    LfgPost,
} from '@entities/lfg';
import { TuiIcon } from '@taiga-ui/core';

/**
 * Когда начинаем: через сколько минут или своё время.
 */
type StartChoice = 0 | 30 | 60 | 120 | 'custom';

/**
 * Пределы, как на сервере.
 */
const TITLE_MIN = 3;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;
const SLOTS_MAX = 10;
const ACTIVITIES_MAX = 4;
const CONTACT_MIN = 3;
const CONTACT_MAX = 64;
const MAX_LEAD_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LAG_MS = 60 * 60 * 1000;

/**
 * Значение для `datetime-local` в местном времени.
 *
 * @param date Дата.
 * @returns Строка `YYYY-MM-DDTHH:mm`.
 */
function toLocalInput(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Понедельник, от которого считаются короткие названия дней.
 */
const A_MONDAY = new Date(2024, 0, 1);

/**
 * Форма нового объявления: разовый поход (занятие, когда, сколько людей) или
 * поиск постоянного напарника (занятия, дни и время игры, опыт, голос,
 * обязательный контакт).
 */
@Component({
    selector: 'app-lfg-post-form',
    templateUrl: './lfg-post-form.component.html',
    styleUrl: './lfg-post-form.component.less',
    imports: [FormsModule, NgTemplateOutlet, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgPostFormComponent implements OnInit {
    private readonly api = inject(LfgApiService);
    private readonly i18n = inject(I18nService);

    /**
     * Вид объявления.
     */
    public readonly kind = input<LfgKind>('POST_KIND_SESSION');

    /**
     * Объявление опубликовано.
     */
    public readonly created = output<LfgPost>();

    /**
     * Форму закрыли без публикации.
     */
    public readonly cancelled = output<void>();

    /**
     * Публикация не удалась: ключ перевода причины.
     */
    public readonly failed = output<string>();

    protected readonly activities = LFG_ACTIVITIES;
    protected readonly playTimes = LFG_PLAY_TIMES;
    protected readonly experiences = LFG_EXPERIENCES;
    protected readonly activitiesMax = ACTIVITIES_MAX;
    protected readonly contactMax = CONTACT_MAX;
    protected readonly titleMax = TITLE_MAX;
    protected readonly descriptionMax = DESCRIPTION_MAX;
    protected readonly slotsMax = SLOTS_MAX;
    protected readonly startChoices: readonly { value: StartChoice; key: string }[] = [
        { value: 0, key: 'now' },
        { value: 30, key: 'in30' },
        { value: 60, key: 'in60' },
        { value: 120, key: 'in120' },
        { value: 'custom', key: 'custom' },
    ];

    protected readonly teammate = computed(() => this.kind() === 'POST_KIND_TEAMMATE');

    /**
     * Дни недели с короткими названиями на языке сайта.
     */
    protected readonly weekdays = computed(() => {
        const format = new Intl.DateTimeFormat(this.i18n.language(), { weekday: 'short' });
        return LFG_WEEKDAYS.map((day) => ({
            day,
            label: format.format(new Date(A_MONDAY.getTime() + (day - 1) * 86_400_000)),
        }));
    });

    /**
     * Выбранные занятия: у похода одно, у напарника до четырёх.
     */
    protected readonly chosen = signal<LfgActivity[]>([]);
    protected readonly days = signal<number[]>([]);
    protected readonly times = signal<LfgPlayTime[]>([]);
    protected readonly experience = signal<LfgExperience | null>(null);
    protected readonly voice = signal(false);
    protected readonly contact = signal('');
    protected readonly title = signal('');
    protected readonly description = signal('');
    protected readonly start = signal<StartChoice>(30);
    protected readonly customStart = signal(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
    protected readonly slots = signal(2);
    protected readonly submitting = signal(false);
    protected readonly touched = signal(false);

    /**
     * Время начала (`null` — своё время задано неверно).
     */
    private readonly startsAt = computed((): Date | null => {
        const choice = this.start();
        if (choice !== 'custom') {
            return new Date(Date.now() + choice * 60 * 1000);
        }

        const date = new Date(this.customStart());
        const now = Date.now();
        if (Number.isNaN(date.getTime()) || date.getTime() < now - MAX_LAG_MS || date.getTime() > now + MAX_LEAD_MS) {
            return null;
        }
        return date;
    });

    /**
     * Своё время выбрано, но задано неверно.
     */
    protected readonly customInvalid = computed(() => this.start() === 'custom' && this.startsAt() === null);

    /**
     * Контакт задан неверно: у напарника он обязателен, у похода — по желанию.
     */
    protected readonly contactInvalid = computed(() => {
        const length = this.contact().trim().length;
        if (length === 0) {
            return this.teammate();
        }
        return length < CONTACT_MIN || length > CONTACT_MAX;
    });

    /**
     * Можно ли публиковать.
     */
    protected readonly valid = computed(
        () =>
            this.chosen().length > 0 &&
            this.title().trim().length >= TITLE_MIN &&
            !this.contactInvalid() &&
            (this.teammate() || this.startsAt() !== null)
    );

    /**
     * Выбирает занятие: у похода заменяет, у напарника переключает (до четырёх).
     *
     * @param activity Занятие.
     */
    protected toggleActivity(activity: LfgActivity): void {
        if (!this.teammate()) {
            this.chosen.set([activity]);
            return;
        }
        this.chosen.update((list) => {
            if (list.includes(activity)) {
                return list.filter((item) => item !== activity);
            }
            return list.length >= ACTIVITIES_MAX ? list : [...list, activity];
        });
    }

    /**
     * Отмечает день недели.
     *
     * @param day 1 — понедельник … 7 — воскресенье.
     */
    protected toggleDay(day: number): void {
        this.days.update((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort()));
    }

    /**
     * Отмечает время суток.
     *
     * @param time Время суток.
     */
    protected toggleTime(time: LfgPlayTime): void {
        this.times.update((list) => (list.includes(time) ? list.filter((t) => t !== time) : [...list, time]));
    }

    /**
     * Выбирает опыт; повторное нажатие снимает выбор.
     *
     * @param value Опыт.
     */
    protected toggleExperience(value: LfgExperience): void {
        this.experience.update((current) => (current === value ? null : value));
    }

    public ngOnInit(): void {
        // Напарника чаще ищут одного, в поход — компанию.
        if (this.teammate()) {
            this.slots.set(1);
        }
    }

    /**
     * Меняет число нужных людей в пределах 1..10.
     *
     * @param delta На сколько.
     */
    protected changeSlots(delta: number): void {
        this.slots.update((value) => Math.min(SLOTS_MAX, Math.max(1, value + delta)));
    }

    /**
     * Публикует объявление.
     */
    protected submit(): void {
        this.touched.set(true);
        const startsAt = this.startsAt();
        if (!this.valid() || this.submitting()) {
            return;
        }

        const request: CreateLfgPostRequest = {
            kind: this.kind(),
            activities: this.chosen(),
            title: this.title().trim(),
            description: this.description().trim(),
            slots: this.slots(),
            contact: this.contact().trim(),
        };
        if (this.teammate()) {
            request.play_days = this.days();
            request.play_times = LFG_PLAY_TIMES.map((t) => t.value).filter((t) => this.times().includes(t));
            request.voice = this.voice();
            const experience = this.experience();
            if (experience) {
                request.experience = experience;
            }
        } else if (startsAt) {
            request.starts_at = startsAt.toISOString();
        }

        this.submitting.set(true);
        this.api.create(request).subscribe({
            next: (post) => {
                this.submitting.set(false);
                this.created.emit(post);
            },
            error: (error: unknown) => {
                this.submitting.set(false);
                const status = error instanceof HttpErrorResponse ? error.status : 0;
                const limitKey = this.teammate() ? 'lfg.toast.limitMate' : 'lfg.toast.limit';
                this.failed.emit(status === 429 ? limitKey : status === 400 ? 'lfg.toast.invalid' : 'lfg.toast.error');
            },
        });
    }
}
