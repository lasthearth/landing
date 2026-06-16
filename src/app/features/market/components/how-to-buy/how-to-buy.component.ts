import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TuiSlider } from '@taiga-ui/kit/components/slider';
import { TuiAlertService, TuiIcon } from '@taiga-ui/core';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { UserService } from '@entities/user/api/user.service';

/**
 * Диалог пополнения осколков (донат-валюты).
 *
 * Позволяет выбрать сумму в рублях через слайдер или ручной ввод.
 * Курс: 1 рубль = 10 осколков.
 */
@Component({
    selector: 'app-how-to-buy',
    standalone: true,
    imports: [FormsModule, DecimalPipe, TuiSlider, TuiIcon, LHInputComponent],
    templateUrl: './how-to-buy.component.html',
    styleUrl: './how-to-buy.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToBuyComponent {
    /**
     * Курс обмена: 1 рубль = 10 осколков.
     */
    private readonly rate = 10;

    /**
     * Минимальная сумма пополнения в рублях.
     */
    protected readonly minAmount = 50;

    /**
     * Максимальная сумма пополнения в рублях.
     */
    protected readonly maxAmount = 10000;

    /**
     * Шаг слайдера в рублях.
     */
    protected readonly step = 50;

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис уведомлений.
     */
    private readonly alertService = inject(TuiAlertService);

    /**
     * Никнейм текущего пользователя.
     */
    protected readonly username = computed(() => this.userService.userName || 'Неизвестный');

    /**
     * Текущая сумма в рублях.
     */
    protected readonly rubles = signal(500);

    /**
     * Вычисляемое количество осколков на основе суммы в рублях.
     */
    protected readonly shards = computed(() => this.rubles() * this.rate);

    /**
     * URL QR-кода для перевода через СБП по ГОСТ Р 56042-2014.
     * Содержит реквизиты получателя, сумму в копейках и ник игрока.
     * Распознаётся всеми банковскими приложениями.
     */
    /**
     * Сумма в рублях с задержкой для генерации QR-кода.
     * Используется debounce, чтобы не спамить api.qrserver.com при движении слайдера.
     */
    private readonly debouncedRubles = toSignal(toObservable(this.rubles).pipe(debounceTime(300)), {
        initialValue: 500,
    });

    /**
     * Формирует реквизиты для перевода через СБП по ГОСТ Р 56042-2014.
     *
     * @param rubles Сумма в рублях.
     * @returns Строка реквизитов для СБП.
     */
    private buildSbpDetails(rubles: number): string {
        const sumInKopecks = rubles * 100;
        const purpose = `Пополнение баланса Last Hearth, ник: ${this.username()}`;
        return `ST00012|Name=БУРАКОВ ИВАН АЛЕКСАНДРОВИЧ|PersonalAcc=40817810017002268665|BankName=ПАО СБЕРБАНК|BIC=044525225|CorrespAcc=30101810400000000225|Sum=${sumInKopecks}|Purpose=${purpose}`;
    }

    /**
     * Реквизиты для перевода через СБП по ГОСТ Р 56042-2014.
     */
    protected readonly sbpDetails = computed(() => this.buildSbpDetails(this.rubles()));

    /**
     * URL QR-кода для перевода через СБП.
     * Обновляется с debounce, чтобы не генерировать QR на каждое изменение слайдера.
     */
    protected readonly sberQrUrl = computed(() => {
        const data = this.buildSbpDetails(this.debouncedRubles());
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=3f3c34&bgcolor=ffffff&data=${encodeURIComponent(data)}`;
    });

    /**
     * Обрабатывает изменение суммы в рублях из слайдера или инпута.
     *
     * @param value Новое значение (строка из инпута или число из слайдера).
     */
    protected onRublesChange(value: string | number): void {
        const num = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
        this.rubles.set(this.clampRubles(num));
    }

    /**
     * Ограничивает сумму в рублях допустимым диапазоном
     * и округляет до шага.
     *
     * @param value Исходное значение.
     * @returns Скорректированное значение.
     */
    private clampRubles(value: number): number {
        const rounded = Math.round(value / this.step) * this.step;
        return Math.max(this.minAmount, Math.min(this.maxAmount, rounded));
    }

    /**
     * Копирует реквизиты СБП в буфер обмена.
     *
     * Поскольку QR-код СБП содержит реквизиты, а не веб-ссылку,
     * это ближайший аналог «перейти туда же, куда QR-код».
     */
    protected copySbpDetails(): void {
        navigator.clipboard
            .writeText(this.sbpDetails())
            .then(() => {
                this.alertService.open('', { label: 'Реквизиты СБП скопированы. Вставьте их в приложение банка.', appearance: 'positive' }).subscribe();
            })
            .catch(() => {
                this.alertService.open('', { label: 'Не удалось скопировать реквизиты. Попробуйте отсканировать QR-код.', appearance: 'negative' }).subscribe();
            });
    }
}
