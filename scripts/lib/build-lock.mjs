/**
 * Замок на сборку: два процесса `ng build` пишут в `dist/` одновременно и мешают
 * друг другу — падают на копировании ассетов (`ENOENT` на иконке Taiga) или
 * оставляют выход недописанным.
 *
 * Замок держит файл `.build.lock` в корне репозитория. Внутри — pid и метка
 * процесса. Замок мёртвого процесса (pid не отвечает) считается брошенным
 * и забирается без вопросов.
 *
 * Дочерним процессам признак передаётся переменной `LH_BUILD_LOCK_HELD`:
 * `verify.mjs` берёт замок на весь прогон и его шаги не пытаются взять его снова.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень репозитория. */
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Путь к файлу замка. */
const LOCK_FILE = join(ROOT, '.build.lock');

/** Переменная, которой родитель сообщает: замок уже у него. */
export const LOCK_ENV = 'LH_BUILD_LOCK_HELD';

/**
 * Проверяет, жив ли процесс.
 *
 * @param pid Идентификатор процесса.
 * @returns true, если процесс отвечает на сигнал 0.
 */
function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * Читает содержимое замка.
 *
 * @returns Данные владельца либо null, если файла нет или он повреждён.
 */
function readLock() {
    try {
        return JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Берёт замок на сборку.
 *
 * @param label Что именно собирается — попадает в сообщение о занятом замке.
 * @returns Функция снятия замка; её же можно звать дважды.
 */
export function acquireBuildLock(label = 'сборка') {
    if (process.env[LOCK_ENV] === '1') {
        return () => {};
    }

    if (existsSync(LOCK_FILE)) {
        const holder = readLock();

        // Живой владелец — второй сборке работать негде: падаем сразу и говорим кто.
        if (holder?.pid && holder.pid !== process.pid && isAlive(holder.pid)) {
            console.log(
                `Отказ: ${label} уже идёт в процессе ${holder.pid} (${holder.label}). ` +
                    'Дождитесь его конца: параллельные сборки пишут в один dist.'
            );
            process.exit(1);
        }

        rmSync(LOCK_FILE, { force: true });
    }

    writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, label, at: new Date().toISOString() }));
    process.env[LOCK_ENV] = '1';

    return () => {
        const holder = readLock();

        if (holder?.pid === process.pid) {
            rmSync(LOCK_FILE, { force: true });
        }

        delete process.env[LOCK_ENV];
    };
}