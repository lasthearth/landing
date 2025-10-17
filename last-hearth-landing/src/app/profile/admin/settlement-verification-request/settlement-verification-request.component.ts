import { ChangeDetectionStrategy, inject, input, InputSignal, TemplateRef, ViewChild } from '@angular/core';
import { Component } from '@angular/core';
import { TuiButton, TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import {
    PolymorpheusComponent,
    PolymorpheusContent,
    PolymorpheusOutlet,
} from '@taiga-ui/polymorpheus';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { IRequestSettlement } from '@app/settlements/interfaces/i-request-settlement';
import { ConfirmApproveComponent } from '../confirm-approve/confirm-approve.component';
import { ConfirmRejectComponent } from '../confirm-reject/confirm-reject.component';
import { SettlementService } from '@services/settlement.service';

/**
 * Компонент отображения запроса на верификацию селения.
 */
@Component({
    standalone: true,
    selector: 'app-settlement-verification-request',
    imports: [PolymorpheusOutlet, TuiButton, TuiPreview],
    templateUrl: './settlement-verification-request.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementVerificationRequestComponent {
    /**
     * Данные анкеты запроса.
     */
    public readonly data: InputSignal<IRequestSettlement> = input.required<IRequestSettlement>();

    /**
     * Описание изображения открытого в предпросмотре.
     */
    protected previewDesc: string | null = null;

    /**
     * Сервис поселений.
     */
    protected readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис диалогов.
     */
    private readonly dialogService: TuiDialogService = inject(TuiDialogService);

    /**
     * Сервис предпросмотра.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * Ссылка на элемент в шаблоне.
     */
    @ViewChild('preview')
    protected readonly preview?: TemplateRef<TuiDialogContext>;

    /**
     * Содержание предпросмотра.
     */
    protected previewContent: PolymorpheusContent;

    /**
     * Открывает окно подтверждения принятия анкеты.
     */
    protected approve(): void {
        this.dialogService
            .open(new PolymorpheusComponent(ConfirmApproveComponent), {
                size: 'auto',
                data: { userId: this.data().id, type: 'settlement' },
            })
            .subscribe();
    }

    /**
     * Открывает окно подтверждения отклонения анкеты.
     */
    protected reject(): void {
        this.dialogService
            .open(new PolymorpheusComponent(ConfirmRejectComponent), { size: 'l', data: { userId: this.data().id, type: 'settlement' }, })
            .subscribe();
    }

    /**
     *  Открывает изображение в окне предпросмотра.
     *
     * @param url Ссылка на изображение.
     * @param desc Описание изображения.
     */
    protected show(url: string, desc: string): void {
        this.previewContent = url;
        this.previewDesc = desc;
        this.previewService.open(this.preview || '').subscribe();
    }

    /**
     *  Возвращает тип селения по ключу.
     *
     * @param key Ключ.
     */
    protected getSettlementType(key: string): string {
        return this.settlementService.getSettlementTypeByKey(key);
    }
}
