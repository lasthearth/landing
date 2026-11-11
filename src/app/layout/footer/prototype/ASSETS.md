# Ассеты футера: спецификации и промпты

> **Что это.** Растровые слои для вариантов футера (`ember-field`,
> `hearth-gate`, `night-skyline`). Каждый слой необязателен: пока файла нет,
> вариант рисует фолбэк на CSS/SVG. Положил файл с нужным именем в
> `public/footer-assets/` — слой подхватился, менять код не нужно.

## Куда класть

Все файлы — в `public/footer-assets/`, имена строго такие:

| Файл                  | Размер (px) | Фон        | Слой                                                                                  |
| --------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------- |
| `skyline-far.png`     | 3000×400    | прозрачный | дальний: ели и холмы, сплошной `#1a1816`                                              |
| `skyline-village.png` | 3000×500    | прозрачный | средний: крыши и башни, сплошной `#2a2722`                                            |
| `skyline-wall.png`    | 3000×300    | прозрачный | ближний: частокол и ворота, сплошной `#141210`                                        |
| `burnt-edge.png`      | 2400×220    | прозрачный | обгоревшая кромка: сверху прозрачно, ниже рваной линии `#1a1816` с янтарным свечением |
| `ember.png`           | 96×96       | прозрачный | одна искра с радиальным спадом                                                        |
| `moon.png`            | 400×400     | прозрачный | луна с мягким ореолом                                                                 |

Цвета слоёв — значения токенов проекта: `--lh-night` `#1a1816`,
`--lh-night-2` `#2a2722`, `--lh-night-deep` `#1a110d`, акцент огня
`--lh-accent` `#ff7920`, пергамент `--lh-parchment-3` `#f5eedd`.
Прозрачность — настоящая альфа, не белая заливка.

Бесшовность: слои повторяются по горизонтали (`repeat-x`). Если стык виден,
слой переводят в один широкий кадр (`background-size: 100% 100%`) — скажи,
переключу.

## Промпты

Английский текст моделей картинок понимают стабильнее. Копируй целиком.

**skyline-far.png**

> Seamless horizontally tileable silhouette of a distant conifer forest ridge
> and low hills at night. One flat solid colour #1a1816, fully transparent
> background, no gradients, no outlines, no sky, no stars. Crisp vector-like
> edges. Canvas 3000×400 px, silhouette occupies the bottom 70 % of the frame,
> left and right edges match for tiling.

**skyline-village.png**

> Seamless horizontally tileable silhouette of a medieval wooden village
> skyline: pitched rooftops, a watchtower with a small flag, chimneys, a chapel
> spire. One flat solid colour #2a2722, fully transparent background, no
> gradients, no outlines. Crisp edges. Canvas 3000×500 px, silhouette occupies
> the bottom 80 %, left and right edges match for tiling.

**skyline-wall.png**

> Seamless horizontally tileable silhouette of a wooden palisade fortification
> wall with a central gate tower and battlements. One flat solid colour
> #141210, fully transparent background, no gradients, no outlines. Crisp
> edges. Canvas 3000×300 px, silhouette occupies the bottom 90 %, left and right
> edges match for tiling.

**burnt-edge.png**

> Seamless horizontally tileable strip of a burnt, torn parchment edge seen
> from above: the lower part is solid charcoal #1a1816 with a jagged charred
> upper boundary and a thin warm ember glow (#ff7920) along the tear; the upper
> part is fully transparent. Subtle soot speckles. No text. Canvas 2400×220 px.

**ember.png**

> A single tiny glowing ember spark on a fully transparent background: bright
> warm core #ffd9a0 fading through #ff7920 to transparent, soft radial falloff,
> slightly irregular shape, centred, 96×96 px, nothing else in the frame.

**moon.png**

> A soft glowing full moon on a fully transparent background: pale warm-white
> disc #f5eedd with a gentle halo fading to transparent, subtle crater shading,
> centred, 400×400 px, nothing else in the frame.

## Если генерить не хочется: готовые свободные наборы

- **Kenney.nl**, packs «Backgrounds: fantasy» и «Parallax backgrounds» — CC0,
  слои уже прозрачные PNG и уже бесшовные.
- **OpenGameArt.org**, запросы `night forest silhouette parallax`,
  `village silhouette`, `fortress wall silhouette` — фильтр CC0 или CC-BY;
  для CC-BY нужна строка атрибуции в футере.
- **Pexels / Unsplash**, запросы `campfire sparks long exposure`,
  `night forest silhouette` — лицензия свободная, но силуэты придётся
  обтравливать: у стоков нет прозрачного фона.

## Проверка

Открой в браузере `http://127.0.0.1:4310/home?fvariant=night-skyline&nowelcome`
(или `hearth-gate`, `ember-field`) и прокрути до подвала. Для стоп-кадров
подойдёт любой headless Chrome по CDP; рабочий хелпер лежит в
`/tmp/lh-shot.mjs`:

```bash
node /tmp/lh-shot.mjs --url "http://127.0.0.1:4310/home?fvariant=night-skyline&nowelcome" \
  --out shots/footer-night-skyline-1440.png --scroll 99999 --wait 6000
```

Смотреть: слои на месте по низу футера, стык не виден, луна не перекрывает
текст, при `prefers-reduced-motion` картинка статична.
