import { ISeasonInfoDto, ISeasonInfo } from './season-info.interface';
import { ISeasonResultEntryDto, ISeasonResultEntry } from './season-result-entry.interface';
import { IMatchPlayerDto, IMatchPlayer } from './match-result-request.interface';

/**
 * Преобразует строковую дату в объект Date.
 *
 * Возвращает `null` для отсутствующих дат, нулевых значений protobuf
 * ("0001-01-01T00:00:00Z") и невалидных строк.
 *
 * @param rawDate Исходная строка даты в формате ISO 8601.
 * @returns Объект Date или `null`.
 */
function parseDate(rawDate: string | undefined): Date | null {
    if (!rawDate) {
        return null;
    }

    if (rawDate.startsWith('0001-01-01') || rawDate === '0001-01-01T00:00:00Z') {
        return null;
    }

    const parsed = new Date(rawDate);

    return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Форматирует дату в локальный формат.
 *
 * @param date Объект Date.
 * @returns Строка в формате "DD.MM.YY - HH:mm".
 */
function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

/**
 * Форматирует дату с fallback на "—".
 *
 * @param rawDate Исходная строка даты.
 * @returns Строка в формате "DD.MM.YY - HH:mm" или "—".
 */
function formatDateOrFallback(rawDate: string | undefined): string {
    const date = parseDate(rawDate);

    return date ? formatDate(date) : '—';
}

/**
 * Преобразует DTO информации о сезоне в UI-модель.
 *
 * @param dto DTO сезона от API.
 * @returns UI-модель сезона.
 */
export function mapDtoToSeasonInfo(dto: ISeasonInfoDto): ISeasonInfo {
    const startedAt = parseDate(dto.started_at);
    const endedAt = parseDate(dto.ended_at);

    return {
        id: dto.id,
        number: dto.number,
        startedAt,
        formattedStartedAt: startedAt ? formatDate(startedAt) : '—',
        endedAt,
        formattedEndedAt: endedAt ? formatDate(endedAt) : '—',
        isActive: !dto.ended_at,
    };
}

/**
 * Преобразует DTO записи лидерборда в UI-модель.
 *
 * @param dto DTO записи от API.
 * @returns UI-модель записи лидерборда.
 */
export function mapDtoToSeasonResultEntry(dto: ISeasonResultEntryDto): ISeasonResultEntry {
    return {
        playerId: dto.player_id,
        playerName: dto.player_name,
        elo: dto.elo,
        wins: dto.wins,
        kills: dto.kills,
    };
}

/**
 * Преобразует UI-модель участника матча в DTO для отправки на API.
 *
 * @param player UI-модель участника.
 * @returns DTO участника.
 */
export function mapMatchPlayerToDto(player: IMatchPlayer): IMatchPlayerDto {
    return {
        player_id: player.playerId,
        player_name: player.playerName,
        place: player.place,
        kills: player.kills,
    };
}
