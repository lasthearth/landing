import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { IUser } from '../services/interface/i-user';
import { AsyncPipe, NgIf } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { VerificationComponent } from '../verification/verification.component';
import { RouterOutlet } from '@angular/router';
import { ServerInformationService } from '../services/server-information.service';
@Component({
    standalone: true,
    imports: [TuiIcon, NgIf, RouterOutlet, AsyncPipe],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
})
export class ProfileComponent {
    protected readonly userService = inject(UserService);

    protected select = 'how-play';

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly dialogs = inject(TuiDialogService);

    protected readonly code$ = inject(ServerInformationService).getCode();

    protected readonly details$ = inject(ServerInformationService).getDetails();

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    protected signOut(): void {
        this.userService.signOut();
    }

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
        this.dialogs.open(new PolymorpheusComponent(VerificationComponent), { size: 'l' }).subscribe();
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
}
