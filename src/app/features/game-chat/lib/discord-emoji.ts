/**
 * Словарь Discord-эмодзи в Unicode.
 */
const DISCORD_EMOJI_MAP: Record<string, string> = {
    outbox_tray: '📤',
    inbox_tray: '📥',
    skull: '💀',
    skull_crossbones: '☠️',
    crossed_swords: '⚔️',
    warning: '⚠️',
    white_check_mark: '✅',
    x: '❌',
    heart: '❤️',
    fire: '🔥',
    star: '⭐',
    tada: '🎉',
    wave: '👋',
    arrow_up: '⬆️',
    arrow_down: '⬇️',
    arrow_left: '⬅️',
    arrow_right: '➡️',
    moneybag: '💰',
    gem: '💎',
    scroll: '📜',
    map: '🗺️',
    house: '🏠',
    hammer: '🔨',
    pick: '⛏️',
    axe: '🪓',
    bow_and_arrow: '🏹',
    shield: '🛡️',
    crown: '👑',
    trident: '🔱',
    dagger: '🗡️',
    bomb: '💣',
    boomerang: '🪃',
    magic_wand: '🪄',
    crystal_ball: '🔮',
    book: '📖',
    books: '📚',
    scroll1: '📜',
    page_with_curl: '📃',
    memo: '📝',
    pencil: '✏️',
    pen: '🖊️',
    paintbrush: '🖌️',
    crayon: '🖍️',
    magnifying_glass: '🔍',
    key: '🔑',
    lock: '🔒',
    unlock: '🔓',
    gear: '⚙️',
    tools: '🛠️',
    nut_and_bolt: '🔩',
    brick: '🧱',
    wood: '🪵',
    rock: '🪨',
    mine: '⛏️',
    tent: '⛺',
    campfire: '🔥',
    flashlight: '🔦',
    lantern: '🏮',
    candle: '🕯️',
    hourglass: '⏳',
    stopwatch: '⏱️',
    clock: '🕐',
    alarm_clock: '⏰',
    calendar: '📅',
    date: '📅',
    clock12: '🕛',
    clock1: '🕐',
    clock2: '🕑',
    clock3: '🕒',
    clock4: '🕓',
    clock5: '🕔',
    clock6: '🕕',
    clock7: '🕖',
    clock8: '🕗',
    clock9: '🕘',
    clock10: '🕙',
    clock11: '🕚',
};

/**
 * Заменяет Discord-эмодзи вида `:name:` на Unicode-эмодзи.
 *
 * @param text Исходный текст.
 * @returns Текст с заменёнными эмодзи.
 */
export function replaceDiscordEmojis(text: string): string {
    return text.replace(/:([a-z0-9_+-]+):/g, (match, name) => {
        const emoji = DISCORD_EMOJI_MAP[name.toLowerCase()];

        return emoji ?? match;
    });
}
