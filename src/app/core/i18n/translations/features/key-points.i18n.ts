/**
 * Переводы страницы «Ключевые точки» `/key-points`.
 *
 * ЧЕРНОВИК: названия улучшений и бонусы в `points.*.nodes` — заглушки до утверждения уровней.
 * Структура схем (связи, стоимость) — в `features/key-points/config/*-scheme.constant.ts`;
 * id узла там должен совпадать с ключом в `nodes`.
 */
export const KEY_POINTS_I18N = {
    ru: {
        keyPoints: {
            title: 'Ключевые точки',
            seoTitle: 'Ключевые точки и их прокачка — Last Hearth',
            breadcrumb: 'Ключевые точки',
            intro: 'Ключевые точки — особые локации эксклава, которые дают выгоды селению-владельцу. Здесь видно, как прокачать каждый тип точки: какие улучшения открываются, сколько они стоят и какую специализацию выбрать.',
            draft: 'Схемы предварительные: уровни, стоимость и бонусы ещё уточняются и могут измениться.',
            tabsLabel: 'Типы ключевых точек',
            howTo: 'Нажмите на улучшение, чтобы увидеть подробности, и отмечайте построенное — схема подскажет, что откроется дальше.',
            scheme: {
                label: 'Схема прокачки: {{name}}',
                or: 'или',
            },
            legend: {
                title: 'Обозначения',
                optional: 'любое из',
            },
            states: {
                built: 'Построено',
                available: 'Можно строить',
                locked: 'Закрыто',
                excluded: 'Выбрана другая ветка',
            },
            kinds: {
                level: 'Уровень точки',
                upgrade: 'Улучшение',
                choice: 'На выбор',
            },
            details: {
                cost: 'Стоимость',
                requires: 'Нужно',
                requiresAny: 'Любое из:',
                unlocks: 'Открывает',
                choiceNote: 'На этой ступени можно выбрать только один вариант.',
                free: 'Отдельно не оплачивается.',
                action: {
                    available: 'Отметить построенным',
                    built: 'Убрать из плана',
                    locked: 'Сначала постройте нужное',
                    excluded: 'Выбран другой вариант',
                    automatic: 'Открывается автоматически',
                },
            },
            plan: {
                title: 'Ваш план',
                empty: 'Отмечайте улучшения построенными — здесь сложится общая стоимость.',
                count: 'Отмечено {{count}} из {{total}}. Всего понадобится:',
                reset: 'Сбросить',
            },
            resources: {
                ducats: { one: 'дукат', few: 'дуката', many: 'дукатов', other: 'дуката' },
                silver: { one: 'серебряная', few: 'серебряные', many: 'серебряных', other: 'серебряной' },
                copper: { one: 'медная', few: 'медные', many: 'медных', other: 'медной' },
                coins: { one: 'монета', few: 'монеты', many: 'монет', other: 'монеты' },
                timber: { one: 'бревно', few: 'бревна', many: 'брёвен', other: 'бревна' },
                stone: { one: 'блок камня', few: 'блока камня', many: 'блоков камня', other: 'блока камня' },
                metal: { one: 'слиток', few: 'слитка', many: 'слитков', other: 'слитка' },
                labor: { one: 'рабочий', few: 'рабочих', many: 'рабочих', other: 'рабочего' },
            },
            short: {
                ducats: 'зол.',
                silver: 'сер.',
                copper: 'мед.',
                coins: 'мон.',
                timber: 'бр.',
                stone: 'кам.',
                metal: 'сл.',
                labor: 'раб.',
            },
            moneyNote: 'Цены — в монетах сервера: 1 дукат (золотая) = 100 серебряных, 1 серебряная = 10 медных.',
            points: {
                mine: {
                    name: 'Шахта',
                    tagline: 'Руда, уголь и камень',
                    description:
                        'Ключевая точка с тремя монументами: даёт владельцу постоянный приток руды и камня. Чем глубже шахта, тем богаче добыча и тем дороже её удержать.',
                    nodes: {
                        adit: {
                            title: 'Штольня',
                            effect: 'Открывает добычу: +1 ящик руды в реальный день.',
                        },
                        props: {
                            title: 'Деревянная крепь',
                            effect: 'Шахта не обваливается при набеге: защита монументов +10%.',
                        },
                        lift: {
                            title: 'Ворот-подъёмник',
                            effect: 'Добыча поднимается быстрее: +15% к выдаче руды.',
                        },
                        mine2: {
                            title: 'Рудник',
                            effect: 'Уровень II: +2 ящика руды и уголь в реальный день.',
                        },
                        deep: {
                            title: 'Глубокий забой',
                            effect: 'Специализация: шанс редкой руды и самоцветов.',
                        },
                        sorting: {
                            title: 'Рудная сортировка',
                            effect: 'Специализация: руда приходит уже обогащённой, +25% металла.',
                        },
                        carts: {
                            title: 'Рельсы и вагонетки',
                            effect: 'Доставка в лен без каравана, склад шахты больше.',
                        },
                        mine3: {
                            title: 'Горный двор',
                            effect: 'Уровень III: максимальная добыча и собственная стража шахты.',
                        },
                    },
                },
                fort: {
                    name: 'Форт',
                    tagline: 'Оборона и контроль дорог',
                    description:
                        'Укреплённая точка на перекрёстке земель. Даёт владельцу обзор, защиту соседних наделов и право держать гарнизон.',
                    nodes: {
                        outpost: {
                            title: 'Застава',
                            effect: 'Флаг лена над точкой, оповещение о чужих у стен.',
                        },
                        palisade: {
                            title: 'Частокол',
                            effect: 'Первая линия стен: время набега на точку +10 минут.',
                        },
                        watchtower: {
                            title: 'Сторожевая башня',
                            effect: 'Обзор округи: набег на соседние наделы виден заранее.',
                        },
                        fort2: {
                            title: 'Форт',
                            effect: 'Уровень II: точка выдерживает осаду, монумент прочнее.',
                        },
                        garrison: {
                            title: 'Гарнизон',
                            effect: 'Специализация: защитники точки получают бонус в бою.',
                        },
                        walls: {
                            title: 'Каменные стены',
                            effect: 'Специализация: места пролома сокращаются вдвое.',
                        },
                        armory: {
                            title: 'Оружейная',
                            effect: 'Хранилище снаряжения, починка оружия на месте.',
                        },
                        citadel: {
                            title: 'Цитадель',
                            effect: 'Уровень III: форт прикрывает союзные наделы в радиусе.',
                        },
                    },
                },
                harbor: {
                    name: 'Воздушная гавань',
                    tagline: 'Торговля с Империей',
                    description:
                        'Крупный воздушный торговый порт, позволяющий торговать с Империей путём отправки аэростатов и дирижаблей.',
                    nodes: {
                        access: {
                            title: 'Право на гавань',
                            effect: 'Доступ к возведению воздушной гавани на одной из ключевых точек — по предварительному проекту, как с великим строением.',
                        },
                        balloon: {
                            title: 'Аэростатная мачта',
                            effect: 'Открывает покупку аэростата за 20 дукатов.',
                        },
                        supplies: {
                            title: 'Имперские поставки',
                            effect: 'Открывает поставки строительных материалов из Империи.',
                        },
                        discount10: {
                            title: 'Скидка поставщика',
                            effect: 'Скидка 10% на покупку ресурсов в торговой точке.',
                        },
                        airship: {
                            title: 'Дирижабельная пристань',
                            effect: 'Открывает покупку дирижабля за 15 дукатов.',
                        },
                        discount15: {
                            title: 'Оптовый договор',
                            effect: 'Скидка 15% на покупку ресурсов в торговой точке.',
                        },
                        empireTrade: {
                            title: 'Торговля с Империей',
                            effect: 'Продажа ресурсов в Империю за монеты. Торговый дирижабль из Империи прибывает раз в неделю и без улучшений увозит только один двойной сундук ресурсов — 36 слотов.',
                        },
                        discount25: {
                            title: 'Имперская привилегия',
                            effect: 'Скидка 25% на покупку ресурсов в торговой точке.',
                        },
                        rivetedSale: {
                            title: 'Клёпаный товар',
                            effect: 'Империя начинает покупать клёпаные блоки из металлов.',
                        },
                        metals: {
                            title: 'Металлы',
                            effect: 'Ветка продажи металлов. Слитки можно продавать сразу, клёпаные блоки — только после «Клёпаного товара».',
                        },
                        cargo: {
                            title: 'Трюм дирижабля',
                            effect: 'Ветка улучшения грузоподъёмности торгового дирижабля Империи.',
                        },
                        luxury: {
                            title: 'Предметы роскоши',
                            effect: 'Ветка продажи предметов роскоши.',
                        },
                        metal1: {
                            title: 'Медь',
                            effect: 'Империя покупает: слиток меди — 50 медных/шт; клёпаный блок меди — 4 серебряных/шт.',
                        },
                        metal2: {
                            title: 'Латунь',
                            effect: 'Империя покупает: слиток латуни — 60 медных/шт; клёпаный блок латуни — 4 серебряных 80 медных/шт.',
                        },
                        metal3: {
                            title: 'Золото',
                            effect: 'Империя покупает: слиток золота — 2 серебряных 50 медных/шт; клёпаный блок золота — 20 серебряных/шт.',
                        },
                        metal4: {
                            title: 'Висмут',
                            effect: 'Империя покупает: слиток висмута — 55 медных/шт; клёпаный блок висмута — 4 серебряных 40 медных/шт.',
                        },
                        metal5: {
                            title: 'Серебро',
                            effect: 'Империя покупает: слиток серебра — 2 серебряных 50 медных/шт; клёпаный блок серебра — 20 серебряных/шт.',
                        },
                        metal6: {
                            title: 'Мельхиор',
                            effect: 'Империя покупает: слиток мельхиора — 3 серебряных/шт; клёпаный блок мельхиора — 24 серебряных/шт.',
                        },
                        metal7: {
                            title: 'Железо',
                            effect: 'Империя покупает: слиток обычного железа — 4 серебряных/шт; клёпаный блок железа — 32 серебряных/шт.',
                        },
                        hold1: {
                            title: 'Расширенный трюм',
                            effect: 'Грузоподъёмность дирижабля +1 одиночный сундук (+16 слотов).',
                        },
                        hold2: {
                            title: 'Второй трюм',
                            effect: 'Грузоподъёмность дирижабля ещё +1 одиночный сундук (+16 слотов).',
                        },
                        hold3: {
                            title: 'Сдвоенный трюм',
                            effect: 'Два одиночных сундука объединяются в один двойной: вместо +32 слотов — +36.',
                        },
                        lux1: {
                            title: 'Искусство и диковины',
                            effect: 'Империя покупает картины, гобелены (полные, не поштучно), детские игрушки (категория хлама), художественную бутыль, резонансные цилиндры — 1 серебряная/шт.',
                        },
                        lux2: {
                            title: 'Наряды и украшения',
                            effect: 'Империя покупает одежду (не крафтовую), украшения, маски, головные уборы — 2 серебряных/шт.',
                        },
                        lux3: {
                            title: 'Драгоценные камни',
                            effect: 'Империя покупает драгоценные камни от высокого качества — 3 серебряных/шт.',
                        },
                        lux4: {
                            title: 'Артефакты',
                            effect: 'Империя покупает артефакты — 5 серебряных/шт: черепа (хрустальный, деформированный, саблезуба), мумифицированную голову, голову Эйдолона, статуэтки, насекомое в янтаре, древнюю вырезанную голову, реликварий обречённого, серебряную и золотую шестерёнки, песочные часы, гунбай, прототип странного устройства, странное устройство, зоолит, мультитул.',
                        },
                    },
                },
                industry: {
                    name: 'Промышленная',
                    tagline: 'Плавка, слитки и сталь',
                    description:
                        'Крупное промышленное предприятие, позволяющее быстро и в больших объёмах перерабатывать руду в слитки, плавить железо, варить сталь.',
                    nodes: {
                        works: {
                            title: 'Закладка мануфактуры',
                            effect: 'Предприятие на точке: 2 сыродутные печи (бесконечные), 2 медные наковальни и 4 горна.',
                        },
                        bloomery1: {
                            title: 'Малая плавильня',
                            effect: '+2 сыродутные печи — всего 4.',
                        },
                        bloomery2: {
                            title: 'Большая плавильня',
                            effect: '+2 сыродутные печи — всего 6.',
                        },
                        bloomery3: {
                            title: 'Плавильный двор',
                            effect: '+2 сыродутные печи — всего 8.',
                        },
                        anvilBronze: {
                            title: 'Бронзовые наковальни',
                            effect: 'Медные наковальни заменяются бронзовыми.',
                        },
                        anvilIron: {
                            title: 'Железные наковальни',
                            effect: 'Бронзовые наковальни заменяются железными.',
                        },
                        beehive: {
                            title: 'Ульевая печь',
                            effect: 'Начало возведения ульевой печи. Открывается вместе с предприятием.',
                        },
                        beehiveBase: {
                            title: 'Основание печи',
                            effect: 'Заложено основание ульевой печи — пользоваться ей пока нельзя.',
                        },
                        beehiveFiring: {
                            title: 'Свод и обжиг',
                            effect: 'Второй уровень ульевой печи: в ней уже можно обжигать.',
                        },
                        beehiveSecond: {
                            title: 'Вторая ульевая печь',
                            effect: 'На предприятии появляется вторая ульевая печь.',
                        },
                        beehiveRepair: {
                            title: 'Ремонт ульевой печи',
                            effect: 'Починка одной ульевой печи.',
                        },
                        beehiveDiscount: {
                            title: 'Печных дел мастер',
                            effect: 'Починка ульевых печей дешевле на 25%.',
                        },
                        steelworks: {
                            title: 'Сталеварня',
                            effect: 'Начало стального дела: открывает кирпичи и постройку стальных печей.',
                        },
                        steelRepair: {
                            title: 'Ремонт стальной печи',
                            effect: 'Починка одной стальной печи.',
                        },
                        steelDiscount: {
                            title: 'Мастер-сталевар',
                            effect: 'Починка стальных печей дешевле на 25%.',
                        },
                        bricks1: {
                            title: 'Простая кладка',
                            effect: '1-й уровень кирпичей: открывает постройку первой стальной печи.',
                        },
                        bricks2: {
                            title: 'Крепкая кладка',
                            effect: '2-й уровень кирпичей: открывает постройку второй стальной печи.',
                        },
                        bricks3: {
                            title: 'Мастерская кладка',
                            effect: '3-й уровень кирпичей: открывает постройку третьей стальной печи.',
                        },
                        furnace1Stage1: {
                            title: 'Закладка печи',
                            effect: 'Постройка первой стальной печи, этап 1 из 3.',
                        },
                        furnace1Stage2: {
                            title: 'Кладка стен',
                            effect: 'Постройка первой стальной печи, этап 2 из 3.',
                        },
                        furnace1Stage3: {
                            title: 'Свод печи',
                            effect: 'Постройка первой стальной печи, этап 3 из 3.',
                        },
                        steel1: {
                            title: 'Стальная печь',
                            effect: 'Готова первая стальная печь: на предприятии 1 стальная печь. Открывается сама после третьего этапа.',
                        },
                        furnace2Stage1: {
                            title: 'Закладка печи',
                            effect: 'Постройка второй стальной печи, этап 1 из 3.',
                        },
                        furnace2Stage2: {
                            title: 'Кладка стен',
                            effect: 'Постройка второй стальной печи, этап 2 из 3.',
                        },
                        furnace2Stage3: {
                            title: 'Свод печи',
                            effect: 'Постройка второй стальной печи, этап 3 из 3.',
                        },
                        steel2: {
                            title: 'Вторая стальная печь',
                            effect: 'Готова вторая стальная печь: на предприятии 2 стальные печи. Открывается сама после третьего этапа.',
                        },
                        furnace3Stage1: {
                            title: 'Закладка печи',
                            effect: 'Постройка третьей стальной печи, этап 1 из 3.',
                        },
                        furnace3Stage2: {
                            title: 'Кладка стен',
                            effect: 'Постройка третьей стальной печи, этап 2 из 3.',
                        },
                        furnace3Stage3: {
                            title: 'Свод печи',
                            effect: 'Постройка третьей стальной печи, этап 3 из 3.',
                        },
                        steel3: {
                            title: 'Третья стальная печь',
                            effect: 'Готова третья стальная печь: на предприятии 3 стальные печи. Открывается сама после третьего этапа.',
                        },
                    },
                },
                trade: {
                    name: 'Торговая',
                    tagline: 'Торговцы и рынок',
                    description:
                        'Торговый пост, предлагающий широкий спектр товаров. Рынок растёт от двух до шести торговцев: каждого можно нанять со случайной специализацией — дешевле, или позвать купца нужной специализации — вдвое дороже. Вершина ветки — имперский торговый прилавок.',
                    nodes: {
                        market: {
                            title: 'Торговая площадь',
                            effect: 'Закладка рынка: на точке появляется торговая площадь и первые два торговца.',
                        },
                        random3: {
                            title: 'Заезжий купец',
                            effect: 'Третий торговец — какой приедет, тот и останется: специализация купца случайная. Дешевле.',
                        },
                        traders3: {
                            title: 'Торговый ряд',
                            effect: 'На рынке три торговца. Открывается сам после найма третьего купца.',
                        },
                        specific3: {
                            title: 'Приглашённый купец',
                            effect: 'Третий торговец — тот, кого позовёте: специализацию купца выбираете сами. Вдвое дороже.',
                        },
                        random4: {
                            title: 'Заезжий купец',
                            effect: 'Четвёртый торговец — какой приедет, тот и останется: специализация купца случайная. Дешевле.',
                        },
                        traders4: {
                            title: 'Гостиный двор',
                            effect: 'На рынке четыре торговца. Открывается сам после найма четвёртого купца.',
                        },
                        specific4: {
                            title: 'Приглашённый купец',
                            effect: 'Четвёртый торговец — тот, кого позовёте: специализацию купца выбираете сами. Вдвое дороже.',
                        },
                        random5: {
                            title: 'Заезжий купец',
                            effect: 'Пятый торговец — какой приедет, тот и останется: специализация купца случайная. Дешевле.',
                        },
                        traders5: {
                            title: 'Купеческая слобода',
                            effect: 'На рынке пять торговцев. Открывается сам после найма пятого купца.',
                        },
                        specific5: {
                            title: 'Приглашённый купец',
                            effect: 'Пятый торговец — тот, кого позовёте: специализацию купца выбираете сами. Вдвое дороже.',
                        },
                        random6: {
                            title: 'Заезжий купец',
                            effect: 'Шестой торговец — какой приедет, тот и останется: специализация купца случайная. Дешевле.',
                        },
                        traders6: {
                            title: 'Большая ярмарка',
                            effect: 'На рынке шесть торговцев. Открывается сам после найма шестого купца и ведёт к имперскому прилавку.',
                        },
                        specific6: {
                            title: 'Приглашённый купец',
                            effect: 'Шестой торговец — тот, кого позовёте: специализацию купца выбираете сами. Вдвое дороже.',
                        },
                        imperial: {
                            title: 'Имперский торговый прилавок',
                            effect: 'Вершина ветки: имперский прилавок на рынке точки.',
                        },
                    },
                },
            },
        },
    },
    en: {
        keyPoints: {
            title: 'Key points',
            seoTitle: 'Key points and their upgrades — Last Hearth',
            breadcrumb: 'Key points',
            intro: 'Key points are special locations of the exclave that benefit the settlement holding them. Here you can see how to upgrade each type of point: which upgrades open up, what they cost and which specialization to pick.',
            draft: 'These schemes are preliminary: levels, costs and bonuses are still being worked out and may change.',
            tabsLabel: 'Key point types',
            howTo: 'Click an upgrade to see the details and mark what you have built — the scheme shows what opens next.',
            scheme: {
                label: 'Upgrade scheme: {{name}}',
                or: 'or',
            },
            legend: {
                title: 'Legend',
                optional: 'any of',
            },
            states: {
                built: 'Built',
                available: 'Can be built',
                locked: 'Locked',
                excluded: 'Another branch chosen',
            },
            kinds: {
                level: 'Point level',
                upgrade: 'Upgrade',
                choice: 'Choice',
            },
            details: {
                cost: 'Cost',
                requires: 'Requires',
                requiresAny: 'Any of:',
                unlocks: 'Unlocks',
                choiceNote: 'Only one option can be chosen at this step.',
                free: 'Not paid for separately.',
                action: {
                    available: 'Mark as built',
                    built: 'Remove from plan',
                    locked: 'Build the requirements first',
                    excluded: 'Another option chosen',
                    automatic: 'Opens automatically',
                },
            },
            plan: {
                title: 'Your plan',
                empty: 'Mark upgrades as built and the total cost will add up here.',
                count: '{{count}} of {{total}} marked. You will need:',
                reset: 'Reset',
            },
            resources: {
                ducats: { one: 'ducat', few: 'ducats', many: 'ducats', other: 'ducats' },
                silver: { one: 'silver', few: 'silver', many: 'silver', other: 'silver' },
                copper: { one: 'copper', few: 'copper', many: 'copper', other: 'copper' },
                coins: { one: 'coin', few: 'coins', many: 'coins', other: 'coins' },
                timber: { one: 'log', few: 'logs', many: 'logs', other: 'logs' },
                stone: { one: 'stone block', few: 'stone blocks', many: 'stone blocks', other: 'stone blocks' },
                metal: { one: 'ingot', few: 'ingots', many: 'ingots', other: 'ingots' },
                labor: { one: 'worker', few: 'workers', many: 'workers', other: 'workers' },
            },
            short: {
                ducats: 'g',
                silver: 's',
                copper: 'c',
                coins: 'coins',
                timber: 'logs',
                stone: 'stone',
                metal: 'ingots',
                labor: 'workers',
            },
            moneyNote: 'Prices are in server coins: 1 ducat (gold) = 100 silver, 1 silver = 10 copper.',
            points: {
                mine: {
                    name: 'Mine',
                    tagline: 'Ore, coal and stone',
                    description:
                        'A key point with three monuments that gives its holder a steady flow of ore and stone. The deeper the mine, the richer the yield — and the costlier it is to hold.',
                    nodes: {
                        adit: {
                            title: 'Adit',
                            effect: 'Opens mining: +1 crate of ore per real day.',
                        },
                        props: {
                            title: 'Timber props',
                            effect: 'The mine does not collapse during raids: monument protection +10%.',
                        },
                        lift: {
                            title: 'Hoist',
                            effect: 'Ore comes up faster: +15% ore output.',
                        },
                        mine2: {
                            title: 'Ore mine',
                            effect: 'Level II: +2 crates of ore and coal per real day.',
                        },
                        deep: {
                            title: 'Deep shaft',
                            effect: 'Specialization: chance of rare ore and gems.',
                        },
                        sorting: {
                            title: 'Ore sorting',
                            effect: 'Specialization: ore arrives pre-processed, +25% metal.',
                        },
                        carts: {
                            title: 'Rails and carts',
                            effect: 'Delivery to the fief without a caravan, larger mine storage.',
                        },
                        mine3: {
                            title: 'Mining court',
                            effect: 'Level III: maximum yield and the mine’s own guard.',
                        },
                    },
                },
                fort: {
                    name: 'Fort',
                    tagline: 'Defence and road control',
                    description:
                        'A fortified point at a crossroads. Gives its holder a wide view, protection for nearby holdings and the right to keep a garrison.',
                    nodes: {
                        outpost: {
                            title: 'Outpost',
                            effect: 'The fief’s banner over the point, alerts about strangers at the walls.',
                        },
                        palisade: {
                            title: 'Palisade',
                            effect: 'First line of walls: raid time on the point +10 minutes.',
                        },
                        watchtower: {
                            title: 'Watchtower',
                            effect: 'A view of the area: raids on nearby holdings are visible in advance.',
                        },
                        fort2: {
                            title: 'Fort',
                            effect: 'Level II: the point withstands a siege, the monument is sturdier.',
                        },
                        garrison: {
                            title: 'Garrison',
                            effect: 'Specialization: the point’s defenders get a combat bonus.',
                        },
                        walls: {
                            title: 'Stone walls',
                            effect: 'Specialization: breach spots are halved.',
                        },
                        armory: {
                            title: 'Armory',
                            effect: 'Gear storage and on-site weapon repair.',
                        },
                        citadel: {
                            title: 'Citadel',
                            effect: 'Level III: the fort shields allied holdings within its radius.',
                        },
                    },
                },
                harbor: {
                    name: 'Air harbor',
                    tagline: 'Trade with the Empire',
                    description:
                        'A large air trade port that lets you trade with the Empire by sending balloons and airships.',
                    nodes: {
                        access: {
                            title: 'Harbor charter',
                            effect: 'Access to building an air harbor at one of the key points — by preliminary design, as with a great structure.',
                        },
                        balloon: {
                            title: 'Balloon mast',
                            effect: 'Unlocks buying a balloon for 20 ducats.',
                        },
                        supplies: {
                            title: 'Imperial supplies',
                            effect: 'Unlocks building material supplies from the Empire.',
                        },
                        discount10: {
                            title: 'Supplier discount',
                            effect: '10% off buying resources at the trade point.',
                        },
                        airship: {
                            title: 'Airship pier',
                            effect: 'Unlocks buying an airship for 15 ducats.',
                        },
                        discount15: {
                            title: 'Wholesale contract',
                            effect: '15% off buying resources at the trade point.',
                        },
                        empireTrade: {
                            title: 'Trade with the Empire',
                            effect: 'Selling resources to the Empire for coins. The imperial trade airship arrives once a week and without upgrades carries only one double chest of resources — 36 slots.',
                        },
                        discount25: {
                            title: 'Imperial privilege',
                            effect: '25% off buying resources at the trade point.',
                        },
                        rivetedSale: {
                            title: 'Riveted goods',
                            effect: 'The Empire starts buying riveted metal blocks.',
                        },
                        metals: {
                            title: 'Metals',
                            effect: 'The metal sales branch. Ingots can be sold right away, riveted blocks only after “Riveted goods”.',
                        },
                        cargo: {
                            title: 'Airship hold',
                            effect: 'The branch for upgrading the imperial trade airship’s capacity.',
                        },
                        luxury: {
                            title: 'Luxury goods',
                            effect: 'The luxury goods sales branch.',
                        },
                        metal1: {
                            title: 'Copper',
                            effect: 'The Empire buys: copper ingot — 50 copper/pc; riveted copper block — 4 silver/pc.',
                        },
                        metal2: {
                            title: 'Brass',
                            effect: 'The Empire buys: brass ingot — 60 copper/pc; riveted brass block — 4 silver 80 copper/pc.',
                        },
                        metal3: {
                            title: 'Gold',
                            effect: 'The Empire buys: gold ingot — 2 silver 50 copper/pc; riveted gold block — 20 silver/pc.',
                        },
                        metal4: {
                            title: 'Bismuth',
                            effect: 'The Empire buys: bismuth ingot — 55 copper/pc; riveted bismuth block — 4 silver 40 copper/pc.',
                        },
                        metal5: {
                            title: 'Silver',
                            effect: 'The Empire buys: silver ingot — 2 silver 50 copper/pc; riveted silver block — 20 silver/pc.',
                        },
                        metal6: {
                            title: 'Cupronickel',
                            effect: 'The Empire buys: cupronickel ingot — 3 silver/pc; riveted cupronickel block — 24 silver/pc.',
                        },
                        metal7: {
                            title: 'Iron',
                            effect: 'The Empire buys: plain iron ingot — 4 silver/pc; riveted iron block — 32 silver/pc.',
                        },
                        hold1: {
                            title: 'Extended hold',
                            effect: 'Airship capacity +1 single chest (+16 slots).',
                        },
                        hold2: {
                            title: 'Second hold',
                            effect: 'Airship capacity +1 more single chest (+16 slots).',
                        },
                        hold3: {
                            title: 'Double hold',
                            effect: 'Two single chests merge into one double chest: +36 slots instead of +32.',
                        },
                        lux1: {
                            title: 'Art and curiosities',
                            effect: 'The Empire buys paintings, tapestries (whole, not by piece), children’s toys (junk category), the art bottle, resonance cylinders — 1 silver/pc.',
                        },
                        lux2: {
                            title: 'Garments and jewellery',
                            effect: 'The Empire buys clothing (not crafted), jewellery, masks, headwear — 2 silver/pc.',
                        },
                        lux3: {
                            title: 'Gemstones',
                            effect: 'The Empire buys gemstones of high quality and above — 3 silver/pc.',
                        },
                        lux4: {
                            title: 'Artifacts',
                            effect: 'The Empire buys artifacts — 5 silver/pc: skulls (crystal, deformed, sabertooth), mummified head, Eidolon head, statuettes, insect in amber, ancient carved head, doomed reliquary, silver and gold gears, hourglass, gunbai, strange device prototype, strange device, zoolite, multitool.',
                        },
                    },
                },
                industry: {
                    name: 'Industrial',
                    tagline: 'Smelting, ingots and steel',
                    description:
                        'A large industrial enterprise for processing ore into ingots, smelting iron and making steel quickly and in large volumes.',
                    nodes: {
                        works: {
                            title: 'Founding the works',
                            effect: 'An enterprise at the point: 2 bloomeries (infinite), 2 copper anvils and 4 forges.',
                        },
                        bloomery1: {
                            title: 'Small smeltery',
                            effect: '+2 bloomeries — 4 in total.',
                        },
                        bloomery2: {
                            title: 'Large smeltery',
                            effect: '+2 bloomeries — 6 in total.',
                        },
                        bloomery3: {
                            title: 'Smelting yard',
                            effect: '+2 bloomeries — 8 in total.',
                        },
                        anvilBronze: {
                            title: 'Bronze anvils',
                            effect: 'Copper anvils are replaced with bronze ones.',
                        },
                        anvilIron: {
                            title: 'Iron anvils',
                            effect: 'Bronze anvils are replaced with iron ones.',
                        },
                        beehive: {
                            title: 'Beehive oven',
                            effect: 'Construction of the beehive oven begins. Opens together with the works.',
                        },
                        beehiveBase: {
                            title: 'Oven foundation',
                            effect: 'The beehive oven’s foundation is laid — it cannot be used yet.',
                        },
                        beehiveFiring: {
                            title: 'Dome and firing',
                            effect: 'Beehive oven level two: it can already be used for firing.',
                        },
                        beehiveSecond: {
                            title: 'Second beehive oven',
                            effect: 'A second beehive oven appears at the works.',
                        },
                        beehiveRepair: {
                            title: 'Beehive oven repair',
                            effect: 'Repair of one beehive oven.',
                        },
                        beehiveDiscount: {
                            title: 'Master oven-wright',
                            effect: 'Beehive oven repairs cost 25% less.',
                        },
                        steelworks: {
                            title: 'Steelworks',
                            effect: 'The start of steelmaking: opens bricks and steel furnace construction.',
                        },
                        steelRepair: {
                            title: 'Steel furnace repair',
                            effect: 'Repair of one steel furnace.',
                        },
                        steelDiscount: {
                            title: 'Master steelmaker',
                            effect: 'Steel furnace repairs cost 25% less.',
                        },
                        bricks1: {
                            title: 'Plain masonry',
                            effect: 'Brick level 1: opens construction of the first steel furnace.',
                        },
                        bricks2: {
                            title: 'Sturdy masonry',
                            effect: 'Brick level 2: opens construction of the second steel furnace.',
                        },
                        bricks3: {
                            title: 'Master masonry',
                            effect: 'Brick level 3: opens construction of the third steel furnace.',
                        },
                        furnace1Stage1: {
                            title: 'Laying the furnace',
                            effect: 'Building the first steel furnace, stage 1 of 3.',
                        },
                        furnace1Stage2: {
                            title: 'Raising the walls',
                            effect: 'Building the first steel furnace, stage 2 of 3.',
                        },
                        furnace1Stage3: {
                            title: 'Furnace dome',
                            effect: 'Building the first steel furnace, stage 3 of 3.',
                        },
                        steel1: {
                            title: 'Steel furnace',
                            effect: 'The first steel furnace is ready: 1 steel furnace at the works. Opens by itself after stage 3.',
                        },
                        furnace2Stage1: {
                            title: 'Laying the furnace',
                            effect: 'Building the second steel furnace, stage 1 of 3.',
                        },
                        furnace2Stage2: {
                            title: 'Raising the walls',
                            effect: 'Building the second steel furnace, stage 2 of 3.',
                        },
                        furnace2Stage3: {
                            title: 'Furnace dome',
                            effect: 'Building the second steel furnace, stage 3 of 3.',
                        },
                        steel2: {
                            title: 'Second steel furnace',
                            effect: 'The second steel furnace is ready: 2 steel furnaces at the works. Opens by itself after stage 3.',
                        },
                        furnace3Stage1: {
                            title: 'Laying the furnace',
                            effect: 'Building the third steel furnace, stage 1 of 3.',
                        },
                        furnace3Stage2: {
                            title: 'Raising the walls',
                            effect: 'Building the third steel furnace, stage 2 of 3.',
                        },
                        furnace3Stage3: {
                            title: 'Furnace dome',
                            effect: 'Building the third steel furnace, stage 3 of 3.',
                        },
                        steel3: {
                            title: 'Third steel furnace',
                            effect: 'The third steel furnace is ready: 3 steel furnaces at the works. Opens by itself after stage 3.',
                        },
                    },
                },
                trade: {
                    name: 'Trade',
                    tagline: 'Merchants and market',
                    description:
                        'A trading post offering a wide range of goods. The market grows from two to six merchants: each can be hired with a random specialization — cheaper — or you can send for a merchant of the specialization you need, for twice the price. The branch is crowned by the imperial trade stall.',
                    nodes: {
                        market: {
                            title: 'Market square',
                            effect: 'Founding the market: a trade square with the first two merchants appears at the point.',
                        },
                        random3: {
                            title: 'Wandering merchant',
                            effect: 'The third merchant — whoever turns up stays: the merchant’s specialization is random. Cheaper.',
                        },
                        traders3: {
                            title: 'Merchant row',
                            effect: 'Three merchants at the market. Opens by itself once the third merchant is hired.',
                        },
                        specific3: {
                            title: 'Invited merchant',
                            effect: 'The third merchant — the one you send for: you choose the merchant’s specialization. Twice the price.',
                        },
                        random4: {
                            title: 'Wandering merchant',
                            effect: 'The fourth merchant — whoever turns up stays: the merchant’s specialization is random. Cheaper.',
                        },
                        traders4: {
                            title: 'Merchant inn',
                            effect: 'Four merchants at the market. Opens by itself once the fourth merchant is hired.',
                        },
                        specific4: {
                            title: 'Invited merchant',
                            effect: 'The fourth merchant — the one you send for: you choose the merchant’s specialization. Twice the price.',
                        },
                        random5: {
                            title: 'Wandering merchant',
                            effect: 'The fifth merchant — whoever turns up stays: the merchant’s specialization is random. Cheaper.',
                        },
                        traders5: {
                            title: 'Merchant quarter',
                            effect: 'Five merchants at the market. Opens by itself once the fifth merchant is hired.',
                        },
                        specific5: {
                            title: 'Invited merchant',
                            effect: 'The fifth merchant — the one you send for: you choose the merchant’s specialization. Twice the price.',
                        },
                        random6: {
                            title: 'Wandering merchant',
                            effect: 'The sixth merchant — whoever turns up stays: the merchant’s specialization is random. Cheaper.',
                        },
                        traders6: {
                            title: 'Grand fair',
                            effect: 'Six merchants at the market. Opens by itself once the sixth merchant is hired and leads to the imperial stall.',
                        },
                        specific6: {
                            title: 'Invited merchant',
                            effect: 'The sixth merchant — the one you send for: you choose the merchant’s specialization. Twice the price.',
                        },
                        imperial: {
                            title: 'Imperial trade stall',
                            effect: 'The top of the branch: an imperial stall at the point’s market.',
                        },
                    },
                },
            },
        },
    },
};
