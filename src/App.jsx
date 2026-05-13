import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { BrowserMultiFormatReader } from "@zxing/browser";

const CACHE_KEY = "chom_inventory_cloud_cache_v1";

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const supabaseUrl = env.VITE_SUPABASE_URL || "https://muxncjzytiyjgmklneqz.supabase.co";
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eG5janp5dGl5amdta2xuZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzA0MjgsImV4cCI6MjA5NDE0NjQyOH0.aJuUridHj-wm3wekwK0GCQjWkgROssMPK7iNJPMtex4";
const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = supabaseReady ? createClient(supabaseUrl, supabaseAnonKey) : null;

const initialItems = [
  { id: "FRS-001", sku: "FRS-001", name: "นมสด", group: "ของสด", unit: "ลิตร", onHand: 4, minStock: 5, maxStock: 20, unitCost: 50, supplier: "Local Dairy", barcode: "8850001000042" },
  { id: "DRY-003", sku: "DRY-003", name: "ชาใต้", group: "ของแห้ง", unit: "กก.", onHand: 0.8, minStock: 1, maxStock: 5, unitCost: 200, supplier: "Chiang Rai Tea", barcode: "8850001000035" },
  { id: "DRY-004", sku: "DRY-004", name: "น้ำตาลทราย", group: "ของแห้ง", unit: "กก.", onHand: 20, minStock: 5, maxStock: 30, unitCost: 21, supplier: "KSL Sugar", barcode: "8850001000059" },
  { id: "BAR-001", sku: "BAR-001", name: "กาแฟอาราบิก้า", group: "บาร์", unit: "กก.", onHand: 5.2, minStock: 2, maxStock: 10, unitCost: 300, supplier: "Beanery Coffee", barcode: "8850001000011" },
];

const movementTypes = [
  { type: "รับเข้า", dbType: "in", color: "green", icon: "+" },
  { type: "เบิกออก", dbType: "out", color: "blue", icon: "−" },
  { type: "โยกย้าย", dbType: "transfer", color: "orange", icon: "⇄" },
  { type: "ของเสีย", dbType: "damage", color: "red", icon: "!" },
];

const dbTypeToThai = {
  in: "รับเข้า",
  out: "เบิกออก",
  transfer: "โยกย้าย",
  damage: "ของเสีย",
};

const thaiToDbType = {
  รับเข้า: "in",
  เบิกออก: "out",
  โยกย้าย: "transfer",
  ของเสีย: "damage",
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function todayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function timeNow() {
  return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function money(value) {
  return safeNumber(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache is optional.
  }
}

function normalizeItem(row) {
  return {
    id: row.id ?? row.sku,
    sku: row.sku || "",
    barcode: row.barcode || "",
    name: row.name || row.item_name || "",
    group: row.stock_group || row.group || row.group_name || row.category || "อื่นๆ",
    unit: row.unit || "หน่วย",
    onHand: safeNumber(row.on_hand ?? row.onHand),
    minStock: safeNumber(row.min_stock ?? row.minStock),
    maxStock: safeNumber(row.max_stock ?? row.maxStock),
    unitCost: safeNumber(row.unit_cost ?? row.unitCost),
    supplier: row.supplier_name || row.supplier || "-",
  };
}

function normalizeMovement(row) {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const typeThai = dbTypeToThai[row.type] || row.type || "รับเข้า";
  return {
    id: row.id || `M-${Date.now()}`,
    date: row.date_key || row.date || todayKey(createdAt),
    month: row.month_key || monthKey(createdAt),
    time: row.time || createdAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    type: typeThai,
    dbType: row.type || thaiToDbType[typeThai] || "in",
    sku: row.sku || "",
    item: row.item_name || row.item || "",
    qty: safeNumber(row.qty),
    unit: row.unit || "หน่วย",
    staff: row.staff || "ไม่ระบุ",
    dept: row.department || row.dept || row.to_department || "-",
    totalValue: safeNumber(row.total_value ?? row.totalValue),
    synced: true,
    note: row.note || "",
    createdAt: row.created_at || createdAt.toISOString(),
  };
}

function itemToDb(item) {
  return {
    sku: item.sku,
    barcode: item.barcode || "",
    name: item.name,
    stock_group: item.group || "อื่นๆ",
    category: item.group || "อื่นๆ",
    unit: item.unit || "หน่วย",
    on_hand: safeNumber(item.onHand),
    min_stock: safeNumber(item.minStock),
    max_stock: safeNumber(item.maxStock),
    unit_cost: safeNumber(item.unitCost),
    supplier_name: item.supplier || "",
  };
}

function createInitialState() {
  const cached = readCache();
  return {
    deviceMode: cached?.deviceMode || "mobile",
    currentUser: cached?.currentUser || "Store",
    items: Array.isArray(cached?.items) && cached.items.length ? cached.items : initialItems,
    movements: Array.isArray(cached?.movements) ? cached.movements : [],
    lastSavedAt: cached?.lastSavedAt || "-",
    cloudStatus: "กำลังเชื่อมต่อ",
    error: "",
    loading: true,
  };
}

function getColorClass(color) {
  const map = {
    green: "bg-green-100 text-green-700 border-green-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return map[color] || "bg-gray-100 text-gray-700 border-gray-200";
}

function getSolidColorClass(type) {
  const map = {
    รับเข้า: "bg-green-500",
    เบิกออก: "bg-blue-500",
    โยกย้าย: "bg-orange-500",
    ของเสีย: "bg-rose-500",
  };
  return map[type] || "bg-gray-500";
}

function getTypeMeta(type) {
  return movementTypes.find((row) => row.type === type || row.dbType === type) || movementTypes[0];
}

function applyStock(items, movement) {
  return items.map((item) => {
    if (item.sku !== movement.sku) return item;
    const qty = safeNumber(movement.qty);
    if (movement.type === "รับเข้า") return { ...item, onHand: safeNumber(item.onHand) + qty };
    if (["เบิกออก", "ของเสีย"].includes(movement.type)) return { ...item, onHand: Math.max(0, safeNumber(item.onHand) - qty) };
    return item;
  });
}

function calculateSummary(movements, selectedDate = todayKey()) {
  return movementTypes.map((meta) => {
    const rows = movements.filter((row) => row.date === selectedDate && row.type === meta.type);
    return {
      ...meta,
      count: rows.length,
      qty: rows.reduce((sum, row) => sum + safeNumber(row.qty), 0),
      unit: "หน่วย",
    };
  });
}

function runTests(state) {
  const tests = [];
  tests.push({ name: "มีรายการสินค้าใน Cloud/Cache", passed: Array.isArray(state.items) && state.items.length > 0 });
  tests.push({ name: "Stock ไม่ติดลบ", passed: state.items.every((item) => safeNumber(item.onHand) >= 0) });
  tests.push({ name: "Movement มีวันที่และผู้ทำรายการ", passed: state.movements.every((row) => row.date && row.time && row.staff) });
  tests.push({ name: "รองรับ Master/Mobile Mode", passed: ["master", "mobile"].includes(state.deviceMode) });
  tests.push({ name: "Supabase URL พร้อม", passed: Boolean(supabaseUrl) });
  tests.push({ name: "Supabase anon key พร้อม", passed: Boolean(supabaseAnonKey) });
  tests.push({ name: "Supabase client พร้อม", passed: Boolean(supabase) });
  return tests;
}

async function fetchCloudState() {
  if (!supabase) {
    return { items: initialItems, movements: [] };
  }

  const [itemsResult, movementsResult] = await Promise.all([
    supabase.from("items").select("*").order("name", { ascending: true }),
    supabase.from("movement_logs").select("*").order("created_at", { ascending: false }).limit(300),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (movementsResult.error) throw movementsResult.error;

  return {
    items: (itemsResult.data || []).map(normalizeItem),
    movements: (movementsResult.data || []).map(normalizeMovement),
  };
}

async function seedItemsIfEmpty() {
  if (!supabase) return;

  const { data, error } = await supabase.from("items").select("id").limit(1);
  if (error) throw error;
  if (data && data.length > 0) return;

  const { error: insertError } = await supabase.from("items").insert(initialItems.map(itemToDb));
  if (insertError) throw insertError;
}

async function updateCloudStock(item, movement) {
  if (!supabase) return safeNumber(item.onHand);

  const qty = safeNumber(movement.qty);
  let nextOnHand = safeNumber(item.onHand);
  if (movement.type === "รับเข้า") nextOnHand += qty;
  if (["เบิกออก", "ของเสีย"].includes(movement.type)) nextOnHand = Math.max(0, nextOnHand - qty);

  const { error } = await supabase
    .from("items")
    .update({ on_hand: nextOnHand })
    .eq("sku", item.sku);

  if (error) throw error;
  return nextOnHand;
}

async function insertCloudMovement(item, movement) {
  if (!supabase) return;

  const payload = {
    sku: item.sku,
    item_name: item.name,
    type: thaiToDbType[movement.type] || "in",
    qty: safeNumber(movement.qty),
    unit: item.unit,
    unit_cost: safeNumber(item.unitCost),
    total_value: safeNumber(movement.qty) * safeNumber(item.unitCost),
    staff: movement.staff || "ไม่ระบุ",
    department: movement.dept || "ไม่ระบุ",
    note: movement.note || "",
    date_key: todayKey(),
    month_key: monthKey(),
  };

  const { error } = await supabase.from("movement_logs").insert(payload);
  if (error) throw error;
}

function downloadCsv(filename, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = safeRows.length ? Object.keys(safeRows[0]) : ["ไม่มีข้อมูล"];
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...safeRows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Header({ state, updateState, setScreen, reloadCloud }) {
  const isMaster = state.deviceMode === "master";
  return (
    <div className="bg-[#102918] px-5 pb-4 pt-4 text-white">
      <div className="mb-3 flex items-center justify-between text-xs text-white/80">
        <span>{timeNow()}</span>
        <button type="button" onClick={reloadCloud} className="rounded-full bg-white/10 px-2 py-1 text-[11px]">↻ Sync</button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60">CHOM CAFE</p>
          <h1 className="text-xl font-black tracking-wide">Inventory Mobile</h1>
          <p className="mt-1 text-xs text-white/70">{isMaster ? "Master เครื่องหลัก" : "Mobile Station"} · {state.cloudStatus}</p>
        </div>
        <button
          type="button"
          onClick={() => setScreen("settings")}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#72d88d] text-2xl text-[#102918] shadow-[0_0_24px_rgba(114,216,141,0.45)]"
        >
          📦
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => updateState({ deviceMode: "master" })}
          className={`rounded-xl py-2 ${state.deviceMode === "master" ? "bg-white text-[#102918]" : "text-white/70"}`}
        >
          Master
        </button>
        <button
          type="button"
          onClick={() => updateState({ deviceMode: "mobile" })}
          className={`rounded-xl py-2 ${state.deviceMode === "mobile" ? "bg-white text-[#102918]" : "text-white/70"}`}
        >
          Mobile
        </button>
      </div>
    </div>
  );
}

function SearchPanel({ items, searchText, setSearchText, onOpenItem }) {
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return items.slice(0, 3);
    return items.filter((item) => `${item.sku} ${item.barcode} ${item.name} ${item.group}`.toLowerCase().includes(keyword));
  }, [items, searchText]);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-black">ค้นหาวัตถุดิบ</h2>
        <span className="rounded-full bg-[#eef8ed] px-3 py-1 text-xs font-bold text-[#17662f]">{filteredItems.length} รายการ</span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-3 text-gray-500 focus-within:ring-2 focus-within:ring-[#9bc79e]">
        <span aria-hidden="true">🔎</span>
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="ค้นหาชื่อสินค้า / SKU / บาร์โค้ด"
          className="w-full bg-transparent text-sm text-[#172416] outline-none"
        />
        <span aria-hidden="true" className="text-lg">▣</span>
      </div>
      {searchText.trim() && (
        <div className="mt-3 space-y-2">
          {filteredItems.map((item) => {
            const isLow = safeNumber(item.onHand) <= safeNumber(item.minStock);
            return (
              <button
                type="button"
                key={item.sku}
                onClick={() => onOpenItem(item)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.99] ${isLow ? "border-red-100 bg-red-50" : "border-transparent bg-[#f7f4ee]"}`}
              >
                <div>
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku} · {item.group}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${isLow ? "text-red-600" : "text-[#17662f]"}`}>{item.onHand} {item.unit}</p>
                  <p className="text-xs text-gray-500">›</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ row, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(row.type)}
      className={`group relative overflow-hidden rounded-[24px] border p-4 text-left shadow-sm transition-all duration-300 active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${getColorClass(row.color)}`}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_65%)]" />
      <div className="relative flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-black text-white ${getSolidColorClass(row.type)}`}>{row.icon}</span>
        <span className="text-xl">›</span>
      </div>
      <p className="relative mt-2 text-sm font-black">{row.type}</p>
      <p className="relative mt-1 text-2xl font-black">{row.count}</p>
      <p className="relative text-xs font-bold opacity-80">รายการ</p>
    </button>
  );
}

function HomeScreen({ state, setScreen, setSelectedType, setSelectedItem, searchText, setSearchText }) {
  const summary = calculateSummary(state.movements);
  const lowItems = state.items.filter((item) => safeNumber(item.onHand) <= safeNumber(item.minStock)).slice(0, 3);

  function openMovement(type) {
    setSelectedType(type);
    setScreen("movement");
  }

  return (
    <div className="space-y-4 p-4">
      {state.error && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</div>}
      {state.loading && <div className="rounded-2xl bg-white p-3 text-sm text-gray-500 shadow-sm">กำลังโหลดข้อมูลจาก Supabase...</div>}

      <button type="button" onClick={() => setScreen("login")} className="flex w-full items-center justify-between rounded-[28px] bg-white p-4 text-left shadow-sm transition active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef8ed] text-xl text-[#17662f]">👤</div>
          <div>
            <p className="text-sm font-bold">{state.currentUser}</p>
            <p className="text-xs text-gray-500">ออนไลน์ · Cloud Sync พร้อมใช้งาน</p>
          </div>
        </div>
        <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,.8)]" />
      </button>

      <SearchPanel items={state.items} searchText={searchText} setSearchText={setSearchText} onOpenItem={(item) => { setSelectedItem(item); setScreen("item"); }} />

      <section className="rounded-[28px] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-black">Movement วันนี้</h2>
            <p className="text-xs text-gray-500">กดคอลัมน์เพื่อเข้าไปดูแต่ละหน้า</p>
          </div>
          <button type="button" onClick={() => openMovement("ทั้งหมด")} className="rounded-full bg-[#eef8ed] px-3 py-1.5 text-xs font-bold text-[#17662f]">ทั้งหมด</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {summary.map((row) => <SummaryCard key={row.type} row={row} onClick={openMovement} />)}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black">วัตถุดิบใกล้หมด</h2>
            <p className="text-xs text-gray-500">รายการที่ควรตรวจสอบก่อนสั่งซื้อ</p>
          </div>
          <button type="button" onClick={() => setScreen("stock")} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">ดูทั้งหมด</button>
        </div>
        <div className="mt-3 divide-y rounded-2xl border">
          {lowItems.length === 0 && <div className="p-3 text-sm text-gray-500">ยังไม่มีวัตถุดิบใกล้หมด</div>}
          {lowItems.map((item) => (
            <button key={item.sku} type="button" onClick={() => { setSelectedItem(item); setScreen("item"); }} className="flex w-full items-center justify-between p-3 text-left transition active:scale-[0.99]">
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-xs text-gray-500">คงเหลือ {item.onHand} {item.unit} / Min {item.minStock}</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">ต่ำ ›</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setScreen("form")} className="rounded-2xl bg-[#17662f] py-3 text-sm font-black text-white shadow-sm">+ ทำรายการ</button>
        <button type="button" onClick={() => setScreen("stock")} className="rounded-2xl bg-white py-3 text-sm font-bold shadow-sm">สินค้า</button>
        <button type="button" onClick={() => setScreen("settings")} className="rounded-2xl bg-white py-3 text-sm font-bold shadow-sm">ตั้งค่า</button>
      </div>
    </div>
  );
}

function MovementScreen({ state, selectedType, setSelectedType, setScreen }) {
  const summary = calculateSummary(state.movements);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState(selectedType || "ทั้งหมด");

  const visibleRows = useMemo(() => {
    return state.movements.filter((row) => {
      const typeMatch = filter === "ทั้งหมด" || row.type === filter;
      const text = `${row.type} ${row.item} ${row.staff} ${row.dept} ${row.sku}`.toLowerCase();
      return typeMatch && (!keyword.trim() || text.includes(keyword.trim().toLowerCase()));
    });
  }, [state.movements, filter, keyword]);

  return (
    <div className="min-h-[760px] bg-[#f8f5ee]">
      <div className="bg-[#102918] px-5 pb-7 pt-5 text-white">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => setScreen("home")} className="text-3xl leading-none">‹</button>
          <div className="text-center">
            <h1 className="text-xl font-black">Movement วันนี้</h1>
            <p className="text-sm text-white/75">ข้อมูลจาก Supabase Cloud</p>
          </div>
          <button type="button" className="text-xl">📅</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {summary.map((row) => (
            <button key={row.type} type="button" onClick={() => { setFilter(row.type); setSelectedType(row.type); }} className={`rounded-2xl border p-2 text-center text-xs font-bold ${filter === row.type ? getColorClass(row.color) : "border-white/15 bg-white/10 text-white"}`}>
              <p>{row.type}</p>
              <p className="mt-1">{row.count}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="-mt-4 space-y-4 p-4">
        <div className="rounded-[28px] bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border px-3 py-3 text-gray-500">
              <span>🔎</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="ค้นหาในรายการนี้..." className="w-full bg-transparent text-sm outline-none" />
            </div>
            <button type="button" onClick={() => setFilter("ทั้งหมด")} className="rounded-2xl border px-3 text-sm font-bold">ทั้งหมด</button>
          </div>
        </div>

        <div className="space-y-3">
          {visibleRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[52px_1fr] gap-3">
              <div className="pt-5 text-right text-sm font-bold text-gray-600">{row.time}</div>
              <button type="button" className="group relative overflow-hidden flex items-center justify-between rounded-[24px] border bg-white p-4 text-left shadow-sm transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-black text-white ${getSolidColorClass(row.type)}`}>{getTypeMeta(row.type).icon}</span>
                  <div>
                    <p className="font-black">{row.type} - {row.item}</p>
                    <p className="text-sm text-gray-600">{row.qty} {row.unit} · {row.dept}</p>
                    <p className="mt-1 text-xs text-gray-500">โดย: {row.staff} · {row.synced ? "Sync แล้ว" : "รอ Sync"}</p>
                  </div>
                </div>
                <span className="text-2xl text-gray-300">›</span>
              </button>
            </div>
          ))}
          {visibleRows.length === 0 && <div className="rounded-2xl bg-white p-4 text-center text-sm text-gray-500 shadow-sm">ยังไม่มีรายการ</div>}
        </div>
      </div>
    </div>
  );
}

function getMobilePlatform() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}

function BarcodeScanner({ items, onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState("กำลังเปิดกล้อง...");
  const [platform] = useState(getMobilePlatform);
  const [scannerMode, setScannerMode] = useState("zxing");

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    function stopCamera() {
      try {
        if (controlsRef.current?.stop) controlsRef.current.stop();
      } catch {
        // Optional cleanup.
      }
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Optional cleanup.
      }
    }

    function completeScan(code) {
      const cleanCode = String(code || "").trim();
      if (!cleanCode || detectedRef.current) return;
      detectedRef.current = true;
      stopCamera();
      onDetected(cleanCode);
    }

    async function startZxingScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerMode("manual");
          setStatus("เครื่องนี้ไม่รองรับการเปิดกล้องจาก Browser ใช้ช่องกรอกรหัสแทน");
          return;
        }

        if (!window.isSecureContext && window.location.hostname !== "localhost") {
          setScannerMode("manual");
          setStatus("มือถือบล็อกกล้อง เพราะลิงก์ไม่ใช่ HTTPS ให้เปิดผ่าน Vercel HTTPS หรือกรอกรหัสแทน");
          return;
        }

        setScannerMode("zxing");
        setStatus("กำลังเปิดกล้อง ZXing...");

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (cancelled || !result) return;
            const code = typeof result.getText === "function" ? result.getText() : result.text;
            completeScan(code);
          }
        );

        controlsRef.current = controls;
        setStatus("พร้อมสแกน · ใช้ได้ทั้ง iOS และ Android");
      } catch (zxingError) {
        setStatus(`ZXing เปิดไม่ได้: ${zxingError.message || "ลองอนุญาตกล้อง หรือใช้ช่องกรอกรหัส"}`);
        await startNativeScanner();
      }
    }

    async function startNativeScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerMode("manual");
          setStatus("เครื่องนี้ไม่รองรับการเปิดกล้องจาก Browser ใช้ช่องกรอกรหัสแทน");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          await videoRef.current.play();
        }

        if (!("BarcodeDetector" in window)) {
          setScannerMode("manual");
          setStatus(platform === "ios" ? "iPhone ต้องเปิดผ่าน HTTPS และใช้ ZXing หากยังไม่ได้ ให้กรอกรหัสแทน" : "Browser นี้ไม่รองรับ BarcodeDetector ใช้ช่องกรอกรหัสแทน");
          return;
        }

        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"] });
        setScannerMode("native");
        setStatus("พร้อมสแกน · เล็ง Barcode ให้อยู่กลางกรอบ");

        const scanLoop = async () => {
          if (cancelled || !videoRef.current || detectedRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) completeScan(codes[0].rawValue);
          } catch {
            // Continue scanning.
          }
          timer = window.setTimeout(scanLoop, 300);
        };

        scanLoop();
      } catch (error) {
        setScannerMode("manual");
        setStatus(`เปิดกล้องไม่ได้: ${error.message || "กรุณาอนุญาตกล้อง"}`);
      }
    }

    startZxingScanner();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stopCamera();
    };
  }, [onDetected, platform]);

  function submitManualCode() {
    const code = manualCode.trim();
    if (!code) return;
    onDetected(code);
  }

  const platformLabel = platform === "ios" ? "iOS / iPhone" : platform === "android" ? "Android" : "Desktop / Other";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full rounded-[32px] bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">สแกน Barcode รับเข้าสินค้า</h2>
            <p className="text-xs text-gray-500">{platformLabel} · {scannerMode.toUpperCase()} · ส่งข้อมูลเข้า Master</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">ปิด</button>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-4 border-[#17662f] bg-black">
          <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_24px_rgba(255,255,255,.35)]" />
          <div className="pointer-events-none absolute inset-x-12 top-1/2 h-0.5 -translate-y-1/2 bg-green-400 shadow-[0_0_16px_rgba(74,222,128,.9)]" />
        </div>

        <p className="mt-3 rounded-2xl bg-[#eef8ed] px-3 py-2 text-center text-xs font-bold text-[#17662f]">{status}</p>

        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <b>สำคัญ:</b> iPhone/Android ต้องเปิดเว็บผ่าน HTTPS เช่น Vercel URL เท่านั้น ถ้าเปิดด้วย http://192.168.x.x กล้องมักถูกบล็อก
        </div>

        <div className="mt-4 rounded-2xl border p-3">
          <p className="mb-2 text-xs font-bold text-gray-500">กรอกรหัสแทนการสแกน / ใช้ได้ทุกเครื่อง</p>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Barcode / SKU"
              inputMode="text"
              autoCapitalize="none"
              className="min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#9bc79e]"
            />
            <button type="button" onClick={submitManualCode} className="rounded-xl bg-[#17662f] px-4 text-sm font-black text-white">ใช้รหัส</button>
          </div>
        </div>

        <div className="mt-3 max-h-32 overflow-auto rounded-2xl bg-[#f7f4ee] p-3 text-xs text-gray-600">
          <b>ตัวอย่างในระบบ:</b> {items.slice(0, 4).map((item) => item.barcode || item.sku).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function FormScreen({ state, saveMovement, selectedType, setScreen }) {
  const [type, setType] = useState(selectedType === "ทั้งหมด" ? "รับเข้า" : selectedType);
  const [sku, setSku] = useState(state.items[0]?.sku || "");
  const [qty, setQty] = useState("");
  const [staff, setStaff] = useState(state.currentUser);
  const [dept, setDept] = useState("Store");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const selectedItem = state.items.find((item) => item.sku === sku);

  function handleBarcodeDetected(code) {
    const found = state.items.find((item) => String(item.barcode || "").trim() === code || String(item.sku || "").trim() === code);
    if (!found) {
      setScanNotice(`ไม่พบสินค้าใน Master จากรหัส: ${code}`);
      return;
    }
    setSku(found.sku);
    setType("รับเข้า");
    setScannerOpen(false);
    setScanNotice(`พบสินค้า: ${found.name} (${found.sku})`);
  }

  async function handleSave() {
    if (!selectedItem || safeNumber(qty) <= 0 || saving) return;
    setSaving(true);
    const ok = await saveMovement({
      type,
      sku: selectedItem.sku,
      qty: safeNumber(qty),
      staff: staff || "ไม่ระบุ",
      dept: dept || "ไม่ระบุ",
      note,
    });
    setSaving(false);
    if (ok) setScreen("movement");
  }

  return (
    <div className="min-h-[760px] bg-[#f8f5ee]">
      <div className="bg-[#102918] px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setScreen("home")} className="text-3xl leading-none">‹</button>
          <h1 className="text-xl font-black">ทำรายการ</h1>
          <span className="w-7" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-[28px] bg-white p-4 shadow-sm">
          <button type="button" onClick={() => setScannerOpen(true)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17662f] py-4 font-black text-white"><span className="text-2xl">▣</span> สแกน Barcode รับเข้าสินค้า</button>
          {scanNotice && <p className="mb-3 rounded-xl bg-[#eef8ed] px-3 py-2 text-xs font-bold text-[#17662f]">{scanNotice}</p>}
          <label className="text-xs font-bold text-gray-500">ประเภท</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]">
            {movementTypes.map((row) => <option key={row.type} value={row.type}>{row.type}</option>)}
          </select>
          <label className="mt-3 block text-xs font-bold text-gray-500">สินค้า</label>
          <select value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]">
            {state.items.map((item) => <option key={item.sku} value={item.sku}>{item.name} ({item.sku})</option>)}
          </select>
          {selectedItem && <p className="mt-2 rounded-xl bg-[#eef8ed] px-3 py-2 text-xs text-[#17662f]">คงเหลือปัจจุบัน {selectedItem.onHand} {selectedItem.unit}</p>}
          <label className="mt-3 block text-xs font-bold text-gray-500">จำนวน</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]" placeholder="ใส่จำนวน" />
          <label className="mt-3 block text-xs font-bold text-gray-500">ผู้ทำรายการ</label>
          <input value={staff} onChange={(e) => setStaff(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]" />
          <label className="mt-3 block text-xs font-bold text-gray-500">แผนก / จุดใช้งาน</label>
          <input value={dept} onChange={(e) => setDept(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]" placeholder="เช่น บาร์ / ครัวหลัก" />
          <label className="mt-3 block text-xs font-bold text-gray-500">หมายเหตุ</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]" placeholder="ไม่บังคับ" />
          <button type="button" onClick={handleSave} disabled={saving} className="mt-4 w-full rounded-2xl bg-[#102918] py-4 font-black text-white disabled:opacity-60">{saving ? "กำลังบันทึก..." : "บันทึกรายการ"}</button>
        </div>
              {scannerOpen && (
          <BarcodeScanner
            items={state.items}
            onDetected={handleBarcodeDetected}
            onClose={() => setScannerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ItemScreen({ item, setScreen }) {
  if (!item) return null;
  const isLow = safeNumber(item.onHand) <= safeNumber(item.minStock);
  return (
    <div className="min-h-[760px] bg-[#f8f5ee]">
      <div className="bg-[#102918] px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setScreen("home")} className="text-3xl leading-none">‹</button>
          <h1 className="text-xl font-black">รายละเอียดสินค้า</h1>
          <span className="w-7" />
        </div>
      </div>
      <div className="p-4">
        <div className="rounded-[28px] bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">{item.sku} · {item.group}</p>
          <h2 className="mt-1 text-2xl font-black">{item.name}</h2>
          <div className={`mt-4 rounded-2xl p-4 ${isLow ? "bg-red-50 text-red-700" : "bg-[#eef8ed] text-[#17662f]"}`}>
            <p className="text-xs font-bold">คงเหลือ</p>
            <p className="text-3xl font-black">{item.onHand} {item.unit}</p>
            <p className="text-sm">Min: {item.minStock} {item.unit}</p>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f7f4ee] p-4 text-sm">
            <p>Supplier: <b>{item.supplier}</b></p>
            <p>ต้นทุนต่อหน่วย: <b>{money(item.unitCost)} บาท</b></p>
            <p>มูลค่าคงเหลือ: <b>{money(safeNumber(item.onHand) * safeNumber(item.unitCost))} บาท</b></p>
          </div>
          <button type="button" onClick={() => setScreen("form")} className="mt-4 w-full rounded-2xl bg-[#17662f] py-4 font-black text-white">ทำรายการสินค้านี้</button>
        </div>
      </div>
    </div>
  );
}

function StockScreen({ state, setScreen, setSelectedItem }) {
  return (
    <div className="min-h-[760px] bg-[#f8f5ee]">
      <div className="bg-[#102918] px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setScreen("home")} className="text-3xl leading-none">‹</button>
          <h1 className="text-xl font-black">สินค้า Master</h1>
          <span className="w-7" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        {state.items.map((item) => (
          <button key={item.sku} type="button" onClick={() => { setSelectedItem(item); setScreen("item"); }} className="flex w-full items-center justify-between rounded-[24px] bg-white p-4 text-left shadow-sm transition active:scale-[0.99]">
            <div>
              <p className="font-black">{item.name}</p>
              <p className="text-xs text-gray-500">{item.sku} · {item.group}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-[#17662f]">{item.onHand} {item.unit}</p>
              <p className="text-xs text-gray-500">›</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen({ state, updateState, setScreen, reloadCloud }) {
  const tests = runTests(state);
  const passedCount = tests.filter((test) => test.passed).length;

  function exportStock() {
    downloadCsv(`chom-stock-${todayKey()}.csv`, state.items.map((item) => ({
      SKU: item.sku,
      ชื่อสินค้า: item.name,
      กลุ่ม: item.group,
      คงเหลือ: item.onHand,
      หน่วย: item.unit,
      Min: item.minStock,
      Max: item.maxStock,
      ต้นทุนต่อหน่วย: item.unitCost,
      มูลค่าคงเหลือ: safeNumber(item.onHand) * safeNumber(item.unitCost),
      Supplier: item.supplier,
    })));
  }

  function exportMovement() {
    downloadCsv(`chom-movement-${todayKey()}.csv`, state.movements.map((row) => ({
      วันที่: row.date,
      เวลา: row.time,
      ประเภท: row.type,
      SKU: row.sku,
      รายการ: row.item,
      จำนวน: row.qty,
      หน่วย: row.unit,
      ผู้ทำรายการ: row.staff,
      แผนก: row.dept,
      มูลค่า: row.totalValue,
      สถานะ: row.synced ? "Sync แล้ว" : "รอ Sync",
    })));
  }

  return (
    <div className="min-h-[760px] bg-[#f8f5ee]">
      <div className="bg-[#102918] px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setScreen("home")} className="text-3xl leading-none">‹</button>
          <h1 className="text-xl font-black">ตั้งค่า Cloud</h1>
          <span className="w-7" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-[28px] bg-white p-4 shadow-sm">
          <h2 className="font-black">Supabase Cloud Sync</h2>
          <p className="mt-1 text-sm text-gray-600">ข้อมูลหลักบันทึกใน Supabase ใช้ได้ทั้งมือถือและคอม</p>
          <p className="mt-2 rounded-xl bg-[#eef8ed] px-3 py-2 text-xs text-[#17662f]">สถานะ: {state.cloudStatus} · อัปเดตล่าสุด: {state.lastSavedAt || "-"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={reloadCloud} className="rounded-2xl bg-[#17662f] py-3 text-sm font-black text-white">Reload Cloud</button>
            <button type="button" onClick={() => updateState({ deviceMode: state.deviceMode === "master" ? "mobile" : "master" })} className="rounded-2xl bg-gray-100 py-3 text-sm font-bold">Switch Mode</button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-4 shadow-sm">
          <h2 className="font-black">Export ใช้กับ Excel</h2>
          <p className="mt-1 text-sm text-gray-600">ดาวน์โหลดเป็น CSV เปิดด้วย Excel หรือ Google Sheet ได้ทันที</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={exportStock} className="rounded-2xl bg-white py-3 text-sm font-bold shadow-sm">Export Stock</button>
            <button type="button" onClick={exportMovement} className="rounded-2xl bg-white py-3 text-sm font-bold shadow-sm">Export Movement</button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black">System Tests</h2>
            <span className="rounded-full bg-[#eef8ed] px-3 py-1 text-xs font-bold text-[#17662f]">{passedCount}/{tests.length} ผ่าน</span>
          </div>
          <div className="space-y-2">
            {tests.map((test) => (
              <div key={test.name} className="flex items-center justify-between rounded-2xl bg-[#f7f4ee] px-3 py-2 text-xs">
                <span>{test.name}</span>
                <span className={test.passed ? "font-bold text-green-600" : "font-bold text-red-600"}>{test.passed ? "PASS" : "FAIL"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ state, updateState, setScreen }) {
  const [name, setName] = useState(state.currentUser || "");
  return (
    <div className="min-h-[760px] bg-[#102918] p-5 text-white">
      <div className="pt-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#72d88d] text-4xl text-[#102918]">📦</div>
        <p className="mt-5 text-xs tracking-widest text-white/70">CHOM CAFE</p>
        <h1 className="text-2xl font-black">Inventory Mobile</h1>
      </div>
      <div className="mt-10 rounded-[32px] bg-white p-5 text-[#172416] shadow-2xl">
        <h2 className="text-center text-xl font-black">เข้าสู่ระบบ</h2>
        <p className="mt-1 text-center text-sm text-gray-500">เลือกชื่อผู้ใช้สำหรับบันทึกรายการ</p>
        <label className="mt-5 block text-xs font-bold text-gray-500">ชื่อผู้ใช้งาน</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-[#9bc79e]" placeholder="เช่น พี่เอ / Store" />
        <button type="button" onClick={() => { updateState({ currentUser: name || "Store" }); setScreen("home"); }} className="mt-5 w-full rounded-2xl bg-[#17662f] py-4 font-black text-white">เข้าสู่ระบบ</button>
        <button type="button" onClick={() => setScreen("home")} className="mt-2 w-full rounded-2xl bg-gray-100 py-3 text-sm font-bold">กลับหน้าแรก</button>
      </div>
    </div>
  );
}

export default function ChomInventoryMobilePreview() {
  const [state, setState] = useState(createInitialState);
  const [screen, setScreen] = useState("home");
  const [selectedType, setSelectedType] = useState("ทั้งหมด");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchText, setSearchText] = useState("");

  function persist(next) {
    writeCache(next);
    return next;
  }

  function updateState(patch) {
    setState((current) => persist({ ...current, ...patch, lastSavedAt: new Date().toLocaleString("th-TH") }));
  }

  async function reloadCloud() {
    setState((current) => ({ ...current, loading: true, cloudStatus: "กำลัง Sync", error: "" }));
    try {
      await seedItemsIfEmpty();
      const cloud = await fetchCloudState();
      setState((current) => persist({
        ...current,
        ...cloud,
        loading: false,
        cloudStatus: "Sync แล้ว",
        error: "",
        lastSavedAt: new Date().toLocaleString("th-TH"),
      }));
    } catch (error) {
      setState((current) => persist({
        ...current,
        loading: false,
        cloudStatus: "ใช้ Cache ชั่วคราว",
        error: `เชื่อม Supabase ไม่สำเร็จ: ${error.message || "ตรวจสอบ Table / RLS / ENV"}`,
      }));
    }
  }

  async function saveMovement(movementInput) {
    const item = state.items.find((row) => row.sku === movementInput.sku);
    if (!item) return false;

    const movement = {
      id: `LOCAL-${Date.now()}`,
      date: todayKey(),
      month: monthKey(),
      time: timeNow(),
      type: movementInput.type,
      dbType: thaiToDbType[movementInput.type] || "in",
      sku: item.sku,
      item: item.name,
      qty: safeNumber(movementInput.qty),
      unit: item.unit,
      staff: movementInput.staff || state.currentUser || "ไม่ระบุ",
      dept: movementInput.dept || "ไม่ระบุ",
      note: movementInput.note || "",
      totalValue: safeNumber(movementInput.qty) * safeNumber(item.unitCost),
      synced: false,
    };

    const optimisticItems = applyStock(state.items, movement);
    setState((current) => persist({
      ...current,
      items: optimisticItems,
      movements: [movement, ...current.movements],
      cloudStatus: "กำลังบันทึก",
      error: "",
    }));

    try {
      await updateCloudStock(item, movement);
      await insertCloudMovement(item, movement);
      await reloadCloud();
      return true;
    } catch (error) {
      setState((current) => persist({
        ...current,
        cloudStatus: "บันทึกไม่สำเร็จ",
        error: `บันทึก Supabase ไม่สำเร็จ: ${error.message || "ตรวจสอบ RLS policy"}`,
      }));
      return false;
    }
  }

  useEffect(() => {
    reloadCloud();
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel("chom-inventory-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, reloadCloud)
      .on("postgres_changes", { event: "*", schema: "public", table: "movement_logs" }, reloadCloud)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#efe9dd] p-4 text-[#172416]">
      <div className="relative mx-auto max-w-[390px] overflow-hidden rounded-[42px] border-[10px] border-[#102918] bg-[#f8f5ee] shadow-2xl">
        {screen === "home" && (
          <>
            <Header state={state} updateState={updateState} setScreen={setScreen} reloadCloud={reloadCloud} />
            <HomeScreen state={state} setScreen={setScreen} setSelectedType={setSelectedType} setSelectedItem={setSelectedItem} searchText={searchText} setSearchText={setSearchText} />
          </>
        )}
        {screen === "movement" && <MovementScreen state={state} selectedType={selectedType} setSelectedType={setSelectedType} setScreen={setScreen} />}
        {screen === "form" && <FormScreen state={state} saveMovement={saveMovement} selectedType={selectedType} setScreen={setScreen} />}
        {screen === "item" && <ItemScreen item={selectedItem} setScreen={setScreen} />}
        {screen === "stock" && <StockScreen state={state} setScreen={setScreen} setSelectedItem={setSelectedItem} />}
        {screen === "settings" && <SettingsScreen state={state} updateState={updateState} setScreen={setScreen} reloadCloud={reloadCloud} />}
        {screen === "login" && <LoginScreen state={state} updateState={updateState} setScreen={setScreen} />}
      </div>
    </div>
  );
}
