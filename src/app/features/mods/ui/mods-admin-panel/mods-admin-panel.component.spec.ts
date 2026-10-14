import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TuiAlertService } from '@taiga-ui/core';
import { of, throwError } from 'rxjs';
import { registerTranslations } from '@core/i18n/translations';
import { MODS_I18N } from '@core/i18n/translations/features/mods.i18n';
import { ModLookup, ModRelease, ServerMod, ServerModApiService } from '@entities/server-mod';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { ModsAdminPanelComponent } from './mods-admin-panel.component';

/**
 * Версия мода.
 *
 * @param version Номер.
 * @param gameVersions Версии игры.
 * @returns Версия.
 */
function release(version: string, gameVersions: string[]): ModRelease {
    return { version, gameVersions, fileUrl: '', fileName: '', fileSize: 0, releasedAt: null };
}

/**
 * Мод для списка.
 *
 * @param id Идентификатор.
 * @returns Мод.
 */
function mod(id: string): ServerMod {
    return {
        id,
        name: id,
        author: '',
        logoUrl: '',
        moddbUrl: '',
        side: 'MOD_SIDE_BOTH',
        audience: 'MOD_AUDIENCE_REQUIRED',
        note: '',
        summary: '',
        release: release('1.0.0', ['1.22.7']),
        latestVersion: '',
        releases: [release('1.0.0', ['1.22.7'])],
    };
}

/**
 * Доступ к защищённым членам компонента из теста.
 */
type Panel = ModsAdminPanelComponent & Record<string, any>;

describe('ModsAdminPanelComponent', () => {
    let api: jasmine.SpyObj<ServerModApiService>;
    let panel: Panel;

    /**
     * Идентификаторы модов в списке панели.
     *
     * @returns Идентификаторы по порядку.
     */
    const ids = (): string[] => ((panel['mods']() as ServerMod[] | null) ?? []).map((item) => item.id);

    beforeEach(() => {
        registerTranslations(MODS_I18N);
        api = jasmine.createSpyObj<ServerModApiService>('ServerModApiService', [
            'listAdmin',
            'lookup',
            'add',
            'update',
            'delete',
            'reorder',
            'refresh',
        ]);
        api.listAdmin.and.returnValue(of([mod('a'), mod('b'), mod('c')]));

        TestBed.configureTestingModule({
            providers: [
                { provide: ServerModApiService, useValue: api },
                { provide: TuiAlertService, useValue: { open: () => of(undefined) } },
                { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
            ],
        });

        panel = runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new ModsAdminPanelComponent()) as Panel;
        panel.ngOnInit();
    });

    it('загружает список', () => {
        expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('после поиска выбирает версию, подходящую к игре сервера, а не самую новую', () => {
        const found: ModLookup = {
            mod: mod('new'),
            releases: [release('3.0.0', ['1.23.0']), release('2.0.0', ['1.22.7']), release('1.0.0', ['1.21.5'])],
        };
        api.lookup.and.returnValue(of(found));

        panel['link'].set('https://mods.vintagestory.at/new');
        panel['find']();

        expect(panel['draftRelease']()?.version).toBe('2.0.0');
    });

    it('серверный мод по умолчанию не показывается игрокам', () => {
        api.lookup.and.returnValue(of({ mod: { ...mod('srv'), side: 'MOD_SIDE_SERVER' }, releases: [release('1.0.0', [])] }));

        panel['link'].set('srv');
        panel['find']();

        expect(panel['draftAudience']()).toBe('MOD_AUDIENCE_HIDDEN');
    });

    it('ошибка 404 при поиске — понятный текст', () => {
        api.lookup.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        panel['link'].set('nope');
        panel['find']();

        expect(panel['formError']()).toBe('mods.admin.errors.notFound');
    });

    it('добавленный мод встаёт первым, форма закрывается', () => {
        api.lookup.and.returnValue(of({ mod: mod('new'), releases: [release('1.0.0', ['1.22.7'])] }));
        api.add.and.returnValue(of(mod('new')));

        panel['link'].set('new');
        panel['find']();
        panel['add']();

        expect(api.add).toHaveBeenCalledWith(jasmine.objectContaining({ query: 'new', version: '1.0.0' }));
        expect(ids()).toEqual(['new', 'a', 'b', 'c']);
        expect(panel['found']()).toBeNull();
    });

    it('порядок меняется сразу и откатывается, если сервер отказал', () => {
        api.reorder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

        panel['move'](0, 1);

        expect(api.reorder).toHaveBeenCalledWith(['b', 'a', 'c']);
        expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('подпись версии отмечает совместимость', () => {
        expect(panel['releaseLabel'](release('2.0.0', ['1.22.7']))).toContain('подходит к 1.22.7');
        expect(panel['releaseLabel'](release('1.0.0', ['1.21.5']))).toContain('для 1.21.x');
    });

    it('после обновления версии снимок версий сохраняется', () => {
        const updated = { ...mod('a'), release: release('2.0.0', ['1.22.7']), releases: [] };
        api.update.and.returnValue(of(updated));

        panel['setRelease'](mod('a'), release('2.0.0', ['1.22.7']));

        const saved = (panel['mods']() as ServerMod[])[0];
        expect(saved.release?.version).toBe('2.0.0');
        expect(saved.releases.length).toBe(1);
    });
});
