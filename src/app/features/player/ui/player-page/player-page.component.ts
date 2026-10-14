import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    PLATFORM_ID,
    signal,
    TemplateRef,
    viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService, TranslatePipe, AmountPipe } from '@core/i18n';
import { SeoService } from '@core/services/seo.service';
import { SettlementDisplayNamePipe } from '@entities/settlement';
import { Role, UserService } from '@entities/user';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button/share-button.component';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { PlayerProfileService } from '../../api/player-profile.service';
import { PlayerProfile } from '../../model/player-profile';
import { PlayerAboutComponent } from '../player-about/player-about.component';
import { PlayerBadgesComponent } from '../player-badges/player-badges.component';
import { bannerById, PlayerFrameComponent, ProfileBannerComponent } from '@entities/player-style';
import { ProfileStyleService } from '../../api/profile-style.service';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Состояние страницы игрока.
 */
type PlayerPageState =
    | { status: 'loading' }
    | { status: 'not-found'; nickname: string }
    | { status: 'ready'; profile: PlayerProfile };

/**
 * Публичная страница игрока `/player/:nick`: аватар, статус, поселение,
 * статистика с местами в рейтинге, «Голодные игры» и значки.
 *
 * Данные — открытые (таблица лидеров, поселения), поэтому страница видна и гостям.
 */
@Component({
    selector: 'app-player-page',
    templateUrl: './player-page.component.html',
    styleUrl: './player-page.component.less',
    imports: [AmountPipe,
        RouterLink,
        TuiIcon,
        TranslatePipe,
        RelativeTimeComponent,
        ShareButtonComponent,
        SettlementDisplayNamePipe,
        PlayerAboutComponent,
        PlayerBadgesComponent,
        PlayerFrameComponent,
        ProfileBannerComponent,
        TuiPreview,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerPageComponent {
    private readonly profiles = inject(PlayerProfileService);
    private readonly users = inject(UserService);
    private readonly styles = inject(ProfileStyleService);
    private readonly seo = inject(SeoService);
    private readonly i18n = inject(I18nService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly previews = inject(TuiPreviewDialogService);

    /**
     * Шаблон просмотра баннера целиком.
     */
    private readonly bannerPreview = viewChild<TemplateRef<TuiDialogContext>>('bannerPreview');

    /**
     * Состояние страницы.
     */
    protected readonly state = toSignal(
        inject(ActivatedRoute).paramMap.pipe(
            map((params) => decodeURIComponent(params.get('nick') ?? '')),
            switchMap((nickname) =>
                !this.isBrowser
                    ? of<PlayerPageState>({ status: 'loading' })
                    : this.profiles.load(nickname).pipe(
                          map(
                              (profile): PlayerPageState =>
                                  profile ? { status: 'ready', profile } : { status: 'not-found', nickname }
                          ),
                          catchError(() => of<PlayerPageState>({ status: 'not-found', nickname })),
                          startWith<PlayerPageState>({ status: 'loading' })
                      )
            )
        ),
        { initialValue: { status: 'loading' } as PlayerPageState }
    );

    /**
     * Профиль, если загружен.
     */
    protected readonly profile = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.profile : null;
    });

    /**
     * Оформление игрока: своё выбранное или по умолчанию.
     */
    protected readonly style = computed(() => {
        const profile = this.profile();
        return profile ? this.styles.styleOf(profile) : null;
    });

    /**
     * Баннер шапки; `null` — игрок выбрал «без баннера», шапка без картинки.
     */
    protected readonly banner = computed(() => {
        const id = this.style()?.bannerId;
        return id && id !== 'none' ? bannerById(id) : null;
    });

    /**
     * Титул под ником — значок, выбранный игроком.
     */
    protected readonly title = computed(() => {
        const key = this.style()?.titleKey;
        return this.profile()?.badges.find((badge) => badge.key === key) ?? null;
    });

    /**
     * Состояние входа: `userId` и роли заполняются вместе с ним.
     */
    private readonly isAuthenticated = toSignal(this.users.authState$, { initialValue: false });

    /**
     * Профиль открыт его владельцем.
     */
    protected readonly isOwner = computed(() => {
        this.isAuthenticated();

        return this.users.userId === this.profile()?.userId;
    });

    /**
     * У текущего пользователя есть право скрыть чужое описание.
     */
    protected readonly canModerate = computed(() => {
        this.isAuthenticated();

        return this.users.roles.includes(Role.admin);
    });

    /**
     * Описание, сохранённое на этой странице без перезагрузки.
     */
    private readonly aboutOverride = signal<string | null>(null);

    /**
     * Профиль с учётом только что сохранённого описания.
     */
    protected readonly aboutProfile = computed(() => {
        const profile = this.profile();
        const override = this.aboutOverride();

        return !profile || override === null ? profile : { ...profile, about: override };
    });

    /**
     * Запоминает новое описание «О себе».
     *
     * @param about Текст, который принял сервер.
     */
    protected onAboutChanged(about: string): void {
        this.aboutOverride.set(about);
    }

    /**
     * Открывает баннер целиком в окне просмотра.
     */
    protected openBanner(): void {
        const template = this.bannerPreview();
        if (template) {
            this.previews.open(template).subscribe();
        }
    }

    public constructor() {
        // SEO обновляем при каждом новом состоянии.
        effect(() => this.applySeo(this.state()));
    }

    /**
     * Ставит заголовок и описание страницы.
     *
     * @param state Состояние страницы.
     */
    private applySeo(state: PlayerPageState): void {
        if (state.status === 'not-found') {
            this.seo.setSeoTags({
                title: this.i18n.translate('player.notFound.title') + ' — Last Hearth',
                description: this.i18n.translate('player.notFound.text'),
                keywords: '',
                robots: 'noindex, follow',
            });
        } else if (state.status === 'ready') {
            const { profile } = state;
            this.seo.setSeoTags({
                title: this.i18n.translate('player.seoTitle', { name: profile.nickname }),
                description: this.i18n.translate('player.seoDescription', {
                    name: profile.nickname,
                    hours: Math.round(profile.hours),
                }),
                keywords: '',
                robots: 'noindex, follow',
                url: `${SITE_URL}/player/${encodeURIComponent(profile.nickname)}`,
            });
        }
    }
}
