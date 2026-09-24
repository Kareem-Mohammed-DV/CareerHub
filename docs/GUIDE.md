# CareerHub — الدليل الشامل

منصة توظيف كاملة: باحثو عمل يقدّمون على وظائف، شركات تنشر وتدير المتقدمين، وأدمن يدير المنصة.

---

## 1) الهيكل العام (هيكل الموقع)

```
CareerHub/
├── docker-compose.yml        ← يدير الحاويات الثلاثة
├── .env                      ← كل الأسرار والمتغيرات (جاهز)
├── docs/sitemap.html         ← خريطة الموقع التفاعلية (افتحها في المتصفح)
├── backend/                  ← API (Node + Express + TypeScript + Prisma)
│   ├── prisma/schema.prisma  ← تعريف قاعدة البيانات (12 جدول)
│   └── src/
│       ├── app.ts            ← الراوتر المركزي + Swagger
│       ├── common/           ← أخطاء، مصادقة، pagination
│       └── modules/          ← auth, jobs, applications, profiles,
│                                companies, notifications, messages, admin
└── frontend/                 ← React + Vite + TypeScript (ثيم فاتح)
    └── src/
        ├── pages/            ← 17 صفحة
        ├── api/              ← عملاء REST لكل وحدة
        └── utils/            ← تأثيرات الجزيئات الخفيفة
```

### الخدمات الثلاثة (Docker)

| الخدمة | المنفذ | الوصف |
|---|---|---|
| **web** | 5173 | واجهة React (nginx + SPA fallback) |
| **api** | 4000 | REST API + Swagger على `/docs` |
| **postgres** | 5432 | قاعدة البيانات + healthcheck |

---

## 2) قاعدة البيانات (12 جدول)

| الجدول | الوظيفة |
|---|---|
| `users` | الحسابات (3 أدوار: JOB_SEEKER / COMPANY / ADMIN) + حالة (ACTIVE / SUSPENDED / PENDING_VERIFICATION) |
| `job_seeker_profiles` | السيرة الذاتية: مهارات، خبرات، تعليم، bio |
| `companies` | الشركات: اسم، slug، وصف، لوجو، موقع |
| `company_members` | عضوية المستخدمين في الشركات |
| `jobs` | الوظائف: حالة (DRAFT/PUBLISHED/CLOSED)، مرتب، نوع، مستوى |
| `applications` | التقديمات: cover letter، حالة، سجل تاريخي |
| `application_status_history` | Timeline كامل لكل تقديم |
| `resumes` | ملفات السير المرفوعة (metadata) |
| `saved_jobs` | الوظائف المحفوظة |
| `conversations` | محادثات المراسلة |
| `messages` | رسائل المحادثات |
| `notifications` | إشعارات المستخدمين |

### الوصول للداتابيز

```bash
# من التيرمنال (psql جوا الحاوية)
docker exec -it careerhub-postgres-1 psql -U careerhub -d careerhub

# أوامر مفيدة
\dt                      -- عرض الجداول
SELECT * FROM users;     -- استعلام
\q                       -- خروج
```

> ⚠️ من pgAdmin أو أي عميل خارجي: host=`localhost`, port=`5432`,
> user=`careerhub`, password=**(the value of `POSTGRES_PASSWORD` in your `.env`)**, db=`careerhub`
> (بيانات الدخول جوا الشبكة الداخلية للدوكر مختلفة — host=`postgres` — ومكتوبة في `.env`).

---

## 3) التشغيل خطوة بخطوة

### أ) أول مرة (أو بعد نسخ المشروع)

```bash
# 1. افتح Docker Desktop واستنى لحد ما الأيقونة تستقر في الـ system tray

# 2. من مجلد المشروع
cd "C:\Users\user\Documents\Codex\2026-09-22\new-chat\outputs\CareerHub"

# 3. بناء وتشغيل كل الخدمات
docker compose up --build -d

# 4. تابع حتى تستقر (كلها Up + Healthy)
docker compose ps

# 5. جرّب الصحة
curl http://localhost:4000/health
```

> الـ API ينفّذ `prisma db push` تلقائيًا عند الإقلاع — لا migrations يدوية مطلوبة في التطوير.

### ب) الأيام التالية

```bash
docker compose up -d     # تشغيل بدون إعادة بناء (سريع)
docker compose down      # إيقاف (البيانات تبقى محفوظة في volume)
docker compose down -v   # إيقاف + مسح كل البيانات (نهائي)
docker compose logs api  # متابعة لوجات الـ API
```

### ج) حسابات التجربة (كلمة السر موحدة: `Passw0rd!123`)

> ⚠️ **دي حسابات تطوير محلية بس** — موجودة على جهازك من وقت الاختبار. مش بتنشأ تلقائيًا على أي سيرفر إنتاج (`migrate deploy` مش بيعمل seed)، وممنوع تكرر كلمة سر بسيطة زي دي في الإنتاج.

| الدور | البريد | ملاحظات |
|---|---|---|
| 👤 باحث عمل | `test@careerhub.dev` | بروفايل معدّ |
| 🏢 شركة | `jobs@niletech.dev` | Nile Tech — وظيفتان منشورتان |
| 🛡️ أدمن | `sara@careerhub.dev` | صلاحيات كاملة |

---

## 4) خريطة الـ API (المنافذ على :4000)

| المجموعة | المسار | أهم العمليات |
|---|---|---|
| المصادقة | `/api/v1/auth` | register, login, refresh (rotation), logout |
| الوظائف | `/api/v1/jobs` | بحث عام + CRUD للشركة + حفظ |
| التقديمات | `/api/v1/applications` | تقديم، متابعة، ملخص `me/summary` |
| البروفايل | `/api/v1/me` | بيانات باحث العمل |
| الشركات | `/api/v1/companies` | عامة + إدارة خاصة |
| الإشعارات | `/api/v1/notifications` | عرض + تحديد مقروء |
| الرسائل | `/api/v1/conversations` | إنشاء محادثة + إرسال |
| الإدارة | `/api/v1/admin` | إحصائيات + إدارة كل الكيانات |

التوثيق التفاعلي الكامل مع أمثلة: **http://localhost:4000/docs**

---

## 5) خطة تحقيق الدخل 💰

### المرحلة 1 — إطلاق مجاني لبناء القاعدة (شهر 1-3)

- **الهدف:** 50 شركة و1,000 باحث عمل في مصر/المنطقة العربية.
- التسجيل مجاني بالكامل. وظيفة واحدة نشطة لكل شركة مجانًا.
- **المؤشرات:** الوظايف المنشورة أسبوعيًا، نسبة إكمال البروفايل.

### المرحلة 2 — خطط مدفوعة للشركات (B2B) — المصدر الأساسي

| الخطة | السعر المقترح | المزايا |
|---|---|---|
| **Free** | 0 EGP | وظيفة نشطة واحدة، 25 متقدم كحد أقصى |
| **Growth** | 750 EGP/شهر | 10 وظائف، متقدمون بلا حدود، Boost في نتائج البحث، تحليلات |
| **Scale** | 2,000 EGP/شهر | وظائف بلا حدود، علامة بيضاء، أولوية دعم، API access |

> تنفيذ تقني جاهز 80%: جدول `jobs` فيه حالة، والتحقق من حدود الخطة يتم في
> `jobs.routes.ts` قبل الإنشاء — يلزم فقط إضافة جدول `subscriptions` وبوابة دفع.

### المرحلة 3 — مصادر إضافية

1. **Featured/Boost للوظيفة** (150 EGP/أسبوع): تثبيت أعلى نتائج البحث + شارة مميزة.
   *(نقطة تنفيذ بسيطة: عمود `featuredUntil` في جدول jobs + sort في query البحث.)*
2. **الدخول للشركات (B2B Enterprise)**: عقود سنوية للشركات الكبيرة — توظيف بالجملة + ATS خفيف.
3. **عمولة على التدريب**: شراكة مع منصات كورسات — خصم للمستخدمين وعمولة لك.
4. **إعلانات** لاحقًا فقط وبشكل محدود جدًا (حتى لا تفسد التجربة).

### أرقام واقعية للتقدير (سنة أولى معتدلة)

- 100 شركة مدفوعة × متوسط 900 EGP ≈ **90,000 EGP/شهر**
- 40 وظيفة Featured × 150 EGP ≈ **6,000 EGP/شهر**
- **الإجمالي المحتمل ≈ 1.15M EGP سنويًا** بمصاريف تشغيل شبه معدومة (سيرفر ~$20/شهر).

### أول خطوات عملية

1. إضافة جدول `plans` + `subscriptions` (يوم عمل واحد).
2. ربط **Paymob** أو **Fawry** للدفع المحلي (2-3 أيام).
3. صفحة Pricing عامة + لوحة billing داخل حساب الشركة.
4. بريد ترحيبي آلي + تذكير تجريبي بعد 14 يوم.

---

## 6) النشر الإنتاجي (VPS) 🚀

### المكونات الجاهزة

| الملف | الوظيفة |
|---|---|
| `docker-compose.prod.yml` | كومبوز الإنتاج: Postgres **بدون منفذ مكشوف** + api بـ `migrate deploy` + web + Caddy |
| `Caddyfile` | **HTTPS تلقائي** (Let's Encrypt) + توجيه `/api/*` و `/docs` للـ API + headers أمنية |
| `.env.production.example` | قالب بكل المتغيرات المطلوبة مع أوامر توليد الأسرار |
| `scripts/deploy.sh` | أمر واحد للنشر: تحديث الكود + نسخة احتياطية + بناء + تشغيل + انتظار الصحة + إعادة تشغيل الخدمات الواقعة + تحقق HTTPS |
| `scripts/backup-db.sh` | نسخة `.sql.gz` مضغوطة + حذف القديم + رفع اختياري بـ rclone |
| `scripts/backup-all.sh` | نسخة شاملة: الداتابيز + كل ملفات الـ CV في tar.gz — **دي المستحسن للكرون** |
| `scripts/restore-db.sh` | استرجاع أي نسخة (بيوقف الـ API ويرجّعه أوتوماتيك) |
| `scripts/restore-resumes.sh` | استرجاع ملفات الـ CV من نسخة tar.gz |
| `scripts/health-check.sh` | فحص صحة كل الخدمات: حاويات + API + web + قاعدة البيانات |
| `prisma/migrations/` | Migrations رسمية — `migrate deploy` بدل `db push` نهائيًا في الإنتاج |

### خطوات النشر على VPS جديد (Ubuntu + Docker)

```bash
# 1) على جهازك: انقل المشروع (أو git clone على السيرفر مباشرة)
scp -r CareerHub user@your-vps:/opt/careerhub

# 2) على السيرفر: جهز البيئة بالأسرار الحقيقية
cd /opt/careerhub
cp .env.production.example .env
nano .env     # DOMAIN + POSTGRES_PASSWORD + JWT secrets + SMTP
#   توليد أسرار:  openssl rand -hex 32   و   openssl rand -base64 24

# 3) وجّه DNS: سجل A record للدومين على IP السيرفر (قبل التشغيل)

# 4) انشر — أمر واحد
./scripts/deploy.sh
# بيبني الصور، يشغّل الـ stack، ينفذ migrations، ويتحقق من https://your-domain/health
```

أول تشغيل: Caddy يطلق شهادة TLS تلقائيًا من Let's Encrypt ويجديدها دايمًا — صفر إعداد يدوي.

### النسخ الاحتياطي التلقائي

```bash
# مجدول يوميًا 3 فجرًا — أضفه مرة واحدة:
crontab -e
0 3 * * * cd /opt/careerhub && ./scripts/backup-all.sh >> ./backups/backup.log 2>&1
```

- النسخ في `./backups/` كـ gzip (الافتراضي: آخر 14 يوم، قابل للتعديل بـ `BACKUP_KEEP_DAYS`)
- نسخ خارج السيرفر: اضبط `rclone config` مرة واحدة وحط الـ remote في `BACKUP_RCLONE_TARGET` (مثلًا Google Drive أو S3)
- الاسترجاع: `./scripts/restore-db.sh backups/careerhub_2026-09-23_0300.sql.gz`

### اختلافات الإنتاج عن التطوير

| | التطوير (compose up) | الإنتاج (prod.yml) |
|---|---|---|
| Schema | `prisma db push` | `prisma migrate deploy` (مُراجعة ومحفوظة) |
| Postgres | مكشوف على :5432 | **داخلي فقط** — لا منفذ على السيرفر |
| HTTP | localhost مباشر | Caddy: HTTPS + HSTS + gzip |
| إعادة تشغيل | يدوي | `restart: unless-stopped` لكل الخدمات |

**عند تعديل الـ schema مستقبلًا**: `npx prisma migrate dev --name <change>` محليًا → اعمل commit لمجلد migrations → `./scripts/deploy.sh` على السيرفر هيطبقها تلقائيًا.

---

## 7) ملخص الجاهزية ✅

| المجال | الحالة |
|---|---|
| الكود (TypeScript كامل) | ✅ صفر أخطاء typecheck |
| Docker (3 خدمات + healthchecks) | ✅ شغال فعليًا الآن |
| إنتاج (HTTPS + migrations + backups) | ✅ جاهز للنشر بأمر واحد |
| قاعدة البيانات (12 جدول + بيانات تجريبية) | ✅ |
| الأمان (JWT rotation, bcrypt, RBAC, rate limit) | ✅ |
| واجهة مستخدم (ثيم فاتح، responsive) | ✅ مُختبرة بصريًا |
| التوثيق (Swagger + هذا الدليل + خريطة) | ✅ |
