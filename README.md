# منصة مسابقات تكنوفيست

## نظرة عامة
منصة لإدارة مسابقات تكنوفيست باللغة العربية، تتضمن تسجيل الطلاب، إدارة المشاريع، وتقييمها.

---

## هيكل المشروع

```
teknofest-kitchen-ibtikar/
├── backend/                 # Python FastAPI
│   ├── main.py             # نقطة البداية + إنشاء المدير الأعلى تلقائياً
│   ├── database.py         # إعدادات قاعدة البيانات
│   ├── models.py           # نماذج البيانات
│   ├── schemas.py          # مخططات Pydantic
│   ├── routers/            # مسارات API
│   │   ├── students.py     # مسارات الطلاب + إرسال روابط تلغرام
│   │   ├── projects.py     # مسارات المشاريع
│   │   ├── admin.py        # مسارات الإداريين + إدارة الأوزان
│   │   ├── evaluation.py   # مسارات التقييم (المرجح بالأوزان)
│   │   └── email.py        # مسارات البريد الإلكتروني
│   ├── services/           # الخدمات
│   │   ├── email_service.py
│   │   ├── auth_service.py
│   │   ├── ai_evaluation.py
│   │   └── pdf_generator.py
│   └── requirements.txt
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # المكونات (AdminLayout, etc.)
│   │   ├── pages/          # الصفحات
│   │   │   ├── admin/      # صفحات لوحة التحكم
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Teams.tsx
│   │   │   │   ├── Projects.tsx
│   │   │   │   ├── Evaluations.tsx
│   │   │   │   └── AdminManagement.tsx  # إدارة أوزان الإداريين
│   │   │   ├── TeamRegistration.tsx
│   │   │   └── Home.tsx
│   │   ├── services/       # خدمات API
│   │   └── types/          # أنواع TypeScript
│   ├── package.json
│   └── index.html
│
└── README.md
```

---

## المميزات الرئيسية

### نظام التقييم
- **75% تقييم الإداريين**: متوسط مرجح حسب أوزان كل إداري
- **25% تقييم AI**: تقييم آلي باستخدام DeepSeek API
- **المجموع**: 100 نقطة كحد أقصى

### نظام الأوزان للإداريين
- المدير الأعلى (Super Admin) يمكنه تعديل أوزان تقييم الإداريين
- كل إداري له وزن يحدد نسبة تأثير تقييمه على المتوسط المرجح
- مثال: إداري بوزن 25% وآخر بوزن 75%
  - إذا قيّم الأول 60/75 والثاني 70/75
  - المتوسط المرجح = (60×25 + 70×75) / 100 = 67.5/75

### سيناريوهات التسجيل
1. فريق لديه فكرة مشروع
2. فرد لديه فكرة مشروع
3. فرد بدون فكرة مشروع
4. فريق بدون فكرة مشروع

### استبيان المشروع
- عنوان المشروع
- المشكلة التي يحلها
- الوصف التقني (1000+ حرف)
- المرجع العلمي
- رفع صور/مخططات

### لوحة الإداريين
- تسجيل دخول آمن (JWT)
- عرض وتصدير الاستبيانات PDF
- فرز الأفراد إلى فرق
- إرسال روابط تلغرام بالبريد
- تقييم المشاريع
- عرض أفضل الفرق المميزة

### صلاحيات المدير الأعلى (Super Admin)
- جميع صلاحيات الإداريين
- إدارة أوزان تقييم الإداريين
- يتم إنشاؤه تلقائياً عند بدء التشغيل

---

## خطوات التشغيل

### الخطوة 1: إعداد المتغيرات البيئية

أنشئ ملف `.env` في مجلد `backend/`:

```env
# قاعدة البيانات
DATABASE_URL=postgresql://user:password@host:5432/technofest_db

# المفتاح السري للتشفير
SECRET_KEY=your-secret-key-here

# بيانات المدير الأعلى (يتم إنشاؤه تلقائياً)
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=your-secure-password

# إعدادات البريد الإلكتروني
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# مفتاح DeepSeek API للتقييم بالذكاء الاصطناعي
DEEPSEEK_API_KEY=your-deepseek-key
```

### الخطوة 2: إعداد قاعدة البيانات PostgreSQL

```bash
createdb technofest_db
```

### الخطوة 3: تشغيل الباك إند

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### الخطوة 4: تشغيل الفرونت إند

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### الطلاب والفرق
- `POST /api/students/register` - تسجيل فريق جديد
- `POST /api/students/team/{team_id}/telegram` - إرسال رابط تلغرام للفريق

### المشاريع
- `GET /api/projects` - جلب جميع المشاريع
- `POST /api/projects` - إنشاء مشروع جديد
- `GET /api/projects/{id}` - جلب مشروع محدد

### التقييم
- `POST /api/evaluation/admin` - تقييم إداري
- `POST /api/evaluation/ai` - تقييم AI
- `GET /api/evaluation/project/{id}/score` - النتيجة النهائية
- `GET /api/evaluation/top-teams` - أفضل الفرق

### الإداريين
- `POST /api/admin/login` - تسجيل الدخول
- `GET /api/admin/check-superadmin` - التحقق من صلاحية المدير الأعلى
- `PUT /api/admin/{id}/weight` - تحديث وزن إداري (للمدير الأعلى فقط)

### البريد الإلكتروني
- `POST /api/email/send` - إرسال بريد إلكتروني

---

## التقنيات المستخدمة

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT Authentication
- Pydantic

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Axios

---
