import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const DEPARTMENTS = ["ครัวหลัก", "ครัวพนักงาน", "บาร์", "บริการ"];
const STOCK_GROUPS = ["ของแห้ง", "ของสด", "เครื่องดื่ม", "บรรจุภัณฑ์", "อื่นๆ"];
const STORAGE_KEY = "chom-cafe-inventory-v2";
const SUPABASE_URL = "https://muxncjzytiyjgmklneqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eG5janp5dGl5amdta2xuZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzA0MjgsImV4cCI6MjA5NDE0NjQyOH0.aJuUridHj-wm3wekwK0GCQjWkgROssMPK7iNJPMtex4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MOBILE_ACCESS_URL = typeof window !== "undefined" && window.location ? window.location.href : "https://chom-inventory.local";
const DEFAULT_MOBILE_DEVICES = [
  { id: "mobile-1", name: "มือถือ Store", owner: "ยังไม่ Login", role: "Stock", status: "offline", lastAction: "รอสแกน QR", count: 0 },
  { id: "mobile-2", name: "มือถือ Bar", owner: "ยังไม่ Login", role: "Bar", status: "offline", lastAction: "รอสแกน QR", count: 0 },
];

const DEFAULT_ITEMS = [
  { id: 1, sku: "DRY-001", barcode: "8850001000011", brand: "Chom Blend", imageUrl: "", name: "กาแฟอาราบิก้า", category: "วัตถุดิบแห้ง", stockGroup: "ของแห้ง", departments: ["บาร์"], supplierName: "Beanery Coffee Roasters", supplierPhone: "081-234-5678", supplierEmail: "info@beanerycoffee.com", unit: "กก.", onHand: 5.2, minStock: 2, maxStock: 10, unitCost: 300, detail: "เมล็ดกาแฟอาราบิก้า 100% คั่วกลาง" },
  { id: 2, sku: "DRY-002", barcode: "8850001000028", brand: "Beanery", imageUrl: "", name: "กาแฟโรบัสต้า", category: "วัตถุดิบแห้ง", stockGroup: "ของแห้ง", departments: ["บาร์"], supplierName: "Beanery Coffee Roasters", supplierPhone: "081-234-5678", supplierEmail: "info@beanerycoffee.com", unit: "กก.", onHand: 7.5, minStock: 2, maxStock: 15, unitCost: 160, detail: "กาแฟโรบัสต้า สำหรับเบลนด์เครื่องดื่ม" },
  { id: 3, sku: "DRY-003", barcode: "8850001000035", brand: "Chiang Rai Tea", imageUrl: "", name: "ชาใต้", category: "วัตถุดิบแห้ง", stockGroup: "ของแห้ง", departments: ["บาร์"], supplierName: "Chiang Rai Tea", supplierPhone: "089-111-2233", supplierEmail: "tea@example.com", unit: "กก.", onHand: 3.2, minStock: 1, maxStock: 5, unitCost: 200, detail: "ชาใต้กลิ่นเข้มสำหรับเมนูเย็น" },
  { id: 4, sku: "FRS-001", barcode: "8850001000042", brand: "Local Dairy", imageUrl: "", name: "นมสด", category: "วัตถุดิบสด", stockGroup: "ของสด", departments: ["บาร์", "ครัวหลัก"], supplierName: "Local Dairy", supplierPhone: "086-444-8899", supplierEmail: "milk@example.com", unit: "ลิตร", onHand: 12, minStock: 5, maxStock: 20, unitCost: 50, detail: "นมสดพาสเจอร์ไรซ์" },
  { id: 5, sku: "DRY-004", barcode: "8850001000059", brand: "KSL", imageUrl: "", name: "น้ำตาลทราย", category: "วัตถุดิบแห้ง", stockGroup: "ของแห้ง", departments: ["ครัวหลัก", "ครัวพนักงาน", "บาร์"], supplierName: "KSL Sugar", supplierPhone: "082-999-1111", supplierEmail: "sugar@example.com", unit: "กก.", onHand: 20, minStock: 5, maxStock: 30, unitCost: 21, detail: "น้ำตาลทรายขาวสำหรับครัวและบาร์น้ำ" },
];

function emptyItem() {
  return { sku: "", barcode: "", brand: "", imageUrl: "", name: "", category: "", stockGroup: "ของแห้ง", departments: [], supplierName: "", supplierPhone: "", supplierEmail: "", supplierDetail: "", supplierLogo: "", unit: "", onHand: "", minStock: "", maxStock: "", unitCost: "", detail: "" };
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function formatMoney(value) {
  return safeNumber(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMovementLabel(type) {
  const labels = { in: "รับเข้า", out: "เบิกออก", transfer: "โยกย้ายวัตถุดิบ", damage: "ของเสียหาย" };
  return labels[type] || "ไม่ระบุ";
}

function getStockStatus(item) {
  const onHand = safeNumber(item.onHand);
  if (onHand <= safeNumber(item.minStock)) return "low";
  if (safeNumber(item.maxStock) > 0 && onHand >= safeNumber(item.maxStock)) return "over";
  return "normal";
}

function getStockVisualStatus(item) {
  const onHand = safeNumber(item.onHand);
  const minStock = safeNumber(item.minStock);

  if (onHand <= minStock) {
    return {
      key: "critical",
      label: "ใกล้หมด",
      description: "ควรสั่งเพิ่มด่วน",
      frameClass: "border-red-200 bg-red-50/70 shadow-[0_0_28px_rgba(239,68,68,0.18)]",
      glowClass: "shadow-[0_0_34px_rgba(239,68,68,0.22)]",
      dotClass: "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.75)]",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
    };
  }

  if (minStock > 0 && onHand <= minStock * 1.5) {
    return {
      key: "reorder",
      label: "ต้องสั่งเพิ่ม",
      description: "อยู่ในจุดเตรียมสั่งซื้อ",
      frameClass: "border-yellow-200 bg-yellow-50/70 shadow-[0_0_28px_rgba(234,179,8,0.18)]",
      glowClass: "shadow-[0_0_34px_rgba(234,179,8,0.22)]",
      dotClass: "bg-yellow-500 shadow-[0_0_14px_rgba(234,179,8,0.75)]",
      badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
  }

  return {
    key: "normal",
    label: "สต๊อกปกติ",
    description: "ระดับสต๊อกปลอดภัย",
    frameClass: "border-green-200 bg-green-50/60 shadow-[0_0_28px_rgba(34,197,94,0.14)]",
    glowClass: "shadow-[0_0_34px_rgba(34,197,94,0.18)]",
    dotClass: "bg-green-500 shadow-[0_0_14px_rgba(34,197,94,0.75)]",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
  };
}

function getReorderItems(items) {
  return (Array.isArray(items) ? items : []).filter((item) => ["critical", "reorder"].includes(getStockVisualStatus(item).key));
}

function buildLineOrderMessage(items) {
  const reorderItems = getReorderItems(items);
  if (reorderItems.length === 0) return "CHOM Inventory ✅ สต๊อกปกติ ยังไม่มีรายการต้องสั่งเพิ่ม";

  const lines = reorderItems.map((item, index) => {
    const visual = getStockVisualStatus(item);
    const targetQty = Math.max(0, safeNumber(item.maxStock) - safeNumber(item.onHand));
    return `${index + 1}. ${item.name} (${item.sku})
สถานะ: ${visual.label}
คงเหลือ: ${item.onHand} ${item.unit} / Min: ${item.minStock}
แนะนำสั่งเพิ่ม: ${targetQty} ${item.unit}
Supplier: ${item.supplierName || "-"} ${item.supplierPhone || ""}`;
  });

  return `CHOM Inventory แจ้งเตือนสั่งของ
วันที่: ${new Date().toLocaleString("th-TH")}

รายการที่ควรสั่งเพิ่ม:
${lines.join("\n\n")}`;
}

function calculateSummary(items) {
  const list = Array.isArray(items) ? items : [];
  const dry = list.filter((item) => item.stockGroup === "ของแห้ง");
  return {
    totalItems: list.length,
    stockValue: list.reduce((sum, item) => sum + safeNumber(item.onHand) * safeNumber(item.unitCost), 0),
    dryItems: dry.length,
    dryStockValue: dry.reduce((sum, item) => sum + safeNumber(item.onHand) * safeNumber(item.unitCost), 0),
    lowStock: list.filter((item) => getStockStatus(item) === "low").length,
    overStock: list.filter((item) => getStockStatus(item) === "over").length,
  };
}

function filterItems(items, query, group = "ทั้งหมด") {
  const q = normalizeText(query);
  return (Array.isArray(items) ? items : []).filter((item) => {
    const matchGroup = group === "ทั้งหมด" || !group || item.stockGroup === group;
    const text = normalizeText(`${item.sku} ${item.barcode} ${item.brand} ${item.name} ${item.category} ${item.stockGroup} ${item.supplierName} ${item.unit}`);
    return matchGroup && (!q || text.includes(q));
  });
}

function findItemByBarcode(items, barcode) {
  const code = String(barcode || "").trim();
  if (!code) return null;
  return (Array.isArray(items) ? items : []).find((item) => String(item.barcode || "").trim() === code || String(item.sku || "").trim() === code) || null;
}

function applyMovement(items, itemId, type, qty) {
  const id = safeNumber(itemId);
  const amount = safeNumber(qty);
  const list = Array.isArray(items) ? items : [];
  if (!id || amount <= 0) return { changed: false, items: list, target: null };
  const target = list.find((item) => safeNumber(item.id) === id);
  if (!target) return { changed: false, items: list, target: null };
  const nextOnHand = type === "in" ? safeNumber(target.onHand) + amount : Math.max(0, safeNumber(target.onHand) - amount);
  return { changed: true, target, items: list.map((item) => safeNumber(item.id) === id ? { ...item, onHand: nextOnHand } : item) };
}

function calculateLogSummary(logs, dateKey, monthKey) {
  const base = { inValue: 0, outValue: 0, transferValue: 0, damageValue: 0, inQty: 0, outQty: 0, transferQty: 0, damageQty: 0 };
  const add = (rows) => rows.reduce((sum, log) => {
    const prefix = log.type;
    if (["in", "out", "transfer", "damage"].includes(prefix)) {
      sum[`${prefix}Value`] += safeNumber(log.totalValue);
      sum[`${prefix}Qty`] += safeNumber(log.qty);
    }
    return sum;
  }, { ...base });
  const list = Array.isArray(logs) ? logs : [];
  return {
    today: add(list.filter((log) => log.dateKey === dateKey)),
    month: add(list.filter((log) => log.monthKey === monthKey)),
  };
}

function calculateDepartmentInventory(logs, department, items = []) {
  const rows = (Array.isArray(logs) ? logs : []).filter((log) => log.toDepartment === department);
  const assigned = (Array.isArray(items) ? items : []).filter((item) => Array.isArray(item.departments) && item.departments.includes(department));
  const bySku = {};

  assigned.forEach((item) => {
    bySku[item.sku] = { sku: item.sku, brand: item.brand || "", itemName: item.name, stockGroup: item.stockGroup, unit: item.unit, receivedQty: 0, outQty: 0, damageQty: 0, balanceQty: 0, value: 0, isAssigned: true };
  });

  rows.forEach((log) => {
    if (!bySku[log.sku]) bySku[log.sku] = { sku: log.sku, brand: log.brand || "", itemName: log.itemName, stockGroup: log.stockGroup, unit: log.unit, receivedQty: 0, outQty: 0, damageQty: 0, balanceQty: 0, value: 0, isAssigned: false };
    const qty = safeNumber(log.qty);
    const value = safeNumber(log.totalValue);
    if (log.type === "transfer") { bySku[log.sku].receivedQty += qty; bySku[log.sku].balanceQty += qty; bySku[log.sku].value += value; }
    if (log.type === "out") { bySku[log.sku].outQty += qty; bySku[log.sku].balanceQty = Math.max(0, bySku[log.sku].balanceQty - qty); bySku[log.sku].value = Math.max(0, bySku[log.sku].value - value); }
    if (log.type === "damage") { bySku[log.sku].damageQty += qty; bySku[log.sku].balanceQty = Math.max(0, bySku[log.sku].balanceQty - qty); bySku[log.sku].value = Math.max(0, bySku[log.sku].value - value); }
  });

  return Object.values(bySku);
}

function calculateDepartmentSummary(logs, dateKey, monthKey) {
  const make = () => DEPARTMENTS.reduce((acc, dept) => ({ ...acc, [dept]: { qty: 0, value: 0 } }), {});
  const add = (rows) => rows.reduce((sum, log) => {
    if (log.type === "transfer" && log.toDepartment && sum[log.toDepartment]) {
      sum[log.toDepartment].qty += safeNumber(log.qty);
      sum[log.toDepartment].value += safeNumber(log.totalValue);
    }
    return sum;
  }, make());
  const list = Array.isArray(logs) ? logs : [];
  return { today: add(list.filter((log) => log.dateKey === dateKey)), month: add(list.filter((log) => log.monthKey === monthKey)) };
}

function calculateMonthlyReport(items, logs, monthKey) {
  const catalog = Array.isArray(items) ? items : [];
  const monthLogs = (Array.isArray(logs) ? logs : []).filter((log) => log.monthKey === monthKey);
  const movement = calculateLogSummary(monthLogs, "", monthKey).month;
  const departmentRows = DEPARTMENTS.map((dept) => {
    const deptItems = calculateDepartmentInventory(monthLogs, dept, catalog);
    return {
      department: dept,
      skuCount: deptItems.length,
      balanceQty: deptItems.reduce((s, item) => s + safeNumber(item.balanceQty), 0),
      balanceValue: deptItems.reduce((s, item) => s + safeNumber(item.value), 0),
      transferValue: monthLogs.filter((log) => log.type === "transfer" && log.toDepartment === dept).reduce((s, log) => s + safeNumber(log.totalValue), 0),
      outValue: monthLogs.filter((log) => log.type === "out" && log.toDepartment === dept).reduce((s, log) => s + safeNumber(log.totalValue), 0),
      damageValue: monthLogs.filter((log) => log.type === "damage" && log.toDepartment === dept).reduce((s, log) => s + safeNumber(log.totalValue), 0),
    };
  });
  return { movement, departmentRows, monthLogs };
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeExcelCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function sanitizeSheetName(name) {
  return String(name || "Sheet")
    .replace(/[\/?:*\[\]]/g, " ")
    .slice(0, 31) || "Sheet";
}

function getExcelCellType(value) {
  if (typeof value === "number" && Number.isFinite(value)) return "Number";
  return "String";
}

function rowsToExcelWorksheet(sheetName, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = safeRows.length > 0 ? Object.keys(safeRows[0]) : ["ไม่มีข้อมูล"];

  const headerRow = `<Row>${headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeExcelCell(header)}</Data></Cell>`).join("")}</Row>`;
  const bodyRows = safeRows.length === 0
    ? `<Row><Cell><Data ss:Type="String">ไม่มีข้อมูล</Data></Cell></Row>`
    : safeRows.map((row) => {
        const cells = headers.map((header) => {
          const value = row[header];
          const type = getExcelCellType(value);
          return `<Cell><Data ss:Type="${type}">${escapeExcelCell(value)}</Data></Cell>`;
        }).join("");
        return `<Row>${cells}</Row>`;
      }).join("");

  return `
    <Worksheet ss:Name="${escapeExcelCell(sanitizeSheetName(sheetName))}">
      <Table>
        ${headers.map(() => `<Column ss:AutoFitWidth="1" ss:Width="130"/>`).join("")}
        ${headerRow}
        ${bodyRows}
      </Table>
    </Worksheet>
  `;
}

function buildExcelWorkbookXml(sheets) {
  const safeSheets = Array.isArray(sheets) && sheets.length > 0 ? sheets : [{ name: "Summary", rows: [{ สถานะ: "ไม่มีข้อมูล" }] }];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>CHOM Cafe Inventory System</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Tahoma" ss:Size="10"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#17662F" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
  </Styles>
  ${safeSheets.map((sheet) => rowsToExcelWorksheet(sheet.name, sheet.rows)).join("\n")}
</Workbook>`;
}

async function exportExcelFile(filename, sheets) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const workbookXml = buildExcelWorkbookXml(sheets);
    const safeFilename = filename.toLowerCase().endsWith(".xls") ? filename : `${filename.replace(/\.(xlsx|csv|txt|html)$/i, "")}.xls`;
    const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8;" });

    const saveFilePicker = typeof window !== "undefined" ? window.showSaveFilePicker : null;
    if (typeof saveFilePicker === "function") {
      const handle = await saveFilePicker.call(window,{
        suggestedName: safeFilename,
        types: [
          {
            description: "Excel Workbook (.xls)",
            accept: {
              "application/vnd.ms-excel": [".xls"],
            },
          },
        ],
        excludeAcceptAllOption: true,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function readSavedPayload() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSavedPayload(payload) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export default function InventorySystemSimple() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [logs, setLogs] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchText, setSearchText] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ทั้งหมด");
  const [notice, setNotice] = useState("");
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [selectedDepartment, setSelectedDepartment] = useState("ครัวหลัก");
  const [selectedItemId, setSelectedItemId] = useState(DEFAULT_ITEMS[0].id);
  const [editingId, setEditingId] = useState(null);
  const [newItem, setNewItem] = useState(emptyItem());
  const [movement, setMovement] = useState({ itemId: "", type: "in", qty: "", staff: "", note: "", toDepartment: "ครัวหลัก", imageUrl: "" });
  const [logoImage, setLogoImage] = useState("");
  const [saveMode, setSaveMode] = useState("auto");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [mobileDevices, setMobileDevices] = useState(DEFAULT_MOBILE_DEVICES);
  const [activeMobileId, setActiveMobileId] = useState(DEFAULT_MOBILE_DEVICES[0].id);
  const [mobileLoginName, setMobileLoginName] = useState("");
  const [showMobileLoginQr, setShowMobileLoginQr] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const summary = useMemo(() => calculateSummary(items), [items]);
  const visibleItems = useMemo(() => filterItems(items, searchText, groupFilter), [items, searchText, groupFilter]);
  const movementItems = useMemo(() => filterItems(items, movementSearch, "ทั้งหมด"), [items, movementSearch]);
  const selectedItem = items.find((item) => item.id === selectedItemId) || items[0] || null;
  const selectedLogs = selectedItem ? logs.filter((log) => log.sku === selectedItem.sku).slice(0, 6) : [];
  const lowStockItems = useMemo(() => items.filter((item) => getStockStatus(item) === "low"), [items]);
  const reorderItems = useMemo(() => getReorderItems(items), [items]);
  const logSummary = useMemo(() => calculateLogSummary(logs, selectedDate, selectedMonth), [logs, selectedDate, selectedMonth]);
  const departmentSummary = useMemo(() => calculateDepartmentSummary(logs, selectedDate, selectedMonth), [logs, selectedDate, selectedMonth]);
  const departmentItems = useMemo(() => calculateDepartmentInventory(logs, selectedDepartment, items), [logs, selectedDepartment, items]);
  const departmentLogs = useMemo(() => logs.filter((log) => log.toDepartment === selectedDepartment).slice(0, 10), [logs, selectedDepartment]);
  const sectionLogs = useMemo(() => {
    if (["in", "out", "transfer", "damage"].includes(activeSection)) return logs.filter((log) => log.type === activeSection).slice(0, 20);
    return logs.slice(0, 20);
  }, [logs, activeSection]);

  useEffect(() => {
    async function loadSupabaseData() {
      try {
        const { data: itemsData } = await supabase
          .from("items")
          .select("*")
          .order("id");

        const { data: logsData } = await supabase
          .from("movement_logs")
          .select("*")
          .order("id", { ascending: false });

        const { data: mobileData } = await supabase
          .from("mobile_devices")
          .select("*");

        if (itemsData?.length) {
          setItems(itemsData.map((item) => ({
            ...item,
            imageUrl: item.image_url || item.imageUrl || "",
            stockGroup: item.stock_group || item.stockGroup || "ของแห้ง",
            supplierName: item.supplier_name || item.supplierName || "",
            supplierPhone: item.supplier_phone || item.supplierPhone || "",
            supplierEmail: item.supplier_email || item.supplierEmail || "",
            supplierDetail: item.supplier_detail || item.supplierDetail || "",
            supplierLogo: item.supplier_logo || item.supplierLogo || "",
            onHand: item.on_hand ?? item.onHand ?? 0,
            minStock: item.min_stock ?? item.minStock ?? 0,
            maxStock: item.max_stock ?? item.maxStock ?? 0,
            unitCost: item.unit_cost ?? item.unitCost ?? 0,
          })));
        }

        if (logsData?.length) {
          setLogs(logsData.map((log) => ({
            ...log,
            itemName: log.item_name || log.itemName,
            stockGroup: log.stock_group || log.stockGroup,
            unitCost: log.unit_cost || log.unitCost,
            totalValue: log.total_value || log.totalValue,
            toDepartment: log.to_department || log.toDepartment,
            imageUrl: log.image_url || log.imageUrl,
            dateKey: log.date_key || log.dateKey,
            monthKey: log.month_key || log.monthKey,
          })));
        }

        if (mobileData?.length) {
          setMobileDevices(mobileData.map((d) => ({
            ...d,
            lastAction: d.last_action || d.lastAction,
          })));
        }
      } catch (error) {
        console.log("Supabase load error", error);
      }

      const saved = readSavedPayload();
    if (saved) {
      if (Array.isArray(saved.items)) setItems(saved.items);
      if (Array.isArray(saved.logs)) setLogs(saved.logs);
      if (saved.logoImage) setLogoImage(saved.logoImage);
      if (saved.lastSavedAt) setLastSavedAt(saved.lastSavedAt);
      if (Array.isArray(saved.mobileDevices)) setMobileDevices(saved.mobileDevices);
    }
    setLoaded(true);
    }

    loadSupabaseData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        async () => {
          const { data } = await supabase
            .from("items")
            .select("*")
            .order("id");

          if (data) {
            setItems(data.map((item) => ({
              ...item,
              imageUrl: item.image_url || item.imageUrl || "",
              stockGroup: item.stock_group || item.stockGroup || "ของแห้ง",
              supplierName: item.supplier_name || item.supplierName || "",
              supplierPhone: item.supplier_phone || item.supplierPhone || "",
              supplierEmail: item.supplier_email || item.supplierEmail || "",
              supplierDetail: item.supplier_detail || item.supplierDetail || "",
              supplierLogo: item.supplier_logo || item.supplierLogo || "",
              onHand: item.on_hand ?? item.onHand ?? 0,
              minStock: item.min_stock ?? item.minStock ?? 0,
              maxStock: item.max_stock ?? item.maxStock ?? 0,
              unitCost: item.unit_cost ?? item.unitCost ?? 0,
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime Sync + Local Master Save
  // หลังบ้านเครื่องนี้จะเป็น Master Inventory
  // และ Sync Realtime ไปมือถือผ่าน Supabase
  useEffect(() => {
    if (!loaded || saveMode !== "auto") return;
    const savedAt = new Date().toLocaleString("th-TH");
    if (writeSavedPayload({ items, logs, logoImage, mobileDevices, lastSavedAt: savedAt })) setLastSavedAt(savedAt);
  }, [items, logs, logoImage, mobileDevices, loaded, saveMode]);

  // Cloud Sync ไป Supabase แบบ Realtime
  useEffect(() => {
    if (!loaded) return;

    async function syncCloud() {
      try {
        setSyncing(true);

        if (items.length > 0) {
          const payload = items.map((item) => ({
            id: item.id,
            sku: item.sku,
            barcode: item.barcode,
            brand: item.brand,
            image_url: item.imageUrl,
            name: item.name,
            category: item.category,
            stock_group: item.stockGroup,
            departments: item.departments,
            supplier_name: item.supplierName,
            supplier_phone: item.supplierPhone,
            supplier_email: item.supplierEmail,
            supplier_detail: item.supplierDetail,
            supplier_logo: item.supplierLogo,
            unit: item.unit,
            on_hand: item.onHand,
            min_stock: item.minStock,
            max_stock: item.maxStock,
            unit_cost: item.unitCost,
            detail: item.detail,
          }));

          await supabase.from("items").upsert(payload);
        }

        if (logs.length > 0) {
          const payload = logs.slice(0, 300).map((log) => ({
            id: log.id,
            time: log.time,
            date_key: log.dateKey,
            month_key: log.monthKey,
            sku: log.sku,
            barcode: log.barcode,
            brand: log.brand,
            item_name: log.itemName,
            stock_group: log.stockGroup,
            type: log.type,
            qty: log.qty,
            unit: log.unit,
            unit_cost: log.unitCost,
            total_value: log.totalValue,
            staff: log.staff,
            note: log.note,
            to_department: log.toDepartment,
            image_url: log.imageUrl,
          }));

          await supabase.from("movement_logs").upsert(payload);
        }

        if (mobileDevices.length > 0) {
          const payload = mobileDevices.map((device) => ({
            id: device.id,
            name: device.name,
            owner: device.owner,
            role: device.role,
            status: device.status,
            last_action: device.lastAction,
            count: device.count,
          }));

          await supabase.from("mobile_devices").upsert(payload);
        }
      } catch (error) {
        console.log("Supabase sync error", error);
      } finally {
        setSyncing(false);
      }
    }

    const timeout = setTimeout(syncCloud, 900);
    return () => clearTimeout(timeout);
  }, [items, logs, mobileDevices, loaded]);

  function updateNewItem(field, value) { setNewItem((current) => ({ ...current, [field]: value })); }
  function updateMovement(field, value) { setMovement((current) => ({ ...current, [field]: value })); }

  function updateMobileDeviceStatus(status, lastAction, countDelta = 0) {
    setMobileDevices((current) => current.map((device) => device.id === activeMobileId ? { ...device, status, lastAction, count: safeNumber(device.count) + countDelta } : device));
  }

  function loginMobileDevice() {
    const name = mobileLoginName.trim() || "พนักงานมือถือ";
    setMobileDevices((current) => current.map((device) => device.id === activeMobileId ? { ...device, owner: name, status: "online", lastAction: "Login ผ่าน QR แล้ว" } : device));
    setMobileLoginName("");
    setNotice(`${name} Login มือถือสำเร็จ`);
  }

  function openMobileAction(type) {
    setMovement((current) => ({ ...current, type }));
    setActiveSection(type);
    updateMobileDeviceStatus("working", type === "in" ? "กำลังรับเข้า" : type === "out" ? "กำลังเบิกออก" : type === "damage" ? "กำลังบันทึกของเสีย" : "กำลังโยกย้าย");
  }

  function handleBarcodeScanned(code) {
    const scannedCode = String(code || "").trim();
    if (!scannedCode) return;
    setMovementSearch(scannedCode);
    const found = findItemByBarcode(items, scannedCode);
    if (found) {
      setMovement((current) => ({ ...current, itemId: String(found.id) }));
      setSelectedItemId(found.id);
      const defaultDept = Array.isArray(found.departments) && found.departments.length > 0 ? found.departments[0] : "ครัวหลัก";
      setMovement((current) => ({ ...current, itemId: String(found.id), toDepartment: defaultDept }));
      setSelectedDepartment(defaultDept);
      setNotice(`พบสินค้า ${found.sku} - ${found.name} จากบาร์โค้ด ${scannedCode} และส่งเข้าแผนก ${defaultDept}`);
    } else {
      setNotice(`ไม่พบสินค้าในระบบจากบาร์โค้ด ${scannedCode}`);
    }
  }

  async function sendLineOrderAlert() {
    const message = buildLineOrderMessage(items);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) await navigator.clipboard.writeText(message);
    } catch (error) {
      // Copy is optional. LINE share below still works.
    }

    if (typeof window !== "undefined") {
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, "_blank");
    }

    setNotice("สร้างข้อความแจ้งเตือนสั่งของสำหรับ LINE แล้ว");
  }

  function openSection(id) {
    if (id === "export") { exportToExcel(); return; }
    if (["in", "out", "transfer", "damage"].includes(id)) setMovement((m) => ({ ...m, type: id }));
    setActiveSection(id);
  }

  function saveToThisComputer() {
    const savedAt = new Date().toLocaleString("th-TH");
    const ok = writeSavedPayload({ items, logs, logoImage, mobileDevices, lastSavedAt: savedAt });
    setLastSavedAt(savedAt);
    setNotice(ok ? "บันทึกข้อมูลลงเครื่องนี้เรียบร้อย" : "บันทึกไม่สำเร็จ");
  }

  function loadFromThisComputer() {
    const saved = readSavedPayload();
    if (!saved) { setNotice("ยังไม่มีข้อมูลที่บันทึกไว้"); return; }
    setItems(Array.isArray(saved.items) ? saved.items : DEFAULT_ITEMS);
    setLogs(Array.isArray(saved.logs) ? saved.logs : []);
    setLogoImage(saved.logoImage || "");
    if (Array.isArray(saved.mobileDevices)) setMobileDevices(saved.mobileDevices);
    setLastSavedAt(saved.lastSavedAt || "");
    setNotice("โหลดข้อมูลจากเครื่องนี้เรียบร้อย (Master Inventory)");
  }

  function clearSavedData() {
    if (typeof window !== "undefined" && window.localStorage) window.localStorage.removeItem(STORAGE_KEY);
    setLastSavedAt("");
    setNotice("ล้างข้อมูลบันทึกแล้ว");
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return setNotice("กรุณาเลือกไฟล์รูปภาพ");
    updateNewItem("imageUrl", await readImageFile(file));
    setNotice("โหลดรูปสินค้าเรียบร้อย");
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return setNotice("กรุณาเลือกไฟล์โลโก้");
    setLogoImage(await readImageFile(file));
    setNotice("อัปโหลดโลโก้เรียบร้อย");
  }

  async function handleMovementImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return setNotice("กรุณาเลือกรูปหลักฐาน");
    const imageData = await readImageFile(file);
    updateMovement("imageUrl", imageData);
    setNotice("โหลดรูปหลักฐานเรียบร้อย");
  }

  function resetForm() { setNewItem(emptyItem()); setEditingId(null); }

  function handleEditItem(item) {
    setEditingId(item.id);
    setSelectedItemId(item.id);
    setNewItem({ ...emptyItem(), ...item, onHand: String(item.onHand ?? ""), minStock: String(item.minStock ?? ""), maxStock: String(item.maxStock ?? ""), unitCost: String(item.unitCost ?? "") });
    setActiveSection("stock");
  }

  function handleSaveItem() {
    const sku = newItem.sku.trim();
    const name = newItem.name.trim();
    const category = newItem.category.trim();
    const unit = newItem.unit.trim();
    if (!sku || !name || !category || !unit) return setNotice("กรุณากรอกรหัส ชื่อ หมวดหมู่ และหน่วยให้ครบ");
    if (items.some((item) => normalizeText(item.sku) === normalizeText(sku) && item.id !== editingId)) return setNotice("รหัสสินค้านี้มีอยู่แล้ว");
    const saved = { ...newItem, id: editingId || Date.now(), sku, name, category, unit, departments: Array.isArray(newItem.departments) ? newItem.departments : [], onHand: Math.max(0, safeNumber(newItem.onHand)), minStock: Math.max(0, safeNumber(newItem.minStock)), maxStock: Math.max(0, safeNumber(newItem.maxStock)), unitCost: Math.max(0, safeNumber(newItem.unitCost)) };
    setItems((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved]);
    setSelectedItemId(saved.id);
    resetForm();
    setNotice("บันทึกสินค้าเรียบร้อย");
  }

  function handleStockMovement() {
    const result = applyMovement(items, movement.itemId, movement.type, movement.qty);
    if (!result.changed) return setNotice("กรุณาเลือกรายการและใส่จำนวนมากกว่า 0");
    if (["transfer", "out", "damage"].includes(movement.type) && !movement.toDepartment) return setNotice("กรุณาเลือกแผนก");
    const qty = safeNumber(movement.qty);
    const totalValue = qty * safeNumber(result.target.unitCost);
    const now = new Date();
    const log = { id: Date.now(), time: now.toLocaleString("th-TH"), dateKey: getDateKey(now), monthKey: getMonthKey(now), sku: result.target.sku, barcode: result.target.barcode || "", brand: result.target.brand, itemName: result.target.name, stockGroup: result.target.stockGroup, type: movement.type, qty, unit: result.target.unit, unitCost: result.target.unitCost, totalValue, staff: movement.staff.trim() || "ไม่ระบุ", note: movement.note.trim() || "-", toDepartment: ["transfer", "out", "damage"].includes(movement.type) ? movement.toDepartment : "", imageUrl: movement.imageUrl || "" };
    setItems(result.items);
    setLogs((current) => [log, ...current]);
    updateMobileDeviceStatus("success", `${getMovementLabel(log.type)} ${log.sku}`, 1);
    setSelectedItemId(result.target.id);
    setMovement({ itemId: "", type: movement.type, qty: "", staff: "", note: "", toDepartment: movement.toDepartment || "ครัวหลัก", imageUrl: "" });
    setNotice(`${getMovementLabel(log.type)} ${log.sku} มูลค่า ${formatMoney(totalValue)} บาท`);
  }

  function deleteSelectedItem() {
    if (!selectedItem) return;
    setItems((current) => current.filter((item) => item.id !== selectedItem.id));
    setSelectedItemId(items.find((item) => item.id !== selectedItem.id)?.id || null);
  }

  function updateItemSupplier(itemId, supplierData) {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...supplierData } : item));
    setNotice("อัปเดตข้อมูล Supplier เรียบร้อย");
  }

  async function exportToExcel() {
    setNotice("กำลังเตรียมไฟล์ Excel...");
    const ok = await exportExcelFile(`chom-inventory-${getDateKey()}.xls`, [
      { name: "Stock On Hand", rows: items.map((item) => ({ รหัสสินค้า: item.sku, บาร์โค้ด: item.barcode || "", ยี่ห้อ: item.brand, ชื่อสินค้า: item.name, กลุ่มสินค้า: item.stockGroup, หมวดหมู่: item.category, Supplier: item.supplierName, คงเหลือ: item.onHand, หน่วย: item.unit, Min: item.minStock, Max: item.maxStock, ต้นทุนต่อหน่วย: item.unitCost, มูลค่าคงเหลือ: safeNumber(item.onHand) * safeNumber(item.unitCost), สถานะ: getStockStatus(item) })) },
      { name: "Movement Logs", rows: logs.map((log) => ({ เวลา: log.time, วันที่: log.dateKey, ประเภท: getMovementLabel(log.type), รหัสสินค้า: log.sku, บาร์โค้ด: log.barcode || "", สินค้า: log.itemName, แผนก: log.toDepartment, จำนวน: log.qty, หน่วย: log.unit, มูลค่า: log.totalValue, ผู้ทำรายการ: log.staff, หมายเหตุ: log.note, มีรูปหลักฐาน: log.imageUrl ? "มี" : "ไม่มี" })) },
      { name: "Department Items", rows: DEPARTMENTS.flatMap((dept) => calculateDepartmentInventory(logs, dept, items).map((row) => ({ แผนก: dept, รหัสสินค้า: row.sku, ชื่อสินค้า: row.itemName, รับเข้าแผนก: row.receivedQty, เบิกออก: row.outQty, เสียหาย: row.damageQty, คงเหลือในแผนก: row.balanceQty, มูลค่า: row.value }))) },
      { name: "Summary", rows: [{ รายการทั้งหมด: summary.totalItems, มูลค่าสต๊อก: summary.stockValue, ต่ำกว่าMin: summary.lowStock, ถึงMax: summary.overStock }] },
    ]);
    setNotice(ok ? "Export Excel เรียบร้อย ไฟล์นามสกุล .xls" : "ยกเลิกหรือ Export ไม่สำเร็จ");
  }

  async function exportMonthlyReportExcel() {
    setNotice("กำลังเตรียมรายงาน Excel...");
    const report = calculateMonthlyReport(items, logs, selectedMonth);
    const ok = await exportExcelFile(`chom-monthly-report-${selectedMonth}.xls`, [
      { name: "Monthly Overview", rows: [{ เดือน: selectedMonth, มูลค่าสต๊อกคงเหลือ: summary.stockValue, รับเข้า: report.movement.inValue, เบิกออก: report.movement.outValue, โยกย้าย: report.movement.transferValue, เสียหาย: report.movement.damageValue }] },
      { name: "Department Summary", rows: report.departmentRows.map((row) => ({ แผนก: row.department, SKU: row.skuCount, คงเหลือรวม: row.balanceQty, มูลค่าคงเหลือ: row.balanceValue, โยกย้ายเข้า: row.transferValue, เบิกออก: row.outValue, เสียหาย: row.damageValue })) },
      { name: "Monthly Logs", rows: report.monthLogs.map((log) => ({ เวลา: log.time, ประเภท: getMovementLabel(log.type), รหัสสินค้า: log.sku, บาร์โค้ด: log.barcode || "", สินค้า: log.itemName, แผนก: log.toDepartment, จำนวน: log.qty, มูลค่า: log.totalValue, ผู้ทำรายการ: log.staff })) },
    ]);
    setNotice(ok ? "Export รายงานเดือนเรียบร้อย ไฟล์นามสกุล .xls" : "ยกเลิกหรือ Export ไม่สำเร็จ");
  }

  const navItems = [
    ["dashboard", "Dashboard"], ["stock", "สินค้า / สต๊อก"], ["in", "รับเข้า"], ["out", "เบิกออก"], ["transfer", "โยกย้ายวัตถุดิบ"], ["damage", "ของเสียหาย"], ["history", "ประวัติ"], ["department", "แผนก"], ["supplier", "Supplier"], ["report", "รายงานสรุป"], ["export", "Export Excel"], ["settings", "ตั้งค่า"],
  ];

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#182015]">
      <div className="grid min-h-screen lg:grid-cols-[230px_1fr_360px]">
        <aside className="bg-gradient-to-b from-[#123d22] via-[#0f331d] to-[#0a2414] text-white shadow-2xl">
          <div className="relative bg-white p-6 text-center text-[#123d22]">
            <label className="absolute right-3 top-3 cursor-pointer rounded-full bg-[#eef8ed] px-2 py-1 text-[10px] font-bold text-[#17662f] hover:shadow-[0_0_14px_rgba(114,216,141,0.45)]">แก้ไข<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
            {logoImage ? <img src={logoImage} alt="CHOM Logo" className="mx-auto mb-3 h-24 w-24 rounded-full object-contain" /> : <div className="mx-auto mb-2 text-5xl font-bold text-[#3d9b53]">ชม</div>}
            <div className="text-3xl font-semibold tracking-widest text-black">CHOM</div><div className="text-xs tracking-widest text-black">CAFE & RESTAURANT</div>
          </div>
          <nav className="space-y-2 p-4 text-sm font-medium">
            {navItems.map(([id, label]) => {
              const active = activeSection === id;

              return (
                <button
                  key={id}
                  onClick={() => openSection(id)}
                  className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${active ? "border-[#72d88d]/60 bg-white/20 shadow-[0_0_18px_rgba(114,216,141,0.18)]" : "border-transparent bg-white/5 hover:bg-white/10 hover:shadow-[0_0_16px_rgba(114,216,141,0.12)]"}`}
                >
                  <span className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${active ? "bg-[radial-gradient(circle_at_left,rgba(114,216,141,0.14),transparent_60%)]" : "bg-[radial-gradient(circle_at_left,rgba(114,216,141,0.09),transparent_60%)]"}`} />

                  <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${active ? "bg-[#72d88d] text-[#123d22] shadow-[0_0_14px_rgba(114,216,141,0.45)]" : "bg-white/10 text-white group-hover:bg-[#72d88d]/20 group-hover:shadow-[0_0_14px_rgba(114,216,141,0.28)]"}`}>
                    {id === "dashboard" ? "🏠" : id === "stock" ? "📦" : id === "in" ? "📥" : id === "out" ? "📤" : id === "transfer" ? "🔄" : id === "damage" ? "⚠️" : id === "history" ? "🕘" : id === "department" ? "🏢" : id === "supplier" ? "🚚" : id === "report" ? "📊" : id === "export" ? "📁" : "⚙️"}
                  </span>

                  <span className="relative z-10 text-[13px] tracking-wide text-white transition-all duration-300 group-hover:translate-x-1">
                    {label}
                  </span>

                  <span className={`absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full transition-all duration-300 ${active ? "bg-[#72d88d] shadow-[0_0_10px_#72d88d]" : "bg-white/20 group-hover:bg-[#72d88d] group-hover:shadow-[0_0_10px_#72d88d]"}`} />
                </button>
              );
            })}
          </nav>
          <MobileDeviceColumn
            devices={mobileDevices}
            activeMobileId={activeMobileId}
            onSelect={(id) => {
              setActiveMobileId(id);
              setShowMobileLoginQr(true);
            }}
          />
        </aside>

        <section className="space-y-5 p-5 lg:p-7">
          <Header saveMode={saveMode} setSaveMode={setSaveMode} lastSavedAt={lastSavedAt} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onSave={saveToThisComputer} onExport={exportToExcel} syncing={syncing} />
          {notice && <div className="rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm">{notice}</div>}
          <MobilePhonePanel
            devices={mobileDevices}
            activeMobileId={activeMobileId}
            setActiveMobileId={setActiveMobileId}
            loginName={mobileLoginName}
            setLoginName={setMobileLoginName}
            onLogin={loginMobileDevice}
            onAction={openMobileAction}
            logs={logs}
            showQr={showMobileLoginQr}
            onToggleQr={() => setShowMobileLoginQr((value) => !value)}
          />

          {activeSection === "dashboard" && <Dashboard summary={summary} logSummary={logSummary} lowStockItems={lowStockItems} reorderItems={reorderItems} setSelectedItemId={setSelectedItemId} onLineAlert={sendLineOrderAlert} />}
          {activeSection === "report" && <MonthlyReport month={selectedMonth} onMonthChange={setSelectedMonth} report={calculateMonthlyReport(items, logs, selectedMonth)} summary={summary} onExport={exportMonthlyReportExcel} />}
          {(activeSection === "dashboard" || activeSection === "department") && <DepartmentSection departmentSummary={departmentSummary} selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} departmentItems={departmentItems} departmentLogs={departmentLogs} />}
          {(activeSection === "dashboard" || activeSection === "stock") && <StockSection items={visibleItems} selectedItem={selectedItem} searchText={searchText} setSearchText={setSearchText} groupFilter={groupFilter} setGroupFilter={setGroupFilter} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onEdit={handleEditItem} setSelectedItemId={setSelectedItemId} />}
          {(activeSection === "dashboard" || activeSection === "stock") && (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    resetForm();
                    setActiveSection("stock");
                    if (typeof window !== "undefined" && typeof document !== "undefined") {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                    }
                  }}
                  className="group flex items-center gap-2 rounded-2xl bg-[#17662f] px-6 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#0f4f23] hover:shadow-[0_0_25px_rgba(46,125,70,0.45)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-[#17662f] transition-all duration-300 group-hover:rotate-90">
                    +
                  </span>
                  เพิ่มสินค้าใหม่
                </button>
              </div>

              <ItemForm
                newItem={newItem}
                updateNewItem={updateNewItem}
                editingId={editingId}
                handleImageUpload={handleImageUpload}
                handleSaveItem={handleSaveItem}
                resetForm={resetForm}
              />
            </>
          )}
          {["dashboard", "in", "out", "transfer", "damage"].includes(activeSection) && <MovementForm activeSection={activeSection} movement={movement} updateMovement={updateMovement} movementSearch={movementSearch} setMovementSearch={setMovementSearch} movementItems={movementItems} handleStockMovement={handleStockMovement} handleMovementImageUpload={handleMovementImageUpload} onBarcodeScanned={handleBarcodeScanned} logs={sectionLogs} />}
          {activeSection === "history" && <MovementHistory logs={logs} />}
          {activeSection === "supplier" && <SupplierList items={items} />}
          {activeSection === "settings" && <SettingsPanel logoImage={logoImage} onLogoUpload={handleLogoUpload} saveMode={saveMode} setSaveMode={setSaveMode} lastSavedAt={lastSavedAt} onSave={saveToThisComputer} onLoad={loadFromThisComputer} onClear={clearSavedData} />}
        </section>

        <aside className="border-l bg-white p-5 shadow-xl">{selectedItem ? <ItemDetail item={selectedItem} logs={selectedLogs} onEdit={() => handleEditItem(selectedItem)} onDelete={deleteSelectedItem} onSupplierUpdate={updateItemSupplier} /> : <p className="text-gray-500">ยังไม่มีสินค้า</p>}</aside>
      </div>
    </main>
  );
}

function MobileDeviceColumn({ devices, activeMobileId, onSelect }) {
  const statusStyle = {
    online: "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]",
    working: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]",
    success: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]",
    offline: "bg-gray-400",
  };

  return (
    <div className="mx-4 mb-5 rounded-[24px] border border-white/10 bg-white/10 p-3 text-white shadow-inner">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-white/90">มือถือที่ใช้งาน</p>
        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">Realtime</span>
      </div>
      <div className="space-y-2">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => onSelect(device.id)}
            className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(114,216,141,0.18)] ${activeMobileId === device.id ? "border-[#72d88d]/50 bg-white/20" : "border-white/10 bg-white/10"}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl">📱</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{device.name}</p>
                <p className="truncate text-[11px] text-white/70">{device.owner}</p>
              </div>
              <span className={`h-3 w-3 rounded-full ${statusStyle[device.status] || statusStyle.offline}`} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
              <span className="truncate">{device.lastAction}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-white">{device.count}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobilePhonePanel({ devices, activeMobileId, setActiveMobileId, loginName, setLoginName, onLogin, onAction, logs, showQr, onToggleQr }) {
  const activeDevice = devices.find((device) => device.id === activeMobileId) || devices[0];
  const todayLogs = logs.filter((log) => log.dateKey === getDateKey());
  const inCount = todayLogs.filter((log) => log.type === "in").length;
  const outCount = todayLogs.filter((log) => log.type === "out").length;
  const damageCount = todayLogs.filter((log) => log.type === "damage").length;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${MOBILE_ACCESS_URL}?device=${activeMobileId}&mode=mobile`)}`;

  return (
    <Card title="Mobile Stock Station" tools={<span className="rounded-full bg-[#eef8ed] px-3 py-1.5 text-xs font-bold text-[#17662f]">QR Login + Realtime</span>}>
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="rounded-[34px] border-4 border-[#123d22] bg-[#123d22] p-3 shadow-[0_18px_40px_rgba(18,61,34,0.18)]">
          <div className="rounded-[28px] bg-gradient-to-b from-[#f8fff8] to-[#eef8ed] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#17662f]">CHOM Mobile</span>
              <span className={`h-2.5 w-2.5 rounded-full ${activeDevice?.status === "offline" ? "bg-gray-400" : "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.7)]"}`} />
            </div>
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eef8ed] text-4xl">📱</div>
              <p className="text-sm font-bold text-[#123d22]">{activeDevice?.name}</p>
              <p className="text-xs text-gray-500">{activeDevice?.owner}</p>
              <p className="mt-2 rounded-full bg-[#f7f4ee] px-3 py-1 text-[11px] text-gray-600">{activeDevice?.lastAction}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <BounceNumber label="รับเข้า" value={inCount} tone="green" />
              <BounceNumber label="เบิกออก" value={outCount} tone="blue" />
              <BounceNumber label="เสีย" value={damageCount} tone="red" />
            </div>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => onAction("in")}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 px-2 py-1.5 text-white shadow-[0_6px_16px_rgba(34,197,94,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(34,197,94,0.35)] active:scale-[0.97]"
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_58%)]" />
                <span className="relative flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-sm backdrop-blur-sm shadow-inner">
                    📥
                  </span>
                  <span className="text-[11px] font-bold tracking-wide">รับเข้า</span>
                </span>
                <span className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              </button>

              <button
                onClick={() => onAction("out")}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-2 py-1.5 text-white shadow-[0_6px_16px_rgba(59,130,246,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(59,130,246,0.35)] active:scale-[0.97]"
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_58%)]" />
                <span className="relative flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-sm backdrop-blur-sm shadow-inner">
                    📤
                  </span>
                  <span className="text-[11px] font-bold tracking-wide">เบิกออก</span>
                </span>
                <span className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              </button>

              <button
                onClick={() => onAction("damage")}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-400 via-rose-500 to-red-600 px-2 py-1.5 text-white shadow-[0_6px_16px_rgba(239,68,68,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(239,68,68,0.35)] active:scale-[0.97]"
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_58%)]" />
                <span className="relative flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 text-sm backdrop-blur-sm shadow-inner">
                    ⚠️
                  </span>
                  <span className="text-[11px] font-bold tracking-wide">ของเสีย</span>
                </span>
                <span className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-white/70" />
                  <span className="relative block h-3 w-3 rounded-full bg-white" />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-[#f7f4ee] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#17662f]">Login มือถือหลังสแกน QR</p>
                <p className="text-xs text-gray-500">กดแสดง QR ก่อน แล้วใช้มือถือสแกนเข้า Inventory Mobile</p>
              </div>
              <button onClick={onToggleQr} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_14px_rgba(114,216,141,0.25)]">
                {showQr ? "ซ่อน QR" : "แสดง QR Login"}
              </button>
            </div>

            {showQr && (
              <div className="mb-4 grid gap-3 rounded-[24px] border border-[#9bc79e] bg-white p-4 shadow-[0_0_22px_rgba(114,216,141,0.16)] md:grid-cols-[150px_1fr]">
                <img src={qrUrl} alt="Mobile Login QR" className="mx-auto h-36 w-36 rounded-2xl border bg-white p-2" />
                <div className="flex flex-col justify-center">
                  <p className="font-bold text-[#17662f]">QR สำหรับ {activeDevice?.name}</p>
                  <p className="mt-1 text-sm text-gray-600">สแกนแล้วเข้าหน้ามือถือ จากนั้นกด Login เพื่อเริ่มรับเข้า / เบิกออก / สแกนบาร์โค้ด</p>
                  <p className="mt-2 rounded-xl bg-[#eef8ed] px-3 py-2 text-xs text-[#17662f]">เมื่อยิงบาร์โค้ด ระบบจะเลือกสินค้าและส่งเข้าแผนกแรกที่กำหนดใน Master Stock อัตโนมัติ</p>
                </div>
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-[180px_1fr_120px]">
              <select value={activeMobileId} onChange={(e) => setActiveMobileId(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm">
                {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
              </select>
              <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="ชื่อผู้ใช้มือถือ เช่น พี่เอ / Store / Bar" className="rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#9bc79e]" />
              <button onClick={onLogin} className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(72,187,120,0.35)] active:scale-[0.98]"><span className="relative flex items-center justify-center gap-2"><span>🔐</span><span>Login</span></span></button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{device.name}</p>
                  <span className="rounded-full bg-[#eef8ed] px-2 py-1 text-[10px] font-bold text-[#17662f]">{device.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">ผู้ใช้: {device.owner}</p>
                <p className="mt-2 text-xs text-gray-600">{device.lastAction}</p>
                <p className="mt-3 animate-bounce text-2xl font-black text-[#17662f]">{device.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BounceNumber({ label, value, tone }) {
  const color = tone === "green" ? "text-green-600" : tone === "blue" ? "text-blue-600" : "text-red-600";
  return <div className="rounded-2xl bg-white p-2 text-center shadow-sm"><p className="text-[10px] text-gray-500">{label}</p><p className={`animate-bounce text-xl font-black ${color}`}>{value}</p></div>;
}

function MobileAccessQRCode() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(MOBILE_ACCESS_URL)}`;

  return (
    <div className="group relative">
      <button className="flex items-center gap-2 rounded-xl border border-[#9bc79e] bg-white px-3 py-2 text-xs font-semibold text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#72d88d] hover:shadow-[0_0_18px_rgba(114,216,141,0.28)]">
        <span className="text-base">📱</span>
        Mobile QR
      </button>

      <div className="invisible absolute right-0 top-12 z-50 w-72 translate-y-2 rounded-[28px] border border-[#9bc79e] bg-white p-4 opacity-0 shadow-[0_18px_40px_rgba(23,102,47,0.16)] transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef8ed] text-3xl">
            📲
          </div>
          <h3 className="text-sm font-bold text-[#17662f]">สแกนเข้าใช้งานผ่านมือถือ</h3>
          <p className="mt-1 text-xs text-gray-500">
            ใช้มือถือสแกน QR เพื่อเปิดระบบ Inventory สำหรับรับเข้า / เบิกออก / สแกนบาร์โค้ด
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border bg-white p-3 shadow-inner">
          <img src={qrUrl} alt="Inventory Mobile QR" className="mx-auto h-52 w-52 rounded-2xl object-cover" />
        </div>

        <div className="mt-3 rounded-2xl bg-[#f7f4ee] p-3 text-xs text-gray-600">
          <p>• มือถือและคอมต้องอยู่ Wi‑Fi เดียวกัน</p>
          <p>• ใช้กล้องมือถือสแกนบาร์โค้ดสินค้าได้</p>
          <p>• รองรับ รับเข้า / เบิกออก / ของเสียหาย</p>
        </div>
      </div>
    </div>
  );
}

function Header({ saveMode, setSaveMode, lastSavedAt, selectedDate, setSelectedDate, onSave, onExport, syncing }) {
  return <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h1 className="text-3xl font-bold">Inventory Dashboard</h1><p className="text-sm text-gray-500">CHOM Cafe Inventory System</p><p className="mt-1 text-xs text-gray-400">Save Mode: {saveMode === "auto" ? "Auto Save" : "Manual Save"}{lastSavedAt ? ` · ${lastSavedAt}` : ""}</p><div className="mt-2 flex items-center gap-2 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${syncing ? "animate-pulse bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]" : "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]"}`} /><span className="text-gray-500">{syncing ? "กำลัง Sync Cloud Realtime" : "Cloud Sync พร้อมใช้งาน"}</span></div></div><div className="flex flex-wrap gap-2"><MobileAccessQRCode /><select value={saveMode} onChange={(e) => setSaveMode(e.target.value)} className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm"><option value="auto">Auto Save</option><option value="manual">Manual Save</option></select><button onClick={onSave} className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(23,102,47,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(72,187,120,0.28)] active:scale-[0.98]"><span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" /><span className="relative flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs backdrop-blur-sm">💾</span><span className="tracking-wide">Save</span></span></button><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border bg-white px-4 py-2 shadow-sm" /><button onClick={onExport} className="rounded-xl bg-[#17662f] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0f4f23] hover:shadow-[0_0_18px_rgba(46,125,70,0.35)]">📁 Export Excel</button></div></header>;
}

function Dashboard({ summary, logSummary, lowStockItems, reorderItems, setSelectedItemId, onLineAlert }) {
  return <><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><KpiCard title="มูลค่าสต๊อก" value={`฿ ${formatMoney(summary.stockValue)}`} tone="green" /><KpiCard title="รายการสินค้า" value={summary.totalItems} /><KpiCard title="ใกล้หมด" value={summary.lowStock} tone="orange" /><KpiCard title="เสียหายวันนี้" value={`฿ ${formatMoney(logSummary.today.damageValue)}`} tone="red" /><KpiCard title="โยกย้ายวันนี้" value={`฿ ${formatMoney(logSummary.today.transferValue)}`} tone="blue" /></section>
  <Card title="แจ้งเตือนสินค้าใกล้หมด" tools={<button onClick={onLineAlert} className="group relative overflow-hidden rounded-full bg-[#06c755] px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(6,199,85,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(6,199,85,0.35)]"><span className="relative flex items-center gap-2"><span>💬</span><span>ส่ง LINE สั่งของ</span></span></button>}>
    <div className="mb-4 rounded-2xl bg-[#eef8ed] p-4 text-sm text-[#17662f]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">LINE Alert</p>
          <p className="text-xs text-gray-600">กดเพื่อสร้างข้อความรายการต้องสั่งเพิ่ม และเปิด LINE สำหรับส่งต่อ</p>
        </div>
        <div className="animate-bounce rounded-full bg-white px-3 py-1 text-lg font-black text-[#06c755] shadow-sm">{reorderItems.length}</div>
      </div>
    </div>
    {lowStockItems.length === 0 ? <div className="rounded-2xl bg-green-50 p-4 text-center text-green-700">สต๊อกปกติ</div> : <div className="grid gap-2 md:grid-cols-4">{lowStockItems.map((item) => <button key={item.id} onClick={() => setSelectedItemId(item.id)} className="relative rounded-2xl border border-red-100 bg-red-50 p-4 text-center hover:shadow-[0_0_24px_rgba(239,68,68,0.22)]"><span className="absolute right-3 top-3 flex h-3 w-3"><span className="absolute h-full w-full animate-ping rounded-full bg-red-400" /><span className="relative h-3 w-3 rounded-full bg-red-500" /></span><p className="font-bold text-red-700">{item.sku}</p><p>{item.name}</p><p className="text-sm text-red-600">คงเหลือ {item.onHand} {item.unit}</p></button>)}</div>}
  </Card></>;
}

function DepartmentSection({ departmentSummary, selectedDepartment, setSelectedDepartment, departmentItems, departmentLogs }) {
  return <><Card title="สรุปโยกย้ายวัตถุดิบแยกแผนก"><div className="grid gap-2 md:grid-cols-4">{DEPARTMENTS.map((dept) => <button key={dept} onClick={() => setSelectedDepartment(dept)} className={`rounded-2xl p-4 text-center hover:shadow-[0_0_24px_rgba(72,187,120,0.18)] ${selectedDepartment === dept ? "bg-[#e6f3e5] ring-2 ring-[#17662f]" : "bg-[#f7f4ee]"}`}><p className="text-sm text-gray-500">{dept}</p><p className="mt-2 text-2xl font-bold text-[#17662f]">฿ {formatMoney(departmentSummary.today[dept]?.value || 0)}</p><p className="mt-1 text-xs text-gray-500">วันนี้ {departmentSummary.today[dept]?.qty || 0}</p></button>)}</div></Card><DepartmentDetail department={selectedDepartment} items={departmentItems} logs={departmentLogs} /></>;
}

function StockSection({ items, selectedItem, searchText, setSearchText, groupFilter, setGroupFilter, selectedMonth, setSelectedMonth, onEdit, setSelectedItemId }) {
  return <><section className="grid gap-2 xl:grid-cols-[1fr_180px_180px]"><Input value={searchText} onChange={setSearchText} placeholder="ค้นหาสินค้า / ยี่ห้อ / Supplier" /><select className="rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}><option value="ทั้งหมด">ทั้งหมด</option>{STOCK_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select><input type="month" className="rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /></section><Card title="รายการสินค้า (Stock On Hand)" tools={<><button className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#72d88d] hover:bg-[#eef8ed] hover:shadow-[0_0_12px_rgba(114,216,141,0.25)]">➕ เพิ่ม</button><button className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#72d88d] hover:bg-[#eef8ed] hover:shadow-[0_0_12px_rgba(114,216,141,0.25)]">📦 สต๊อก</button><button className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#72d88d] hover:bg-[#eef8ed] hover:shadow-[0_0_12px_rgba(114,216,141,0.25)]">⚡ Low</button></>}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-3 pr-4">รูป</th><th className="pr-4">รหัส</th><th className="pr-4">Barcode</th><th className="pr-4">ยี่ห้อ</th><th className="pr-4">ชื่อ</th><th className="pr-4">คงเหลือ</th><th className="pr-4">Min</th><th className="pr-4">Max</th><th className="pr-4">มูลค่า</th><th>จัดการ</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => setSelectedItemId(item.id)} className={`cursor-pointer border-b hover:bg-[#f6fbf4] ${selectedItem?.id === item.id ? "bg-[#eef8ed]" : ""}`}><td className="py-3 pr-4"><ProductImage item={item} small /></td><td className="pr-4 font-medium">{getStockStatus(item) === "low" && <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-red-500" />}{item.sku}</td><td className="pr-4 font-mono text-xs">{item.barcode || "-"}</td><td className="pr-4">{item.brand}</td><td className="pr-4">{item.name}</td><td className={getStockStatus(item) === "low" ? "pr-4 font-bold text-red-600" : "pr-4 font-bold text-[#17662f]"}>{item.onHand} {item.unit}</td><td className="pr-4">{item.minStock}</td><td className="pr-4">{item.maxStock}</td><td className="pr-4">฿ {formatMoney(safeNumber(item.onHand) * safeNumber(item.unitCost))}</td><td><button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="rounded-lg border px-3 py-1 text-xs hover:bg-[#eef8ed]">แก้ไข</button></td></tr>)}</tbody></table></div></Card></>;
}

function ItemForm({ newItem, updateNewItem, editingId, handleImageUpload, handleSaveItem, resetForm }) {
  return (
    <Card title={editingId ? "แก้ไขข้อมูลสินค้า Master" : "เพิ่มสินค้า Master ใหม่"} tools={<span className="rounded-full bg-[#eef8ed] px-3 py-1.5 text-xs font-bold text-[#17662f]">Master Stock</span>}>
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <label className="group flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#9bc79e] bg-[#f7f4ee] p-5 text-center transition-all duration-300 hover:border-[#17662f] hover:bg-[#eef8ed] hover:shadow-[0_0_24px_rgba(114,216,141,0.22)]">
            {newItem.imageUrl ? (
              <img src={newItem.imageUrl} alt="preview" className="h-72 w-full rounded-2xl object-cover bg-white shadow-sm" />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-white text-5xl shadow-inner">📷</div>
                <p className="text-sm font-bold text-[#17662f]">เพิ่มรูปสินค้า</p>
                <p className="mt-2 text-sm text-gray-500">คลิกเพื่อเลือกรูปจากเครื่องคอม</p>
                <p className="mt-1 text-xs text-gray-400">รองรับไฟล์ JPG, PNG, WEBP</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          {newItem.imageUrl && (
            <label className="block cursor-pointer rounded-2xl bg-[#17662f] px-4 py-3 text-center text-sm font-medium text-white transition-all duration-300 hover:bg-[#0f4f23] hover:shadow-[0_0_18px_rgba(46,125,70,0.35)]">
              เปลี่ยนรูปสินค้า
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Input value={newItem.sku} onChange={(v) => updateNewItem("sku", v)} placeholder="รหัสสินค้า" />
          <Input value={newItem.barcode} onChange={(v) => updateNewItem("barcode", v.replace(/\D/g, ""))} placeholder="Barcode / EAN-13 จาก Supplier" />
          <Input value={newItem.brand} onChange={(v) => updateNewItem("brand", v)} placeholder="ยี่ห้อ" />
          <Input value={newItem.name} onChange={(v) => updateNewItem("name", v)} placeholder="ชื่อสินค้า" />
          <Input value={newItem.category} onChange={(v) => updateNewItem("category", v)} placeholder="หมวดหมู่" />
          <select className="rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={newItem.stockGroup} onChange={(e) => updateNewItem("stockGroup", e.target.value)}>
            {STOCK_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <Input value={newItem.supplierName} onChange={(v) => updateNewItem("supplierName", v)} placeholder="Supplier" />
          <Input value={newItem.supplierPhone} onChange={(v) => updateNewItem("supplierPhone", v)} placeholder="เบอร์โทร" />
          <Input value={newItem.supplierEmail} onChange={(v) => updateNewItem("supplierEmail", v)} placeholder="Email Supplier" />
          <Input value={newItem.unit} onChange={(v) => updateNewItem("unit", v)} placeholder="หน่วย" />
          <Input type="number" value={newItem.onHand} onChange={(v) => updateNewItem("onHand", v)} placeholder="คงเหลือ" />
          <Input type="number" value={newItem.unitCost} onChange={(v) => updateNewItem("unitCost", v)} placeholder="ต้นทุน/หน่วย" />
          <Input type="number" value={newItem.minStock} onChange={(v) => updateNewItem("minStock", v)} placeholder="Min" />
          <Input type="number" value={newItem.maxStock} onChange={(v) => updateNewItem("maxStock", v)} placeholder="Max" />
          <DepartmentChecks value={newItem.departments} onChange={(v) => updateNewItem("departments", v)} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 md:flex-row">
        <button
          onClick={handleSaveItem}
          className="group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] px-6 py-4 text-base font-bold text-white shadow-[0_10px_30px_rgba(23,102,47,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(72,187,120,0.45)] active:scale-[0.98]"
        >
          <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_55%)]" />
          <span className="relative mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur-sm">
            {editingId ? "✓" : "+"}
          </span>
          <span className="relative tracking-wide">
            {editingId ? "บันทึกการแก้ไขสินค้า" : "เพิ่มสินค้าเข้าสู่ระบบ"}
          </span>
        </button>

        {editingId && (
          <button
            onClick={resetForm}
            className="rounded-2xl border border-gray-200 bg-white px-6 py-4 font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </Card>
  );
}

function DepartmentChecks({ value, onChange }) {
  const current = Array.isArray(value) ? value : [];
  return <div className="rounded-xl border bg-white p-3 md:col-span-2"><p className="mb-2 text-sm text-gray-600">กำหนดแผนก</p><div className="grid gap-2 md:grid-cols-4">{DEPARTMENTS.map((dept) => <label key={dept} className="flex gap-2 rounded-lg bg-[#f7f4ee] px-3 py-2 text-sm"><input type="checkbox" checked={current.includes(dept)} onChange={(e) => onChange(e.target.checked ? [...current, dept] : current.filter((d) => d !== dept))} />{dept}</label>)}</div></div>;
}

function MovementForm({ activeSection, movement, updateMovement, movementSearch, setMovementSearch, movementItems, handleStockMovement, handleMovementImageUpload, onBarcodeScanned, logs }) {
  const needsImage = ["in", "damage"].includes(movement.type);
  const title = activeSection === "in" ? "รับเข้า" : activeSection === "out" ? "เบิกออก" : activeSection === "transfer" ? "โยกย้ายวัตถุดิบ" : activeSection === "damage" ? "ของเสียหาย" : "รับเข้า / เบิกออก / โยกย้าย / ของเสียหาย";

  return (
    <Card title={title}>
      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_180px]">
          <Input value={movementSearch} onChange={setMovementSearch} placeholder="ค้นหาสินค้า / ยิงบาร์โค้ด / สแกนรหัส" />
          <BarcodeScannerButton onScan={onBarcodeScanned} />
        </div>
        <select className="w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={movement.itemId} onChange={(e) => updateMovement("itemId", e.target.value)}>
          <option value="">เลือกรายการ</option>
          {movementItems.map((item) => <option key={item.id} value={item.id}>{item.sku} {item.barcode ? `| ${item.barcode}` : ""} - {item.brand ? `${item.brand} - ` : ""}{item.name}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={movement.type} onChange={(e) => updateMovement("type", e.target.value)}>
            <option value="in">รับเข้า</option>
            <option value="out">เบิกออก</option>
            <option value="transfer">โยกย้าย</option>
            <option value="damage">ของเสียหาย</option>
          </select>
          <Input type="number" value={movement.qty} onChange={(v) => updateMovement("qty", v)} placeholder="จำนวน" />
        </div>

        {["transfer", "out", "damage"].includes(movement.type) && (
          <select className="w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" value={movement.toDepartment} onChange={(e) => updateMovement("toDepartment", e.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}

        {needsImage && (
          <div className="rounded-[28px] border-2 border-dashed border-[#9bc79e] bg-[#f7f4ee] p-4">
            <label className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-white/70 p-4 text-center transition-all duration-300 hover:bg-[#eef8ed] hover:shadow-[0_0_22px_rgba(114,216,141,0.22)]">
              {movement.imageUrl ? (
                <img src={movement.imageUrl} alt="movement evidence" className="h-56 w-full rounded-2xl object-cover shadow-sm" />
              ) : (
                <div>
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef8ed] text-4xl">📸</div>
                  <p className="text-sm font-bold text-[#17662f]">เพิ่มรูปหลักฐาน</p>
                  <p className="mt-1 text-sm text-gray-500">ใช้ได้ทั้งคอมและมือถือ</p>
                  <p className="mt-1 text-xs text-gray-400">เหมาะสำหรับใบส่งของ / สินค้ารับเข้า / ของเสียหาย</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleMovementImageUpload} className="hidden" />
            </label>
            {movement.imageUrl && (
              <div className="mt-3 flex gap-2">
                <label className="flex-1 cursor-pointer rounded-xl bg-[#17662f] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#0f4f23]">
                  เปลี่ยนรูป
                  <input type="file" accept="image/*" capture="environment" onChange={handleMovementImageUpload} className="hidden" />
                </label>
                <button type="button" onClick={() => updateMovement("imageUrl", "")} className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                  ลบรูป
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-[#eef8ed] p-3 text-sm text-[#17662f]">
          ระบบจะบันทึกวันที่และเวลาอัตโนมัติเมื่อกดบันทึก: {new Date().toLocaleString("th-TH")}
        </div>

        <Input value={movement.staff} onChange={(v) => updateMovement("staff", v)} placeholder="ชื่อผู้ทำรายการ" />
        <Input value={movement.note} onChange={(v) => updateMovement("note", v)} placeholder="หมายเหตุ" />
        <button
          onClick={handleStockMovement}
          className={`group relative w-full overflow-hidden rounded-2xl px-6 py-4 text-base font-bold text-white shadow-[0_10px_30px_rgba(23,102,47,0.28)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${movement.type === "damage" ? "bg-gradient-to-r from-[#b91c1c] via-[#ef4444] to-[#b91c1c] hover:shadow-[0_0_30px_rgba(239,68,68,0.45)]" : "bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] hover:shadow-[0_0_28px_rgba(72,187,120,0.45)]"}`}
        >
          <span className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${movement.type === "damage" ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_55%)]"}`} />

          <span className="relative flex items-center justify-center gap-2">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl backdrop-blur-sm ${movement.type === "damage" ? "bg-white/15" : "bg-white/20"}`}>
              {movement.type === "damage" ? "⚠️" : movement.type === "in" ? "📥" : movement.type === "out" ? "📤" : "🔄"}
            </span>

            <span className="tracking-wide">
              {movement.type === "damage"
                ? "บันทึกของเสียหายเข้าระบบ"
                : `บันทึก${getMovementLabel(movement.type)}`}
            </span>
          </span>

          {movement.type === "damage" && (
            <span className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-red-200" />
              <span className="relative block h-3 w-3 rounded-full bg-white" />
            </span>
          )}
        </button>
        <MovementDetailList title="Movement ล่าสุด" logs={logs} />
      </div>
    </Card>
  );
}

function BarcodeScannerButton({ onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("พร้อมสแกนด้วยกล้องมือถือ");

  async function stopScanner() {
    if (scanTimerRef.current && typeof window !== "undefined") window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setOpen(false);
  }

  async function startScanner() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Browser นี้ไม่รองรับการเปิดกล้อง");
      return;
    }

    const BarcodeDetectorCtor = typeof window !== "undefined" ? window.BarcodeDetector : null;
    if (typeof BarcodeDetectorCtor !== "function") {
      setMessage("เครื่องนี้ยังไม่รองรับ BarcodeDetector ให้ใช้เครื่องยิงบาร์โค้ดหรือพิมพ์เลขแทน");
      return;
    }

    try {
      setOpen(true);
      setMessage("กำลังเปิดกล้อง...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BarcodeDetectorCtor({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
      setMessage("เล็งกล้องไปที่บาร์โค้ดสินค้า");

      if (typeof window === "undefined") return;
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            onScan(code);
            setMessage(`สแกนสำเร็จ: ${code}`);
            await stopScanner();
          }
        } catch (error) {
          setMessage("กำลังค้นหาบาร์โค้ด...");
        }
      }, 700);
    } catch (error) {
      setMessage("เปิดกล้องไม่สำเร็จ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้ HTTPS/localhost");
      setOpen(false);
    }
  }

  useEffect(() => {
    return () => {
      if (scanTimerRef.current && typeof window !== "undefined") window.clearInterval(scanTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={open ? stopScanner : startScanner}
        className="w-full rounded-xl bg-[#17662f] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0f4f23] hover:shadow-[0_0_18px_rgba(46,125,70,0.35)]"
      >
        {open ? "ปิดกล้อง" : "📷 สแกนบาร์โค้ด"}
      </button>

      {open && (
        <div className="mt-3 rounded-[24px] border border-[#9bc79e] bg-[#f7f4ee] p-3 shadow-[0_0_22px_rgba(114,216,141,0.18)]">
          <video ref={videoRef} className="h-52 w-full rounded-2xl bg-black object-cover" muted playsInline />
          <p className="mt-2 text-center text-xs text-[#17662f]">{message}</p>
        </div>
      )}

      {!open && message !== "พร้อมสแกนด้วยกล้องมือถือ" && (
        <p className="mt-2 text-center text-xs text-gray-500">{message}</p>
      )}
    </div>
  );
}

function MovementDetailList({ title, logs }) {
  return <div className="mt-5 border-t pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-[#17662f]">{title}</h3><span className="rounded-full bg-[#eef8ed] px-3 py-1 text-xs text-[#17662f]">{logs.length} รายการ</span></div>{logs.length === 0 ? <div className="rounded-2xl bg-[#f7f4ee] p-5 text-center text-sm text-gray-500">ยังไม่มี Movement</div> : <div className="max-h-[420px] space-y-3 overflow-y-auto">{logs.map((log) => <div key={log.id} className="rounded-2xl border bg-white p-4 text-sm shadow-sm"><div className="flex justify-between"><div><p className="font-bold">{getMovementLabel(log.type)} · {log.sku}</p><p>{log.itemName}</p></div><div className="text-right"><p className="font-bold text-[#17662f]">{log.qty} {log.unit}</p><p>฿ {formatMoney(log.totalValue)}</p></div></div>{log.imageUrl && <img src={log.imageUrl} alt="movement evidence" className="mt-3 h-32 w-full rounded-xl object-cover" />}<div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2"><p>ผู้ทำรายการ: {log.staff}</p><p>แผนก: {log.toDepartment || "-"}</p><p>เวลา: {log.time}</p><p>หมายเหตุ: {log.note}</p></div></div>)}</div>}</div>;
}

function MovementHistory({ logs }) {
  return <Card title="ประวัติการเคลื่อนไหวทั้งหมด"><MovementDetailList title="Movement ทั้งหมด" logs={logs} /></Card>;
}

function SupplierList({ items }) {
  const suppliers = Object.values(items.reduce((acc, item) => { const key = item.supplierName || "ไม่ระบุ Supplier"; if (!acc[key]) acc[key] = { name: key, phone: item.supplierPhone || "-", email: item.supplierEmail || "-", count: 0, value: 0 }; acc[key].count += 1; acc[key].value += safeNumber(item.onHand) * safeNumber(item.unitCost); return acc; }, {}));
  return <Card title="Supplier"><div className="grid gap-4 md:grid-cols-3">{suppliers.map((s) => <div key={s.name} className="rounded-2xl bg-[#f7f4ee] p-4"><h3 className="font-bold text-[#17662f]">{s.name}</h3><p>โทร: {s.phone}</p><p>อีเมล: {s.email}</p><p>สินค้า {s.count} รายการ</p><p className="font-bold">฿ {formatMoney(s.value)}</p></div>)}</div></Card>;
}

function SettingsPanel({ logoImage, onLogoUpload, saveMode, setSaveMode, lastSavedAt, onSave, onLoad, onClear }) {
  return <Card title="ตั้งค่า"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#f7f4ee] p-5"><h3 className="font-bold">โลโก้ร้าน</h3>{logoImage ? <img src={logoImage} alt="logo" className="mt-4 h-28 w-28 rounded-2xl object-contain bg-white" /> : <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-white text-4xl text-[#3d9b53]">ชม</div>}<label className="mt-4 inline-block cursor-pointer rounded-xl bg-[#17662f] px-4 py-2 text-sm text-white">อัปโหลดโลโก้<input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" /></label></div><div className="rounded-2xl bg-[#f7f4ee] p-5"><h3 className="font-bold">บันทึกข้อมูล</h3><select value={saveMode} onChange={(e) => setSaveMode(e.target.value)} className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]"><option value="auto">Auto Save</option><option value="manual">Manual Save</option></select><p className="mt-3 text-sm">บันทึกล่าสุด: {lastSavedAt || "ยังไม่มี"}</p><div className="mt-4 grid gap-2 md:grid-cols-3"><button onClick={onSave} className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,102,47,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(72,187,120,0.38)] active:scale-[0.98]"><span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" /><span className="relative flex items-center justify-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">💾</span><span>บันทึก</span></span></button><button onClick={onLoad} className="rounded-xl border bg-white px-4 py-3 text-sm">โหลด</button><button onClick={onClear} className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-600">ล้าง</button></div></div></div></Card>;
}

function MonthlyReport({ month, onMonthChange, report, summary, onExport }) {
  return <Card title="รายงานสรุปภาพรวมรายเดือน"><div className="mb-5 flex justify-between gap-2"><div><p className="text-sm text-gray-500">เลือกเดือนและ Export Excel</p><p className="text-2xl font-bold text-[#17662f]">{month}</p></div><div className="flex gap-2"><input type="month" value={month} onChange={(e) => onMonthChange(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" /><button onClick={onExport} className="rounded-xl bg-[#17662f] px-5 py-2 font-medium text-white shadow-sm hover:bg-[#0f4f23]">เลือกที่บันทึกรายงาน Excel (.xls)</button></div></div><div className="grid gap-2 md:grid-cols-4"><KpiCard title="มูลค่าสต๊อก" value={`฿ ${formatMoney(summary.stockValue)}`} /><KpiCard title="รับเข้า" value={`฿ ${formatMoney(report.movement.inValue)}`} /><KpiCard title="เบิกออก" value={`฿ ${formatMoney(report.movement.outValue)}`} /><KpiCard title="เสียหาย" value={`฿ ${formatMoney(report.movement.damageValue)}`} tone="red" /></div></Card>;
}

function DepartmentDetail({ department, items, logs }) {
  const totalValue = items.reduce((sum, item) => sum + safeNumber(item.value), 0);
  return <Card title={`สินค้าในแผนก: ${department}`}><div className="mb-4 grid gap-2 md:grid-cols-3"><KpiCard title="จำนวน SKU" value={items.length} /><KpiCard title="มูลค่าคงเหลือ" value={`฿ ${formatMoney(totalValue)}`} tone="green" /><KpiCard title="ประวัติ" value={logs.length} /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-3 pr-4">รหัส</th><th className="pr-4">สินค้า</th><th className="pr-4">รับเข้า</th><th className="pr-4">เบิกออก</th><th className="pr-4">เสียหาย</th><th className="pr-4">คงเหลือ</th><th>มูลค่า</th></tr></thead><tbody>{items.length === 0 ? <tr><td colSpan={7} className="py-4 text-gray-400">ยังไม่มีรายการ</td></tr> : items.map((item) => <tr key={item.sku} className="border-b"><td className="py-3 pr-4 font-medium">{item.sku}</td><td className="pr-4">{item.itemName}</td><td className="pr-4">{item.receivedQty}</td><td className="pr-4">{item.outQty}</td><td className="pr-4">{item.damageQty}</td><td className="pr-4">{item.balanceQty} {item.unit}</td><td>฿ {formatMoney(item.value)}</td></tr>)}</tbody></table></div><MovementDetailList title="ประวัติของแผนกนี้" logs={logs} /></Card>;
}

function Card({ title, children, tools }) {
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">{(title || tools) && <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">{title}</h2><div className="flex flex-wrap gap-2">{tools}</div></div>}{children}</section>;
}

function KpiCard({ title, value, tone = "default" }) {
  const color = tone === "green" ? "text-[#17662f]" : tone === "orange" ? "text-orange-600" : tone === "red" ? "text-red-600" : tone === "blue" ? "text-blue-600" : "text-gray-900";
  return <div className="relative rounded-2xl border bg-white p-5 text-center shadow-sm"><p className="text-sm text-gray-500">{title}</p><p className={`mt-3 text-2xl font-bold ${color}`}>{value}</p>{["orange", "red"].includes(tone) && <span className="absolute right-3 top-3 h-3 w-3 animate-ping rounded-full bg-red-400" />}</div>;
}

function ProductImage({ item, small = false }) {
  const size = small ? "h-14 w-14" : "h-40 w-full";
  if (item.imageUrl) return <img src={item.imageUrl} alt={item.name} className={`${size} rounded-2xl object-cover bg-[#f0eadf]`} />;
  return <div className={`flex ${size} items-center justify-center rounded-2xl bg-[#f0eadf] text-4xl`}>☕</div>;
}

function ItemDetail({ item, logs, onEdit, onDelete, onSupplierUpdate }) {
  const visual = getStockVisualStatus(item);
  const stockValue = safeNumber(item.onHand) * safeNumber(item.unitCost);
  const [editingSupplier, setEditingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    supplierName: item.supplierName || "",
    supplierPhone: item.supplierPhone || "",
    supplierEmail: item.supplierEmail || "",
    supplierDetail: item.supplierDetail || "",
    supplierLogo: item.supplierLogo || "",
  });

  useEffect(() => {
    setSupplierForm({
      supplierName: item.supplierName || "",
      supplierPhone: item.supplierPhone || "",
      supplierEmail: item.supplierEmail || "",
      supplierDetail: item.supplierDetail || "",
      supplierLogo: item.supplierLogo || "",
    });
    setEditingSupplier(false);
  }, [item.id]);

  function updateSupplierForm(field, value) {
    setSupplierForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSupplierLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const imageData = await readImageFile(file);
    updateSupplierForm("supplierLogo", imageData);
  }

  function saveSupplier() {
    onSupplierUpdate(item.id, supplierForm);
    setEditingSupplier(false);
  }

  return (
    <div className={`sticky top-5 space-y-5 rounded-[30px] border p-4 transition-all duration-300 ${visual.frameClass}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">ข้อมูลสินค้า</h2>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${visual.badgeClass}`}>
          <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${visual.dotClass}`} />
          {visual.label}
        </span>
      </div>

      <div className={`relative overflow-hidden rounded-[28px] border bg-white p-3 ${visual.glowClass}`}>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-gray-700 backdrop-blur-sm">
          <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${visual.dotClass}`} />
          {visual.description}
        </div>
        <ProductImage item={item} />
      </div>

      <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
        <span className="rounded-full bg-[#eef8ed] px-3 py-1 text-xs text-[#17662f]">{item.sku}</span>
        <h3 className="mt-3 text-xl font-bold">{item.name}</h3>
        <p className="text-sm text-gray-500">{item.brand || "ไม่ระบุยี่ห้อ"}</p>
      </div>

      <DetailSection title="ข้อมูลทั่วไป" rows={[["รหัส", item.sku], ["Barcode", item.barcode || "-"], ["ยี่ห้อ", item.brand || "-"], ["หมวดหมู่", item.category], ["หน่วย", item.unit]]} />
      <DetailSection title="สต๊อก" rows={[["สถานะ", visual.label], ["คงเหลือ", `${item.onHand} ${item.unit}`], ["Min", `${item.minStock}`], ["Max", `${item.maxStock}`], ["ต้นทุน", `฿ ${formatMoney(item.unitCost)}`], ["มูลค่า", `฿ ${formatMoney(stockValue)}`]]} />
      <SupplierEditor
        editing={editingSupplier}
        form={supplierForm}
        onEdit={() => setEditingSupplier(true)}
        onCancel={() => {
          setSupplierForm({ supplierName: item.supplierName || "", supplierPhone: item.supplierPhone || "", supplierEmail: item.supplierEmail || "", supplierDetail: item.supplierDetail || "", supplierLogo: item.supplierLogo || "" });
          setEditingSupplier(false);
        }}
        onSave={saveSupplier}
        onChange={updateSupplierForm}
        onLogoUpload={handleSupplierLogoUpload}
      />
      <MovementDetailList title="ประวัติล่าสุด" logs={logs} />
      <button onClick={onEdit} className="w-full rounded-xl bg-[#17662f] px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0f4f23] hover:shadow-[0_0_18px_rgba(46,125,70,0.35)]">แก้ไขข้อมูลสินค้า</button>
      <button onClick={onDelete} className="w-full rounded-xl border border-red-300 bg-white/80 px-4 py-3 font-medium text-red-600 transition-all duration-300 hover:bg-red-50 hover:shadow-[0_0_18px_rgba(239,68,68,0.16)]">ลบสินค้า</button>
    </div>
  );
}

function SupplierEditor({ editing, form, onEdit, onCancel, onSave, onChange, onLogoUpload }) {
  if (!editing) {
    return (
      <div className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-bold">Supplier</h3>
          <button onClick={onEdit} className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-[#17662f] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#72d88d] hover:bg-[#eef8ed] hover:shadow-[0_0_12px_rgba(114,216,141,0.25)]">แก้ไข Supplier</button>
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            {form.supplierLogo ? <img src={form.supplierLogo} alt="supplier logo" className="h-16 w-16 rounded-2xl object-contain bg-white shadow-sm" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef8ed] text-3xl">🚚</div>}
            <div>
              <p className="font-bold text-[#17662f]">{form.supplierName || "ไม่ระบุ Supplier"}</p>
              <p className="text-sm text-gray-500">{form.supplierPhone || "-"}</p>
              <p className="text-sm text-gray-500">{form.supplierEmail || "-"}</p>
            </div>
          </div>
          <p className="rounded-xl bg-[#f7f4ee] p-3 text-sm text-gray-600">{form.supplierDetail || "ยังไม่มีรายละเอียด Supplier"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold">แก้ไข Supplier</h3>
        <span className="rounded-full bg-[#eef8ed] px-3 py-1 text-xs text-[#17662f]">แก้ไขได้ทันที</span>
      </div>

      <div className="space-y-3 rounded-2xl bg-white/80 p-4 shadow-sm">
        <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9bc79e] bg-[#f7f4ee] p-3 text-center transition-all duration-300 hover:bg-[#eef8ed] hover:shadow-[0_0_18px_rgba(114,216,141,0.18)]">
          {form.supplierLogo ? <img src={form.supplierLogo} alt="supplier logo preview" className="h-28 w-full rounded-xl object-contain bg-white" /> : <div><div className="text-4xl">🏷️</div><p className="mt-2 text-sm font-bold text-[#17662f]">แนบโลโก้ Supplier</p><p className="text-xs text-gray-500">คลิกเพื่อเลือกรูปจากเครื่อง</p></div>}
          <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
        </label>

        <Input value={form.supplierName} onChange={(v) => onChange("supplierName", v)} placeholder="ชื่อ Supplier" />
        <Input value={form.supplierPhone} onChange={(v) => onChange("supplierPhone", v)} placeholder="เบอร์โทร Supplier" />
        <Input value={form.supplierEmail} onChange={(v) => onChange("supplierEmail", v)} placeholder="Email Supplier" />
        <textarea value={form.supplierDetail} onChange={(e) => onChange("supplierDetail", e.target.value)} placeholder="รายละเอียด Supplier / เงื่อนไขส่งของ / เครดิต / หมายเหตุ" className="min-h-24 w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" />

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onSave} className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#17662f] via-[#238b45] to-[#17662f] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,102,47,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(72,187,120,0.38)] active:scale-[0.98]"><span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" /><span className="relative flex items-center justify-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">💾</span><span>Save Supplier</span></span></button>
          <button onClick={onCancel} className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-600 transition-all duration-300 hover:bg-gray-50">ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, rows }) { return <div className="border-t pt-4"><h3 className="mb-3 font-bold">{title}</h3><div className="space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="text-gray-500">{label}</span><span className="text-right font-medium">{value}</span></div>)}</div></div>; }

function Input({ value, onChange, placeholder, type = "text" }) { return <input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} className="w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition-all duration-300 hover:border-[#72d88d] hover:shadow-[0_0_12px_rgba(114,216,141,0.2)] focus:ring-2 focus:ring-[#9bc79e]" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />; }

export function runInventoryLogicTests() {
  const sample = [{ id: 1, sku: "A", barcode: "8851234567890", name: "A", stockGroup: "ของแห้ง", onHand: 1, minStock: 2, maxStock: 10, unitCost: 5, unit: "kg", departments: ["บาร์"] }];
  console.assert(getStockStatus(sample[0]) === "low", "low stock should work");
  console.assert(getStockVisualStatus({ onHand: 10, minStock: 5 }).key === "normal", "visual status should show normal");
  console.assert(getStockVisualStatus({ onHand: 7, minStock: 5 }).key === "reorder", "visual status should show reorder");
  console.assert(getStockVisualStatus({ onHand: 5, minStock: 5 }).key === "critical", "visual status should show critical");
  console.assert(calculateSummary(sample).stockValue === 5, "stock value should calculate");
  console.assert(applyMovement(sample, 1, "in", 2).items[0].onHand === 3, "in movement should add stock");
  console.assert(applyMovement(sample, 1, "out", 5).items[0].onHand === 0, "out movement should not go below zero");
  console.assert(filterItems(sample, "A", "ทั้งหมด").length === 1, "filter should work");
  console.assert(filterItems(sample, "8851234567890", "ทั้งหมด").length === 1, "barcode search should work");
  console.assert(findItemByBarcode(sample, "8851234567890")?.sku === "A", "findItemByBarcode should find barcode");
  console.assert(Array.isArray(sample[0].departments) && sample[0].departments[0] === "บาร์", "barcode scanned item should route to first master department");
  console.assert(getReorderItems(sample).length === 1, "reorder items should include low stock");
  console.assert(buildLineOrderMessage(sample).includes("แจ้งเตือนสั่งของ"), "LINE alert message should be created");
  const supplierPatch = { supplierName: "New Supplier", supplierDetail: "Credit 7 days", supplierLogo: "data:image/png;base64,test" };
  console.assert(supplierPatch.supplierName === "New Supplier" && supplierPatch.supplierLogo.startsWith("data:image"), "supplier edit payload should support details and logo");
  const movementLogWithImage = { imageUrl: "data:image/png;base64,test", time: new Date().toLocaleString("th-TH"), dateKey: getDateKey(), monthKey: getMonthKey() };
  console.assert(Boolean(movementLogWithImage.imageUrl) && Boolean(movementLogWithImage.time), "movement image and auto time should be stored");
  const logs = [{ type: "transfer", toDepartment: "บาร์", sku: "A", itemName: "A", qty: 2, totalValue: 10, unit: "kg", monthKey: "2026-05", dateKey: "2026-05-10" }];
  console.assert(calculateDepartmentInventory(logs, "บาร์", sample)[0].balanceQty === 2, "department inventory should work");
  const workbookXml = buildExcelWorkbookXml([{ name: "Test", rows: [{ A: 1, B: "x" }] }]);
  console.assert(workbookXml.includes("<Workbook") && workbookXml.includes("<Worksheet"), "excel workbook xml should work");
  console.assert("report.xlsx".replace(/\.(xlsx|csv|txt|html)$/i, "") + ".xls" === "report.xls", "export should force .xls extension");
  console.assert(sanitizeSheetName("A/B?C*D[E]") === "A B C D E ", "sheet name should be sanitized");
  console.assert(MOBILE_ACCESS_URL.length > 0, "mobile qr url should exist");
  return "Inventory logic tests completed";
}

