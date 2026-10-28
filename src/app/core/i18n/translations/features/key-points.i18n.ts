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
                choice: 'Специализация',
            },
            details: {
                cost: 'Стоимость',
                requires: 'Нужно',
                requiresAny: 'И любое из:',
                unlocks: 'Открывает',
                choiceNote: 'Из специализаций одной ветки можно выбрать только одну.',
                action: {
                    available: 'Отметить построенным',
                    built: 'Убрать из плана',
                    locked: 'Сначала постройте нужное',
                    excluded: 'Выбрана другая специализация',
                },
            },
            plan: {
                title: 'Ваш план',
                empty: 'Отмечайте улучшения построенными — здесь сложится общая стоимость.',
                count: 'Отмечено {{count}} из {{total}}. Всего понадобится:',
                reset: 'Сбросить',
            },
            resources: {
                coins: 'монет',
                timber: 'брёвен',
                stone: 'камня',
                metal: 'слитков',
                labor: 'рабочих',
            },
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
                    tagline: 'Перелёты и почта',
                    description:
                        'Причал для воздушных судов. Сокращает путь между ленами и столицей, открывает почтовые и грузовые рейсы.',
                    nodes: {
                        mast: {
                            title: 'Причальная мачта',
                            effect: 'Первый причал: перелёт до столицы раз в реальный день.',
                        },
                        beacon: {
                            title: 'Сигнальный огонь',
                            effect: 'Суда находят гавань ночью и в непогоду.',
                        },
                        hangar: {
                            title: 'Эллинг',
                            effect: 'Судно можно оставить на стоянке без риска поломки.',
                        },
                        harbor2: {
                            title: 'Воздушная пристань',
                            effect: 'Уровень II: рейсы в союзные лены.',
                        },
                        courier: {
                            title: 'Почтовые рейсы',
                            effect: 'Специализация: письма и малые посылки доходят мгновенно.',
                        },
                        cargo: {
                            title: 'Грузовые рейсы',
                            effect: 'Специализация: перевозка ящиков без каравана.',
                        },
                        shipyard: {
                            title: 'Верфь',
                            effect: 'Ремонт и постройка собственных воздушных судов.',
                        },
                        harbor3: {
                            title: 'Воздушная гавань',
                            effect: 'Уровень III: регулярное сообщение со всеми ключевыми землями.',
                        },
                    },
                },
                industry: {
                    name: 'Промышленная',
                    tagline: 'Мастерские и выплавка',
                    description:
                        'Производственная точка: даёт доступ к печам и механизмам, которые не построить в обычном лене.',
                    nodes: {
                        forge: {
                            title: 'Кузня',
                            effect: 'Общая кузня точки, ковка без своего горна.',
                        },
                        bloomery: {
                            title: 'Сыродутная печь',
                            effect: 'Выплавка железа быстрее на 15%.',
                        },
                        sawmill: {
                            title: 'Лесопилка',
                            effect: 'Брёвна в доски вдвое быстрее.',
                        },
                        works2: {
                            title: 'Мануфактура',
                            effect: 'Уровень II: заказы для лена без участия мастера.',
                        },
                        foundry: {
                            title: 'Литейная',
                            effect: 'Специализация: литьё сплавов крупными партиями.',
                        },
                        mechanics: {
                            title: 'Механический цех',
                            effect: 'Специализация: механизмы и шестерни дешевле.',
                        },
                        storehouse: {
                            title: 'Склады',
                            effect: 'Большой склад сырья и готовой продукции.',
                        },
                        works3: {
                            title: 'Промышленный двор',
                            effect: 'Уровень III: точка выполняет имперские заказы.',
                        },
                    },
                },
                trade: {
                    name: 'Торговая',
                    tagline: 'Рынок и пошлины',
                    description:
                        'Торговый узел на пути караванов. Приносит пошлины, открывает ярмарки и выгодные контракты.',
                    nodes: {
                        post: {
                            title: 'Торговый пост',
                            effect: 'Прилавки для владельца и союзников.',
                        },
                        scales: {
                            title: 'Весовая',
                            effect: 'Честный вес: пошлина с каждой сделки на точке.',
                        },
                        caravan: {
                            title: 'Караванная стоянка',
                            effect: 'Караваны делают остановку: +1 торговый контракт.',
                        },
                        fair: {
                            title: 'Ярмарка',
                            effect: 'Уровень II: ярмарка раз в неделю, больше покупателей.',
                        },
                        guild: {
                            title: 'Гильдейская контора',
                            effect: 'Специализация: контора гильдии и скидка на контракты.',
                        },
                        exchange: {
                            title: 'Меняльная лавка',
                            effect: 'Специализация: обмен ресурсов на монеты по выгодному курсу.',
                        },
                        depot: {
                            title: 'Пакгауз',
                            effect: 'Хранение товара под охраной точки.',
                        },
                        chamber: {
                            title: 'Торговая палата',
                            effect: 'Уровень III: точка задаёт цены на рынке эксклава.',
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
                choice: 'Specialization',
            },
            details: {
                cost: 'Cost',
                requires: 'Requires',
                requiresAny: 'And any of:',
                unlocks: 'Unlocks',
                choiceNote: 'Only one specialization per branch can be chosen.',
                action: {
                    available: 'Mark as built',
                    built: 'Remove from plan',
                    locked: 'Build the requirements first',
                    excluded: 'Another specialization chosen',
                },
            },
            plan: {
                title: 'Your plan',
                empty: 'Mark upgrades as built and the total cost will add up here.',
                count: '{{count}} of {{total}} marked. You will need:',
                reset: 'Reset',
            },
            resources: {
                coins: 'coins',
                timber: 'logs',
                stone: 'stone',
                metal: 'ingots',
                labor: 'workers',
            },
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
                    tagline: 'Flights and mail',
                    description:
                        'A dock for airships. Shortens the way between fiefs and the capital and opens mail and cargo routes.',
                    nodes: {
                        mast: {
                            title: 'Mooring mast',
                            effect: 'First dock: a flight to the capital once per real day.',
                        },
                        beacon: {
                            title: 'Signal beacon',
                            effect: 'Ships find the harbor at night and in bad weather.',
                        },
                        hangar: {
                            title: 'Hangar',
                            effect: 'A ship can be left moored without risk of damage.',
                        },
                        harbor2: {
                            title: 'Air pier',
                            effect: 'Level II: flights to allied fiefs.',
                        },
                        courier: {
                            title: 'Mail flights',
                            effect: 'Specialization: letters and small parcels arrive instantly.',
                        },
                        cargo: {
                            title: 'Cargo flights',
                            effect: 'Specialization: crate transport without a caravan.',
                        },
                        shipyard: {
                            title: 'Shipyard',
                            effect: 'Repair and construction of your own airships.',
                        },
                        harbor3: {
                            title: 'Air harbor',
                            effect: 'Level III: regular routes to all key lands.',
                        },
                    },
                },
                industry: {
                    name: 'Industrial',
                    tagline: 'Workshops and smelting',
                    description:
                        'A production point that grants access to furnaces and machinery you cannot build in an ordinary fief.',
                    nodes: {
                        forge: {
                            title: 'Forge',
                            effect: 'A shared forge at the point, smithing without your own hearth.',
                        },
                        bloomery: {
                            title: 'Bloomery',
                            effect: 'Iron smelting 15% faster.',
                        },
                        sawmill: {
                            title: 'Sawmill',
                            effect: 'Logs into planks twice as fast.',
                        },
                        works2: {
                            title: 'Manufactory',
                            effect: 'Level II: fief orders without a craftsman present.',
                        },
                        foundry: {
                            title: 'Foundry',
                            effect: 'Specialization: casting alloys in large batches.',
                        },
                        mechanics: {
                            title: 'Machine shop',
                            effect: 'Specialization: mechanisms and gears are cheaper.',
                        },
                        storehouse: {
                            title: 'Storehouses',
                            effect: 'A large warehouse for raw materials and goods.',
                        },
                        works3: {
                            title: 'Industrial yard',
                            effect: 'Level III: the point fulfils imperial orders.',
                        },
                    },
                },
                trade: {
                    name: 'Trade',
                    tagline: 'Market and tolls',
                    description:
                        'A trade hub on caravan routes. Brings in tolls and opens fairs and profitable contracts.',
                    nodes: {
                        post: {
                            title: 'Trading post',
                            effect: 'Stalls for the holder and allies.',
                        },
                        scales: {
                            title: 'Weigh house',
                            effect: 'Honest weights: a toll on every deal at the point.',
                        },
                        caravan: {
                            title: 'Caravan yard',
                            effect: 'Caravans stop by: +1 trade contract.',
                        },
                        fair: {
                            title: 'Fair',
                            effect: 'Level II: a weekly fair, more buyers.',
                        },
                        guild: {
                            title: 'Guild office',
                            effect: 'Specialization: a guild office and discounted contracts.',
                        },
                        exchange: {
                            title: 'Money-changer',
                            effect: 'Specialization: trade resources for coins at a good rate.',
                        },
                        depot: {
                            title: 'Depot',
                            effect: 'Goods storage under the point’s protection.',
                        },
                        chamber: {
                            title: 'Chamber of commerce',
                            effect: 'Level III: the point sets prices on the exclave market.',
                        },
                    },
                },
            },
        },
    },
};
