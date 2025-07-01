import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiIcon, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiFileLike, TuiFiles, TuiSelect, TuiTooltip } from '@taiga-ui/kit';
import { LInputComponent } from '../../components/l-input/l-input.component';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, map, Observable, of, Subject, switchMap, tap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ICreateSettlement } from '../interfaces/i-create-settlement';
import { UserService } from '../../services/user.service';

type FileKey =
    | 'map'
    | 'monument'
    | 'frontier'
    | 'fireplace'
    | 'home'
    | 'warehouse';

@Component({
    standalone: true,
    selector: 'app-create-settlement',
    imports: [
        LInputComponent,
        FormsModule,
        ReactiveFormsModule,
        RouterLink,
        NgFor,
        AsyncPipe,
        NgIf,
        TuiFiles
    ],
    templateUrl: './create-settlement.component.html',
    styleUrl: './create-settlement.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSettlementComponent {
    name = '';
    selectedUser: { id: number; name: string } | null = null;
    users = [
        'Мы имеем намерение придерживаться нейтралитета и не вступать в конфликты, если того не просит наш официальный союзник, договор, или ситуация в которой нам необходимо защищаться',
        'Мы имеем намерение вести свои дела как хотим. Если вы хотите уверенности в чем-то, вы можете попытаться договориться с нами при помощи дипломатии. В ином случае, мы оставляем за собой право на любые действия.',
        'Мы своенравны и наши намерения - не ваше дело. Мы не любим дипломатию, мы любим кровь.'
    ];

    protected readonly fileFields: FileKey[] = [
        'map',
        'monument',
        'frontier',
        'fireplace',
        'home',
        'warehouse',
    ];

    protected readonly form = new FormGroup({
        name: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        x: new FormControl<number | null>(null, [Validators.required]),
        z: new FormControl<number | null>(null, [Validators.required]),
        diplomacy: new FormControl<string | null>(null, [Validators.required]),
        description: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        map: new FormControl<File | null>(null, Validators.required),
        monument: new FormControl<File | null>(null, Validators.required),
        frontier: new FormControl<File | null>(null, Validators.required),
        fireplace: new FormControl<File | null>(null, Validators.required),
        home: new FormControl<File | null>(null, Validators.required),
        warehouse: new FormControl<File | null>(null, Validators.required),
    });

    protected readonly fileStatus = this.fileFields.reduce((acc, key) => {
        acc.loading[key] = new Subject<File | null>();
        acc.failed[key] = new Subject<File | null>();
        acc.loaded[key] = this.form.controls[key].valueChanges.pipe(
            switchMap(file => this.processFile(file, acc.loading[key], acc.failed[key]))
        );
        return acc;
    }, {
        loading: {} as Record<FileKey, Subject<File | null>>,
        failed: {} as Record<FileKey, Subject<File | null>>,
        loaded: {} as Record<FileKey, Observable<File | null>>,
    });

    /**
         * {@link Subject} события отправки формы.
         */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
        * Ссылка уничтожения на компонент.
        */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    private readonly us = inject(UserService);

    /**
     * Инициализирует компонент класса {@link }
     */
    public constructor() {
        this.onSubmit.pipe(
            switchMap(() => {
                const values = this.form.value;

                // Собираем массив Observable<string> для всех файлов
                const base64Files$: Observable<string | null>[] = this.fileFields.map(key => {
                    const file = values[key];
                    if (file) {
                        return this.convertTuiFileLikeToBase64(file);
                    }
                    return of(null);
                });

                // Ждём когда все base64 загрузятся
                return forkJoin(base64Files$).pipe(
                    map(base64Files => {
                        const attachments = this.fileFields.map((key, i) => ({
                            data: base64Files[i] ?? '',
                            description: this.getLabelForKey(key)
                        }));

                        const request: ICreateSettlement = {
                            type: 1,
                            name: values.name ?? '',
                            description: values.description ?? '',
                            diplomacy: values.diplomacy ?? '',
                            coordinates: {
                                x: values.x ?? 0,
                                y: values.z ?? 0,
                            },
                            attachments,
                        };

                        return request;
                    })
                );
            }),
            tap(request => {
                console.log(request);
                this.us.requestSettlement$(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe();
    }

    protected removeFile(controlName: FileKey): void {
        this.form.controls[controlName].setValue(null);
    }

    protected processFile(
        file: File | null,
        loading$: Subject<File | null>,
        failed$: Subject<File | null>,
    ): Observable<File | null> {
        failed$.next(null);

        if (!file) {
            return of(null);
        }

        const maxSizeBytes = 10 * 1024 * 1024;

        if (file.size && file.size > maxSizeBytes) {
            failed$.next(file);
            return of(null);
        }

        loading$.next(file);

        return timer(300).pipe(
            map(() => file),
            finalize(() => loading$.next(null)),
        );
    }

    displayUserName(user: { id: number; name: string }): string {
        return user.name;
    }

    getLabelForKey(key: FileKey): string {
        return {
            map: 'Вид с карты',
            monument: 'Ваш монумент',
            frontier: 'Пограничные столбики',
            fireplace: 'Место костра',
            home: 'Землянка/Навес',
            warehouse: 'Склад',
        }[key];
    }

    convertTuiFileLikeToBase64(file: File): Observable<string> {
        return new Observable<string>(observer => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1]; // убираем data:*/*;base64,
                observer.next(base64);
                observer.complete();
            };

            reader.onerror = err => {
                observer.error(err);
            };

            reader.readAsDataURL(file);
        });
    }

}
