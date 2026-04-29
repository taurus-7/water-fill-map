# 💧 Система заливки участков

Веб-карта для визуализации использования водных лимитов по полигональным участкам.  
Заливка снизу вверх показывает процент использования — как термометр.

---

## 🚀 Запуск через Docker Desktop

### Шаг 1 — Установить Docker Desktop

Скачайте и установите **Docker Desktop** для вашей ОС:
- Windows: https://www.docker.com/products/docker-desktop
- macOS: https://www.docker.com/products/docker-desktop
- Linux: https://docs.docker.com/desktop/linux/install/

После установки запустите Docker Desktop и убедитесь что в трее/меню-баре
иконка Docker активна (не показывает ошибку).

---

### Шаг 2 — Распаковать архив

Распакуйте `water-fill-map.zip` в удобную папку, например:
```
C:\Projects\water-fill-map\       (Windows)
~/Projects/water-fill-map/        (macOS / Linux)
```

---

### Шаг 3 — Открыть терминал в папке проекта

**Windows:**
- Откройте папку `water-fill-map` в Проводнике
- В адресной строке наберите `cmd` и нажмите Enter
- Или: ПКМ → "Открыть в терминале"

**macOS / Linux:**
```bash
cd ~/Projects/water-fill-map
```

---

### Шаг 4 — Запустить проект

```bash
docker compose up --build
```

При первом запуске Docker скачает образы и соберёт контейнеры (~3-5 минут).  
При следующих запусках — намного быстрее.

Когда в терминале увидите:
```
watermap-frontend  | ... nginx started
watermap-backend   | ... Application startup complete
```
— можно открывать браузер.

---

### Шаг 5 — Открыть приложение

| Адрес                     | Описание              |
|---------------------------|-----------------------|
| http://localhost:3000     | 🗺 Карта (основное приложение) |
| http://localhost:8000/docs | 📖 API документация (Swagger) |

---

### Остановить приложение

```bash
# Остановить (данные сохранятся)
docker compose stop

# Остановить и удалить контейнеры
docker compose down

# Остановить и удалить контейнеры + данные БД
docker compose down -v
```

---

### Возможные проблемы

**Порт уже занят:**
```
Error: port is already allocated
```
→ Измените порты в `docker-compose.yml`:
```yaml
ports:
  - "3001:80"     # вместо 3000
  - "8001:8000"   # вместо 8000
```

**Docker Desktop не запущен:**
```
Cannot connect to the Docker daemon
```
→ Запустите Docker Desktop из меню «Пуск» / Launchpad.

**Нет интернета при сборке:**
→ Все образы качаются при первом запуске. Нужен интернет.

---

## Стек

| Слой       | Технология                        |
|------------|-----------------------------------|
| База       | PostgreSQL 16 + PostGIS 3.4       |
| Бэкенд     | FastAPI + asyncpg                 |
| Клиппинг   | PostGIS `ST_Intersection` (SQL)   |
| Фронтенд   | React 18 + Vite                   |
| Карта      | deck.gl v9 + MapLibre GL          |
| Деплой     | Docker Compose                    |

---

## Шкала цветов

| Диапазон   | Цвет         | Статус    |
|------------|--------------|-----------|
| 0 – 60%    | 🟢 Зелёный   | Норма     |
| 60 – 80%   | 🟡 Жёлтый    | Внимание  |
| 80 – 95%   | 🟠 Оранжевый | Высокое   |
| 95 – 100%  | 🔴 Красный   | Критично  |

---

## Стили карты

Переключение кнопками в правом верхнем углу карты:
- ☀️ **Светлая** — Carto Positron (белый фон)
- 🌙 **Тёмная** — Carto Dark Matter
- 🛰️ **Спутник** — ESRI World Imagery (без ключа)

---

## API эндпоинты

```
GET  /api/parcels/map            GeoJSON для карты (контуры + заливка)
GET  /api/parcels                Список участков без геометрии
GET  /api/parcels/{id}           Один участок с геометрией
PATCH /api/parcels/{id}/fact     Обновить водозабор  { "water_fact": 500000 }
PATCH /api/parcels/{id}/limit    Обновить лимит      { "water_limit": 1000000 }
GET  /api/stats                  Сводная статистика
```

Полная документация: http://localhost:8000/docs

---

## Добавить реальные участки

### Вариант 1 — SQL INSERT

Координаты в UTM Zone 42N (EPSG:32642):
```sql
INSERT INTO parcels (name, geom, water_limit, water_fact, notes) VALUES
(
  'КХ Иванов А-01',
  ST_GeomFromText('MULTIPOLYGON(((
    634800 4499700, 635500 4499700, 635600 4500100,
    635300 4500400, 634900 4500300, 634800 4499700
  )))', 32642),
  1500000,   -- лимит м³
  0,         -- факт м³
  'Примечание'
);
```

Подключиться к БД:
```bash
docker compose exec db psql -U watermap -d watermap
```

### Вариант 2 — Shapefile через shp2pgsql

```bash
# Копируем шейпфайл в контейнер
docker compose cp my_parcels.shp db:/tmp/

# Импортируем (EPSG:32642)
docker compose exec db bash -c \
  "shp2pgsql -s 32642 /tmp/my_parcels.shp parcels | psql -U watermap -d watermap"
```

---

## Структура проекта

```
water-fill-map/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI + CORS + lifespan
│   │   ├── database.py          asyncpg пул соединений
│   │   └── routers/
│   │       └── parcels.py       Эндпоинты + PostGIS-клиппинг
│   ├── migrations/
│   │   ├── 001_init.sql         Схема БД + view + триггеры
│   │   └── 002_seed_parcels.sql 400 тестовых участков
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              Корневой компонент, macOS-заголовок
│   │   ├── components/
│   │   │   ├── MapView.jsx      deck.gl: два слоя fill+outline
│   │   │   ├── MapStyleSwitcher.jsx  Светлая/Тёмная/Спутник
│   │   │   ├── ParcelInfo.jsx   Боковая панель + статистика
│   │   │   └── Legend.jsx       Шкала цветов
│   │   └── utils/colors.js      Статусы, цвета, форматирование
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## Как работает клиппинг (PostGIS)

Каждый полигон обрезается горизонтальной плоскостью на высоте `fill_pct%` от bbox:

```sql
ST_CollectionExtract(
    ST_Intersection(
        geom,
        ST_SetSRID(
            ST_MakeBox2D(
                ST_Point(xmin-1, ymin-1),
                ST_Point(xmax+1, ymin + (ymax-ymin) * fill_pct / 100.0)
            ),
            32642
        )
    ),
    3  -- только полигоны
)
```

deck.gl рисует два слоя поверх MapLibre:
1. `fills` — обрезанные цветные полигоны (визуализация заполнения)
2. `outlines` — полные контуры (hover + click события)
