# iCHK — تشغيل شبكة الألياف الضوئية

تطبيق عربي/إنجليزي لإدارة أوامر العمل والفرق الميدانية. يستخدم Supabase للمصادقة وقاعدة PostgreSQL والتحديثات الفورية، ويستخدم Vercel لاستضافة الواجهة والوظائف الإدارية.

## إعداد Supabase

1. أنشئ مشروعاً في [Supabase](https://supabase.com/dashboard).
2. من **Project Settings → API** انسخ Project URL و`anon`/publishable key إلى `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY`.
3. أضف القيمتين نفسيهما إلى `SUPABASE_URL`، وانسخ `service_role` key إلى `SUPABASE_SERVICE_ROLE_KEY`. المفتاح السري للخادم فقط؛ لا تضعه في متغير يبدأ بـ `VITE_` ولا تشاركه.
4. من **SQL Editor** شغّل محتوى [`supabase/schema.sql`](./supabase/schema.sql).
5. من **Authentication → Providers** فعّل Email. من إعدادات Authentication أضف نطاق Vercel ضمن **Site URL / Redirect URLs** بعد النشر.
6. أنشئ حساب مسؤول من **Authentication → Users**، ثم نفّذ الاستعلام التالي في SQL Editor مع استبدال البريد:

   ```sql
   insert into public.profiles (id, email, role)
   select id, email, 'supervisor'
   from auth.users
   where email = 'supervisor@example.com';
   ```

حسابات الفرق ينشئها مسؤول الشفت من التطبيق، وتستخدم اسم المستخدم وكلمة المرور. لا يُحفظ نص كلمة المرور في قاعدة البيانات.

## تشغيل محلي

انسخ `.env.example` إلى `.env` واملأ الإعدادات. لا ترفع `.env` إلى GitHub.

```sh
npm install
npm run dev
```

`npm run dev` يشغّل واجهة Vite فقط؛ وظائف إدارة الحسابات تعمل على Vercel. يمكن استخدام `?demo=1` لمعاينة واجهة تجريبية محلية.

## النشر على GitHub وVercel

1. ارفع ملفات المشروع إلى مستودع GitHub خاص.
2. في Vercel اختر **Add New → Project** واربط المستودع. يستخدم Vercel `npm run build` ومجلد `dist`.
3. أضف متغيرات البيئة الأربعة أعلاه من **Project Settings → Environment Variables**. عرّف `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` للـ Production وPreview وDevelopment؛ وعرّف `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` للخادم فقط.
4. أعد النشر بعد إضافة المتغيرات. عمليات الدفع اللاحقة إلى GitHub ستطلق نشر Vercel تلقائياً.

## ملاحظات

- قواعد RLS في `supabase/schema.sql` تقصر بيانات المهام على مسؤول الشفت والفريق المعيّن، وتحمي محادثات المهام.
- تنبيهات الجيك تعمل أثناء فتح التطبيق عبر Supabase Realtime؛ إشعارات الخلفية أثناء إغلاق الموقع لم تعد متاحة بعد إزالة Firebase Messaging.
- إعداد Supabase جديد لا يستورد بيانات Firebase تلقائياً. صدّر بيانات Firebase القديمة وخطّط لترحيلها قبل إيقاف مشروع Firebase إذا كانت البيانات الحالية مطلوبة.
