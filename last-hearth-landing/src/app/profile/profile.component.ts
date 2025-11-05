import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { IUser } from '../services/interface/i-user';
import { AsyncPipe, NgIf } from '@angular/common';
import { TuiButton, TuiDialogContext, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent, PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import { RouterOutlet } from '@angular/router';
import { ServerInformationService } from '../services/server-information.service';
import { PlayerVerificationFormComponent } from './player-verification-form/player-verification-form.component';
import { map } from 'rxjs';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
@Component({
    standalone: true,
    imports: [TuiIcon, NgIf, RouterOutlet, AsyncPipe, PolymorpheusOutlet, TuiPreview, TuiButton],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
})
export class ProfileComponent {
    protected readonly userService = inject(UserService);

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly dialogs = inject(TuiDialogService);

    protected readonly code$ = inject(ServerInformationService).getCode();

    protected readonly details$ = inject(ServerInformationService).getDetails();

    protected readonly userGameName$ = this.userService.getPlayer$(this.userService.userId).pipe(map((data) => data.user_game_name));

    /**
     * Описание изображения открытого в предпросмотре.
     */
    protected previewDesc: string | null = null;

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
         * Сервис предпросмотра.
         */
    private readonly previewService = inject(TuiPreviewDialogService);

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    protected getRoleName() {
        if (this.userService.roles.includes('admin')) {
            return 'Администратор';
        }

        if (this.userService.roles.includes('player')) {
            return 'Игрок';
        }

        return 'Неверифицирован';
    }

    protected verification() {
        this.dialogs.open(new PolymorpheusComponent(PlayerVerificationFormComponent), { size: 'l' }).subscribe();
    }

    triggerFileInput() {
        this.fileInputRef.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]; // убираем data:image/png;base64,

                this.userService.setProfileImage$(base64).subscribe({
                    next: res => console.log('Uploaded:', res),
                    error: err => console.error('Error:', err),
                });
            };

            reader.readAsDataURL(file);
        }
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
}
