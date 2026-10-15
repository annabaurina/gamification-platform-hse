# Gamification HSE

Веб-приложение для геймификации учебного процесса в Высшей школе экономики (ВШЭ). Проект позволяет отслеживать учебный прогресс студентов, посещаемость, баллы и достижения, а также управлять учебными данными.

## Возможности

- **Авторизация** — вход в систему с использованием JWT.
- **Прогресс студентов** — просмотр личной статистики и накопленных баллов.
- **Рейтинг студентов** — сравнение результатов и достижений.
- **Бонусные события** — создание заявок на дополнительные баллы и их подтверждение преподавателями.
- **Управление студентами и группами** — работа с учебными данными.
- **Учёт посещаемости** — отметка посещения занятий.
- **Управление дисциплинами, оценками и учебными группами**.

## Технологический стек

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT
- SQLite

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Ant Design

## Структура проекта

```text
gamification-hse/
├── api/                    # Модели, сериализаторы и API
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── tests.py
├── backend/                # Настройки Django
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── frontend/               # Клиентское приложение
│   └── src/
├── manage.py
└── README.md
```

## Установка и запуск

### 1. Клонирование репозитория

```bash
git clone https://github.com/nadyahse2/gamification-hse.git
cd gamification-hse
```

### 2. Запуск Backend

Создайте виртуальное окружение:

```bash
python -m venv .venv
```

Активируйте его.

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

Установите зависимости проекта:

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers drf-yasg
```

Примените миграции и запустите сервер:

```bash
python manage.py migrate
python manage.py runserver
```

Backend будет доступен по адресу `http://127.0.0.1:8000/`.

### 3. Запуск Frontend

Перейдите в директорию frontend:

```bash
cd frontend
npm install
```

Создайте файл `.env` при необходимости и укажите адрес API:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Запустите приложение:

```bash
npm run dev
```

Адрес frontend будет выведен в терминале Vite.

> Примечание: команды установки зависимостей предполагают соответствующую структуру проекта. Если в репозитории есть `requirements.txt` и `package.json`, предпочтительно устанавливать зависимости из этих файлов.

## API

Основные API-эндпоинты:

| Метод                 | Endpoint                      | Назначение                            |
| --------------------- | ----------------------------- | ------------------------------------- |
| POST                  | `/api/token/`                 | Получение JWT-токена                  |
| POST                  | `/api/token/refresh/`         | Обновление токена                     |
| GET                   | `/api/progress/my_progress/`  | Просмотр личного прогресса            |
| GET, POST             | `/api/students/`              | Получение списка и создание студентов |
| GET, POST             | `/api/groups/`                | Получение списка и создание групп     |
| `/api/disciplines/`   | Управление дисциплинами       |                                       |
| `/api/course-groups/` | Учебные группы курсов         |                                       |
| `/api/grades/`        | Работа с оценками             |                                       |
| `/api/attendance/`    | Учёт посещаемости             |                                       |
| POST                  | `/api/attendance/mark_group/` | Отметка посещаемости группы           |
| GET                   | `/api/bonus-events/my/`       | Личные бонусные события               |
| POST                  | `/api/bonus-events/`          | Создание бонусного события            |
| GET                   | `/api/bonus-events/pending/`  | Заявки на подтверждение               |
| GET                   | `/api/bonus-events/stats/`    | Статистика бонусных событий           |

Дополнительные действия для подтверждения и отклонения бонусных событий доступны через `/api/bonus-events/{id}/approve/` и `/api/bonus-events/{id}/reject/`.

Полный список маршрутов и поддерживаемых методов см. в `api/urls.py` и `api/views.py`.

## Статус проекта

Проект находится в разработке. Состав реализованных функций и доступность отдельных возможностей зависят от текущей реализации backend и frontend.
