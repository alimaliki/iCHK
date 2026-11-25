import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from "./supabase";
import { httpsCallable } from "./supabase";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "./supabase";
import { auth, db, functions, isSupabaseConfigured } from "./supabase";
import { iraqGovernorates, iraqMapViewBox } from "./iraqGovernorates";

const SettingsContext = createContext(null);
const TASK_SLA_MS = 4 * 60 * 60 * 1000;
const EMPTY_CASE_DETAILS = {
  src: "",
  fmsId: "",
  department: "",
  region: "",
  fdt: "",
  efu: "0",
  maintenance: "",
  caseStatus: "",
  escalation: "",
  grRequest: "no",
  caseCreatedAt: "",
};
const english = {
  "iCHK": "iCHK",
  "متابعة المهام": "Task operations",
  "عمليات الألياف الضوئية": "Fiber operations",
  "مركز تشغيل الشبكة": "Network operations center",
  "مساحة الفريق": "Team workspace",
  "لوحة المتابعة": "Operations overview",
  "لوحة التحكم": "Dashboard",
  "الخريطة": "Map",
  "أعضاء الفرق": "Team members",
  "الفرق": "Teams",
  "الأعضاء": "Members",
  "الشفت": "Shift",
  "الشفتات": "Shifts",
  "كل الشفتات": "All shifts",
  "الصباحي": "Morning",
  "المسائي": "Evening",
  "الفجري": "Night",
  "الشفت الصباحي": "Morning shift",
  "الشفت المسائي": "Evening shift",
  "الشفت الفجري": "Night shift",
  "فرق": "teams",
  "لا توجد فرق في هذا الشفت.": "No teams are assigned to this shift.",
  "فرق الشفت": "Shift teams",
  "بيانات الكيس": "Case details",
  "رقم SRC": "SRC",
  "معرّف FMS": "FMS ID",
  "القسم": "Department",
  "المنطقة": "Region",
  "FDT": "FDT",
  "EFU": "EFU",
  "الصيانة": "Maintenance",
  "حالة الكيس": "Case status",
  "التصعيد": "Escalation",
  "طلب GR": "GR Request",
  "تاريخ إنشاء الكيس": "Created at",
  "فتح FMS": "Open FMS",
  "فتح مهمة FMS": "Open FMS Task",
  "الوقت المنقضي": "ELAPSED",
  "الوقت المتبقي": "REMAINING",
  "الوقت عند الإغلاق": "ELAPSED AT CLOSE",
  "المتبقي عند الإغلاق": "REMAINING AT CLOSE",
  "وقت إغلاق المهمة": "Task close time",
  "تاريخ إغلاق المهمة": "CLOSED",
  "غير متوفر": "NOT AVAILABLE",
  "وقت الإغلاق غير مسجل": "CLOSE TIME NOT RECORDED",
  "حدد وقت إغلاق صالحاً.": "Set a valid close time.",
  "تجاوز SLA": "OVER SLA",
  "الوقت المنقضي حتى تجاوز SLA": "Elapsed time until SLA is exceeded",
  "تاريخ إضافة المهمة": "CREATED",
  "الوصف": "Description",
  "نعم": "Yes",
  "لا": "No",
  "غير محدد": "Not specified",
  "رابط FMS يجب أن يبدأ بـ https://.": "The FMS link must start with https://.",
  "معلومات الأعضاء مستقلة عن حسابات الدخول.": "Member details are separate from sign-in accounts.",
  "إضافة عضو": "Add member",
  "إضافة فريق": "Add team",
  "لا توجد فرق متاحة بعد.": "No teams available yet.",
  "الاسم الكامل": "Full name",
  "رقم الهاتف": "Phone number",
  "الاختصاص أو المسؤولية": "Role or responsibility",
  "المعرّف": "ID",
  "اسم المستخدم (معلومات فقط)": "Username (reference only)",
  "معلومات تعريفية فقط، لا تنشئ حساب دخول.": "Reference information only; this does not create a sign-in account.",
  "كل الفرق": "All teams",
  "أعضاء": "members",
  "المهام": "Tasks",
  "لا يوجد أعضاء لهذا الفريق بعد.": "This team has no members yet.",
  "لا توجد فرق متاحة. أضف فريقاً أولاً ثم سجّل أعضاءه.": "No teams available. Create a team first, then add its members.",
  "بدون معرّف": "No ID",
  "لا يوجد رقم": "No phone number",
  "إجراءات العضو": "Member actions",
  "جميع الأعضاء": "All members",
  "اسم المستخدم": "Username",
  "لا يوجد أعضاء بعد.": "No members yet.",
  "لا توجد مهام بهذه الحالة.": "No tasks in this status.",
  "اختر فريقاً": "Select a team",
  "حفظ العضو": "Save member",
  "تعديل بيانات العضو": "Edit member details",
  "حذف العضو": "Delete member",
  "تأكيد حذف العضو": "Confirm member deletion",
  "هل تريد حذف بيانات هذا العضو؟": "Delete this member's details?",
  "أدخل اسم العضو واختر الفريق.": "Enter a member name and select a team.",
  "لا توجد أسماء مطابقة.": "No matching members.",
  "بحث بالاسم أو المعرّف...": "Search by name or ID...",
  "لوحة تحكم العمليات": "Operations dashboard",
  "نظرة عامة على حالة المهام والفرق الميدانية.": "An overview of field tasks and crew activity.",
  "بانتظار الفحص": "Pending checks",
  "إجمالي المهام": "Total tasks",
  "حالة مواقع المهام": "Task location status",
  "محافظات العراق": "Iraq governorates",
  "خريطة محافظات العراق": "Map of Iraq governorates",
  "خريطة العمليات الميدانية": "Field operations map",
  "التوزيع الجغرافي للمهام": "Geographic task distribution",
  "نظرة مباشرة على المحافظات ومواقع المهام الميدانية.": "A live view of governorates and field task locations.",
  "مهام في الخريطة": "Tasks on map",
  "المهام الممثلة على الخريطة": "Tasks represented on the map",
  "محافظات عليها مهام": "Governorates with tasks",
  "مهام بلا محافظة": "Tasks without a governorate",
  "توزيع المهام حسب المحافظة": "Task distribution by governorate",
  "حالة المهام": "Task status",
  "المحافظات المشمولة": "Covered governorates",
  "تغطية المحافظات": "Governorate coverage",
  "بقية المحافظات": "Other governorates",
  "من أصل": "of",
  "لا توجد محافظات مغطاة حالياً": "No governorates covered yet",
  "عيّن محافظة لإحدى المهام لتظهر هنا على الخريطة.": "Assign a governorate to a task to see it highlighted on the map.",
  "الأصفر يميّز المحافظات التي لديها مهام مفتوحة.": "Yellow marks governorates with open tasks.",
  "اضغط على المحافظة لعرض مهامها.": "Select a governorate to view its cases.",
  "عرض كل المهام": "Show all cases",
  "المهام في": "Cases in",
  "لا توجد مهام مفتوحة في هذه المحافظة.": "No open cases in this governorate.",
  "مهمة": "task",
  "مهام": "tasks",
  "المحافظات حسب خريطة SVG المرفقة؛ المحافظات التي تحتوي على مهام مفتوحة مميزة باللون الأصفر. اضغط على المحافظة لعرض مهامها.": "Governorates follow the supplied SVG map; governorates with open tasks are highlighted in yellow. Select a governorate to view its cases.",
  "المحافظة": "Governorate",
  "المحافظات": "Governorates",
  "اختر المحافظة": "Select governorate",
  "المحافظة غير محددة": "Governorate not specified",
  "اختر محافظة واحدة أو أكثر.": "Select one or more governorates.",
  "اختر محافظة واحدة على الأقل.": "Select at least one governorate.",
  "عرض على الخريطة": "Show on map",
  "تحديد المحافظات": "Set governorates",
  "حدد محافظة واحدة أو أكثر للمهمة لتمييزها على الخريطة.": "Select one or more governorates for the task to highlight them on the map.",
  "بغداد - غرفة التوزيع 4": "Baghdad — Distribution room 4",
  "البصرة - موقع 12": "Basrah — Site 12",
  "ذي قار - غرفة التوزيع 4": "Dhi Qar — Distribution room 4",
  "غرفة التوزيع 4": "Distribution room 4",
  "موقع 12": "Site 12",
  "الموقع غير محدد": "Location not specified",
  "لا توجد مهام نشطة حالياً.": "No active tasks right now.",
  "إجراءات سريعة": "Quick actions",
  "مراجعة طلب فحص": "Review check request",
  "عرض الفرق": "Manage crews",
  "افتح مهمة": "Open task",
  "ابحث برقم المهمة أو المنطقة...": "Search by case ID or region...",
  "لم نعثر على مهام مطابقة.": "No matching tasks found.",
  "مسح البحث": "Clear search",
  "مهامي": "My team's tasks",
  "ابدأ بإضافة أول مهمة للفريق.": "Create the first task for your crews.",
  "ستظهر المهام الجديدة هنا.": "New assignments will appear here.",
  "مهمة جديدة": "New task",
  "دعوة عضو للفريق": "Invite a crew member",
  "المتابع": "Shift supervisor",
  "عضو الفريق": "Crew member",
  "تسجيل الخروج": "Sign out",
  "المهمة": "Task",
  "مكتملة": "Completed",
  "قيد التنفيذ": "In Progress",
  "معلّقة": "On Hold",
  "إيقاف المهمة مؤقتاً": "Put on hold",
  "استئناف المهمة": "Resume task",
  "المهام النشطة": "Active tasks",
  "لا توجد مهام نشطة.": "No active tasks.",
  "الإعدادات": "Settings",
  "إدارة إعدادات مساحة العمل والمظهر.": "Manage workspace and appearance settings.",
  "الملف الشخصي": "Profile",
  "إعدادات الملف الشخصي": "Profile settings",
  "الاسم الظاهر": "Display name",
  "غيّر اسمك، أو حدّث البريد وكلمة المرور بعد تأكيد هويتك.": "Change your name, or update your email and password after verifying your identity.",
  "البريد الإلكتروني الحالي": "Current email",
  "البريد الإلكتروني الجديد": "New email",
  "كلمة المرور الحالية": "Current password",
  "كلمة مرور جديدة": "New password",
  "متاح بالمناوبة": "Available this shift",
  "جاهز": "Ready",
  "خارج المناوبة": "Off shift",
  "مشغول": "Busy",
  "مهام مفتوحة": "open tasks",
  "إخراج الفريق من المناوبة": "Set team off shift",
  "إضافة الفريق إلى المناوبة": "Set team on shift",
  "تغيير إلى مشغول": "Set to Busy",
  "إنهاء فترة العمل": "End shift",
  "تغيير إلى جاهز": "Set to Ready",
  "تغيير حالة الفريق": "Change team availability",
  "تم حفظ التغييرات.": "Changes saved.",
  "تم إرسال رابط تأكيد البريد الإلكتروني إلى العنوان الجديد.": "A confirmation link was sent to the new email address.",
  "أدخل كلمة المرور الحالية لتغيير البريد أو كلمة المرور.": "Enter your current password to change your email or password.",
  "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.": "The new password must be at least 8 characters.",
  "أدخل اسماً ظاهراً من حرفين إلى 80 حرفاً.": "Enter a display name between 2 and 80 characters.",
  "عرض الفرق وحالة مناوبتها وإدارتها.": "View teams, their shift availability, and manage them.",
  "في المعاينة، يتم حفظ الاسم محلياً فقط.": "In preview mode, the name is saved locally only.",
  "لا يوجد وصف إضافي لهذه المهمة.": "No additional details for this task.",
  "مسؤول الشفت": "Shift supervisor",
  "إنهاء المهمة": "Complete task",
  "إعادة فتح المهمة": "Reopen task",
  "رقم المهمة": "Task number",
  "تاريخ الإضافة": "Created",
  "الفريق": "Assigned crew",
  "فريق الميدان": "Field crew",
  "محادثة المهمة": "Task conversation",
  "بداية المحادثة": "Conversation started",
  "أرسل تحديثات واستفسارات مرتبطة بهذه المهمة.": "Share updates and questions related to this task.",
  "أنت": "You",
  "مباشرة": "Live",
  "طلب جيك": "Request task check",
  "بانتظار الجيك": "Check requested",
  "تم الجيك": "Check completed",
  "تأكيد تنفيذ الجيك": "Confirm check completed",
  "طلبات جيك": "Check requests",
  "تفعيل التنبيهات": "Enable alerts",
  "التنبيهات مفعلة": "Alerts enabled",
  "فتح الجيك": "Open check",
  "طلب جيك جديد": "New task check request",
  "إجراءات التكت": "Task actions",
  "تعديل التكت": "Edit task",
  "حذف التكت": "Delete task",
  "إجراءات الرسالة": "Message actions",
  "تعديل الرسالة": "Edit message",
  "حذف الرسالة": "Delete message",
  "إجراءات الفريق": "Team actions",
  "تعديل الفريق": "Edit team",
  "حذف الفريق": "Delete team",
  "حفظ التعديلات": "Save changes",
  "رقم المهمة لا يتغير للحفاظ على سجل المحادثة.": "The task number is fixed to preserve its conversation history.",
  "سيتم حذف المهمة": "This will permanently delete task",
  "ومحادثتها بالكامل. لا يمكن التراجع عن هذا الإجراء.": "and its entire conversation. This cannot be undone.",
  "حذف التكت نهائياً": "Delete task permanently",
  "إلغاء": "Cancel",
  "نص الرسالة": "Message text",
  "يمكن لمسؤول الشفت تعديل رسائل محادثة المهمة.": "The shift supervisor can edit messages in this task conversation.",
  "سيتم حذف هذه الرسالة من محادثة المهمة.": "This message will be removed from the task conversation.",
  "اختر ما يحدث للتكتات": "Choose what happens to this team's tasks",
  "حذف الفريق فقط (إذا لم توجد تكتات)": "Delete the team only (when it has no tasks)",
  "إعادة إسناد التكتات إلى فريق آخر": "Reassign tasks to another team",
  "حذف الفريق وكل تكتاته ومحادثاتها": "Delete the team and all its tasks and conversations",
  "الفريق البديل": "Replacement team",
  "هذا الخيار يحذف نهائياً كل التكتات والرسائل المرتبطة بالفريق.": "This permanently deletes every task and message assigned to this team.",
  "تأكيد حذف الفريق": "Confirm team deletion",
  "طي القائمة": "Collapse menu",
  "عرض القائمة": "Show menu",
  "إخفاء القائمة": "Hide menu",
  "تكت": "tasks",
  "حساب قديم": "legacy account",
  "اتركها فارغة دون تغيير": "Leave blank to keep unchanged",
  "أدخل اسم المهمة واختر الفريق.": "Enter a task title and choose a team.",
  "اكتب تحديثاً أو استفساراً عن هذه المهمة...": "Write an update or question about this task...",
  "Enter للإرسال · Shift + Enter لسطر جديد": "Enter to send · Shift + Enter for a new line",
  "إرسال الرسالة": "Send message",
  "الرسائل مرتبطة بالمهمة الحالية فقط": "Messages are scoped to this task",
  "ابدأ مساحة المتابعة": "Network operations",
  "أضف أول مهمة لفريقك": "Assign your first field task",
  "لا توجد مهام بعد": "No assigned tasks yet",
  "أنشئ مهمة برقمها الخاص، وتابع النقاش والتحديثات في محادثة مستقلة.": "Create a numbered work order and follow its updates in a dedicated thread.",
  "سيضيف المتابع المهام هنا. ستجد محادثة خاصة بكل مهمة.": "Your supervisor will assign work here. Each task has its own conversation.",
  "إنشاء مهمة جديدة": "Create a task",
  "ستكون لهذه المهمة محادثة مستقلة تظهر للفريق.": "This work order will have a dedicated conversation for its assigned crew.",
  "اسم المهمة": "Task title",
  "المنطقة / الموقع": "Area / site",
  "تفاصيل إضافية": "Work details",
  "(اختياري)": "(optional)",
  "أضف وصفاً يساعد الفريق...": "Add site notes or work instructions...",
  "إنشاء المهمة": "Create task",
  "اختر الفريق": "Assign to crew",
  "حدد الفريق الذي سيتولى هذه المهمة.": "Choose the field crew responsible for this task.",
  "أنشئ دعوة مرتبطة ببريد العضو، ثم أرسل له الرمز.": "Create an invite for the member's email and share the code.",
  "تم إنشاء الدعوة": "Invitation created",
  "أرسل هذا الرمز إلى العضو على البريد الذي أدخلته:": "Share this code with the member at the email you entered:",
  "نسخ الرمز": "Copy code",
  "إنشاء دعوة أخرى": "Create another invite",
  "بريد عضو الفريق": "Crew member email",
  "صلاحية الحساب: عضو فريق.": "This invitation grants field crew access.",
  "إنشاء رمز الدعوة": "Create invite code",
  "إدارة الفرق": "Manage crews",
  "إنشاء فريق": "Create crew",
  "اسم الفريق": "Crew name",
  "أدخل اسم الفريق.": "Enter a crew name.",
  "تم اعتماد فحص هذه المهمة.": "The check for this task has been confirmed.",
  "طلب الفريق مراجعة هذه المهمة من مسؤول الشفت.": "The crew has requested a review from the shift supervisor.",
  "يمكن للفريق طلب جيك جديد عند الحاجة.": "The crew can request another check when needed.",
  "بعد إنهاء العمل الميداني، أرسل طلب الجيك لهذه المهمة فقط.": "After completing the field work, request a check for this task.",
  "تعذر النسخ. انسخ بيانات الدخول يدوياً.": "Could not copy. Copy the credentials manually.",
  "هذا المتصفح لا يدعم إشعارات المتصفح.": "This browser does not support web notifications.",
  "أضف مفتاح VAPID إلى إعدادات المشروع أولاً.": "Add the VAPID key to project settings first.",
  "المراسلة السحابية غير مدعومة في هذا المتصفح.": "Live alerts are not supported in this browser.",
  "يجب السماح بإشعارات المتصفح لتفعيل تنبيهات الجيك.": "Allow browser notifications to enable task-check alerts.",
  "تعذر تسجيل جهازك لاستقبال الإشعارات.": "Could not register this device for notifications.",
  "مثال: فريق الشمال": "e.g. North crew",
  "حفظ الفريق": "Save crew",
  "الوضع الداكن": "Dark mode",
  "الوضع الفاتح": "Light mode",
  "التبديل إلى الإنجليزية": "Switch to English",
  "التبديل إلى العربية": "Switch to Arabic",
  "تحديثات مباشرة": "Live updates",
  "معاينة محلية — الرسائل والتغييرات هنا للتجربة فقط": "Local preview — changes are for demonstration only",
  "عرض واجهة الفريق": "Preview crew view",
  "عرض واجهة المتابع": "Preview supervisor view",
  "فريق الشرق": "East crew",
  "فريق الغرب": "West crew",
  "القطاع الشرقي - غرفة التوزيع 4": "East sector — Distribution room 4",
  "القطاع الغربي": "West sector",
  "فحص الموقع - القطاع الشرقي": "Site inspection — East sector",
  "استلام المعدات للموقع": "Equipment delivery — Site 12",
  "التأكد من جاهزية الموقع وتوثيق الملاحظات قبل نهاية الجولة.": "Verify site readiness and report findings before the end of the shift.",
  "مراجعة الكميات ومشاركة أي نواقص مع المتابع.": "Check quantities and report any shortages to the supervisor.",
  "صباح الخير، يرجى البدء بفحص القطاع الشرقي وإرسال التحديث هنا.": "Good morning. Please begin the East sector inspection and post updates here.",
  "تم الوصول للموقع. نبدأ الجولة الآن، وسنشارككم بالملاحظات أولاً بأول.": "On site. Starting the inspection now; we'll share findings as we go.",
  "تمام، يعطيكم العافية. فضلاً تحققوا من وحدات الإنارة في المدخل.": "Thanks. Please also check the fiber termination units at the entrance.",
  "تم استلام المعدات ومطابقة الكميات مع القائمة.": "Equipment received and quantities match the list.",
  "وصلت": "Connected",
  "فريق الألياف الضوئية": "Fiber field crew",
  "مركز تشغيل شبكة الألياف الضوئية": "Fiber Network Operations Center",
  "نبض الشبكة": "Network pulse",
  "خطوة واحدة ونبدأ": "One setup step to go",
  "أضف بيانات مشروع Supabase لتفعيل تسجيل الدخول والمحادثات الفورية بين الأجهزة.": "Add your Supabase project settings to enable sign-in and live messaging across devices.",
  "أنشئ مشروعاً في Supabase وفعّل Email/Password من Authentication.": "Create a Supabase project and enable Email/Password in Authentication.",
  "انسخ إعدادات تطبيق الويب إلى ملف": "Copy your web app settings into",
  "شغّل": "Run",
  "بعد تطبيق": "after applying",
  "انشر قواعد": "Deploy",
  "ثم شغّل": "then run",
  "معاينة الواجهات الآن": "Preview the interfaces",
  "راجع README.md لخطوات إعداد المشرف الأول بالتفصيل.": "See README.md for the first supervisor setup steps.",
  "فريق الميدان والمتابعة على تواصل.": "Field crews and supervisors, in sync.",
  "إدارة الميدان والتشكيل من مكان واحد.": "Manage field operations and crew assignments in one place.",
  "تابع الفرق والمهام وحالة المناوبة من لوحة مسؤول الشفت.": "Track crews, tasks, and shift availability from the supervisor dashboard.",
  "استخدم بريد مسؤول الشفت وكلمة المرور للدخول إلى لوحة الإدارة.": "Sign in to the management dashboard with your supervisor email and password.",
  "الوصول مقتصر على مسؤول الشفت": "Access is restricted to shift supervisors.",
  "محادثة واضحة مرتبطة بالمهمة نفسها، من أول خطوة إلى إنجازها.": "One clear conversation for each work order, from dispatch to completion.",
  "مساحة عملك آمنة وخاصة بفريقك": "A secure workspace for your crews",
  "أهلاً بعودتك": "Welcome back",
  "انضم إلى الفريق": "Join your crew",
  "تسجيل الدخول": "Sign in",
  "جارٍ تجهيز مساحة العمل...": "Preparing your workspace...",
  "إنشاء حساب الفريق": "Create crew account",
  "سجّل دخولك لمتابعة مهام فريقك.": "Sign in to see your crew's assignments.",
  "تحتاج إلى دعوة صالحة من المتابع لإنشاء الحساب.": "A valid supervisor invitation is required to create an account.",
  "رمز الدعوة": "Invitation code",
  "البريد الإلكتروني": "Email address",
  "كلمة المرور": "Password",
  "جارٍ التحقق...": "Checking...",
  "دخول إلى مساحة العمل": "Open workspace",
  "إنشاء الحساب": "Create account",
  "لديك دعوة للفريق؟": "Have a crew invitation?",
  "لديك حساب بالفعل؟": "Already have an account?",
  "إنشاء حساب": "Create an account",
  "دخول خاص لأعضاء الفريق المدعوين فقط": "Private access for invited crew members",
  "خاص بالمهمة": "Only visible to this task",
  "الموقع": "Location",
  "الربط بالمهمة": "Work order",
  "مثال: فحص مسار الألياف - القطاع الشرقي": "e.g. Inspect fiber route — East sector",
  "مثال: القطاع الشرقي - غرفة التوزيع 4": "e.g. East sector — Distribution room 4",
  "إسناد المهمة للفريق": "Assign work order",
  "المعاينة لا ترسل بريداً ولا تنشئ حساباً حقيقياً.": "Preview mode does not send email or create a real account.",
  "إنشاء رمز تجريبي": "Generate preview code",
  "معاينة دعوة عضو": "Preview a crew invitation",
  "في الموقع المتصل، يرسل هذا الرمز إلى البريد المحدد.": "In the connected app, this code is sent to the selected email.",
  "رمز تجريبي": "Preview code",
  "لن يعمل هذا الرمز خارج المعاينة المحلية.": "This code works only in the local preview.",
  "أنشئ فريقاً ميدانياً أولاً، ثم أسند له المهام وادعُ أعضاءه.": "Create a field crew first, then assign work and invite its members.",
  "تنظيم الفرق الميدانية التي تستقبل أوامر العمل.": "Manage the crews that receive fiber work orders.",
  "لا توجد فرق مضافة بعد.": "No crews have been added yet.",
  "أضف فريقاً إلى التشكيل المنشود؛ لا يتطلب إنشاء حساب دخول.": "Add a crew to the roster; no sign-in account is required.",
  "يتم إدارة أعضاء الفريق من صفحة أعضاء الفرق دون بيانات دخول.": "Manage crew members on the Team Members page; no sign-in credentials are required.",
  "تحديث اسم الفريق في التشكيل.": "Update the crew name on the roster.",
  "أضف فريقاً إلى التشكيل؛ لا يتطلب إنشاء حساب دخول.": "Add a crew to the roster; no sign-in account is required.",
  "يتم تسجيل أعضاء الفريق وبياناتهم من صفحة أعضاء الفرق.": "Manage crew member details on the Team Members page.",
  "يوجد فريق بهذا الاسم بالفعل.": "A crew with this name already exists.",
  "اختر الفريق الذي سيتولى المهمة.": "Choose which crew will handle this work order.",
  "أدخل رقم المهمة واسمها.": "Enter a work order number and title.",
  "رقم المهمة مستخدم بالفعل. اختر رقماً آخر.": "That work order number is already in use.",
  "استخدم أرقاماً أو أحرفاً إنجليزية أو - و _ فقط لرقم المهمة.": "Use English letters, numbers, hyphens, or underscores for the work order number.",
  "أنشئ فريقاً قبل إسناد مهمة.": "Create a crew before assigning work.",
  "اختر فريقاً قبل إنشاء الدعوة.": "Choose a crew before creating an invitation.",
  "أدخل البريد الإلكتروني للعضو.": "Enter the crew member's email address.",
  "سيُسمح لهذا البريد فقط باستخدام الدعوة. صلاحية الحساب: عضو فريق.": "Only this email can use the invitation. Access level: field crew.",
  "تعذر النسخ. انسخ الرمز يدوياً.": "Could not copy. Please copy the code manually.",
  "رمز الدعوة غير صحيح أو منتهي.": "This invitation code is invalid or expired.",
  "الدعوة غير صالحة لهذا البريد أو سبق استخدامها.": "This invitation is for a different email or has already been used.",
  "أدخل رمز الدعوة الذي أرسله لك المتابع.": "Enter the invitation code from your supervisor.",
  "ليس لديك صلاحية لهذا الإجراء. تحقق من الدعوة أو تواصل مع المتابع.": "You don't have permission for this action. Check the invitation or contact your supervisor.",
  "البريد الإلكتروني أو كلمة المرور غير صحيحة.": "Incorrect email or password.",
  "هذا البريد مسجل مسبقاً. سجّل الدخول بدلاً من ذلك.": "This email is already registered. Please sign in.",
  "اختر كلمة مرور أقوى (٦ أحرف على الأقل).": "Choose a stronger password (at least 6 characters).",
  "تحقق من صيغة البريد الإلكتروني.": "Check the email address format.",
  "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.": "Too many attempts. Please wait and try again.",
  "تعذر إكمال العملية. حاول مرة أخرى.": "Something went wrong. Please try again.",
  "حسابك لا يملك ملف صلاحيات. تواصل مع المتابع لإكمال تفعيل الحساب.": "Your account has no assigned access profile. Contact your supervisor.",
  "حسابك غير مرتبط بفريق ميداني. تواصل مع مسؤول الشفت لتحديث صلاحياتك.": "Your account is not assigned to a field crew. Contact your shift supervisor to update your access.",
  "تعذر فتح مساحة العمل": "Unable to open workspace",
  "٦ أحرف على الأقل": "At least 6 characters",
  "خطأ": "Error",
  "إغلاق": "Close",
};

function useCopy() {
  const { language } = useContext(SettingsContext);
  return (arabicText) => language === "en" ? english[arabicText] || arabicText : arabicText;
}

const iconArtwork = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  archive: <><path d="M3 4h18v4H3z" /><path d="M5 8v12h14V8M10 12h4" /></>,
  task: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M17 11a3.5 3.5 0 0 0 0-7M17 14.5h.5a4 4 0 0 1 3.5 3.5V20" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M19 8v6M16 11h6" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2M12 19.5v2M4.7 4.7l1.4 1.4M17.9 17.9l1.4 1.4M2.5 12h2M19.5 12h2M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4" /><circle cx="12" cy="12" r="7" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  network: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="m10.8 6.8-4.6 9.4M13.2 6.8l4.6 9.4M7 18h10" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  bolt: <><path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5a7.5 7.5 0 1 1 17-4.5Z" /><path d="M8 11h8M8 14h5" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" /></>,
  chevronDown: <><path d="m6 9 6 6 6-6" /></>,
  arrowLeft: <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
  arrowUp: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
};

const governorateNamesArabic = {
  "Al-Anbar": "الأنبار",
  "Karbala": "كربلاء",
  "An-Najaf": "النجف",
  "Babil": "بابل",
  "Baghdad": "بغداد",
  "Al-Qadisiyah": "القادسية",
  "Al-Muthanna": "المثنى",
  "Dhi Qar": "ذي قار",
  "Al-Basrah": "البصرة",
  "Maysan": "ميسان",
  "Wasit": "واسط",
  "Ninawa": "نينوى",
  "Dohuk": "دهوك",
  "Salah al-Din": "صلاح الدين",
  "Diyala": "ديالى",
  "Kirkuk": "كركوك",
  "Erbil": "أربيل",
  "Al-Sulaimaniyah": "السليمانية",
};

const governorateAliases = {
  AN: ["الانبار", "انبار", "anbar", "al anbar"],
  KR: ["كربلاء", "كربلا", "karbala"],
  NJ: ["النجف", "نجف", "najaf"],
  BB: ["بابل", "babil", "babylon"],
  BG: ["بغداد", "baghdad"],
  QA: ["القادسية", "الديوانية", "al qadisiyah", "qadisiyah", "diwaniyah"],
  MU: ["المثنى", "السماوة", "al muthanna", "muthanna", "samawah"],
  DQ: ["ذي قار", "الناصرية", "dhi qar", "thi qar", "nasiriyah", "nasria"],
  BS: ["البصرة", "basrah", "basra"],
  MY: ["ميسان", "العمارة", "maysan", "amarah"],
  WA: ["واسط", "الكوت", "wasit", "kut"],
  NI: ["نينوى", "الموصل", "ninawa", "mosul", "nineveh"],
  DH: ["دهوك", "dohuk", "duhok"],
  SD: ["صلاح الدين", "تكريت", "salah al din", "salahuddin", "tikrit"],
  DY: ["ديالى", "بعقوبة", "diyala", "baqubah"],
  KI: ["كركوك", "kirkuk"],
  ER: ["اربيل", "أربيل", "erbil", "hawler"],
  SU: ["السليمانية", "سليمانية", "sulaymaniyah", "sulaimani"],
};

function normalizeGovernorateText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const governorateCodeSet = new Set(iraqGovernorates.map((item) => item.code));

function isValidGovernorateSelection(codes) {
  return Array.isArray(codes)
    && codes.length > 0
    && codes.length <= iraqGovernorates.length
    && new Set(codes).size === codes.length
    && codes.every((code) => governorateCodeSet.has(code));
}

function getTaskGovernorateCodes(task) {
  if (!task) return [];
  const regionCode = getGovernorateCodeFromRegion(task.region);
  if (regionCode) return [regionCode];

  if (Object.prototype.hasOwnProperty.call(task, "governorates")) {
    if (!Array.isArray(task.governorates) || task.governorates.some((code) => !governorateCodeSet.has(code))) return [];
    return [...new Set(task.governorates)];
  }

  const explicitValue = String(task.governorate || "").trim();
  if (explicitValue) {
    const explicit = explicitValue.toUpperCase();
    const explicitMatch = iraqGovernorates.find((governorate) =>
      governorate.code === explicit
      || normalizeGovernorateText(governorate.name) === normalizeGovernorateText(explicitValue)
      || normalizeGovernorateText(governorateNamesArabic[governorate.name]) === normalizeGovernorateText(explicitValue));
    return explicitMatch ? [explicitMatch.code] : [];
  }

  const location = ` ${normalizeGovernorateText(task.location)} `;
  const matches = iraqGovernorates.filter((governorate) => (governorateAliases[governorate.code] || []).some((alias) =>
    location.includes(` ${normalizeGovernorateText(alias)} `)));
  return matches.length === 1 ? [matches[0].code] : [];
}

function getGovernorateCodeFromRegion(region) {
  const normalized = normalizeGovernorateText(region);
  if (!normalized) return "";
  return Object.entries(governorateAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeGovernorateText(alias) === normalized))?.[0] || "";
}

function getTaskLocationLabel(task, language) {
  const regionCode = getGovernorateCodeFromRegion(task.region);
  if (!regionCode) return task.location || "";

  const regionName = getGovernorateName(regionCode, language);
  const locationParts = String(task.location || "").trim().split(/\s*[—–-]\s*/);
  const locationCode = getGovernorateCodeFromRegion(locationParts[0]);
  const siteDetails = locationCode ? locationParts.slice(1).join(" — ") : locationParts.join(" — ");
  const localizedSiteDetails = language === "en"
    ? siteDetails.split(" — ").map((part) => english[part] || part).join(" — ")
    : siteDetails;
  return siteDetails ? `${regionName} — ${localizedSiteDetails}` : regionName;
}

function getTaskGovernorateCodesForTasks(tasks) {
  return [...new Set(tasks.filter((task) => task.status === "open").flatMap(getTaskGovernorateCodes))];
}

function getGovernorateName(code, language) {
  const governorate = iraqGovernorates.find((item) => item.code === code);
  if (!governorate) return "";
  return language === "en" ? governorate.name : governorateNamesArabic[governorate.name] || governorate.name;
}

function getLocalizedRegion(region, language) {
  const code = getGovernorateCodeFromRegion(region);
  if (!code) return region;
  return code === "DQ"
    ? language === "en" ? "Dhi Qar" : "ذي قار"
    : getGovernorateName(code, language);
}

function getLocalizedCaseValue(value, language) {
  const caseValuesArabic = {
    Support: "الدعم",
    "Last Mile": "الميل الأخير",
    Open: "مفتوح",
  };
  return language === "en" ? english[value] || value : caseValuesArabic[value] || value;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function GovernoratePicker({ values, onChange }) {
  const t = useCopy();
  const { language } = usePreferences();
  const selectedCodes = Array.isArray(values) ? values : [];
  return (
    <fieldset className="governorate-picker">
      <legend>{t("المحافظات")}</legend>
      <div className="governorate-picker-options">
        {iraqGovernorates.map((governorate) => {
          const selected = selectedCodes.includes(governorate.code);
          return (
            <label key={governorate.code} className={`governorate-choice ${selected ? "selected" : ""}`}>
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onChange(event.target.checked
                  ? [...selectedCodes, governorate.code]
                  : selectedCodes.filter((code) => code !== governorate.code))}
              />
              <span>{getGovernorateName(governorate.code, language)}</span>
            </label>
          );
        })}
      </div>
      {!selectedCodes.length && <small>{t("اختر محافظة واحدة أو أكثر.")}</small>}
    </fieldset>
  );
}

function IraqGovernorateMap({ highlightedCodes = [], className = "", selectedCode = null, onSelectGovernorate }) {
  const t = useCopy();
  const { language } = usePreferences();
  const isInteractive = typeof onSelectGovernorate === "function";
  const activeCodes = new Set(Array.isArray(highlightedCodes) ? highlightedCodes.filter((code) => governorateCodeSet.has(code)) : []);
  const activeGovernorates = iraqGovernorates.filter((item) => activeCodes.has(item.code));
  return (
    <svg
      className={`iraq-governorate-map ${className}`.trim()}
      viewBox={iraqMapViewBox}
      role={isInteractive ? "group" : "img"}
      aria-label={t("خريطة محافظات العراق")}
    >
      <title>{t("خريطة محافظات العراق")}</title>
      <g className="iraq-governorates">
        {iraqGovernorates.map((governorate) => (
          <path
            key={governorate.name}
            className={`${activeCodes.has(governorate.code) ? "highlighted " : ""}${selectedCode === governorate.code ? "selected" : ""}`.trim()}
            d={governorate.d}
            fillRule="evenodd"
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={getGovernorateName(governorate.code, language)}
            aria-pressed={isInteractive ? selectedCode === governorate.code : undefined}
            onClick={isInteractive ? () => onSelectGovernorate(governorate.code) : undefined}
            onKeyDown={isInteractive ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectGovernorate(governorate.code);
              }
            } : undefined}
          >
            <title>{getGovernorateName(governorate.code, language)}</title>
          </path>
        ))}
      </g>
      {activeGovernorates.map((governorate) => (
        <circle key={governorate.code} className="iraq-governorate-pulse" cx={governorate.label[0]} cy={governorate.label[1]} r="16" />
      ))}
      <g className="iraq-governorate-labels" aria-hidden="true">
        {iraqGovernorates.map((governorate) => (
          <text
            key={governorate.name}
            className={activeCodes.has(governorate.code) ? "highlighted" : ""}
            x={governorate.label[0]}
            y={governorate.label[1]}
          >
            {governorate.code}
          </text>
        ))}
      </g>
    </svg>
  );
}

function AppIcon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={`app-icon ${name === "arrowLeft" ? "app-icon-arrow-left" : ""} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconArtwork[name]}
    </svg>
  );
}

function usePreferences() {
  return useContext(SettingsContext);
}

function formatTime(timestamp, language = "ar") {
  if (!timestamp?.toDate) return language === "en" ? "Now" : "الآن";
  return new Intl.DateTimeFormat(language === "en" ? "en" : "ar", { hour: "2-digit", minute: "2-digit" }).format(
    timestamp.toDate(),
  );
}

function formatDate(timestamp, language = "ar") {
  if (!timestamp?.toDate) return language === "en" ? "Today" : "اليوم";
  return new Intl.DateTimeFormat(language === "en" ? "en" : "ar", { day: "numeric", month: "short" }).format(
    timestamp.toDate(),
  );
}

function getDateValue(value) {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return value ? new Date(value) : null;
}

function formatCaseCreatedAt(value, language) {
  const date = getDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en" : "ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeInput(value) {
  const date = getDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function normalizeTaskClosedAt(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new Error("حدد وقت إغلاق صالحاً.");
  return date.toISOString();
}

function getSafeFmsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getTaskCaseFormValues(task) {
  return {
    ...EMPTY_CASE_DETAILS,
    src: task.src || "",
    fmsId: task.fmsId || "",
    department: task.department || "",
    region: task.region || "",
    fdt: task.fdt || "",
    efu: task.efu || "0",
    maintenance: task.maintenance || "",
    caseStatus: task.caseStatus || "",
    escalation: task.escalation || "",
    grRequest: task.grRequest || "no",
    caseCreatedAt: toDateTimeInput(task.caseCreatedAt),
  };
}

function normalizeTaskCaseDetails(values) {
  const createdAt = values.caseCreatedAt ? new Date(values.caseCreatedAt) : null;
  const fmsId = values.fmsId.trim();
  if (fmsId && !getSafeFmsUrl(fmsId)) {
    throw new Error("رابط FMS يجب أن يبدأ بـ https://.");
  }
  return {
    src: values.src.trim(),
    fmsId: fmsId ? getSafeFmsUrl(fmsId) : "",
    department: values.department.trim(),
    region: values.region.trim(),
    fdt: values.fdt.trim(),
    efu: values.efu.trim(),
    maintenance: values.maintenance.trim(),
    caseStatus: values.caseStatus.trim(),
    escalation: values.escalation.trim(),
    grRequest: values.grRequest,
    caseCreatedAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : null,
  };
}

function ConfigNotice() {
  const t = useCopy();
  const { language } = usePreferences();
  const stepNumbers = language === "en" ? ["1", "2", "3"] : ["١", "٢", "٣"];
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <div className="setup-toolbar"><PreferencesBar compact /></div>
        <img className="brand-logo setup-logo" src="/ichk-wordmark.png" alt="iCHK" />
        <p className="eyebrow">{t("iCHK")} · {t("مركز تشغيل الشبكة")}</p>
        <h1>{t("خطوة واحدة ونبدأ")}</h1>
        <p className="muted">
          {t("أضف بيانات مشروع Supabase لتفعيل تسجيل الدخول والمحادثات الفورية بين الأجهزة.")}
        </p>
        <div className="setup-steps">
          <span>{stepNumbers[0]}</span><p>{t("أنشئ مشروعاً في Supabase وفعّل Email/Password من Authentication.")}</p>
          <span>{stepNumbers[1]}</span><p>{t("انسخ إعدادات تطبيق الويب إلى ملف")} <code>.env</code>.</p>
          <span>{stepNumbers[2]}</span><p>{t("شغّل")} <code>npm run dev</code> {t("بعد تطبيق")} <code>supabase/schema.sql</code>.</p>
        </div>
        <a className="button button-primary full-width setup-preview" href="?demo=1">{t("معاينة الواجهات الآن")} <AppIcon name="arrowLeft" size={16} /></a>
        <p className="setup-foot">{t("راجع README.md لخطوات إعداد المشرف الأول بالتفصيل.")}</p>
      </div>
    </main>
  );
}

function AuthScreen() {
  const t = useCopy();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const loginName = identifier.trim().toLowerCase();
      const loginEmail = loginName === "alimaliki"
        ? "alimaliki@earthlink.iq"
        : loginName.includes("@")
          ? loginName
          : `${normalizeUsername(loginName)}@supervisor.wasla.invalid`;
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (submitError) {
      setError(submitError.message === "اسم المستخدم غير صالح."
        ? "اسم المستخدم غير صالح."
        : friendlyError(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside">
        <div className="brand brand-light"><img className="brand-logo" src="/ichk-wordmark.png" alt="iCHK" /></div>
        <div className="aside-copy">
          <span className="aside-kicker">{t("مركز تشغيل الشبكة")}</span>
          <h1>{t("إدارة الميدان والتشكيل من مكان واحد.")}</h1>
          <p>{t("تابع الفرق والمهام وحالة المناوبة من لوحة مسؤول الشفت.")}</p>
        </div>
        <div className="aside-note"><span className="online-dot" /> {t("مساحة عملك آمنة وخاصة بفريقك")}</div>
      </section>
      <section className="auth-main">
        <div className="auth-preferences"><PreferencesBar compact /></div>
        <div className="auth-card">
          <div className="brand"><img className="brand-logo" src="/ichk-wordmark.png" alt="iCHK" /></div>
          <p className="eyebrow">{t("مركز تشغيل الشبكة")}</p>
          <h2>{t("تسجيل الدخول")}</h2>
          <p className="muted">{t("استخدم بريد مسؤول الشفت وكلمة المرور للدخول إلى لوحة الإدارة.")}</p>
          <form onSubmit={submit} className="auth-form">
            <label>
              {t("البريد الإلكتروني")}
              <input type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="supervisor@company.com" autoComplete="username" required />
            </label>
            <label>
              {t("كلمة المرور")}
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("كلمة المرور")} autoComplete="current-password" required />
            </label>
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit" disabled={busy}>
              {busy ? t("جارٍ التحقق...") : t("دخول إلى مساحة العمل")}
              {!busy && <AppIcon name="arrowLeft" size={16} />}
            </button>
          </form>
          <div className="auth-security"><span><AppIcon name="shield" size={16} /></span> {t("الوصول مقتصر على مسؤول الشفت")}</div>
        </div>
      </section>
    </main>
  );
}

function normalizeUsername(value) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("اسم المستخدم غير صالح.");
  return username;
}

function getNextTeamAvailability(status) {
  if (status === "جاهز") return "busy";
  if (status === "مشغول") return "off-shift";
  return "ready";
}

function getNextTeamAvailabilityLabel(status) {
  if (status === "جاهز") return "تغيير إلى مشغول";
  if (status === "مشغول") return "إنهاء فترة العمل";
  return "تغيير إلى جاهز";
}

function PreferencesBar({ compact = false }) {
  const { language, setLanguage, theme, setTheme } = usePreferences();
  const t = useCopy();
  return (
    <div className={`preferences-bar ${compact ? "compact" : ""}`}>
      <button className="preference-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={t(theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن")}>
        <span aria-hidden="true"><AppIcon name={theme === "dark" ? "sun" : "moon"} size={16} /></span>
        {!compact && <span>{t(theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن")}</span>}
      </button>
      <button className="language-button" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} title={t(language === "ar" ? "التبديل إلى الإنجليزية" : "التبديل إلى العربية")}>
        {language === "ar" ? "EN" : "عربي"}
      </button>
    </div>
  );
}

function friendlyError(error) {
  const messages = {
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "invalid_credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/email-already-in-use": "هذا البريد مسجل مسبقاً. سجّل الدخول بدلاً من ذلك.",
    "email_exists": "هذا البريد مسجل مسبقاً. سجّل الدخول بدلاً من ذلك.",
    "auth/weak-password": "اختر كلمة مرور أقوى (٦ أحرف على الأقل).",
    "weak_password": "اختر كلمة مرور أقوى (٦ أحرف على الأقل).",
    "auth/invalid-email": "تحقق من صيغة البريد الإلكتروني.",
    "invalid_email": "تحقق من صيغة البريد الإلكتروني.",
    "23505": "اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.",
    "permission-denied": "ليس لديك صلاحية لهذا الإجراء. تحقق من الدعوة أو تواصل مع المتابع.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.",
    "auth/requires-recent-login": "سجّل الدخول مجدداً قبل تغيير إعدادات الحساب الحساسة.",
    "auth/wrong-password": "كلمة المرور الحالية غير صحيحة.",
    "functions/already-exists": "اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.",
    "functions/permission-denied": "ليس لديك صلاحية لهذا الإجراء.",
    "functions/invalid-argument": "تعذر إنشاء حساب الفريق.",
    "functions/internal": "تعذر إكمال العملية. تحقق من إعدادات Supabase ثم حاول مجدداً.",
    "functions/failed-precondition": "لا يمكن إكمال العملية قبل معالجة التكتات المرتبطة بالفريق.",
    "functions/not-found": "العنصر المطلوب غير موجود أو تم حذفه.",
  };
  return messages[error.code] || error.message || "تعذر إكمال العملية. حاول مرة أخرى.";
}

function Sidebar({ role, email, displayName, teamName, selected, tasks, showDashboard, showMap, showTeams, showMembers, showTasks, onShowDashboard, onShowMap, onShowTeams, onShowMembers, onShowTasks, onSelect, onLogout, onCreateTask, onCreateTeam, onManageTeams, onEditProfile, pendingCheckTasks = [], notificationsEnabled, onEnableNotifications, onOpenTask, demoTeams, demoTeamId, onDemoTeamChange, onDemoRoleChange }) {
  const t = useCopy();
  const { language } = usePreferences();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [checkMenuOpen, setCheckMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resizedWidth, setResizedWidth] = useState(null);
  const dragStateRef = useRef(null);
  const isSupervisor = role === "supervisor";
  const visibleTasks = tasks;
  function startResize(event) {
    if (window.innerWidth <= 620) return;
    dragStateRef.current = { startX: event.clientX, width: resizedWidth || (collapsed ? 78 : 286), moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveResize(event) {
    if (!dragStateRef.current) return;
    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    const delta = (event.clientX - dragStateRef.current.startX) * direction;
    const nextWidth = Math.max(78, Math.min(360, dragStateRef.current.width + delta));
    if (Math.abs(delta) > 4) dragStateRef.current.moved = true;
    setResizedWidth(nextWidth);
    setCollapsed(nextWidth < 180);
  }
  function stopResize(event) {
    if (!dragStateRef.current) return;
    if (!dragStateRef.current.moved) {
      const nextCollapsed = !collapsed;
      setCollapsed(nextCollapsed);
      setResizedWidth(nextCollapsed ? 78 : 286);
    }
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  return (
    <>
    <button
      className={`sidebar-mobile-toggle ${mobileOpen ? "open" : ""}`}
      onClick={() => setMobileOpen((open) => !open)}
      aria-label={t(mobileOpen ? "إخفاء القائمة" : "عرض القائمة")}
    >
      <AppIcon name={mobileOpen ? "close" : "menu"} size={20} />
    </button>
    {mobileOpen && <button className="sidebar-mobile-backdrop" aria-label={t("إغلاق")} onClick={() => setMobileOpen(false)} />}
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}
      style={resizedWidth && window.innerWidth > 620 ? { width: resizedWidth, flexBasis: resizedWidth } : undefined}
    >
      <div className="sidebar-brand">
        <button
          className="brand brand-button"
          onClick={() => {
            if (window.innerWidth <= 620) setMobileOpen(false);
            else {
              setCollapsed((current) => !current);
              setResizedWidth(collapsed ? 286 : 78);
            }
          }}
          aria-label={t(collapsed ? "عرض القائمة" : "طي القائمة")}
          title={t(collapsed ? "عرض القائمة" : "طي القائمة")}
        >
          <img className="brand-logo" src="/ichk-wordmark.png" alt="" />
        </button>
      </div>
      <div className="sidebar-section">
        <button
          className={`dashboard-nav-link ${showDashboard ? "active" : ""}`}
          title={t("لوحة التحكم")}
          onClick={() => { onShowDashboard?.(); setMobileOpen(false); }}
        >
          <AppIcon name="home" size={18} />
          <span>{t("لوحة التحكم")}</span>
        </button>
        <button
          className={`dashboard-nav-link ${showMap ? "active" : ""}`}
          title={t("الخريطة")}
          onClick={() => { onShowMap?.(); setMobileOpen(false); }}
        >
          <AppIcon name="map" size={18} />
          <span>{t("الخريطة")}</span>
        </button>
        {isSupervisor && <button
          className={`dashboard-nav-link ${showTeams ? "active" : ""}`}
          title={t("الفرق")}
          onClick={() => { onShowTeams?.(); setMobileOpen(false); }}
        >
          <AppIcon name="list" size={18} />
          <span>{t("الفرق")}</span>
        </button>}
        {isSupervisor && <button
          className={`dashboard-nav-link ${showMembers ? "active" : ""}`}
          title={t("الأعضاء")}
          onClick={() => { onShowMembers?.(); setMobileOpen(false); }}
        >
          <AppIcon name="user" size={18} />
          <span>{t("الأعضاء")}</span>
        </button>}
        {isSupervisor && <div className="sidebar-two-level">
          <button
            className={`dashboard-nav-link tasks-level-trigger ${showTasks ? "active" : ""}`}
            title={t("المهام")}
            onClick={() => setTasksOpen((open) => !open)}
            aria-expanded={tasksOpen}
          >
            <AppIcon name="task" size={18} />
            <span>{t("المهام")}</span>
            <AppIcon className="tasks-level-chevron" name={tasksOpen ? "chevronDown" : "chevronRight"} size={14} />
          </button>
          {tasksOpen && <div className="tasks-two-level">
            <button className={showTasks === "progress" ? "active" : ""} onClick={() => { onShowTasks?.("progress"); setMobileOpen(false); }}>
              <i className="task-level-dot progress" /><span>{t("قيد التنفيذ")}</span>
            </button>
            <button className={showTasks === "onHold" ? "active" : ""} onClick={() => { onShowTasks?.("onHold"); setMobileOpen(false); }}>
              <i className="task-level-dot hold" /><span>{t("معلّقة")}</span>
            </button>
            <button className={showTasks === "completed" ? "active" : ""} onClick={() => { onShowTasks?.("completed"); setMobileOpen(false); }}>
              <i className="task-level-dot completed" /><span>{t("مكتملة")}</span>
            </button>
          </div>}
        </div>}
        {isSupervisor && <button
          className="new-task-link"
          title={t("مهمة جديدة")}
          aria-label={t("مهمة جديدة")}
          onClick={() => { onCreateTask?.(); setMobileOpen(false); }}
        >
          <AppIcon name="plus" size={18} />
          {t("مهمة جديدة")}
        </button>}
      </div>
      <div className="sidebar-bottom">
        <button className="settings-entry" title={t("الإعدادات")} onClick={() => setSettingsOpen(true)}>
          <AppIcon name="settings" size={17} /><span>{t("الإعدادات")}</span>
        </button>
        <div className="profile-row">
          <div className="avatar">{(displayName || email)?.[0]?.toUpperCase() || (language === "en" ? "U" : "م")}</div>
          <div className="profile-copy"><strong>{isSupervisor ? (displayName || t("المتابع")) : t("عضو الفريق")}</strong><small>{isSupervisor ? email : teamName ? t(teamName) : email}</small></div>
          {isSupervisor && onEditProfile && <button className="profile-edit-button" onClick={onEditProfile} aria-label={t("الملف الشخصي")} title={t("الملف الشخصي")}><AppIcon name="settings" size={17} /></button>}
          <button className="logout-button" onClick={onLogout} aria-label={t("تسجيل الخروج")} title={t("تسجيل الخروج")}><AppIcon name="logout" size={17} /></button>
        </div>
      </div>
    </aside>
    {settingsOpen && <Modal title={t("الإعدادات")} subtitle={t("إدارة إعدادات مساحة العمل والمظهر.")} onClose={() => { setSettingsOpen(false); setCheckMenuOpen(false); }} icon="settings">
      <div className="settings-modal-content">
        {isSupervisor && <button className="invite-button" title={t("إضافة فريق")} onClick={() => { setSettingsOpen(false); onCreateTeam?.(); }}><span><AppIcon name="userPlus" size={18} /></span> {t("إضافة فريق")} <span className="invite-arrow"><AppIcon name="arrowLeft" size={15} /></span></button>}
        <div className="sidebar-live-status" title={t("تحديثات مباشرة")} aria-label={t("تحديثات مباشرة")}><i /><span>{t("تحديثات مباشرة")}</span></div>
        {isSupervisor && onEnableNotifications && <button className={`notification-toggle sidebar-notification-toggle ${notificationsEnabled ? "enabled" : ""}`} title={t(notificationsEnabled ? "التنبيهات مفعلة" : "تفعيل التنبيهات")} onClick={onEnableNotifications}><AppIcon name={notificationsEnabled ? "check" : "alert"} size={15} />{t(notificationsEnabled ? "التنبيهات مفعلة" : "تفعيل التنبيهات")}</button>}
        {demoTeams && role === "team" && (
          <select className="topbar-team-select sidebar-team-select" aria-label={t("اختر الفريق")} value={demoTeamId} onChange={(event) => onDemoTeamChange(event.target.value)}>
            {demoTeams.map((team) => <option key={team.id} value={team.id}>{t(team.name)}</option>)}
          </select>
        )}
        <PreferencesBar />
      </div>
    </Modal>}
    </>
  );
}

function TaskHeader({ task, role, onStatusChange, onCheckAction, onEdit, onDelete, onShowMap }) {
  const t = useCopy();
  const { language } = usePreferences();
  const governorateCodes = getTaskGovernorateCodes(task);
  const governorateNames = governorateCodes.map((code) => getGovernorateName(code, language));
  const governorateNamesText = governorateNames.join(language === "en" ? ", " : "، ");
  return (
    <header className="task-header">
      <div className="breadcrumbs"><span>{t(role === "supervisor" ? "لوحة المتابعة" : "مساحة الفريق")}</span><b> / </b><strong>{t("المهمة")} {task.taskNumber}</strong></div>
      <div className="task-heading-row">
        <div>
          <div className="task-title-line"><h1>{t(task.title)}</h1><span className={`state-chip ${task.status === "done" ? "state-done" : task.status === "onHold" ? "state-hold" : ""}`}><i />{t(task.status === "done" ? "مكتملة" : task.status === "onHold" ? "معلّقة" : "قيد التنفيذ")}</span></div>
        </div>
        {role === "supervisor" && (
          <div className="task-header-actions">
            {task.status !== "done" && <button className="button button-soft" onClick={() => onStatusChange(task, task.status === "onHold" ? "open" : "onHold")}>
              {task.status === "onHold" ? t("استئناف المهمة") : t("إيقاف المهمة مؤقتاً")}
            </button>}
            <button className={`button ${task.status === "done" ? "button-soft" : "button-primary"}`} onClick={() => onStatusChange(task, task.status === "done" ? "open" : "done")}>
              {task.status === "done" ? t("إعادة فتح المهمة") : <><AppIcon name="check" size={16} />{t("إنهاء المهمة")}</>}
            </button>
            {onEdit && onDelete && <details className="actions-dropdown"><summary aria-label={t("إجراءات التكت")}><AppIcon name="more" size={18} /></summary><div>
              <button onClick={() => onEdit(task)}>{t("تعديل التكت")}</button>
              <button className="danger-action" onClick={() => onDelete(task)}>{t("حذف التكت")}</button>
            </div></details>}
          </div>
        )}
      </div>
      <div className="task-meta">
        <span><AppIcon className="meta-icon" name="task" size={15} /> {t("رقم المهمة")} <strong>{task.taskNumber}</strong></span>
        <span><AppIcon className="meta-icon" name="calendar" size={15} /> {t("تاريخ الإضافة")} <strong>{formatDate(task.createdAt, language)}</strong></span>
        <span><AppIcon className="meta-icon" name="users" size={15} /> {t("الفريق")} <strong>{t(task.teamName || "فريق الميدان")}</strong></span>
        {(task.location || getGovernorateCodeFromRegion(task.region)) && <span><AppIcon className="meta-icon" name="pin" size={15} /> {t("الموقع")} <strong>{t(getTaskLocationLabel(task, language))}</strong></span>}
      </div>
      <div className={`task-map-focus ${governorateCodes.length ? "located" : "unlocated"}`}>
        <div className="task-map-focus-copy">
          <span>{t("المحافظات")}</span>
          <strong>{governorateNamesText || t("المحافظة غير محددة")}</strong>
          {governorateCodes.length ? (
            <button type="button" className="task-map-focus-button" onClick={onShowMap}>
              <AppIcon name="map" size={14} />{t("عرض على الخريطة")}
            </button>
          ) : role === "supervisor" && onEdit ? (
            <button type="button" className="task-map-focus-button" onClick={() => onEdit(task)}>
              <AppIcon name="pin" size={14} />{t("تحديد المحافظات")}
            </button>
          ) : <small>{t("حدد محافظة واحدة أو أكثر للمهمة لتمييزها على الخريطة.")}</small>}
        </div>
        <div className="task-map-focus-art">
          <IraqGovernorateMap highlightedCodes={task.status === "open" ? governorateCodes : []} />
        </div>
      </div>
    </header>
  );
}

function CaseDetails({ task }) {
  const t = useCopy();
  const { language } = usePreferences();
  const fmsUrl = getSafeFmsUrl(task.fmsId);
  const details = [
    ["رقم SRC", task.src],
    ["القسم", getLocalizedCaseValue(task.department, language)],
    ["المنطقة", getLocalizedRegion(task.region, language)],
    ["FDT", task.fdt],
    ["الوصف", task.description],
    ["EFU", task.efu],
    ["الصيانة", task.maintenance],
    ["حالة الكيس", getLocalizedCaseValue(task.caseStatus, language)],
    ["التصعيد", getLocalizedCaseValue(task.escalation, language)],
    ["طلب GR", task.grRequest ? getLocalizedCaseValue(task.grRequest === "yes" ? "نعم" : "لا", language) : ""],
    ["تاريخ إنشاء الكيس", formatCaseCreatedAt(task.caseCreatedAt, language)],
  ].filter(([, value]) => value);

  if (!fmsUrl && details.length === 0) return null;

  return (
    <section className="case-details" aria-label={t("بيانات الكيس")}>
      <h2>{t("بيانات الكيس")}</h2>
      <div className="case-details-grid">
        {task.fmsId && <div className="case-detail">
          <span>{t("معرّف FMS")}</span>
          {fmsUrl
            ? <a href={fmsUrl} target="_blank" rel="noreferrer">{t("فتح FMS")} <AppIcon name="arrowLeft" size={13} /></a>
            : <strong>{task.fmsId}</strong>}
        </div>}
        {details.map(([label, value]) => <div className="case-detail" key={label}>
          <span>{t(label)}</span><strong>{value}</strong>
        </div>)}
      </div>
    </section>
  );
}

function CaseDetailsFields({ values, onChange, description, onDescriptionChange }) {
  const t = useCopy();
  const field = (key, label, props = {}) => (
    <label key={key}>{t(label)}<input value={values[key] || ""} onChange={(event) => onChange(key, event.target.value)} {...props} /></label>
  );
  return (
    <fieldset className="case-form-fields">
      <legend>{t("بيانات الكيس")}</legend>
      <div className="case-form-grid">
        {field("src", "رقم SRC", { maxLength: 100 })}
        {field("fmsId", "معرّف FMS", { type: "url", placeholder: "https://...", maxLength: 2048 })}
        {field("department", "القسم", { maxLength: 120 })}
        {field("region", "المنطقة", { maxLength: 120 })}
        {field("fdt", "FDT", { maxLength: 120 })}
        <label>{t("الوصف")}<textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows="2" maxLength="2000" /></label>
        {field("efu", "EFU", { maxLength: 80 })}
        {field("maintenance", "الصيانة", { maxLength: 120 })}
        {field("caseStatus", "حالة الكيس", { maxLength: 120 })}
        {field("escalation", "التصعيد", { maxLength: 120 })}
        <label>{t("طلب GR")}<select value={values.grRequest || "no"} onChange={(event) => onChange("grRequest", event.target.value)}>
          <option value="yes">{t("نعم")}</option>
          <option value="no">{t("لا")}</option>
        </select></label>
        <label>{t("تاريخ إنشاء الكيس")}<input type="datetime-local" value={values.caseCreatedAt || ""} onChange={(event) => onChange("caseCreatedAt", event.target.value)} /></label>
      </div>
    </fieldset>
  );
}

function Conversation({ task, role, user, messages, onSend, onEditMessage, onDeleteMessage }) {
  const t = useCopy();
  const { language } = usePreferences();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="conversation">
      <div className="conversation-top">
        <div className="conversation-title"><span className="chat-icon"><AppIcon name="chat" size={20} /></span><div><h2>{t("محادثة المهمة")}</h2><p>{t("خاص بالمهمة")} #{task.taskNumber}</p></div></div>
        <div className="live-indicator"><span /> {t("مباشرة")}</div>
      </div>
      <div className="message-list">
        <div className="conversation-start"><span>{t("بداية المحادثة")}</span><p>{t("أرسل تحديثات واستفسارات مرتبطة بهذه المهمة.")}</p></div>
        {messages.map((message) => {
          const mine = message.senderId === user.uid;
          return (
            <div className={`message-row ${mine ? "mine" : ""}`} key={message.id}>
              <div className="message-body">
                <div className="message-meta"><strong>{mine ? t("أنت") : t(message.role === "supervisor" ? "المتابع" : "فريق الميدان")}</strong><span>{formatTime(message.createdAt, language)}</span></div>
                <div className="message-bubble">{t(message.text)}</div>
              </div>
              {role === "supervisor" && onEditMessage && onDeleteMessage && <details className="message-actions-dropdown"><summary aria-label={t("إجراءات الرسالة")}><AppIcon name="more" size={18} /></summary><div>
                <button onClick={() => onEditMessage(message)}>{t("تعديل الرسالة")}</button>
                <button className="danger-action" onClick={() => onDeleteMessage(message)}>{t("حذف الرسالة")}</button>
              </div></details>}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={submit}>
        <div className="composer-field">
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("اكتب تحديثاً أو استفساراً عن هذه المهمة...")} rows="1" maxLength="2000" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
          <div className="composer-hint">{t("Enter للإرسال · Shift + Enter لسطر جديد")}</div>
        </div>
        <button className="send-button" type="submit" disabled={!text.trim() || sending} aria-label={t("إرسال الرسالة")}>{sending ? "…" : <AppIcon name="arrowUp" size={18} />}</button>
      </form>
      <p className="conversation-foot">{t("الرسائل مرتبطة بالمهمة الحالية فقط")}</p>
    </section>
  );
}

function EmptyTask({ role, onCreateTask }) {
  const t = useCopy();
  return (
    <div className="empty-main">
      <div className="empty-main-icon"><AppIcon name="task" size={30} /></div>
      <span className="eyebrow">{t(role === "supervisor" ? "ابدأ مساحة المتابعة" : "مساحة الفريق")}</span>
      <h1>{t(role === "supervisor" ? "أضف أول مهمة لفريقك" : "لا توجد مهام بعد")}</h1>
      <p>{t(role === "supervisor" ? "أنشئ مهمة برقمها الخاص، وحدد فريقاً ميدانياً واعتمد حالة تنفيذها." : "هذه اللوحة متاحة لمسؤول الشفت فقط.")}</p>
      {role === "supervisor" && <button className="button button-primary" onClick={onCreateTask}><AppIcon name="plus" size={17} />{t("إنشاء مهمة جديدة")}</button>}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, icon = "plus" }) {
  const t = useCopy();
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={onClose} aria-label={t("إغلاق")}><AppIcon name="close" size={17} /></button>
        <span className="modal-icon"><AppIcon name={icon} size={22} /></span>
        <h2 id="modal-title">{title}</h2>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function TaskCaseCards({ tasks, onOpenTask, className }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = useCopy();
  const { language } = usePreferences();
  return (
    <div className={className}>
      {tasks.map((task) => {
        const fmsUrl = getSafeFmsUrl(task.fmsId);
        const createdAt = getDateValue(task.createdAt);
        const isCompleted = task.status === "done";
        const closedAt = isCompleted ? getDateValue(task.closedAt) : null;
        const validClosedAt = closedAt && !Number.isNaN(closedAt.getTime());
        const timerEnd = isCompleted ? (validClosedAt ? closedAt.getTime() : null) : now;
        const elapsedMs = createdAt && !Number.isNaN(createdAt.getTime()) && timerEnd !== null
          ? Math.max(0, timerEnd - createdAt.getTime())
          : null;
        const overSla = elapsedMs !== null && elapsedMs >= TASK_SLA_MS;
        const progress = elapsedMs === null ? 0 : Math.min(100, (elapsedMs / TASK_SLA_MS) * 100);
        const extraDetails = [
          task.department && ["القسم", task.department],
          task.caseStatus && ["حالة الكيس", task.caseStatus],
          task.grRequest && ["طلب GR", task.grRequest === "yes" ? "نعم" : "لا"],
          task.caseCreatedAt && ["تاريخ إنشاء الكيس", formatCaseCreatedAt(task.caseCreatedAt, language)],
        ].filter(Boolean);

        return (
          <article className={`task-case-card ${overSla ? "over-sla" : ""}`} key={task.id}>
            <header className="task-case-header">
              <button type="button" className="task-case-identity" onClick={() => onOpenTask?.(task)}>
                <span className="task-case-icon"><AppIcon name="network" size={14} /></span>
                <bdi>{task.src || task.taskNumber}</bdi>
              </button>
              <div className="task-case-badges">
                <span className="task-case-efu">EFU {task.efu || "0"}</span>
                {task.escalation && <span className="task-case-escalation">{t("التصعيد")} {getLocalizedCaseValue(task.escalation, language)}</span>}
                {overSla && <span className="task-case-sla-badge">{t("تجاوز SLA")}</span>}
              </div>
            </header>

            <div className="task-case-fields">
              {[
                ["الصيانة", task.maintenance || "غير محدد"],
                ["المنطقة", getLocalizedRegion(task.region, language) || "غير محدد"],
                ["FDT", task.fdt || "غير محدد"],
              ].map(([label, value]) => (
                <div className="task-case-field" key={label}>
                  <span>{t(label)}</span><strong>{t(value)}</strong>
                </div>
              ))}
            </div>

            {task.description && (
              <div className="task-case-description">
                <strong>{t("الوصف")}:</strong><span>{task.description}</span>
              </div>
            )}

            {extraDetails.length > 0 && (
              <div className="task-case-extra">
                {extraDetails.map(([label, value]) => (
                  <span key={label}><strong>{t(label)}:</strong> {getLocalizedCaseValue(value, language)}</span>
                ))}
              </div>
            )}

            <div className="task-case-timer">
              <div className="task-case-timer-labels">
                <span><AppIcon name="clock" size={13} /><strong>{t(isCompleted ? "الوقت عند الإغلاق" : "الوقت المنقضي")}:</strong> {elapsedMs === null ? (isCompleted ? t("غير متوفر") : "--:--:--") : formatDuration(elapsedMs)}</span>
                <span className={overSla ? "remaining-over-sla" : ""}>
                  <strong>{t(isCompleted ? "المتبقي عند الإغلاق" : "الوقت المتبقي")}:</strong> {elapsedMs === null ? (isCompleted ? t("غير متوفر") : "--:--:--") : overSla ? t("تجاوز SLA") : formatDuration(TASK_SLA_MS - elapsedMs)}
                </span>
              </div>
              <div className={`task-case-progress ${elapsedMs === null ? "unknown" : ""}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={elapsedMs === null ? undefined : Math.round(progress)} aria-label={t("الوقت المنقضي حتى تجاوز SLA")}>
                <span style={{ width: `${elapsedMs === null ? 100 : progress}%` }} />
              </div>
            </div>

            <footer className="task-case-footer">
              <span><strong>{t("تاريخ إضافة المهمة")}:</strong> {formatCaseCreatedAt(task.createdAt, language) || "—"}</span>
              {isCompleted && <span><strong>{t("تاريخ إغلاق المهمة")}:</strong> {validClosedAt ? formatCaseCreatedAt(closedAt, language) : t("وقت الإغلاق غير مسجل")}</span>}
              {fmsUrl && <a href={fmsUrl} target="_blank" rel="noreferrer"><AppIcon name="arrowLeft" size={13} />{t("فتح مهمة FMS")}</a>}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function TasksStatusPage({ tasks, status, onOpenTask }) {
  const t = useCopy();
  const statuses = {
    progress: { title: "قيد التنفيذ", label: "قيد التنفيذ", filter: (task) => task.status === "open" },
    onHold: { title: "معلّقة", label: "معلّقة", filter: (task) => task.status === "onHold" },
    completed: { title: "مكتملة", label: "مكتملة", filter: (task) => task.status === "done" },
  };
  const current = statuses[status] || statuses.progress;
  const visible = tasks.filter(current.filter);
  return (
    <section className="tasks-status-page">
      <header className="tasks-status-header">
        <div><span>{t("المهام")}</span><h1>{t(current.title)}</h1><p>{t(current.label)} · {visible.length} {t("مهام")}</p></div>
      </header>
      {visible.length ? (
        <TaskCaseCards tasks={visible} onOpenTask={onOpenTask} className="tasks-status-grid" />
      ) : (
        <div className="members-empty-state"><AppIcon name="task" size={24} /><strong>{t("لا توجد مهام بهذه الحالة.")}</strong></div>
      )}
    </section>
  );
}

function TeamMembersPage({ teams, members, onCreateMember, onUpdateMember, onDeleteMember, onCreateTeam, getTeamShiftStatus, onToggleTeamAvailability, initialView = "teams" }) {
  const t = useCopy();
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ teamId: "", name: "", phone: "", responsibility: "", employeeId: "", username: "" });

  useEffect(() => {
    if (selectedTeamId !== "all" && !teams.some((team) => team.id === selectedTeamId)) setSelectedTeamId("all");
  }, [selectedTeamId, teams]);

  const visibleMembers = members.filter((member) => selectedTeamId === "all" || member.teamId === selectedTeamId);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredMembers = normalizedSearch
    ? visibleMembers.filter((member) => [member.name, member.phone, member.responsibility, member.employeeId, member.username]
      .join(" ").toLocaleLowerCase().includes(normalizedSearch))
    : visibleMembers;
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  function memberCount(teamId) {
    return members.filter((member) => member.teamId === teamId).length;
  }

  function startCreate() {
    setEditingMember(null);
    setForm({ teamId: selectedTeamId === "all" ? teams[0]?.id || "" : selectedTeamId, name: "", phone: "", responsibility: "", employeeId: "", username: "" });
    setFormError("");
    setFormOpen(true);
  }

  function startEdit(member) {
    setEditingMember(member);
    setForm({
      teamId: member.teamId,
      name: member.name || "",
      phone: member.phone || "",
      responsibility: member.responsibility || "",
      employeeId: member.employeeId || "",
      username: member.username || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function saveMember(event) {
    event.preventDefault();
    const memberData = {
      teamId: editingMember?.teamId || form.teamId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      responsibility: form.responsibility.trim(),
      employeeId: form.employeeId.trim(),
      username: form.username.trim(),
    };
    if (!memberData.teamId || !memberData.name) {
      setFormError(t("أدخل اسم العضو واختر الفريق."));
      return;
    }

    setSaving(true);
    try {
      const saved = editingMember
        ? await onUpdateMember(editingMember, memberData)
        : await onCreateMember(memberData);
      if (saved) setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember() {
    if (!deletingMember) return;
    setSaving(true);
    try {
      if (await onDeleteMember(deletingMember)) setDeletingMember(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="team-members-page">
      <header className="members-page-header">
        <div>
          <span className="members-page-eyebrow"><AppIcon name={initialView === "teams" ? "list" : "users"} size={15} />{t(initialView === "teams" ? "الفرق" : "الأعضاء")}</span>
          <h1>{t(initialView === "teams" ? "الفرق" : "الأعضاء")}</h1>
          <p>{t(initialView === "teams" ? "عرض الفرق وحالة المناوبة وعدد الأعضاء." : "معلومات الأعضاء مستقلة عن حسابات الدخول.")}</p>
        </div>
        <button className="button button-primary" onClick={initialView === "teams" ? onCreateTeam : startCreate} disabled={initialView === "members" && !teams.length}>
          <AppIcon name="plus" size={16} />{t(initialView === "teams" ? "إضافة فريق" : "إضافة عضو")}
        </button>
      </header>

      {initialView === "teams" ? (
        teams.length ? (
          <>
            <div className="shift-filter-row">
              <label htmlFor="shift-filter">{t("الشفتات")}</label>
              <select id="shift-filter" className="shift-filter-select" value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)}>
                <option value="all">{t("كل الشفتات")}</option>
                <option value="morning">{t("الصباحي")}</option>
                <option value="evening">{t("المسائي")}</option>
                <option value="night">{t("الفجري")}</option>
              </select>
            </div>
            <div className="teams-directory-grid">
              {teams
                .filter((team) => selectedShift === "all" || (team.shift || "morning") === selectedShift)
                .map((team) => (
                        <article className="team-directory-card" key={team.id}>
                <header className="team-directory-header">
                  <div>
                    <h2>{t(team.name)}</h2>
                    <p>{t(getTeamShiftStatus(team))} · {memberCount(team.id)} {t("أعضاء")}</p>
                  </div>
                    <button type="button" className={`team-shift-status ${getTeamShiftStatus(team) === "خارج المناوبة" ? "off-shift" : getTeamShiftStatus(team) === "مشغول" ? "busy" : "available"}`} onClick={() => onToggleTeamAvailability(team)} title={t(getNextTeamAvailabilityLabel(getTeamShiftStatus(team)))} aria-label={`${t("تغيير حالة الفريق")}: ${t(getNextTeamAvailabilityLabel(getTeamShiftStatus(team)))}`}>
                      {t(getTeamShiftStatus(team))}
                    </button>
                </header>
                <div className="team-directory-members">
                  {members.filter((member) => member.teamId === team.id).map((member) => (
                    <div className="team-directory-member" key={member.id}>
                      <div className="team-directory-member-main">
                        <span className="member-mini-avatar">{(member.name || "?").trim().slice(0, 1).toUpperCase()}</span>
                        <div>
                          <strong>{member.name}</strong>
                          <small>{member.employeeId || t("بدون معرّف")} · {member.phone || t("لا يوجد رقم")}</small>
                        </div>
                      </div>
                      <details className="actions-dropdown">
                        <summary aria-label={t("إجراءات العضو")}><AppIcon name="more" size={18} /></summary>
                        <div>
                          <button onClick={() => startEdit(member)}>{t("تعديل بيانات العضو")}</button>
                          <button className="danger-action" onClick={() => setDeletingMember(member)}>{t("حذف العضو")}</button>
                        </div>
                      </details>
                    </div>
                  ))}
                  {memberCount(team.id) === 0 && (
                    <div className="team-directory-empty"><AppIcon name="users" size={18} /><span>{t("لا يوجد أعضاء لهذا الفريق بعد.")}</span></div>
                  )}
                </div>
              </article>
                ))}
            </div>
          </>
        ) : (
          <div className="members-empty-state"><AppIcon name="users" size={25} /><strong>{t("لا توجد فرق متاحة بعد.")}</strong></div>
        )
      ) : !teams.length ? (
        <div className="members-empty-state"><AppIcon name="users" size={25} /><strong>{t("لا توجد فرق متاحة. أضف فريقاً أولاً ثم سجّل أعضاءه.")}</strong></div>
      ) : (
        <div className="members-only-panel">
          <header className="members-roster-header members-only-header">
            <div><h2>{t("جميع الأعضاء")}</h2><p>{filteredMembers.length} {t("أعضاء")}</p></div>
            <label className="members-search"><AppIcon name="search" size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t("بحث بالاسم أو المعرّف...")} aria-label={t("بحث بالاسم أو المعرّف...")} /></label>
          </header>
          {filteredMembers.length ? (
            <div className="members-card-grid">
              {filteredMembers.map((member) => {
                const team = teams.find((item) => item.id === member.teamId);
                return (
                  <article className="member-card" key={`${member.teamId}-${member.id}`}>
                    <header>
                      <div><h3>{member.name}</h3><span>{t(team?.name || "")}</span></div>
                      <details className="actions-dropdown"><summary aria-label={t("إجراءات العضو")}><AppIcon name="more" size={18} /></summary><div>
                        <button onClick={() => startEdit(member)}>{t("تعديل بيانات العضو")}</button>
                        <button className="danger-action" onClick={() => setDeletingMember(member)}>{t("حذف العضو")}</button>
                      </div></details>
                    </header>
                    <div className="member-card-details">
                      {member.phone && <div><small>{t("رقم الهاتف")}</small><span>{member.phone}</span></div>}
                      {member.responsibility && <div><small>{t("الاختصاص أو المسؤولية")}</small><span>{member.responsibility}</span></div>}
                      {member.employeeId && <div><small>{t("المعرّف")}</small><span>{member.employeeId}</span></div>}
                      {member.username && <div><small>{t("اسم المستخدم")}</small><span>{member.username}</span></div>}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="members-empty-state"><AppIcon name="users" size={24} /><strong>{t("لا يوجد أعضاء بعد.")}</strong></div>
          )}
        </div>
      )}

      {formOpen && (
        <Modal title={t(editingMember ? "تعديل بيانات العضو" : "إضافة عضو")} subtitle={t("معلومات تعريفية فقط، لا تنشئ حساب دخول.")} onClose={() => setFormOpen(false)}>
          <form className="modal-form" onSubmit={saveMember}>
            <label>{t("الفريق")}<select name="teamId" value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))} required>
              {teams.map((team) => <option key={team.id} value={team.id}>{t(team.name)}</option>)}
            </select></label>
            <label>{t("الاسم الكامل")}<input name="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength="100" required autoFocus /></label>
            <label>{t("رقم الهاتف")}<input name="phone" type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} maxLength="40" /></label>
            <label>{t("الاختصاص أو المسؤولية")}<input name="responsibility" value={form.responsibility} onChange={(event) => setForm((current) => ({ ...current, responsibility: event.target.value }))} maxLength="100" /></label>
            <label>{t("المعرّف")}<input name="employeeId" value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} maxLength="40" /></label>
            <label>{t("اسم المستخدم (معلومات فقط)")}<input name="username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} maxLength="40" autoComplete="off" /></label>
            <p className="member-form-note">{t("معلومات تعريفية فقط، لا تنشئ حساب دخول.")}</p>
            {formError && <p className="form-error">{formError}</p>}
            <button className="button button-primary full-width" type="submit" disabled={saving}>{t("حفظ العضو")}</button>
          </form>
        </Modal>
      )}

      {deletingMember && (
        <Modal title={t("تأكيد حذف العضو")} subtitle={`${t("هل تريد حذف بيانات هذا العضو؟")} · ${deletingMember.name}`} onClose={() => setDeletingMember(null)}>
          <div className="modal-actions"><button className="button button-soft" onClick={() => setDeletingMember(null)} disabled={saving}>{t("إلغاء")}</button><button className="button button-danger" onClick={removeMember} disabled={saving}>{t("حذف العضو")}</button></div>
        </Modal>
      )}
    </section>
  );
}

function DashboardView({ role, tasks, teams = [], getTeamShiftStatus, onToggleTeamAvailability, selectedTask, onOpenTask, onCreateTask, onManageTeams }) {
  const t = useCopy();
  const { language } = usePreferences();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [selectedShift, setSelectedShift] = useState("morning");
  const visibleTasks = tasks;
  const shiftTeams = teams.filter((team) => (team.shift || "morning") === selectedShift);
  const activeTasks = tasks.filter((task) => task.status === "open");
  const mapTasks = tasks.filter((task) => task.status === "open");
  const selectedTasks = selectedGovernorate
    ? activeTasks.filter((task) => getTaskGovernorateCodes(task).includes(selectedGovernorate))
    : activeTasks;
  const selectedMapTasks = selectedGovernorate
    ? mapTasks.filter((task) => getTaskGovernorateCodes(task).includes(selectedGovernorate))
    : mapTasks;
  const onHoldTasks = tasks.filter((task) => task.status === "onHold");
  const inProgressTasks = activeTasks.filter((task) => task.status === "open");
  const completedTasks = visibleTasks.filter((task) => task.status === "done");
  const locations = [...new Set(selectedMapTasks.map((task) => task.location?.trim()).filter(Boolean))].slice(0, 4);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredTasks = normalizedSearch
    ? selectedTasks.filter((task) => [
      task.taskNumber,
      task.title,
      t(task.title),
      task.location,
      t(task.location || ""),
      task.teamName,
      t(task.teamName || ""),
    ].join(" ").toLocaleLowerCase().includes(normalizedSearch))
    : selectedTasks;
  const featuredTasks = filteredTasks.slice(0, 4);
  const highlightedCodes = getTaskGovernorateCodesForTasks(mapTasks);
  const highlightedNames = selectedGovernorate
    ? [getGovernorateName(selectedGovernorate, language)]
    : highlightedCodes.map((code) => getGovernorateName(code, language));
  const highlightedNamesText = highlightedNames.join(language === "en" ? ", " : "، ");
  const stats = [
    { key: "active", label: t("قيد التنفيذ"), value: inProgressTasks.length, icon: "activity" },
    { key: "pending", label: t("معلّقة"), value: onHoldTasks.length, icon: "clock" },
    { key: "complete", label: t("مكتملة"), value: completedTasks.length, icon: "check" },
    { key: "total", label: t("إجمالي المهام"), value: visibleTasks.length, icon: "task" },
  ];
  return (
    <section className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow"><AppIcon name="network" size={15} />{t("مركز تشغيل الشبكة")}</span>
          <h1>{t("لوحة تحكم العمليات")}</h1>
          <p>{t("نظرة عامة على حالة المهام والفرق الميدانية.")}</p>
        </div>
        <label className="dashboard-search">
          <AppIcon name="search" size={18} />
          <input
            type="search"
            aria-label={t("ابحث برقم المهمة أو المنطقة...")}
            placeholder={t("ابحث برقم المهمة أو المنطقة...")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && <button type="button" aria-label={t("مسح البحث")} onClick={() => setSearchTerm("")}><AppIcon name="close" size={15} /></button>}
        </label>
        <div className="dashboard-live"><span />{t("تحديثات مباشرة")}</div>
      </header>

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <article key={stat.key} className={`dashboard-stat ${stat.key}`}>
            <span className="dashboard-stat-icon"><AppIcon name={stat.icon} size={22} /></span>
            <span className="dashboard-stat-copy"><strong>{String(stat.value).padStart(2, "0")}</strong><small>{stat.label}</small></span>
            <span className="dashboard-stat-wave" />
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-locations">
          <div className="dashboard-panel-heading">
            <h2><AppIcon name="pin" size={17} />{t("حالة مواقع المهام")}</h2>
            <span className="dashboard-panel-count">{locations.length}</span>
          </div>
          <div className="dashboard-map-content">
            <div className="dashboard-map-art">
              <IraqGovernorateMap
                highlightedCodes={highlightedCodes}
                selectedCode={selectedGovernorate}
                onSelectGovernorate={(code) => setSelectedGovernorate((current) => current === code ? null : code)}
              />
            </div>
            <div className="dashboard-location-list">
              <p>{highlightedNamesText || t("محافظات العراق")}</p>
              {locations.length ? locations.map((location, index) => (
                <div className="dashboard-location-item" key={location}>
                  <span className={`location-indicator location-${index % 4}`} />
                  <span title={location}>{t(location)}</span>
                  <small>{selectedTasks.filter((task) => task.location?.trim() === location).length}</small>
                </div>
              )) : <div className="dashboard-location-empty">{t(selectedGovernorate ? "لا توجد مهام مفتوحة في هذه المحافظة." : "الموقع غير محدد")}</div>}
            </div>
          </div>
          <p className="dashboard-map-note">{t("المحافظات حسب خريطة SVG المرفقة؛ المحافظات التي تحتوي على مهام مفتوحة مميزة باللون الأصفر. اضغط على المحافظة لعرض مهامها.")}</p>
        </section>

        <section className="dashboard-panel dashboard-cases">
          <div className="dashboard-panel-heading">
            <h2><AppIcon name="task" size={17} />{selectedGovernorate ? `${t("المهام في")} ${getGovernorateName(selectedGovernorate, language)}` : t("المهام النشطة")}</h2>
            {selectedGovernorate && <button className="map-filter-reset" onClick={() => setSelectedGovernorate(null)}>{t("عرض كل المهام")}</button>}
            <span className="dashboard-panel-count">{filteredTasks.length}</span>
          </div>
          <div className="dashboard-case-list">
            {featuredTasks.length
              ? <TaskCaseCards tasks={featuredTasks} onOpenTask={onOpenTask} className="dashboard-active-task-cards" />
              : <div className="dashboard-empty-state"><AppIcon name={normalizedSearch ? "search" : "check"} size={22} /><span>{t(normalizedSearch ? "لم نعثر على مهام مطابقة." : selectedGovernorate ? "لا توجد مهام مفتوحة في هذه المحافظة." : "لا توجد مهام نشطة حالياً.")}</span></div>}
          </div>
          <div className="dashboard-cases-footer">
            <span>{selectedGovernorate ? `${t("المهام في")} ${getGovernorateName(selectedGovernorate, language)}` : t("المهام النشطة")}</span>
            <span>{language === "en" ? `${filteredTasks.length} total` : `${filteredTasks.length} مهمة`}</span>
          </div>
        </section>

        <section className="dashboard-panel dashboard-quick-actions">
          <div className="dashboard-panel-heading">
            <h2><AppIcon name="bolt" size={17} />{t("إجراءات سريعة")}</h2>
          </div>
          {role === "supervisor" && <div className="dashboard-shift-switcher" role="group" aria-label={t("الشفتات")}>
            {[
              ["morning", "الصباحي"],
              ["evening", "المسائي"],
              ["night", "الفجري"],
            ].map(([shift, label]) => (
              <button type="button" className={selectedShift === shift ? "active" : ""} aria-pressed={selectedShift === shift} key={shift} onClick={() => setSelectedShift(shift)}>{t(label)}</button>
            ))}
          </div>}
          {role === "supervisor" && <div className="dashboard-shift-teams">
            <header><span>{t("فرق الشفت")}</span><strong>{shiftTeams.length}</strong></header>
            {shiftTeams.length ? (
              <ul>
                {shiftTeams.map((team) => {
                  const teamStatus = getTeamShiftStatus(team);
                  const availabilityClass = teamStatus === "خارج المناوبة" ? "off-shift" : teamStatus === "مشغول" ? "busy" : "available";
                  return (
                    <li key={team.id}>
                      <AppIcon name="users" size={13} />
                      <span title={team.name}>{t(team.name)}</span>
                      <button
                        type="button"
                        className={`dashboard-team-status-dot ${availabilityClass}`}
                        title={t(getNextTeamAvailabilityLabel(teamStatus))}
                        aria-label={`${t("تغيير حالة الفريق")}: ${t(getNextTeamAvailabilityLabel(teamStatus))}`}
                        onClick={() => onToggleTeamAvailability(team)}
                      ><i /></button>
                    </li>
                  );
                })}
              </ul>
            ) : <p>{t("لا توجد فرق في هذا الشفت.")}</p>}
          </div>}
          {role === "supervisor" && (
            <button className="dashboard-action primary" onClick={onCreateTask}><AppIcon name="plus" size={18} />{t("مهمة جديدة")}<AppIcon name="arrowLeft" size={15} /></button>
          )}
          {role === "supervisor" && (
            <button className="dashboard-action" onClick={onManageTeams}><AppIcon name="users" size={18} />{t("عرض الفرق")}<AppIcon name="arrowLeft" size={15} /></button>
          )}
          <div className="dashboard-quick-note">
            <AppIcon name="shield" size={15} />
            <span>{t("تحديثات مباشرة")}</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function StandaloneMapView({ tasks, onOpenTask }) {
  const t = useCopy();
  const { language } = usePreferences();
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const visibleTasks = tasks;
  const activeTasks = tasks.filter((task) => task.status === "open");
  const taskCodes = activeTasks.map((task) => getTaskGovernorateCodes(task));
  const governorateCounts = new Map(iraqGovernorates.map((governorate) => [governorate.code, 0]));
  taskCodes.forEach((codes) => codes.forEach((code) => governorateCounts.set(code, (governorateCounts.get(code) || 0) + 1)));
  const governorateCodes = [...governorateCounts].filter(([, count]) => count > 0).map(([code]) => code);
  const coveredGovernorates = iraqGovernorates
    .filter((governorate) => governorateCounts.get(governorate.code) > 0)
    .sort((first, second) => governorateCounts.get(second.code) - governorateCounts.get(first.code));
  const mappedTasks = activeTasks.map((task, index) => ({ task, codes: taskCodes[index] })).filter(({ codes }) => codes.length > 0);
  const selectedMappedTasks = selectedGovernorate
    ? mappedTasks.filter(({ codes }) => codes.includes(selectedGovernorate))
    : mappedTasks;
  const tasksInMap = mappedTasks.length;
  const unlocatedTasks = activeTasks.length - tasksInMap;
  const completedTasks = visibleTasks.filter((task) => task.status === "done").length;
  const onHoldTasks = visibleTasks.filter((task) => task.status === "onHold").length;
  const inProgressTasks = activeTasks.length;
  return (
    <section className="standalone-map-page" aria-label={t("خريطة العمليات الميدانية")}>
      <div className="standalone-map-content">
        <header className="map-overview-header">
          <div className="map-overview-copy">
            <span className="map-overview-eyebrow"><AppIcon name="map" size={15} />{t("خريطة العمليات الميدانية")}</span>
            <h1>{t("التوزيع الجغرافي للمهام")}</h1>
            <p>{t("نظرة مباشرة على المحافظات ومواقع المهام الميدانية.")}</p>
          </div>
          <div className={`map-overview-stats ${unlocatedTasks === 0 ? "compact" : ""}`}>
            <article className="map-overview-stat">
              <span className="map-stat-icon tasks"><AppIcon name="task" size={17} /></span>
              <div><strong>{tasksInMap}</strong><small>{t("مهام في الخريطة")}</small></div>
            </article>
            <article className="map-overview-stat">
              <span className="map-stat-icon regions"><AppIcon name="pin" size={17} /></span>
              <div><strong>{coveredGovernorates.length}<small className="map-stat-total"> {t("من أصل")} {iraqGovernorates.length}</small></strong><small>{t("محافظات عليها مهام")}</small></div>
            </article>
            {unlocatedTasks > 0 && (
              <article className="map-overview-stat">
                <span className="map-stat-icon unlocated"><AppIcon name="alert" size={17} /></span>
                <div><strong>{unlocatedTasks}</strong><small>{t("مهام بلا محافظة")}</small></div>
              </article>
            )}
          </div>
        </header>

        <div className="standalone-map-layout">
          <article className="standalone-map-card">
            <header className="standalone-map-card-header">
              <div><h2>{t("خريطة محافظات العراق")}</h2><p>{t("الأصفر يميّز المحافظات التي لديها مهام مفتوحة.")} {t("اضغط على المحافظة لعرض مهامها.")}</p></div>
              <span className="map-live-indicator"><i />{t("تحديثات مباشرة")}</span>
            </header>
            <div className="standalone-map-stage">
              <div className="standalone-map-art">
                <IraqGovernorateMap
                  highlightedCodes={governorateCodes}
                  selectedCode={selectedGovernorate}
                  onSelectGovernorate={(code) => setSelectedGovernorate((current) => current === code ? null : code)}
                />
              </div>
            </div>
            <footer className="standalone-map-legend">
              <span><i className="map-legend-active" />{t("محافظات عليها مهام")}</span>
              <span><i className="map-legend-idle" />{t("بقية المحافظات")}</span>
              {selectedGovernorate && <button className="map-filter-reset" onClick={() => setSelectedGovernorate(null)}>{t("عرض كل المهام")}</button>}
            </footer>
          </article>

          <aside className="map-governorate-panel">
            <header className="map-governorate-panel-header">
              <div><h2>{t("توزيع المهام حسب المحافظة")}</h2><p>{t("المحافظات المشمولة")}</p></div>
              <span className="map-panel-count">{coveredGovernorates.length}</span>
            </header>
            {coveredGovernorates.length ? (
              <div className="map-governorate-list">
                {coveredGovernorates.map((governorate) => (
                  <button
                    type="button"
                    className={`map-governorate-row ${selectedGovernorate === governorate.code ? "selected" : ""}`}
                    key={governorate.code}
                    aria-pressed={selectedGovernorate === governorate.code}
                    onClick={() => setSelectedGovernorate((current) => current === governorate.code ? null : governorate.code)}
                  >
                    <span className="map-governorate-code">{governorate.code}</span>
                    <strong>{getGovernorateName(governorate.code, language)}</strong>
                    <span className="map-governorate-task-count">{governorateCounts.get(governorate.code)} <small>{t(governorateCounts.get(governorate.code) === 1 ? "مهمة" : "مهام")}</small></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="map-governorate-empty">
                <span><AppIcon name="pin" size={20} /></span>
                <strong>{t("لا توجد محافظات مغطاة حالياً")}</strong>
                <p>{t("عيّن محافظة لإحدى المهام لتظهر هنا على الخريطة.")}</p>
              </div>
            )}
            <section className="map-task-status">
              <header><h3>{t("حالة المهام")}</h3><span>{visibleTasks.length}</span></header>
              {[
                { label: "قيد التنفيذ", count: inProgressTasks, className: "progress" },
                { label: "معلّقة", count: onHoldTasks, className: "hold" },
                { label: "مكتملة", count: completedTasks, className: "complete" },
              ].map((status) => (
                <div className="map-task-status-row" key={status.className}>
                  <div className="map-task-status-label"><i className={status.className} /><span>{t(status.label)}</span><strong>{status.count}</strong></div>
                  <div className="map-task-status-track"><i className={status.className} style={{ width: `${visibleTasks.length ? status.count / visibleTasks.length * 100 : 0}%` }} /></div>
                </div>
              ))}
            </section>
            {(selectedGovernorate || mappedTasks.length > 0) && (
              <section className="map-mapped-tasks">
                <header><h3>{selectedGovernorate ? `${t("المهام في")} ${getGovernorateName(selectedGovernorate, language)}` : t("المهام الممثلة على الخريطة")}</h3><span>{selectedMappedTasks.length}</span></header>
                {selectedMappedTasks.length ? <div className="map-mapped-task-list">
                  {selectedMappedTasks.map(({ task, codes }) => (
                    <button type="button" className="map-mapped-task-row" key={task.id} onClick={() => onOpenTask?.(task)}>
                      <i className={task.status === "done" ? "done" : ""} />
                      <div><strong>{task.taskNumber}</strong><small>{t(task.title)}</small></div>
                      <span>{codes.map((code) => getGovernorateName(code, language)).join("، ")}</span>
                    </button>
                  ))}
                </div> : <p className="map-no-cases">{t("لا توجد مهام مفتوحة في هذه المحافظة.")}</p>}
              </section>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function Workspace({ user, profile }) {
  const t = useCopy();
  const { language } = usePreferences();
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showTasks, setShowTasks] = useState(null);
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationAlert, setNotificationAlert] = useState(null);
  const audioContextRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const tasksRef = useRef(tasks);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  tasksRef.current = tasks;
  notificationsEnabledRef.current = notificationsEnabled;
  const [taskNumber, setTaskNumber] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskGovernorates, setTaskGovernorates] = useState([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCaseDetails, setTaskCaseDetails] = useState(EMPTY_CASE_DETAILS);
  const [taskTeamId, setTaskTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShift, setNewTeamShift] = useState("morning");
  const [supervisorDisplayName, setSupervisorDisplayName] = useState(user.displayName || profile.displayName || "");
  const [profileEditName, setProfileEditName] = useState("");
  const [profileNewEmail, setProfileNewEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskClosedAt, setEditTaskClosedAt] = useState("");
  const [editTaskCaseDetails, setEditTaskCaseDetails] = useState(EMPTY_CASE_DETAILS);
  const [editTaskLocation, setEditTaskLocation] = useState("");
  const [editTaskGovernorates, setEditTaskGovernorates] = useState([]);
  const [editTaskTeamId, setEditTaskTeamId] = useState("");
  const [deletingTask, setDeletingTask] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamShift, setEditTeamShift] = useState("morning");
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [teamDeleteMode, setTeamDeleteMode] = useState("empty");
  const [teamReassignId, setTeamReassignId] = useState("");
  const role = profile.role;
  const isSupervisor = role === "supervisor";
  const getTeamShiftStatus = (team) => {
    if (team.availability === "off-shift") return "خارج المناوبة";
    if (team.availability === "busy") return "مشغول";
    if (team.availability === "ready") return "جاهز";
    return tasks.some((task) => task.teamId === team.id && task.status === "open")
      ? "مشغول"
      : "جاهز";
  };

  useEffect(() => {
    if (!isSupervisor && !profile.teamId) {
      setTasks([]);
      setSelected(null);
      return undefined;
    }
    const tasksQuery = isSupervisor
      ? query(collection(db, "tasks"), orderBy("createdAt", "desc"))
      : query(collection(db, "tasks"), where("teamId", "==", profile.teamId));
    return onSnapshot(tasksQuery, (snapshot) => {
      const nextTasks = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (!isSupervisor) {
        nextTasks.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      }
      if (isSupervisor && notificationsEnabledRef.current) {
        const previousTasks = new Map(tasksRef.current.map((task) => [task.id, task]));
        for (const task of nextTasks) {
          const previous = previousTasks.get(task.id);
          if (previous?.checkStatus === "requested" || task.checkStatus !== "requested") continue;
          setNotificationAlert({ taskId: task.id, taskNumber: task.taskNumber });
          clearTimeout(notificationTimerRef.current);
          notificationTimerRef.current = setTimeout(() => setNotificationAlert(null), 12000);
          playCheckSound();
          if (Notification.permission === "granted") {
            const notification = new Notification("طلب جيك جديد", {
              body: `المهمة #${task.taskNumber} بانتظار المراجعة`,
              icon: "/ichk-logo.png",
              tag: `task-check-${task.id}`,
            });
            notification.onclick = () => {
              window.focus();
              setSelected(task);
              notification.close();
            };
          }
        }
      }
      setTasks(nextTasks);
      const requestedTaskId = new URLSearchParams(window.location.search).get("task");
      const requestedTask = requestedTaskId ? nextTasks.find((item) => item.id === requestedTaskId) : null;
      if (requestedTask) {
        setSelected(requestedTask);
        setShowMap(false);
        setShowMembers(false);
        setShowDashboard(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("task");
        window.history.replaceState(null, "", url);
      } else {
        setSelected((current) => current ? nextTasks.find((item) => item.id === current.id) || nextTasks[0] || null : nextTasks[0] || null);
      }
    }, (snapshotError) => setError(friendlyError(snapshotError)));
  }, [isSupervisor, profile.teamId]);

  useEffect(() => {
    if (!isSupervisor) {
      setTeams([]);
      return undefined;
    }
    return onSnapshot(collection(db, "teams"), (snapshot) => {
      const nextTeams = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      nextTeams.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(nextTeams);
    }, (snapshotError) => setError(friendlyError(snapshotError)));
  }, [isSupervisor]);

  useEffect(() => {
    if (!isSupervisor) {
      setTeamMembers([]);
      return undefined;
    }
    return onSnapshot(collectionGroup(db, "members"), (snapshot) => {
      setTeamMembers(snapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
        teamId: item.ref.parent.parent?.id || "",
      })));
    }, (snapshotError) => setError(friendlyError(snapshotError)));
  }, [isSupervisor]);

  useEffect(() => {
    if (teams.length === 0) return;
    if (!teams.some((team) => team.id === taskTeamId)) setTaskTeamId(teams[0].id);
  }, [teams, taskTeamId]);

  useEffect(() => {
    if (!selected || showDashboard || showMap) {
      setMessages([]);
      return undefined;
    }
    const messagesQuery = query(collection(db, "tasks", selected.id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (snapshotError) => setError(friendlyError(snapshotError)));
  }, [selected?.id, showDashboard, showMap]);

  useEffect(() => {
    if (showDashboard || showMap || !isSupervisor || selected?.checkStatus !== "requested" || selected.checkViewedBy === user.uid) return;
    updateDoc(doc(db, "tasks", selected.id), {
      checkViewedBy: user.uid,
      checkViewedAt: serverTimestamp(),
    }).catch((viewError) => setError(friendlyError(viewError)));
  }, [isSupervisor, selected?.id, selected?.checkStatus, selected?.checkViewedBy, showDashboard, showMap, user.uid]);

  useEffect(() => () => clearTimeout(notificationTimerRef.current), []);

  function playCheckSound() {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    context.resume().then(() => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.14, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);
    }).catch((audioError) => setError(friendlyError(audioError)));
  }

  async function enableNotifications() {
    setError("");
    try {
      if (!("Notification" in window)) {
        throw new Error("هذا المتصفح لا يدعم إشعارات المتصفح.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("يجب السماح بإشعارات المتصفح لتفعيل تنبيهات الجيك.");

      const audioContext = audioContextRef.current || new window.AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();
      setNotificationsEnabled(true);
    } catch (notificationError) {
      setError(friendlyError(notificationError));
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setError("");
    try {
      const number = taskNumber.trim().toUpperCase();
      const team = teams.find((item) => item.id === taskTeamId);
      if (!number || !taskTitle.trim()) throw new Error("أدخل رقم المهمة واسمها.");
      if (!team) throw new Error("أنشئ فريقاً قبل إسناد مهمة.");
      if (!isValidGovernorateSelection(taskGovernorates)) throw new Error("اختر محافظة واحدة على الأقل.");
      if (!/^[A-Z0-9_-]{1,40}$/.test(number)) throw new Error("استخدم أرقاماً أو أحرفاً إنجليزية أو - و _ فقط لرقم المهمة.");
      if (tasks.some((task) => task.taskNumber === number)) throw new Error("رقم المهمة مستخدم بالفعل. اختر رقماً آخر.");
      await setDoc(doc(db, "tasks", number), {
        taskNumber: number,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        ...normalizeTaskCaseDetails(taskCaseDetails),
        location: taskLocation.trim(),
        governorates: taskGovernorates,
        governorate: taskGovernorates[0],
        teamId: team.id,
        teamName: team.name,
        status: "open",
        checkStatus: "none",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setSelected({ id: number, taskNumber: number, title: taskTitle.trim(), description: taskDescription.trim(), ...normalizeTaskCaseDetails(taskCaseDetails), location: taskLocation.trim(), governorates: taskGovernorates, governorate: taskGovernorates[0], teamId: team.id, teamName: team.name, status: "open", checkStatus: "none", createdAt: new Date().toISOString() });
      setShowMap(false);
      setShowMembers(false);
      setShowDashboard(false);
      setTaskNumber("");
      setTaskTitle("");
      setTaskLocation("");
      setTaskGovernorates([]);
      setTaskDescription("");
      setTaskCaseDetails(EMPTY_CASE_DETAILS);
      setModal("");
    } catch (createError) {
      setError(friendlyError(createError));
    }
  }

  async function createTeam(event) {
    event.preventDefault();
    const name = newTeamName.trim();
    setError("");
    try {
      if (!name) throw new Error("أدخل اسم الفريق.");
      if (teams.some((team) => team.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        throw new Error("يوجد فريق بهذا الاسم بالفعل.");
      }
      const teamId = `team-${crypto.randomUUID()}`;
      await setDoc(doc(db, "teams", teamId), {
        name,
        shift: newTeamShift,
        availability: "ready",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setTaskTeamId(teamId);
      setNewTeamName("");
      setModal("");
    } catch (createError) {
      setError(friendlyError(createError));
    }
  }

  function beginEditProfile() {
    setProfileEditName(supervisorDisplayName || "");
    setProfileNewEmail("");
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileNotice("");
    setError("");
    setModal("profile");
  }

  async function saveSupervisorProfile(event) {
    event.preventDefault();
    const currentUser = auth.currentUser;
    const displayName = profileEditName.trim();
    const nextEmail = profileNewEmail.trim();
    const nextPassword = profileNewPassword;
    const emailChanged = Boolean(nextEmail && nextEmail !== currentUser?.email);
    const passwordChanged = Boolean(nextPassword);

    if (!currentUser || displayName.length < 2 || displayName.length > 80) {
      setError("أدخل اسماً ظاهراً من حرفين إلى 80 حرفاً.");
      return;
    }
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("تحقق من صيغة البريد الإلكتروني.");
      return;
    }
    if (passwordChanged && nextPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if ((emailChanged || passwordChanged) && !profileCurrentPassword) {
      setError("أدخل كلمة المرور الحالية لتغيير البريد أو كلمة المرور.");
      return;
    }

    setError("");
    setProfileNotice("");
    try {
      if (emailChanged || passwordChanged) {
        const credential = EmailAuthProvider.credential(currentUser.email, profileCurrentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
        setSupervisorDisplayName(displayName);
      }
      if (emailChanged) {
        await verifyBeforeUpdateEmail(currentUser, nextEmail);
      }
      if (passwordChanged) {
        await updatePassword(currentUser, nextPassword);
      }

      setProfileCurrentPassword("");
      setProfileNewPassword("");
      if (emailChanged) {
        setProfileNewEmail("");
        setProfileNotice("تم إرسال رابط تأكيد البريد الإلكتروني إلى العنوان الجديد.");
      } else {
        setModal("");
      }
    } catch (profileError) {
      setError(friendlyError(profileError));
    }
  }

  async function sendMessage(text) {
    setError("");
    try {
      await addDoc(collection(db, "tasks", selected.id, "messages"), {
        text,
        senderId: user.uid,
        senderName: supervisorDisplayName || profile.username || user.email,
        role,
        createdAt: serverTimestamp(),
      });
    } catch (messageError) {
      setError(friendlyError(messageError));
      throw messageError;
    }
  }

  async function changeTaskStatus(task, status) {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status,
        closedAt: status === "done" ? serverTimestamp() : null,
      });
    } catch (statusError) {
      setError(friendlyError(statusError));
    }
  }

  function beginEditTask(task) {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskClosedAt(toDateTimeInput(task.closedAt));
    setEditTaskCaseDetails(getTaskCaseFormValues(task));
    setEditTaskLocation(task.location || "");
    setEditTaskGovernorates(getTaskGovernorateCodes(task));
    setEditTaskTeamId(task.teamId);
    setError("");
    setModal("editTask");
  }

  async function saveTaskChanges(event) {
    event.preventDefault();
    const team = teams.find((item) => item.id === editTaskTeamId);
    if (!editingTask || !team || !editTaskTitle.trim()) {
      setError("أدخل اسم المهمة واختر الفريق.");
      return;
    }
    if (!isValidGovernorateSelection(editTaskGovernorates)) {
      setError("اختر محافظة واحدة على الأقل.");
      return;
    }
    try {
      await updateDoc(doc(db, "tasks", editingTask.id), {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim(),
        closedAt: editingTask.status === "done" ? normalizeTaskClosedAt(editTaskClosedAt) : null,
        ...normalizeTaskCaseDetails(editTaskCaseDetails),
        location: editTaskLocation.trim(),
        governorates: editTaskGovernorates,
        governorate: editTaskGovernorates[0],
        teamId: team.id,
        teamName: team.name,
      });
      setModal("");
      setEditingTask(null);
    } catch (saveError) {
      setError(friendlyError(saveError));
    }
  }

  async function confirmDeleteTask() {
    if (!deletingTask) return;
    try {
      await deleteDoc(doc(db, "tasks", deletingTask.id));
      setModal("");
      setDeletingTask(null);
    } catch (deleteError) {
      setError(friendlyError(deleteError));
    }
  }

  function beginEditMessage(message) {
    setEditingMessage(message);
    setEditMessageText(message.text);
    setError("");
    setModal("editMessage");
  }

  async function saveMessageChanges(event) {
    event.preventDefault();
    const text = editMessageText.trim();
    if (!selected || !editingMessage || !text || text.length > 2000) return;
    try {
      await updateDoc(doc(db, "tasks", selected.id, "messages", editingMessage.id), { text });
      setModal("");
      setEditingMessage(null);
    } catch (saveError) {
      setError(friendlyError(saveError));
    }
  }

  async function confirmDeleteMessage() {
    if (!selected || !deletingMessage) return;
    try {
      await deleteDoc(doc(db, "tasks", selected.id, "messages", deletingMessage.id));
      setModal("");
      setDeletingMessage(null);
    } catch (deleteError) {
      setError(friendlyError(deleteError));
    }
  }

  function beginEditTeam(team) {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamShift(team.shift || "morning");
    setResetTeamPassword("");
    setError("");
    setModal("editTeam");
  }

  async function saveTeamChanges(event) {
    event.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;
    try {
      await setDoc(doc(db, "teams", editingTeam.id), {
        ...editingTeam,
        name: editTeamName.trim(),
        shift: editTeamShift,
        updatedAt: serverTimestamp(),
      });
      setModal("");
      setEditingTeam(null);
    } catch (saveError) {
      setError(friendlyError(saveError));
    }
  }

  async function toggleTeamAvailability(team) {
    try {
      await setDoc(doc(db, "teams", team.id), {
        ...team,
        availability: getNextTeamAvailability(getTeamShiftStatus(team)),
        updatedAt: serverTimestamp(),
      });
    } catch (availabilityError) {
      setError(friendlyError(availabilityError));
    }
  }

  async function createTeamMember(member) {
    setError("");
    try {
      if (!teams.some((team) => team.id === member.teamId) || !member.name) throw new Error("أدخل اسم العضو واختر الفريق.");
      await addDoc(collection(db, "teams", member.teamId, "members"), {
        name: member.name,
        phone: member.phone,
        responsibility: member.responsibility,
        employeeId: member.employeeId,
        username: member.username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (memberError) {
      setError(friendlyError(memberError));
      return false;
    }
  }

  async function updateTeamMember(member, changes) {
    setError("");
    try {
      if (changes.teamId && changes.teamId !== member.teamId) {
        await deleteDoc(doc(db, "teams", member.teamId, "members", member.id));
        await addDoc(collection(db, "teams", changes.teamId, "members"), {
          name: changes.name,
          phone: changes.phone,
          responsibility: changes.responsibility,
          employeeId: changes.employeeId,
          username: changes.username,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "teams", member.teamId, "members", member.id), {
          name: changes.name,
          phone: changes.phone,
          responsibility: changes.responsibility,
          employeeId: changes.employeeId,
          username: changes.username,
          updatedAt: serverTimestamp(),
        });
      }
      return true;
    } catch (memberError) {
      setError(friendlyError(memberError));
      return false;
    }
  }

  async function deleteTeamMember(member) {
    setError("");
    try {
      await deleteDoc(doc(db, "teams", member.teamId, "members", member.id));
      return true;
    } catch (memberError) {
      setError(friendlyError(memberError));
      return false;
    }
  }

  function beginDeleteTeam(team) {
    const hasTasks = tasks.some((task) => task.teamId === team.id);
    const alternatives = teams.filter((item) => item.id !== team.id);
    setDeletingTeam(team);
    setTeamDeleteMode(hasTasks ? (alternatives.length ? "reassign" : "cascade") : "empty");
    setTeamReassignId(alternatives[0]?.id || "");
    setError("");
    setModal("deleteTeam");
  }

  async function confirmDeleteTeam() {
    if (!deletingTeam) return;
    try {
      if (teamDeleteMode === "reassign" && teamReassignId) {
        await Promise.all(tasks
          .filter((task) => task.teamId === deletingTeam.id)
          .map((task) => setDoc(doc(db, "tasks", task.id), {
            ...task,
            teamId: teamReassignId,
            teamName: teams.find((team) => team.id === teamReassignId)?.name || "",
            updatedAt: serverTimestamp(),
          })));
      } else if (teamDeleteMode === "cascade") {
        await Promise.all(tasks
          .filter((task) => task.teamId === deletingTeam.id)
          .map((task) => deleteDoc(doc(db, "tasks", task.id))));
      } else if (tasks.some((task) => task.teamId === deletingTeam.id)) {
        throw new Error("لا يمكن حذف الفريق لأن له مهام مرتبطة.");
      }
      await deleteDoc(doc(db, "teams", deletingTeam.id));
      setModal("");
      setDeletingTeam(null);
    } catch (deleteError) {
      setError(friendlyError(deleteError));
    }
  }

  async function updateCheckStatus(task) {
    try {
      const requested = task.checkStatus !== "requested";
      await updateDoc(doc(db, "tasks", task.id), requested
        ? { checkStatus: "requested", checkRequestedBy: user.uid, checkRequestedAt: serverTimestamp() }
        : { checkStatus: "checked", checkCheckedBy: user.uid, checkCheckedAt: serverTimestamp() });
    } catch (checkError) {
      setError(friendlyError(checkError));
    }
  }

  const pendingCheckTasks = tasks.filter((task) => task.checkStatus === "requested");

  function closeTeamModal() {
    setModal("");
  }

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        email={isSupervisor ? user.email : profile.username || user.email}
        displayName={supervisorDisplayName}
        teamName={profile.teamName}
        selected={showDashboard || showMap || showTeams || showMembers ? null : selected}
        tasks={tasks}
        showDashboard={showDashboard}
        showMap={showMap}
        showTeams={showTeams}
        showMembers={showMembers}
        showTasks={showTasks}
        onShowDashboard={() => { setShowMap(false); setShowTeams(false); setShowMembers(false); setShowTasks(null); setShowDashboard(true); }}
        onShowMap={() => { setShowDashboard(false); setShowTeams(false); setShowMembers(false); setShowTasks(null); setShowMap(true); }}
        onShowTeams={() => { setShowDashboard(false); setShowMap(false); setShowMembers(false); setShowTasks(null); setShowTeams(true); }}
        onShowMembers={() => { setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowTasks(null); setShowMembers(true); }}
        onShowTasks={(status) => { setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowMembers(false); setShowTasks(status); }}
        onSelect={(task) => { setSelected(task); setShowMap(false); setShowTeams(false); setShowMembers(false); setShowDashboard(false); }}
        onLogout={() => signOut(auth)}
        onCreateTask={() => { setError(""); setTaskGovernorates([]); if (teams.length) setModal("task"); else setModal("team"); }}
        onCreateTeam={() => { setError(""); setCreatedTeamCredentials(null); setModal("team"); }}
        onManageTeams={() => { setError(""); setModal("teams"); }}
        onEditProfile={beginEditProfile}
        pendingCheckTasks={pendingCheckTasks}
        notificationsEnabled={notificationsEnabled}
        onEnableNotifications={enableNotifications}
        onOpenTask={(task) => { setSelected(task); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
      />
      <main className="main-panel">
        {error && <div className="global-error" role="alert">{t(error)}<button onClick={() => setError("")}>×</button></div>}
        {notificationAlert && <div className="check-toast" role="status"><span><AppIcon name="alert" size={16} />{t("طلب جيك جديد")} #{notificationAlert.taskNumber}</span><button onClick={() => { const task = tasks.find((item) => item.id === notificationAlert.taskId); if (task) { setSelected(task); setShowMap(false); setShowMembers(false); setShowDashboard(false); } setNotificationAlert(null); }}>{t("فتح الجيك")}</button><button className="toast-close" aria-label={t("إغلاق")} onClick={() => setNotificationAlert(null)}><AppIcon name="close" size={15} /></button></div>}
        {showTeams ? (
          <TeamMembersPage teams={teams} members={teamMembers} onCreateMember={createTeamMember} onUpdateMember={updateTeamMember} onDeleteMember={deleteTeamMember} onCreateTeam={() => { setError(""); setModal("team"); }} getTeamShiftStatus={getTeamShiftStatus} onToggleTeamAvailability={toggleTeamAvailability} initialView="teams" />
        ) : showMembers ? (
          <TeamMembersPage teams={teams} members={teamMembers} onCreateMember={createTeamMember} onUpdateMember={updateTeamMember} onDeleteMember={deleteTeamMember} initialView="members" />
        ) : showTasks ? (
          <TasksStatusPage tasks={tasks} status={showTasks} onOpenTask={(task) => { setSelected(task); setShowTasks(null); setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowMembers(false); }} />
        ) : showMap ? (
          <StandaloneMapView
            tasks={tasks}
            onOpenTask={(task) => { setSelected(task); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
          />
        ) : showDashboard ? (
          <DashboardView
            role={role}
            tasks={tasks}
            teams={teams}
            getTeamShiftStatus={getTeamShiftStatus}
            onToggleTeamAvailability={toggleTeamAvailability}
            selectedTask={selected}
            onOpenTask={(task) => { setSelected(task); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
            onCreateTask={() => { setError(""); setTaskGovernorates([]); if (teams.length) setModal("task"); else setModal("team"); }}
            onManageTeams={() => { setError(""); setModal("teams"); }}
          />
        ) : selected ? (
          <div className="task-detail-scroll">
            <TaskHeader task={selected} role={role} onStatusChange={changeTaskStatus} onCheckAction={updateCheckStatus} onEdit={beginEditTask} onDelete={(task) => { setDeletingTask(task); setModal("deleteTask"); }} onShowMap={() => { setShowDashboard(false); setShowMembers(false); setShowMap(true); }} />
            <CaseDetails task={selected} />
          </div>
        ) : <EmptyTask role={role} onCreateTask={() => { setError(""); setTaskGovernorates([]); setModal(teams.length ? "task" : "team"); }} />}
      </main>

      {modal === "profile" && (
        <Modal title={t("إعدادات الملف الشخصي")} subtitle={t("غيّر اسمك، أو حدّث البريد وكلمة المرور بعد تأكيد هويتك.")} onClose={() => { setModal(""); setProfileNotice(""); setError(""); }}>
          <form className="modal-form" onSubmit={saveSupervisorProfile}>
            <label>{t("الاسم الظاهر")}<input value={profileEditName} onChange={(event) => setProfileEditName(event.target.value)} minLength="2" maxLength="80" required /></label>
            <label>{t("البريد الإلكتروني الحالي")}<input value={user.email || ""} readOnly /></label>
            <label>{t("البريد الإلكتروني الجديد")}<input type="email" value={profileNewEmail} onChange={(event) => setProfileNewEmail(event.target.value)} autoComplete="email" /></label>
            <label>{t("كلمة المرور الحالية")}<input type="password" value={profileCurrentPassword} onChange={(event) => setProfileCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
            <label>{t("كلمة مرور جديدة")}<input type="password" value={profileNewPassword} onChange={(event) => setProfileNewPassword(event.target.value)} minLength="8" autoComplete="new-password" /></label>
            {profileNotice && <p className="profile-notice" role="status">{t(profileNotice)}</p>}
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "task" && (
        <Modal title={t("إنشاء مهمة جديدة")} subtitle={t("ستكون لهذه المهمة محادثة مستقلة تظهر للفريق.")} onClose={() => setModal("")}>
          <form className="modal-form" onSubmit={createTask}>
            <label>{t("رقم المهمة")}<input value={taskNumber} onChange={(event) => setTaskNumber(event.target.value)} placeholder="FO-24018" required /></label>
            <label>{t("اسم المهمة")}<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("مثال: فحص مسار الألياف - القطاع الشرقي")} maxLength="160" required /></label>
            <label>{t("اختر الفريق")}<select value={taskTeamId} onChange={(event) => setTaskTeamId(event.target.value)} required><option value="">{t("اختر الفريق")}</option>{teams.map((team) => <option key={team.id} value={team.id}>{t(team.name)} · {t(getTeamShiftStatus(team))}</option>)}</select></label>
            <GovernoratePicker values={taskGovernorates} onChange={setTaskGovernorates} />
            <label>{t("المنطقة / الموقع")} <span className="optional">{t("(اختياري)")}</span><input value={taskLocation} onChange={(event) => setTaskLocation(event.target.value)} placeholder={t("مثال: القطاع الشرقي - غرفة التوزيع 4")} maxLength="120" /></label>
            <CaseDetailsFields values={taskCaseDetails} onChange={(key, value) => setTaskCaseDetails((current) => ({ ...current, [key]: value }))} description={taskDescription} onDescriptionChange={setTaskDescription} />
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("إسناد المهمة للفريق")} <AppIcon name="arrowLeft" size={16} /></button>
          </form>
        </Modal>
      )}

      {modal === "editTask" && editingTask && (
        <Modal title={t("تعديل التكت")} subtitle={`${t("المهمة")} #${editingTask.taskNumber} · ${t("رقم المهمة لا يتغير للحفاظ على سجل المحادثة.")}`} onClose={() => setModal("")}>
          <form className="modal-form" onSubmit={saveTaskChanges}>
            <label>{t("اسم المهمة")}<input value={editTaskTitle} onChange={(event) => setEditTaskTitle(event.target.value)} maxLength="160" required /></label>
            <label>{t("اختر الفريق")}<select value={editTaskTeamId} onChange={(event) => setEditTaskTeamId(event.target.value)} required>{teams.map((team) => <option key={team.id} value={team.id}>{t(team.name)} · {t(getTeamShiftStatus(team))}</option>)}</select></label>
            <GovernoratePicker values={editTaskGovernorates} onChange={setEditTaskGovernorates} />
            <label>{t("المنطقة / الموقع")}<input value={editTaskLocation} onChange={(event) => setEditTaskLocation(event.target.value)} maxLength="120" /></label>
            {editingTask.status === "done" && <label>{t("وقت إغلاق المهمة")}<input type="datetime-local" value={editTaskClosedAt} onChange={(event) => setEditTaskClosedAt(event.target.value)} required /></label>}
            <CaseDetailsFields values={editTaskCaseDetails} onChange={(key, value) => setEditTaskCaseDetails((current) => ({ ...current, [key]: value }))} description={editTaskDescription} onDescriptionChange={setEditTaskDescription} />
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "deleteTask" && deletingTask && (
        <Modal title={t("حذف التكت")} subtitle={`${t("سيتم حذف المهمة")} #${deletingTask.taskNumber} ${t("ومحادثتها بالكامل. لا يمكن التراجع عن هذا الإجراء.")}`} onClose={() => { setModal(""); setDeletingTask(null); }}>
          {error && <p className="form-error">{t(error)}</p>}
          <div className="modal-actions"><button className="button button-soft" onClick={() => { setModal(""); setDeletingTask(null); }}>{t("إلغاء")}</button><button className="button button-danger" onClick={confirmDeleteTask}>{t("حذف التكت نهائياً")}</button></div>
        </Modal>
      )}

      {modal === "editMessage" && editingMessage && (
        <Modal title={t("تعديل الرسالة")} subtitle={t("يمكن لمسؤول الشفت تعديل رسائل محادثة المهمة.")} onClose={() => { setModal(""); setEditingMessage(null); }}>
          <form className="modal-form" onSubmit={saveMessageChanges}>
            <label>{t("نص الرسالة")}<textarea value={editMessageText} onChange={(event) => setEditMessageText(event.target.value)} rows="4" maxLength="2000" required /></label>
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "deleteMessage" && deletingMessage && (
        <Modal title={t("حذف الرسالة")} subtitle={t("سيتم حذف هذه الرسالة من محادثة المهمة.")} onClose={() => { setModal(""); setDeletingMessage(null); }}>
          {error && <p className="form-error">{t(error)}</p>}
          <div className="modal-actions"><button className="button button-soft" onClick={() => { setModal(""); setDeletingMessage(null); }}>{t("إلغاء")}</button><button className="button button-danger" onClick={confirmDeleteMessage}>{t("حذف الرسالة")}</button></div>
        </Modal>
      )}

      {modal === "team" && (
        <Modal title={t("إضافة فريق")} subtitle={t("أضف فريقاً إلى التشكيل المنشود؛ لا يتطلب إنشاء حساب دخول.")} onClose={closeTeamModal}>
          <form className="modal-form" onSubmit={createTeam}>
            <label>{t("اسم الفريق")}<input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder={t("مثال: فريق الشمال")} maxLength="80" required /></label>
            <label>{t("الشفت")}<select value={newTeamShift} onChange={(event) => setNewTeamShift(event.target.value)}>
              <option value="morning">{t("الصباحي")}</option>
              <option value="evening">{t("المسائي")}</option>
              <option value="night">{t("الفجري")}</option>
            </select></label>
            <div className="invite-info"><AppIcon name="alert" size={16} /><p>{t("يتم إدارة أعضاء الفريق من صفحة أعضاء الفرق دون بيانات دخول.")}</p></div>
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("إضافة فريق")} <AppIcon name="arrowLeft" size={16} /></button>
          </form>
        </Modal>
      )}

      {modal === "teams" && (
        <Modal title={t("إدارة الفرق")} subtitle={t("عرض الفرق وحالة مناوبتها وإدارتها.")} onClose={() => setModal("")}>
          <div className="team-management">
            {teams.length === 0 ? <p className="muted">{t("لا توجد فرق مضافة بعد.")}</p> : teams.map((team) => <div className="team-management-row" key={team.id}>
              <span className="crew-avatar"><AppIcon name="users" size={18} /></span>
              <div className="team-row-copy"><strong>{t(team.name)}</strong><small>{teamMembers.filter((member) => member.teamId === team.id).length} {t("أعضاء")} · {tasks.filter((task) => task.teamId === team.id && task.status !== "done").length} {t("مهام مفتوحة")}</small></div>
              <button type="button" className={`team-shift-status ${getTeamShiftStatus(team) === "خارج المناوبة" ? "off-shift" : getTeamShiftStatus(team) === "مشغول" ? "busy" : "available"}`} onClick={() => toggleTeamAvailability(team)} title={t(getNextTeamAvailabilityLabel(getTeamShiftStatus(team)))} aria-label={`${t("تغيير حالة الفريق")}: ${t(getNextTeamAvailabilityLabel(getTeamShiftStatus(team)))}`}>{t(getTeamShiftStatus(team))}</button>
              <details className="actions-dropdown"><summary aria-label={t("إجراءات الفريق")}><AppIcon name="more" size={18} /></summary><div>
                <button onClick={() => toggleTeamAvailability(team)}>{t(getNextTeamAvailabilityLabel(getTeamShiftStatus(team)))}</button>
                <button onClick={() => beginEditTeam(team)}>{t("تعديل الفريق")}</button>
                <button className="danger-action" onClick={() => beginDeleteTeam(team)}>{t("حذف الفريق")}</button>
              </div></details>
            </div>)}
            <button className="button button-primary full-width" onClick={() => { setNewTeamName(""); setError(""); setModal("team"); }}><AppIcon name="userPlus" size={17} />{t("إضافة فريق")}</button>
          </div>
        </Modal>
      )}

      {modal === "editTeam" && editingTeam && (
        <Modal title={t("تعديل الفريق")} subtitle={t("تحديث اسم الفريق في التشكيل.")} onClose={() => { setModal(""); setEditingTeam(null); }}>
          <form className="modal-form" onSubmit={saveTeamChanges}>
            <label>{t("اسم الفريق")}<input value={editTeamName} onChange={(event) => setEditTeamName(event.target.value)} maxLength="80" required /></label>
            <label>{t("الشفت")}<select value={editTeamShift} onChange={(event) => setEditTeamShift(event.target.value)}>
              <option value="morning">{t("الصباحي")}</option>
              <option value="evening">{t("المسائي")}</option>
              <option value="night">{t("الفجري")}</option>
            </select></label>
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "deleteTeam" && deletingTeam && (
        <Modal title={t("حذف الفريق")} subtitle={`${t("الفريق")}: ${t(deletingTeam.name)} · ${tasks.filter((task) => task.teamId === deletingTeam.id).length} ${t("تكت")}`} onClose={() => { setModal(""); setDeletingTeam(null); }}>
          <div className="modal-form">
            <label>{t("اختر ما يحدث للتكتات") }<select value={teamDeleteMode} onChange={(event) => setTeamDeleteMode(event.target.value)}>
              <option value="empty" disabled={tasks.some((task) => task.teamId === deletingTeam.id)}>{t("حذف الفريق فقط (إذا لم توجد تكتات)")}</option>
              <option value="reassign" disabled={!teams.some((team) => team.id !== deletingTeam.id)}>{t("إعادة إسناد التكتات إلى فريق آخر")}</option>
              <option value="cascade">{t("حذف الفريق وكل تكتاته ومحادثاتها")}</option>
            </select></label>
            {teamDeleteMode === "reassign" && <label>{t("الفريق البديل")}<select value={teamReassignId} onChange={(event) => setTeamReassignId(event.target.value)}>{teams.filter((team) => team.id !== deletingTeam.id).map((team) => <option key={team.id} value={team.id}>{t(team.name)}</option>)}</select></label>}
            {teamDeleteMode === "cascade" && <p className="form-error">{t("هذا الخيار يحذف نهائياً كل التكتات والرسائل المرتبطة بالفريق.")}</p>}
            {error && <p className="form-error">{t(error)}</p>}
            <div className="modal-actions"><button className="button button-soft" onClick={() => { setModal(""); setDeletingTeam(null); }}>{t("إلغاء")}</button><button className="button button-danger" onClick={confirmDeleteTeam}>{t("تأكيد حذف الفريق")}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DemoWorkspace() {
  const t = useCopy();
  const { language } = usePreferences();
  const role = "supervisor";
  const [demoDisplayName, setDemoDisplayName] = useState("مسؤول الشفت");
  const [demoProfileName, setDemoProfileName] = useState("");
  const [teams, setTeams] = useState([
    { id: "east", name: "فريق الشرق", availability: "on-shift", shift: "morning" },
    { id: "west", name: "فريق الغرب", availability: "off-shift", shift: "evening" },
  ]);
  const [demoMembers, setDemoMembers] = useState([
    { id: "member-east-1", teamId: "east", name: "أحمد علي", phone: "0770 123 4567", responsibility: "فني شبكات", employeeId: "TECH-014", username: "ahmed.ali" },
    { id: "member-east-2", teamId: "east", name: "سارة محمود", phone: "0780 234 5678", responsibility: "مسؤولة السلامة", employeeId: "SAFE-008", username: "sara.m" },
    { id: "member-west-1", teamId: "west", name: "علي حسن", phone: "0750 345 6789", responsibility: "مشرف ميداني", employeeId: "SUP-021", username: "ali.hassan" },
  ]);
  const [demoTeamId, setDemoTeamId] = useState("east");
  const [tasks, setTasks] = useState([
    { id: "FO-24018", taskNumber: "FO-24018", title: "فحص الموقع - القطاع الشرقي", description: "FNS0164 fat 27 down", src: "P-26111606463127206", fmsId: "https://msp.go2field.iq/task/6753d7cf-ca1f-48d3-b268-20b79b0cc630", department: "Support", region: "Nasria", fdt: "FNS0164", efu: "10", maintenance: "WNS", caseStatus: "Last Mile", escalation: "Open", grRequest: "no", caseCreatedAt: "2026-11-16T09:53:49+03:00", location: "ذي قار - غرفة التوزيع 4", governorates: ["DQ"], governorate: "DQ", teamId: "east", teamName: "فريق الشرق", status: "open", checkStatus: "none", createdAt: new Date(Date.now() - (1 * 60 * 60 * 1000 + 50 * 60 * 1000 + 17000)).toISOString() },
    { id: "FO-24021", taskNumber: "FO-24021", title: "استلام المعدات للموقع", description: "مراجعة الكميات ومشاركة أي نواقص مع المتابع.", location: "البصرة - موقع 12", governorates: ["BS"], governorate: "BS", teamId: "west", teamName: "فريق الغرب", status: "done", closedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), checkStatus: "none", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ]);
  const [selectedId, setSelectedId] = useState("FO-24018");
  const [showDashboard, setShowDashboard] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showTasks, setShowTasks] = useState(null);
  const [messagesByTask, setMessagesByTask] = useState({
    "FO-24018": [
      { id: "sample-1", senderId: "demo-supervisor", role: "supervisor", text: "صباح الخير، يرجى البدء بفحص القطاع الشرقي وإرسال التحديث هنا.", createdAt: null },
      { id: "sample-2", senderId: "demo-team", role: "team", text: "تم الوصول للموقع. نبدأ الجولة الآن، وسنشارككم بالملاحظات أولاً بأول.", createdAt: null },
      { id: "sample-3", senderId: "demo-supervisor", role: "supervisor", text: "تمام، يعطيكم العافية. فضلاً تحققوا من وحدات الإنارة في المدخل.", createdAt: null },
    ],
    "FO-24021": [
      { id: "sample-4", senderId: "demo-team", role: "team", text: "تم استلام المعدات ومطابقة الكميات مع القائمة.", createdAt: null },
    ],
  });
  const [modal, setModal] = useState("");
  const [taskNumber, setTaskNumber] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskGovernorates, setTaskGovernorates] = useState([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCaseDetails, setTaskCaseDetails] = useState(EMPTY_CASE_DETAILS);
  const [taskTeamId, setTaskTeamId] = useState("east");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShift, setNewTeamShift] = useState("morning");
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskClosedAt, setEditTaskClosedAt] = useState("");
  const [editTaskCaseDetails, setEditTaskCaseDetails] = useState(EMPTY_CASE_DETAILS);
  const [editTaskLocation, setEditTaskLocation] = useState("");
  const [editTaskGovernorates, setEditTaskGovernorates] = useState([]);
  const [editTaskTeamId, setEditTaskTeamId] = useState("");
  const visibleTasks = role === "supervisor" ? tasks : tasks.filter((task) => task.teamId === demoTeamId);
  const selected = visibleTasks.find((task) => task.id === selectedId) || visibleTasks[0] || null;
  const user = { uid: `demo-${role}`, email: role === "supervisor" ? "supervisor@wasla.demo" : "field@wasla.demo" };
  const getDemoTeamShiftStatus = (team) => {
    if (team.availability === "off-shift") return "خارج المناوبة";
    if (team.availability === "busy") return "مشغول";
    if (team.availability === "ready") return "جاهز";
    return tasks.some((task) => task.teamId === team.id && task.status === "open")
      ? "مشغول"
      : "جاهز";
  };
  function toggleDemoTeamAvailability(team) {
    const availability = getNextTeamAvailability(getDemoTeamShiftStatus(team));
    setTeams((current) => current.map((item) => item.id === team.id ? { ...item, availability } : item));
  }

  useEffect(() => {
    if (selected?.id !== selectedId) setSelectedId(selected?.id || "");
  }, [selected?.id, selectedId]);

  function createDemoTask(event) {
    event.preventDefault();
    setError("");
    const number = taskNumber.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,40}$/.test(number)) {
      setError("استخدم أرقاماً أو أحرفاً إنجليزية أو - و _ فقط لرقم المهمة.");
      return;
    }
    if (tasks.some((task) => task.taskNumber === number)) {
      setError("رقم المهمة مستخدم بالفعل. اختر رقماً آخر.");
      return;
    }
    const team = teams.find((item) => item.id === taskTeamId);
    if (!team) {
      setError("اختر الفريق الذي سيتولى المهمة.");
      return;
    }
    if (!isValidGovernorateSelection(taskGovernorates)) {
      setError("اختر محافظة واحدة على الأقل.");
      return;
    }
    let caseDetails;
    try {
      caseDetails = normalizeTaskCaseDetails(taskCaseDetails);
    } catch (createError) {
      setError(friendlyError(createError));
      return;
    }
    const task = { id: number, taskNumber: number, title: taskTitle.trim(), description: taskDescription.trim(), ...caseDetails, location: taskLocation.trim(), governorates: taskGovernorates, governorate: taskGovernorates[0], teamId: team.id, teamName: team.name, status: "open", checkStatus: "none", createdAt: new Date().toISOString() };
    setTasks((current) => [task, ...current]);
    setMessagesByTask((current) => ({ ...current, [number]: [] }));
    setSelectedId(number);
    setShowMap(false);
    setShowMembers(false);
    setShowDashboard(false);
    setTaskNumber("");
    setTaskTitle("");
    setTaskLocation("");
    setTaskGovernorates([]);
    setTaskDescription("");
    setTaskCaseDetails(EMPTY_CASE_DETAILS);
    setError("");
    setModal("");
  }

  function beginEditDemoTask(task) {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskClosedAt(toDateTimeInput(task.closedAt));
    setEditTaskCaseDetails(getTaskCaseFormValues(task));
    setEditTaskLocation(task.location || "");
    setEditTaskGovernorates(getTaskGovernorateCodes(task));
    setEditTaskTeamId(task.teamId);
    setError("");
    setModal("editTask");
  }

  function saveDemoTaskChanges(event) {
    event.preventDefault();
    const team = teams.find((item) => item.id === editTaskTeamId);
    if (!editingTask || !team || !editTaskTitle.trim()) {
      setError("أدخل اسم المهمة واختر الفريق.");
      return;
    }
    if (!isValidGovernorateSelection(editTaskGovernorates)) {
      setError("اختر محافظة واحدة على الأقل.");
      return;
    }
    let caseDetails;
    let closedAt;
    try {
      caseDetails = normalizeTaskCaseDetails(editTaskCaseDetails);
      closedAt = editingTask.status === "done" ? normalizeTaskClosedAt(editTaskClosedAt) : null;
    } catch (saveError) {
      setError(friendlyError(saveError));
      return;
    }
    setTasks((current) => current.map((item) => item.id === editingTask.id ? {
      ...item,
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim(),
      closedAt,
      ...caseDetails,
      location: editTaskLocation.trim(),
      governorates: editTaskGovernorates,
      governorate: editTaskGovernorates[0],
      teamId: team.id,
      teamName: team.name,
    } : item));
    setEditingTask(null);
    setModal("");
  }

  function confirmDeleteDemoTask() {
    if (!deletingTask) return;
    setTasks((current) => current.filter((item) => item.id !== deletingTask.id));
    setMessagesByTask((current) => {
      const next = { ...current };
      delete next[deletingTask.id];
      return next;
    });
    setDeletingTask(null);
    setModal("");
  }

  function createDemoTeam(event) {
    event.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    if (teams.some((team) => team.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError("يوجد فريق بهذا الاسم بالفعل.");
      return;
    }
    const team = { id: `crew-${Date.now()}`, name, availability: "ready", shift: newTeamShift };
    setTeams((current) => [...current, team]);
    setTaskTeamId(team.id);
    setDemoTeamId(team.id);
    setNewTeamName("");
    setError("");
    setModal("");
  }

  function createDemoMember(member) {
    setDemoMembers((current) => [...current, { ...member, id: `member-${Date.now()}-${Math.random()}` }]);
    return true;
  }

  function updateDemoMember(member, changes) {
    setDemoMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...changes } : item));
    return true;
  }

  function deleteDemoMember(member) {
    setDemoMembers((current) => current.filter((item) => item.id !== member.id));
    return true;
  }

  function updateDemoCheckStatus(task) {
    const nextStatus = role === "supervisor" ? "checked" : "requested";
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, checkStatus: nextStatus } : item));
  }

  function saveDemoProfile(event) {
    event.preventDefault();
    const name = demoProfileName.trim();
    if (name.length < 2 || name.length > 80) {
      setError("أدخل اسماً ظاهراً من حرفين إلى 80 حرفاً.");
      return;
    }
    setDemoDisplayName(name);
    setModal("");
  }

  function closeDemoTeamModal() {
    setModal("");
    setCreatedTeamCredentials(null);
  }

  async function sendDemoMessage(text) {
    setMessagesByTask((current) => ({
      ...current,
      [selected.id]: [...(current[selected.id] || []), {
        id: `${Date.now()}-${Math.random()}`,
        senderId: user.uid,
        senderName: role === "supervisor" ? demoDisplayName : user.email,
        role,
        text,
        createdAt: null,
      }],
    }));
  }

  return (
    <div className="app-shell demo-shell">
      <Sidebar
        role={role}
        email={user.email}
        displayName={role === "supervisor" ? t(demoDisplayName) : ""}
        teamName={role === "team" ? teams.find((team) => team.id === demoTeamId)?.name : ""}
        selected={showDashboard || showMap || showTeams || showMembers ? null : selected}
        tasks={visibleTasks}
        showDashboard={showDashboard}
        showMap={showMap}
        showTeams={showTeams}
        showMembers={showMembers}
        showTasks={showTasks}
        onShowDashboard={() => { setShowMap(false); setShowTeams(false); setShowMembers(false); setShowTasks(null); setShowDashboard(true); }}
        onShowMap={() => { setShowDashboard(false); setShowTeams(false); setShowMembers(false); setShowTasks(null); setShowMap(true); }}
        onShowTeams={() => { setShowDashboard(false); setShowMap(false); setShowMembers(false); setShowTasks(null); setShowTeams(true); }}
        onShowMembers={() => { setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowTasks(null); setShowMembers(true); }}
        onShowTasks={(status) => { setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowMembers(false); setShowTasks(status); }}
        onSelect={(task) => { setSelectedId(task.id); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
        onLogout={() => { window.location.href = window.location.pathname; }}
        onCreateTask={() => { setError(""); setTaskGovernorates([]); setModal("task"); }}
        onCreateTeam={() => { setError(""); setCreatedTeamCredentials(null); setModal("team"); }}
        onManageTeams={() => { setError(""); setModal("teams"); }}
        onEditProfile={() => { setDemoProfileName(t(demoDisplayName)); setModal("profile"); }}
        pendingCheckTasks={tasks.filter((task) => task.checkStatus === "requested")}
        demoTeams={teams}
        demoTeamId={demoTeamId}
        onDemoTeamChange={setDemoTeamId}
        onOpenTask={(task) => { setSelectedId(task.id); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
      />
      <main className="main-panel">
        <div className="demo-banner"><span><i /> {t("معاينة محلية — الرسائل والتغييرات هنا للتجربة فقط")}</span></div>
        {showTeams ? (
          <TeamMembersPage teams={teams} members={demoMembers} onCreateMember={createDemoMember} onUpdateMember={updateDemoMember} onDeleteMember={deleteDemoMember} onCreateTeam={() => { setError(""); setModal("team"); }} getTeamShiftStatus={getDemoTeamShiftStatus} onToggleTeamAvailability={toggleDemoTeamAvailability} initialView="teams" />
        ) : showMembers ? (
          <TeamMembersPage teams={teams} members={demoMembers} onCreateMember={createDemoMember} onUpdateMember={updateDemoMember} onDeleteMember={deleteDemoMember} initialView="members" />
        ) : showTasks ? (
          <TasksStatusPage tasks={visibleTasks} status={showTasks} onOpenTask={(task) => { setSelectedId(task.id); setShowTasks(null); setShowDashboard(false); setShowMap(false); setShowTeams(false); setShowMembers(false); }} />
        ) : showMap ? (
          <StandaloneMapView
            tasks={visibleTasks}
            onOpenTask={(task) => { setSelectedId(task.id); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
          />
        ) : showDashboard ? (
          <DashboardView
            role={role}
            tasks={visibleTasks}
            teams={teams}
            getTeamShiftStatus={getDemoTeamShiftStatus}
            onToggleTeamAvailability={toggleDemoTeamAvailability}
            selectedTask={selected}
            onOpenTask={(task) => { setSelectedId(task.id); setShowMap(false); setShowMembers(false); setShowDashboard(false); }}
            onCreateTask={() => { setError(""); setTaskGovernorates([]); setModal("task"); }}
            onManageTeams={() => { setError(""); setModal("teams"); }}
          />
        ) : selected ? (
          <div className="task-detail-scroll">
            <TaskHeader
              task={selected}
              role={role}
              onCheckAction={updateDemoCheckStatus}
              onStatusChange={(task, status) => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status, closedAt: status === "done" ? new Date().toISOString() : null } : item))}
              onEdit={beginEditDemoTask}
              onDelete={(task) => { setDeletingTask(task); setModal("deleteTask"); }}
              onShowMap={() => { setShowDashboard(false); setShowMembers(false); setShowMap(true); }}
            />
            <CaseDetails task={selected} />
          </div>
        ) : <EmptyTask role={role} onCreateTask={() => { setError(""); setTaskGovernorates([]); setModal("task"); }} />}
        {error && <div className="global-error" role="alert">{t(error)}<button onClick={() => setError("")}>×</button></div>}
      </main>

      {modal === "profile" && (
        <Modal title={t("إعدادات الملف الشخصي")} subtitle={t("في المعاينة، يتم حفظ الاسم محلياً فقط.")} onClose={() => setModal("")}>
          <form className="modal-form" onSubmit={saveDemoProfile}>
            <label>{t("الاسم الظاهر")}<input value={demoProfileName} onChange={(event) => setDemoProfileName(event.target.value)} minLength="2" maxLength="80" required /></label>
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "task" && (
        <Modal title={t("إنشاء مهمة جديدة")} subtitle={t("ستكون لهذه المهمة محادثة مستقلة تظهر للفريق.")} onClose={() => setModal("")}>
          <form className="modal-form" onSubmit={createDemoTask}>
            <label>{t("رقم المهمة")}<input value={taskNumber} onChange={(event) => setTaskNumber(event.target.value)} placeholder="FO-24018" required /></label>
            <label>{t("اسم المهمة")}<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("مثال: فحص مسار الألياف - القطاع الشرقي")} required /></label>
            <label>{t("اختر الفريق")}<select value={taskTeamId} onChange={(event) => setTaskTeamId(event.target.value)} required>{teams.map((team) => <option key={team.id} value={team.id}>{t(team.name)} · {t(getDemoTeamShiftStatus(team))}</option>)}</select></label>
            <GovernoratePicker values={taskGovernorates} onChange={setTaskGovernorates} />
            <label>{t("المنطقة / الموقع")} <span className="optional">{t("(اختياري)")}</span><input value={taskLocation} onChange={(event) => setTaskLocation(event.target.value)} placeholder={t("مثال: القطاع الشرقي - غرفة التوزيع 4")} /></label>
            <CaseDetailsFields values={taskCaseDetails} onChange={(key, value) => setTaskCaseDetails((current) => ({ ...current, [key]: value }))} description={taskDescription} onDescriptionChange={setTaskDescription} />
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("إسناد المهمة للفريق")} <AppIcon name="arrowLeft" size={16} /></button>
          </form>
        </Modal>
      )}

      {modal === "editTask" && editingTask && (
        <Modal title={t("تعديل التكت")} subtitle={`${t("المهمة")} #${editingTask.taskNumber} · ${t("رقم المهمة لا يتغير للحفاظ على سجل المحادثة.")}`} onClose={() => { setModal(""); setEditingTask(null); }}>
          <form className="modal-form" onSubmit={saveDemoTaskChanges}>
            <label>{t("اسم المهمة")}<input value={editTaskTitle} onChange={(event) => setEditTaskTitle(event.target.value)} maxLength="160" required /></label>
            <label>{t("اختر الفريق")}<select value={editTaskTeamId} onChange={(event) => setEditTaskTeamId(event.target.value)} required>{teams.map((team) => <option key={team.id} value={team.id}>{t(team.name)}</option>)}</select></label>
            <GovernoratePicker values={editTaskGovernorates} onChange={setEditTaskGovernorates} />
            <label>{t("المنطقة / الموقع")}<input value={editTaskLocation} onChange={(event) => setEditTaskLocation(event.target.value)} maxLength="120" /></label>
            {editingTask.status === "done" && <label>{t("وقت إغلاق المهمة")}<input type="datetime-local" value={editTaskClosedAt} onChange={(event) => setEditTaskClosedAt(event.target.value)} required /></label>}
            <CaseDetailsFields values={editTaskCaseDetails} onChange={(key, value) => setEditTaskCaseDetails((current) => ({ ...current, [key]: value }))} description={editTaskDescription} onDescriptionChange={setEditTaskDescription} />
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("حفظ التعديلات")}</button>
          </form>
        </Modal>
      )}

      {modal === "deleteTask" && deletingTask && (
        <Modal title={t("حذف التكت")} subtitle={`${t("سيتم حذف المهمة")} #${deletingTask.taskNumber} ${t("ومحادثتها بالكامل. لا يمكن التراجع عن هذا الإجراء.")}`} onClose={() => { setModal(""); setDeletingTask(null); }}>
          {error && <p className="form-error">{t(error)}</p>}
          <div className="modal-actions"><button className="button button-soft" onClick={() => { setModal(""); setDeletingTask(null); }}>{t("إلغاء")}</button><button className="button button-danger" onClick={confirmDeleteDemoTask}>{t("حذف التكت نهائياً")}</button></div>
        </Modal>
      )}

      {modal === "team" && (
        <Modal title={t("إضافة فريق")} subtitle={t("أضف فريقاً إلى التشكيل؛ لا يتطلب إنشاء حساب دخول.")} onClose={closeDemoTeamModal}>
          <form className="modal-form" onSubmit={createDemoTeam}>
            <label>{t("اسم الفريق")}<input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder={t("مثال: فريق الشمال")} maxLength="80" required /></label>
            <label>{t("الشفت")}<select value={newTeamShift} onChange={(event) => setNewTeamShift(event.target.value)}>
              <option value="morning">{t("الصباحي")}</option>
              <option value="evening">{t("المسائي")}</option>
              <option value="night">{t("الفجري")}</option>
            </select></label>
            <div className="invite-info"><AppIcon name="alert" size={16} /><p>{t("يتم تسجيل أعضاء الفريق وبياناتهم من صفحة أعضاء الفرق.")}</p></div>
            {error && <p className="form-error">{t(error)}</p>}
            <button className="button button-primary full-width" type="submit">{t("إضافة فريق")} <AppIcon name="arrowLeft" size={16} /></button>
          </form>
        </Modal>
      )}

      {modal === "teams" && (
        <Modal title={t("إدارة الفرق")} subtitle={t("عرض الفرق وحالة مناوبتها وإدارتها.")} onClose={() => setModal("")}>
          <div className="team-management">
            {teams.map((team) => <div className="team-management-row" key={team.id}>
              <span className="crew-avatar"><AppIcon name="users" size={18} /></span>
              <div className="team-row-copy"><strong>{t(team.name)}</strong><small>{demoMembers.filter((member) => member.teamId === team.id).length} {t("أعضاء")} · {tasks.filter((task) => task.teamId === team.id && task.status !== "done").length} {t("مهام مفتوحة")}</small></div>
              <button type="button" className={`team-shift-status ${getDemoTeamShiftStatus(team) === "خارج المناوبة" ? "off-shift" : getDemoTeamShiftStatus(team) === "مشغول" ? "busy" : "available"}`} onClick={() => toggleDemoTeamAvailability(team)} title={t(getNextTeamAvailabilityLabel(getDemoTeamShiftStatus(team)))} aria-label={`${t("تغيير حالة الفريق")}: ${t(getNextTeamAvailabilityLabel(getDemoTeamShiftStatus(team)))}`}>{t(getDemoTeamShiftStatus(team))}</button>
              <button className="team-shift-toggle" onClick={() => toggleDemoTeamAvailability(team)}>{t(getNextTeamAvailabilityLabel(getDemoTeamShiftStatus(team)))}</button>
            </div>)}
            <button className="button button-primary full-width" onClick={() => { setNewTeamName(""); setError(""); setModal("team"); }}><AppIcon name="userPlus" size={17} />{t("إضافة فريق")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AppContent() {
  const t = useCopy();
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let stopProfileListener;
    let missingProfileTimeout;
    const stopAuthListener = onAuthStateChanged(auth, (currentUser) => {
      stopProfileListener?.();
      stopProfileListener = undefined;
      clearTimeout(missingProfileTimeout);
      missingProfileTimeout = undefined;
      setUser(currentUser || null);
      setProfile(undefined);
      setProfileError("");
      if (!currentUser) return;
      stopProfileListener = onSnapshot(doc(db, "users", currentUser.uid), (profileSnapshot) => {
        if (!profileSnapshot.exists()) {
          clearTimeout(missingProfileTimeout);
          missingProfileTimeout = setTimeout(() => {
            setProfileError("حسابك لا يملك ملف صلاحيات. تواصل مع المتابع لإكمال تفعيل الحساب.");
          }, 3000);
          return;
        }
        clearTimeout(missingProfileTimeout);
        const profileData = profileSnapshot.data();
        if (profileData.role !== "supervisor") {
          setProfileError("هذه اللوحة متاحة لمسؤول الشفت فقط.");
        } else {
          setProfile(profileData);
          setProfileError("");
        }
      }, (profileLoadError) => {
        clearTimeout(missingProfileTimeout);
        setProfileError(friendlyError(profileLoadError));
      });
    });
    return () => {
      stopAuthListener();
      stopProfileListener?.();
      clearTimeout(missingProfileTimeout);
    };
  }, []);

  if (!isSupabaseConfigured && new URLSearchParams(window.location.search).get("demo") === "1") return <DemoWorkspace />;
  if (!isSupabaseConfigured) return <ConfigNotice />;
  if (user === undefined || (user && profile === undefined && !profileError)) {
    return <main className="loading-screen"><span className="spinner" /><p>{t("جارٍ تجهيز مساحة العمل...")}</p></main>;
  }
  if (user && profileError) {
    return <main className="loading-screen"><div className="access-error"><span>!</span><h2>{t("تعذر فتح مساحة العمل")}</h2><p>{t(profileError)}</p><button className="button button-soft" onClick={() => signOut(auth)}>{t("تسجيل الخروج")}</button></div></main>;
  }
  return user ? <Workspace user={user} profile={profile} /> : <AuthScreen />;
}

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("wasla.language") || "ar");
  const [theme, setTheme] = useState(() => localStorage.getItem("wasla.theme") || "light");

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.title = language === "en" ? "iCHK | Network Operations" : "iCHK | عمليات الألياف الضوئية";
    localStorage.setItem("wasla.language", language);
    localStorage.setItem("wasla.theme", theme);
  }, [language, theme]);

  return (
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme }}>
      <AppContent />
    </SettingsContext.Provider>
  );
}
