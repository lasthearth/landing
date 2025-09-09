import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { UserService } from '../services/user.service';
import { IUser } from '../services/interface/i-user';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { VerificationComponent } from '../verification/verification.component';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, from, Observable, startWith } from 'rxjs';
import { RouteKeys } from '../routes/enums/route-keys';
import { ServerInformationService } from '../services/server-information.service';
@Component({
    standalone: true,
    imports: [TuiIcon, NgIf, RouterOutlet, RouterLink, NgClass, AsyncPipe],
    selector: 'app-profile',
    templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
    protected readonly userService = inject(UserService);

    protected select = 'how-play';

    protected readonly userData: IUser = this.userService.getUserData();

    private readonly destroyRef = inject(DestroyRef);

    private readonly dialogs = inject(TuiDialogService);

    private readonly router = inject(Router);

    private readonly activatedRoute = inject(ActivatedRoute);

    protected readonly code$ = inject(ServerInformationService).getCode();

    protected readonly details$ = inject(ServerInformationService).getDetails();

    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    ngOnInit() {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
                startWith('how-play'),
            )
            .subscribe(() => {
                let route = this.activatedRoute;

                while (route.firstChild) {
                    route = route.firstChild;
                }

                const routeKey = route.snapshot.data['route_keys'];

                if (routeKey) {
                    switch (routeKey) {
                        case RouteKeys.stats:
                            this.select = 'stats';
                            break;
                        case RouteKeys.howPlay:
                            this.select = 'how-play';
                            break;
                        case RouteKeys.admin:
                            this.select = 'admin';
                            break;
                        case RouteKeys.settlement:
                            this.select = 'settlement';
                            break;
                    }
                }

                this.cdr.markForCheck();
            });
    }

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

    /**
     * Возвращает признак, является ли пользователь администратором.
     */
    protected isAdmin(): boolean {
        return this.userService.roles.includes('admin');
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
