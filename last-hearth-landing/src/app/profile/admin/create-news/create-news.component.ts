import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    InputSignal,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { LInputComponent } from '@app/components/l-input/l-input.component';
import { INews } from '@app/services/interface/i-news-admin';
import { IUser } from '@app/services/interface/i-user';
import { NewsService } from '@app/services/news.service';
import { RequestStatusService } from '@app/services/request-status.service';
import { UserService } from '@app/services/user.service';
import { TuiDialogContext, TuiError } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiFileLike, TuiFile, TuiFilesComponent, TuiFiles } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { finalize, forkJoin, interval, map, Observable, of, startWith, Subject, switchMap, tap, timer } from 'rxjs';
import { NewsCardComponent } from '@app/news/news-card/news-card.component';

/**
 * Компонент создания новостей админом
 */
@Component({
    selector: 'app-create-news',
    templateUrl: './create-news.component.html',
    imports: [
        LInputComponent,
        ReactiveFormsModule,
        FormsModule,
        TuiError,
        TuiFieldErrorPipe,
        AsyncPipe,
        TuiFile,
        TuiFiles,
        TuiFilesComponent,
        NgIf,
        NewsCardComponent,
        DatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNewsComponent {
    protected readonly userService = inject(UserService);
    protected readonly userData: IUser = this.userService.getUserData();
    protected readonly form = new FormGroup({
        title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        preview: new FormControl<File | null>(null, Validators.required),
    });

    /**
     * Обработка состояния загрузки файла
     */
    protected readonly failedFiles$ = new Subject<File | null>();
    protected readonly loadingFiles$ = new Subject<File | null>();
    protected readonly loadedFiles$ = this.form.controls.preview.valueChanges.pipe(
        switchMap((file) => this.processFile(file, this.loadingFiles$, this.failedFiles$))
    );
    protected previewUrl: string | null = null; // для отображения картинки в превью

    /**
     * ChangeDetectorRef для принудительного обновления представления.
     */
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
    /**
     * {@link Subject} события отправки формы.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис новостей сайта.
     */
    private readonly newsService: NewsService = inject(NewsService);

    /**
     * Методы работы с загрозкой файла
     */
    protected removeFile(): void {
        this.form.controls.preview.setValue(null);
    }

    protected processFile(
        file: File | null,
        loading$: Subject<File | null>,
        failed$: Subject<File | null>
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
            finalize(() => loading$.next(null))
        );
    }

    /**
     * Получение актуальной даты для предпросмотра новости
     */
    readonly currentDate$ = interval(60000).pipe(
        startWith(0),
        map(() => new Date())
    );

    /**
     * Инициализирует компонент класса {@link CreateNewsComponent}
     */
    public constructor() {
        this.form.controls.preview.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((file) => {
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = () => {
                    this.previewUrl = reader.result as string;
                    this.cdr.markForCheck();
                };
                reader.readAsDataURL(file);
            } else {
                this.previewUrl = null;
                this.cdr.markForCheck();
            }
        });

        this.onSubmit
            .pipe(
                switchMap(() => {
                    // Собираем массив Observable<string> для всех файлов
                    let base64Files$: Observable<string | null> = of(null);
                    if (this.form.controls.preview.value) {
                        const file = this.form.controls.preview.value;
                        if (file) {
                            base64Files$ = this.convertTuiFileLikeToBase64(file);
                        }
                    }

                    // Ждём когда все base64 загрузятся
                    return base64Files$.pipe(
                        map((base64Files) => {
                            const request: INews = {
                                title: this.form.controls.title.value,
                                content: this.form.controls.content.value,
                                preview: base64Files ?? '',
                            };

                            return request;
                        })
                    );
                }),
                tap((request: INews) => {
                    const newNews: INews = request;

                    if (newNews !== null) {
                        this.newsService
                            .createNews$(newNews)
                            .pipe(
                                this.requestStatusService.handleError(),
                                this.requestStatusService.handleSuccess('Новость успешно создана!'),
                                takeUntilDestroyed(this.destroyRef)
                            )
                            .subscribe();
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Конвертация туи-файла в base64
     */
    convertTuiFileLikeToBase64(file: File): Observable<string> {
        return new Observable<string>((observer) => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1]; // убираем data:*/*;base64,
                observer.next(base64);
                observer.complete();
            };

            reader.onerror = (err) => {
                observer.error(err);
            };

            reader.readAsDataURL(file);
        });
    }
}
