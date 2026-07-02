import type { Employee } from "@/app/types/employee";

export interface ManagerRecord extends Employee {
  managerType: "manager" | "office_manager";
  managedDepartments: string[];
  isActive: boolean;
}

// Generated from Sheet: مدير عام in احمد فوزى(2).xlsx
// Rule: manager = rows with jobTitle containing "مكلف" and a valid financial number.
export const mockManagers = [
  {
    "id": "EMP-816",
    "financialNumber": "816",
    "name": "إيناس على السيد فرغلى",
    "jobTitle": "مدير عام مكلف",
    "department": "المراجعه الداخليه",
    "managerType": "manager",
    "managedDepartments": [
      "المراجعه الداخليه"
    ],
    "isActive": true,
    "status": "active",
    "nationalId": "26708192500321",
    "phone": "01001644470",
    "workType": "نهارى"
  },
  {
    "id": "EMP-932",
    "financialNumber": "932",
    "name": "نشوى محمد فهمى عبدالحليم",
    "jobTitle": "مدير عام مكلف",
    "department": "المعامل ومراقبة الجوده",
    "managerType": "manager",
    "managedDepartments": [
      "المعامل ومراقبة الجوده"
    ],
    "isActive": true,
    "nationalId": "26905152500328",
    "phone": "01006990100",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-933",
    "financialNumber": "933",
    "name": "مصطفى فرغلى عثمان احمد",
    "jobTitle": "مدير عام مكلف",
    "department": "انشطة المسئوليه المجتمعيه",
    "managerType": "manager",
    "managedDepartments": [
      "انشطة المسئوليه المجتمعيه"
    ],
    "isActive": true,
    "nationalId": "26810062500719",
    "phone": "01006262366",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-957",
    "financialNumber": "957",
    "name": "اشرف محمد محمد سيد",
    "jobTitle": "مدير عام مكلف",
    "department": "المهمات",
    "managerType": "manager",
    "managedDepartments": [
      "المهمات"
    ],
    "isActive": true,
    "nationalId": "26812042500171",
    "phone": "01001696541",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-983",
    "financialNumber": "983",
    "name": "جمال ضاحى خلف محمد",
    "jobTitle": "مدير عام مكلف",
    "department": "المرافق والكيماويات",
    "managerType": "manager",
    "managedDepartments": [
      "المرافق والكيماويات"
    ],
    "isActive": true,
    "nationalId": "26904252400413",
    "phone": "01000531720",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-991",
    "financialNumber": "991",
    "name": "محمد طلعت عبدالعظيم اسماعيل",
    "jobTitle": "مدير عام مكلف",
    "department": "تخطيط الانتاج",
    "managerType": "manager",
    "managedDepartments": [
      "تخطيط الانتاج"
    ],
    "isActive": true,
    "nationalId": "27301012403919",
    "phone": "01094371789",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-995",
    "financialNumber": "995",
    "name": "فارس عبدالله عبدالحميد محمد",
    "jobTitle": "مدير عام مكلف",
    "department": "التقطير",
    "managerType": "manager",
    "managedDepartments": [
      "التقطير"
    ],
    "isActive": true,
    "nationalId": "27003142100291",
    "phone": "01005024643",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1011",
    "financialNumber": "1011",
    "name": "غاده محمد احمد اسماعيل",
    "jobTitle": "مدير عام مكلف",
    "department": "الهندسه المدنيه",
    "managerType": "manager",
    "managedDepartments": [
      "الهندسه المدنيه"
    ],
    "isActive": true,
    "nationalId": "27507270200469",
    "phone": "01004610607",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1040",
    "financialNumber": "1040",
    "name": "سامر احمد حسين على",
    "jobTitle": "مدير عام مكلف",
    "department": "اعداد وتنمية الموارد البشريه",
    "managerType": "manager",
    "managedDepartments": [
      "اعداد وتنمية الموارد البشريه"
    ],
    "isActive": true,
    "nationalId": "27211272400051",
    "phone": "01001633499",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1051",
    "financialNumber": "1051",
    "name": "على محمد سلطان محمد",
    "jobTitle": "مدير عام مكلف",
    "department": "هندسة التحكم الآلى",
    "managerType": "manager",
    "managedDepartments": [
      "هندسة التحكم الآلى"
    ],
    "isActive": true,
    "nationalId": "27403172501159",
    "phone": "01006721983",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1061",
    "financialNumber": "1061",
    "name": "احمد بدرى محمود محمد",
    "jobTitle": "مدير عام مكلف",
    "department": "الشئون الطبيه",
    "managerType": "manager",
    "managedDepartments": [
      "الشئون الطبيه"
    ],
    "isActive": true,
    "nationalId": "26909092500931",
    "phone": "01001696526",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1090",
    "financialNumber": "1090",
    "name": "ايهاب فايز جادالرب احمد",
    "jobTitle": "مدير عام مكلف",
    "department": "الشئون الاداريه",
    "managerType": "manager",
    "managedDepartments": [
      "الشئون الاداريه"
    ],
    "isActive": true,
    "nationalId": "27405022500319",
    "phone": "01001694062",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1137",
    "financialNumber": "1137",
    "name": "عادل عبدالرحمن صالح احمد",
    "jobTitle": "مدير عام مكلف",
    "department": "شئون البيئه",
    "managerType": "manager",
    "managedDepartments": [
      "شئون البيئه"
    ],
    "isActive": true,
    "nationalId": "27310232501333",
    "phone": "01003894333",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1230",
    "financialNumber": "1230",
    "name": "اكرم محمد عبدالعزيز على",
    "jobTitle": "مدير عام مكلف",
    "department": "الهندسه الكهربائيه",
    "managerType": "manager",
    "managedDepartments": [
      "الهندسه الكهربائيه"
    ],
    "isActive": true,
    "nationalId": "27804302500979",
    "phone": "01005684487",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1244",
    "financialNumber": "1244",
    "name": "محمد مصطفى جادالرب احمد",
    "jobTitle": "مدير عام مكلف",
    "department": "التفتيش الهندسى",
    "managerType": "manager",
    "managedDepartments": [
      "التفتيش الهندسى"
    ],
    "isActive": true,
    "nationalId": "27410282500316",
    "phone": "01004964702",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1337",
    "financialNumber": "1337",
    "name": "احمد محمد طلعت عبدالرحمن",
    "jobTitle": "مدير عام مكلف",
    "department": "صيانة الآلآت الدواره",
    "managerType": "manager",
    "managedDepartments": [
      "صيانة الآلآت الدواره"
    ],
    "isActive": true,
    "nationalId": "27601192500651",
    "phone": "01006803383",
    "workType": "نهارى",
    status: "active"
  },
  {
    "id": "EMP-1432",
    "financialNumber": "1432",
    "name": "عاطف عيسى علام عيسى",
    "jobTitle": "مدير عام مكلف",
    "department": "صيانة الأجهزه",
    "managerType": "manager",
    "managedDepartments": [
      "صيانة الأجهزه"
    ],
    "isActive": true,
    "nationalId": "27702092201755",
    "phone": "01001213561",
    "workType": "نهارى",
    status: "active"
  }
] satisfies ManagerRecord[];
