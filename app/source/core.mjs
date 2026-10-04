export const PROJECT = "TENYEAR_SALON_10";
export const VERSION = "P2.0.0";
export const STORE_KEY = "es_solos_p2_database";
export const PREVIOUS_KEY = "es_solos_p2_previous";
export const copy = (x) => JSON.parse(JSON.stringify(x));
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const uid = (prefix = "ID") =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
export const fail = (condition, message) => {
  if (!condition) throw Error(message);
};
export const money = (v, label = "金額", min = 0) => {
  const n = Number(v);
  fail(
    v !== "" &&
      v !== null &&
      v !== undefined &&
      Number.isSafeInteger(n) &&
      n >= min &&
      Math.abs(n) <= 100000000,
    label + "須為有效整數，且不可小於 " + min,
  );
  return n;
};
export const percent = (v, label = "比例") => {
  const n = Number(v);
  fail(
    v !== "" &&
      v !== null &&
      v !== undefined &&
      Number.isFinite(n) &&
      n >= 0 &&
      n <= 100,
    label + "須介於 0～100",
  );
  return n;
};
export const validDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !isNaN(Date.parse(s)) &&
  new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
export const monthOf = (d) => d.slice(0, 7);
export const active = (x) => !x.archived;
export function emptyDB() {
  return {
    project: PROJECT,
    schema: 2,
    walletLedger: [],
    cashLedger: [],
    revision: 0,
    version: VERSION,
    settings: {
      shopName: "10年磨一劍",
      defaultCommission: 50,
      genders: ["男生", "女生", "小孩", "長輩", "其他"],
      classes: ["洗髮", "剪髮", "燙髮", "染髮", "護理"],
      payments: ["現金", "LinePay", "街口", "信用卡", "轉帳"],
      cashPayments: ["現金"],
      vendors: [],
      productTypes: ["洗髮精", "居家保養", "造型品", "其他"],
      customerTags: [{ id: "tag-vip", name: "VIP", color: "#D4AF37" }],
      expenseTypes: ["店內雜支", "租金", "水電", "行銷", "其他"],
    },
    services: [],
    products: [],
    customers: [],
    staff: [],
    records: [],
    movements: [],
    expenses: [],
    payrolls: [],
    audit: [],
  };
}
export function calculateLine(input, staff, settings) {
  const quantity = money(input.quantity ?? 1, "數量", 1),
    unitPrice = money(input.unitPrice ?? input.finalPrice, "成交單價"),
    unitCost = money(input.unitCost ?? input.cost ?? 0, "材料／成本");
  const retail = input.kind === "product";
  const revenue = unitPrice * quantity,
    material = unitCost * quantity;
  const assistMode = input.assistMode || "amount";
  fail(["amount", "percent"].includes(assistMode), "協助費類型錯誤");
  let assistValue =
    assistMode === "percent"
      ? percent(input.assistValue ?? 0, "協助費比例")
      : money(input.assistValue ?? 0, "每件協助費");
  const assistanceBase = revenue - material;
  const assistance =
    !retail && input.assistantId
      ? assistMode === "percent"
        ? Math.round((assistanceBase * assistValue) / 100)
        : assistValue * quantity
      : 0;
  fail(assistance >= 0, "協助費計算為負數，請改用固定金額或核對材料");
  let rate = retail
    ? percent(input.saleCommission ?? 0, "販賣獎金比例")
    : percent(
        staff.commissionType === "個別設定"
          ? staff.commissionValue
          : settings.defaultCommission,
        "設計師比例",
      );
  const actual = retail ? 0 : revenue - material - assistance;
  return {
    ...copy(input),
    quantity,
    unitPrice,
    unitCost,
    revenue,
    material,
    assistMode,
    assistValue,
    assistanceBase,
    assistance,
    rate,
    virtual: retail ? 0 : revenue,
    actual,
    commission: retail ? 0 : Math.round((actual * rate) / 100),
    retailRevenue: retail ? revenue : 0,
    retailBonus: retail ? Math.round(((revenue - material) * rate) / 100) : 0,
    ruleVersion: 1,
  };
}
export function sumLines(lines) {
  return lines.reduce(
    (a, l) => {
      for (const k of [
        "revenue",
        "material",
        "assistance",
        "virtual",
        "actual",
        "commission",
        "retailRevenue",
        "retailBonus",
      ])
        a[k] += l[k] || 0;
      return a;
    },
    {
      revenue: 0,
      material: 0,
      assistance: 0,
      virtual: 0,
      actual: 0,
      commission: 0,
      retailRevenue: 0,
      retailBonus: 0,
    },
  );
}
export const eligible = (r) => r.status !== "void";
export const complete = (r) =>
  r.ruleVersion === 1 && Array.isArray(r.items) && r.items.length > 0;
export function ensureUnlocked(db, date, staffIds = []) {
  fail(
    !db.payrolls.some(
      (p) =>
        p.month === monthOf(date) &&
        p.status !== "draft" &&
        (staffIds.length === 0 || staffIds.includes(p.staffId)),
    ),
    "該月份已有已確認或已付薪資條，請先撤回確認；已付資料不可直接更動",
  );
}
export function checkout(db, form) {
  fail(validDate(form.date), "請選擇有效日期");
  const staff = db.staff.find((s) => s.id === form.staffId && active(s));
  fail(staff, "請先新增並選擇有效設計師");
  fail(db.settings.payments.includes(form.payment), "請選擇有效付款方式");
  fail(
    Array.isArray(form.items) && form.items.length > 0,
    "請先加入服務或商品",
  );
  fail(
    !db.records.some((r) => r.id === form.id),
    "此筆帳單已完成，請勿重複送出",
  );
  const customer = form.customerId
    ? db.customers.find((c) => c.id === form.customerId && active(c))
    : null;
  fail(!form.customerId || customer, "會員已停用或不存在，請重新選取");
  const items = form.items.map((i) => {
    const source = (i.kind === "product" ? db.products : db.services).find(
      (s) => s.id === i.itemId && active(s),
    );
    fail(source, "項目已停用，請移除後重新選取");
    if (i.assistantId) {
      fail(i.assistantId !== staff.id, "協助人員不能與設計師相同");
      fail(
        db.staff.some((s) => s.id === i.assistantId && active(s)),
        "協助人員已停用",
      );
    }
    return calculateLine(
      {
        ...i,
        name: source.name,
        category: source.cat || source.type,
        assistantName: db.staff.find((s) => s.id === i.assistantId)?.name || "",
        unitCost: source.cost,
        saleCommission: source.comm ?? 0,
      },
      staff,
      db.settings,
    );
  });
  ensureUnlocked(db, form.date, [
    staff.id,
    ...items.map((i) => i.assistantId).filter(Boolean),
  ]);
  const totals = sumLines(items);
  money(totals.revenue, "帳單總額");
  const walletUsed=money(form.walletUsed??0,"儲值扣款");
  fail(walletUsed<=totals.revenue,"儲值扣款不可超過消費金額");
  if(walletUsed){fail(customer,"儲值付款需選擇會員");ensureWalletDate(db,customer.id,form.date);fail(walletBalance(db,customer.id)>=walletUsed,"儲值餘額不足");}
  const externalPaid=totals.revenue-walletUsed;
  if (externalPaid > 0 && db.settings.cashPayments.includes(form.payment))
    fail(
      money(form.cashIn, "收現金額") >= externalPaid,
      "收現不足，請核對金額",
    );
  const demand = {};
  for (const l of items.filter((l) => l.kind === "product"))
    demand[l.itemId] = (demand[l.itemId] || 0) + l.quantity;
  for (const [id, qty] of Object.entries(demand)) {
    const p = db.products.find((p) => p.id === id);
    fail(p.usage !== "店用", "店用商品不能販賣");
    fail(p.stock >= qty, p.name + " 庫存不足");
  }
  const record = {
    id: form.id || uid("REC"),
    date: form.date,
    time: new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    createdAt: new Date().toISOString(),
    customerId: customer?.id || null,
    customer: customer?.name || form.customer || "一般散客",
    gender: form.gender || "其他",
    customerTags: copy(customer?.tags || []),
    staffId: staff.id,
    staff: staff.name,
    payment: form.payment,
    walletUsed, externalPaid,
    cashIn: db.settings.cashPayments.includes(form.payment)
      ? Number(form.cashIn || 0)
      : null,
    change: db.settings.cashPayments.includes(form.payment)
      ? Number(form.cashIn || 0) - externalPaid
      : 0,
    items,
    ...totals,
    total: totals.revenue,
    ruleVersion: 1,
    status: "posted",
  };
  db.records.unshift(record);
  if(walletUsed)db.walletLedger.push({id:uid("WAL"),customerId:customer.id,date:form.date,type:"消費扣款",amount:-walletUsed,cashDelta:0,recordId:record.id,note:"開單扣款",at:new Date().toISOString()});
  db.cashLedger.push({id:uid("CASH"),recordId:record.id,date:form.date,amount:externalPaid,payment:form.payment,type:"消費收款"});
  for (const [id, qty] of Object.entries(demand)) {
    const p = db.products.find((p) => p.id === id);
    p.stock -= qty;
    db.movements.unshift({
      id: uid("MOV"),
      date: form.date,
      productId: id,
      name: p.name,
      quantity: -qty,
      type: "販賣",
      unitCost: p.cost,
      recordId: record.id,
      note: "結帳出庫",
      createdAt: record.createdAt,
    });
  }
  return record;
}
export function voidRecord(db, id, reason) {
  fail(reason?.trim(), "請填寫作廢原因");
  const r = db.records.find((r) => r.id === id);
  fail(r && eligible(r), "單據不存在或已作廢");
  ensureUnlocked(db, r.date, [
    r.staffId,
    ...(r.items || []).map((i) => i.assistantId).filter(Boolean),
  ]);
  if(r.walletUsed){ensureWalletDate(db,r.customerId,today());db.walletLedger.push({id:uid("WAL"),customerId:r.customerId,date:today(),type:"作廢退回",amount:r.walletUsed,cashDelta:0,recordId:r.id,note:reason.trim(),at:new Date().toISOString()});}
  db.cashLedger.push({id:uid("CASH"),recordId:r.id,date:today(),amount:-(r.externalPaid??r.total),payment:r.payment,type:"作廢退款"});
  r.status = "void";
  r.voidReason = reason.trim();
  r.voidAt = new Date().toISOString();
  for (const l of (r.items || []).filter((l) => l.kind === "product")) {
    const p = db.products.find((p) => p.id === l.itemId);
    fail(p, "找不到原商品，無法回補庫存");
    p.stock += l.quantity;
    db.movements.unshift({
      id: uid("MOV"),
      date: today(),
      productId: p.id,
      name: p.name,
      quantity: l.quantity,
      type: "作廢回補",
      unitCost: l.unitCost,
      recordId: r.id,
      note: reason,
      createdAt: r.voidAt,
    });
  }
}
export function customerStats(db, id) {
  const rs = db.records.filter((r) => eligible(r) && r.customerId === id);
  return {
    totalSpend: rs.reduce((s, r) => s + Number(r.total || 0), 0),
    visitCount: rs.filter((r) =>
      complete(r) ? r.items.some((l) => l.kind === "service") : true,
    ).length,
    lastVisit:
      rs
        .map((r) => r.date)
        .sort()
        .at(-1) || "",
    history: rs,
  };
}
export function stockMove(db, f) {
  const p = db.products.find((p) => p.id === f.productId && active(p));
  fail(p, "商品不存在");
  fail(validDate(f.date), "日期無效");
  const qty = money(f.quantity, "異動數量", 1);
  fail(
    ["進貨", "店內耗用", "人員領用", "盤點增加", "盤點減少"].includes(f.type),
    "異動類型錯誤",
  );
  const plus = ["進貨", "盤點增加"].includes(f.type);
  if (!plus) fail(p.stock >= qty, "庫存不足，不能超額領用");
  if (f.type === "人員領用")
    fail(
      db.staff.some((s) => s.id === f.staffId && active(s)),
      "請選擇領用人員",
    );
  if (f.type.startsWith("盤點")) fail(f.note?.trim(), "盤點需填寫原因");
  const unitCost = f.type === "進貨" ? money(f.unitCost, "進货單價") : p.cost;
  const movement = {
    id: uid("MOV"),
    date: f.date,
    productId: p.id,
    name: p.name,
    quantity: plus ? qty : -qty,
    type: f.type,
    unitCost,
    staffId: f.staffId || null,
    staff: db.staff.find((s) => s.id === f.staffId)?.name || "",
    note: f.note || "",
    createdAt: new Date().toISOString(),
  };
  p.stock += movement.quantity;
  db.movements.unshift(movement);
  if (f.type === "進貨") {
    const paid = money(f.paidAmount ?? 0, "已付款金額");
    fail(paid <= qty * unitCost, "已付款不可超過進貨總額");
    movement.purchaseTotal = qty * unitCost;
    if (paid > 0)
      db.expenses.unshift({
        id: uid("EXP"),
        date: f.date,
        type: "進貨付款",
        amount: paid,
        sourceId: movement.id,
        note: p.name + " 進貨付款",
        status: "posted",
      });
  }
  return movement;
}
export function purchaseOutstanding(db, m) {
  return (
    m.purchaseTotal -
    db.expenses
      .filter((e) => eligible(e) && e.sourceId === m.id)
      .reduce((s, e) => s + e.amount, 0)
  );
}
export function addExpense(db, f) {
  fail(validDate(f.date), "日期無效");
  const amount = money(f.amount, "支出金額", 1);
  if (f.type === "員工借支") {
    fail(
      db.staff.some((s) => s.id === f.staffId && active(s)),
      "請選擇借支人員",
    );
    ensureUnlocked(db, f.date, [f.staffId]);
  }
  if (f.sourceId) {
    const m = db.movements.find(
      (m) => m.id === f.sourceId && m.type === "進貨",
    );
    fail(m, "找不到進貨單");
    fail(amount <= purchaseOutstanding(db, m), "付款超過尚欠貨款");
    f.type = "進貨付款";
  } else
    fail(
      f.type !== "進貨付款" && f.type !== "薪資付款",
      "請由進貨單或薪資條付款，避免重複登記",
    );
  const expense = {
    ...copy(f),
    amount,
    id: uid("EXP"),
    status: "posted",
    createdAt: new Date().toISOString(),
  };
  db.expenses.unshift(expense);
  return expense;
}
export function payrollDraft(db, staffId, month) {
  fail(/^\d{4}-(0[1-9]|1[0-2])$/.test(month), "月份無效");
  const staff = db.staff.find((s) => s.id === staffId);
  fail(staff, "人員不存在");
  const records = db.records.filter(
    (r) => eligible(r) && monthOf(r.date) === month,
  );
  const own = records.filter((r) => r.staffId === staffId),
    unknown = records.filter((r) => !complete(r));
  const assist = records
    .filter(complete)
    .flatMap((r) => r.items)
    .filter((i) => i.assistantId === staffId)
    .reduce((s, i) => s + i.assistance, 0);
  const rulesUnknown =
    !staff.salaryEffectiveMonth || month < staff.salaryEffectiveMonth;
  const serviceCommission = own
      .filter(complete)
      .reduce((s, r) => s + r.commission, 0),
    retailBonus = own.filter(complete).reduce((s, r) => s + r.retailBonus, 0);
  const advance = db.expenses
    .filter(
      (e) =>
        eligible(e) &&
        e.type === "員工借支" &&
        e.staffId === staffId &&
        monthOf(e.date) === month,
    )
    .reduce((s, e) => s + e.amount, 0);
  return {
    id: uid("PAY"),
    staffId,
    staffName: staff.name,
    month,
    status: "draft",
    baseSalary: rulesUnknown ? 0 : Number(staff.baseSalary) || 0,
    jobBonus: rulesUnknown ? 0 : Number(staff.jobBonus) || 0,
    allowance: rulesUnknown ? 0 : Number(staff.allowance) || 0,
    attendanceBonus: 0,
    attendanceSuggested: Number(staff.attendanceBonus) || 0,
    serviceCommission,
    retailBonus,
    assistance: assist,
    advance,
    adjustment: 0,
    note: "",
    reviewCount: unknown.length + (rulesUnknown ? 1 : 0),
    sourceRecordIds: records.map((r) => r.id),
    generatedAt: new Date().toISOString(),
  };
}
export const payrollTotal = (p) =>
  p.baseSalary +
  p.jobBonus +
  p.allowance +
  p.attendanceBonus +
  p.serviceCommission +
  p.retailBonus +
  p.assistance -
  p.advance +
  p.adjustment;
export function confirmPayroll(db, id) {
  const p = db.payrolls.find((p) => p.id === id);
  fail(p?.status === "draft", "僅草稿可確認");
  fail(!p.reviewCount, "存在待核對歷史資料，不能確認薪資");
  const fresh = payrollDraft(db, p.staffId, p.month);
  fail(fresh.reviewCount === 0, "薪酬或歷史資料已變更，請重新產生草稿");
  for (const key of [
    "baseSalary",
    "jobBonus",
    "allowance",
    "serviceCommission",
    "retailBonus",
    "assistance",
    "advance",
  ])
    fail(p[key] === fresh[key], "帳目已變更，請重新產生草稿");
  fail(
    p.sourceRecordIds.join() === fresh.sourceRecordIds.join(),
    "帳單已變更，請重新產生草稿",
  );
  fail(p.checked === true, "請勾選已核對底薪、全勤、加扣項");
  fail(payrollTotal(p) >= 0, "應付薪資為負，請先核對");
  p.status = "confirmed";
  p.confirmedAt = new Date().toISOString();
}
export function payPayroll(db, id, date) {
  const p = db.payrolls.find((p) => p.id === id);
  fail(p?.status === "confirmed", "須先確認薪資條");
  fail(validDate(date), "付款日期無效");
  fail(
    !db.expenses.some((e) => e.sourceId === id && eligible(e)),
    "已登記薪資付款",
  );
  p.status = "paid";
  p.paidAt = date;
  db.expenses.unshift({
    id: uid("EXP"),
    date,
    type: "薪資付款",
    amount: payrollTotal(p),
    sourceId: p.id,
    staffId: p.staffId,
    note: p.month + " " + p.staffName + " 薪資",
    status: "posted",
  });
}
export function summarize(db, start, end, staffId = "") {
  fail(validDate(start) && validDate(end) && start <= end, "請核對日期起訖");
  const rs = db.records.filter(
      (r) =>
        eligible(r) &&
        r.date >= start &&
        r.date <= end &&
        (!staffId || r.staffId === staffId),
    ),
    known = rs.filter(complete),
    lines = known.flatMap((r) => r.items),
    totals = sumLines(lines);
  const services = lines.filter((l) => l.kind === "service"),
    categories = [...new Set(services.map((l) => l.category))].map((cat) => {
      const ls = services.filter((l) => l.category === cat),
        value = ls.reduce((s, l) => s + l.revenue, 0);
      return {
        name: cat,
        amount: value,
        quantity: ls.reduce((s, l) => s + l.quantity, 0),
        visits: known.filter((r) =>
          r.items.some((l) => l.kind === "service" && l.category === cat),
        ).length,
        share: totals.virtual ? (value / totals.virtual) * 100 : 0,
      };
    });
  return {
    ...totals,
    receipts: rs.length,
    visits: known.filter((r) => r.items.some((l) => l.kind === "service"))
      .length,
    quantity: services.reduce((s, l) => s + l.quantity, 0),
    reviewCount: rs.length - known.length,
    categories,
    records: rs,
    receiptRevenue: rs.reduce((s, r) => s + Number(r.total || 0), 0),
  };
}
export function validateDB(d) {
  fail(
    d && typeof d === "object" && d.project === PROJECT,
    "不是本專案的備份，禁止混用其他 POS 資料",
  );
  fail([1,2].includes(d.schema), "備份版本不支援");
  if(d.schema===1){d.schema=2;d.walletLedger=[];d.cashLedger=[];}
  validateLedger(d);
  fail(Number.isSafeInteger(d.revision) && d.revision >= 0, "資料版本無效");
  for (const k of [
    "services",
    "products",
    "customers",
    "staff",
    "records",
    "movements",
    "expenses",
    "payrolls",
    "audit",
  ]) {
    fail(Array.isArray(d[k]), "備份缺少 " + k);
    const ids = new Set();
    for (const x of d[k]) {
      fail(
        x && typeof x.id === "string" && x.id && !ids.has(x.id),
        k + " 識別碼遺失或重複",
      );
      ids.add(x.id);
    }
  }
  fail(d.settings && typeof d.settings.shopName === "string", "設定格式無效");
  percent(d.settings.defaultCommission);
  for (const k of [
    "genders",
    "classes",
    "payments",
    "vendors",
    "productTypes",
    "expenseTypes",
  ])
    fail(
      Array.isArray(d.settings[k]) &&
        d.settings[k].every((x) => typeof x === "string" && x.trim()) &&
        new Set(d.settings[k]).size === d.settings[k].length,
      k + " 設定無效",
    );
  fail(
    Array.isArray(d.settings.cashPayments) &&
      d.settings.cashPayments.every((x) => d.settings.payments.includes(x)),
    "現金付款方式無效",
  );
  fail(Array.isArray(d.settings.customerTags), "客群標籤格式無效");
  for (const p of [...d.products, ...d.services]) {
    fail(typeof p.name === "string" && p.name.trim(), "品名無效");
    money(p.price);
    money(p.cost);
    if (d.products.includes(p)) {
      money(p.stock, "庫存");
      money(p.safety, "安全庫存");
      percent(p.comm ?? 0);
    }
  }
  for (const r of d.records) {
    fail(validDate(r.date), "帳單日期無效");
    money(r.total);
    fail(["posted", "void"].includes(r.status), "帳單狀態無效");
    if (r.ruleVersion === 1) {
      fail(complete(r), "帳單明細遺失");
      for (const l of r.items) {
        fail(["product", "service"].includes(l.kind), "明細種類無效");
        money(l.quantity, "數量", 1);
        money(l.unitPrice);
        money(l.unitCost);
        percent(l.rate);
        for (const k of [
          "revenue",
          "material",
          "assistance",
          "virtual",
          "actual",
          "commission",
          "retailRevenue",
          "retailBonus",
        ])
          money(l[k], k, -100000000);
        fail(
          l.revenue === l.unitPrice * l.quantity &&
            l.material === l.unitCost * l.quantity,
          "明細金額不一致",
        );
        if (l.kind === "service")
          fail(
            l.virtual === l.revenue &&
              l.actual === l.revenue - l.material - l.assistance &&
              l.commission === Math.round((l.actual * l.rate) / 100),
            "服務計算不一致",
          );
      }
      const totals = sumLines(r.items);
      for (const [k, v] of Object.entries(totals))
        fail(r[k] === v, "帳單合計不一致：" + k);
      fail(r.total === totals.revenue, "帳單實收不一致");
    }
  }
  for (const e of d.expenses) {
    fail(validDate(e.date), "支出日期無效");
    money(e.amount);
    fail(["posted", "void"].includes(e.status), "支出狀態無效");
  }
  for (const p of d.payrolls) {
    fail(["draft", "confirmed", "paid"].includes(p.status), "薪資狀態無效");
    for (const k of [
      "baseSalary",
      "jobBonus",
      "allowance",
      "attendanceBonus",
      "serviceCommission",
      "retailBonus",
      "assistance",
      "advance",
      "adjustment",
    ])
      money(p[k], k, -100000000);
  }
  const refs = (list, id) => !id || d[list].some((x) => x.id === id);
  for (const c of d.customers) {
    fail(
      typeof c.name === "string" && c.name.trim() && Array.isArray(c.tags),
      "顧客格式無效",
    );
    fail(refs("staff", c.staffId), "顧客人員連結遺失");
  }
  for (const s of d.staff) {
    fail(typeof s.name === "string" && s.name.trim(), "人員姓名無效");
    percent(s.commissionValue ?? 0);
    for (const k of ["baseSalary", "jobBonus", "attendanceBonus", "allowance"])
      money(s[k] ?? 0, k);
  }
  for (const r of d.records) {
    if (!complete(r)) continue;
    fail(
      refs("staff", r.staffId) &&
        !!r.staffId &&
        refs("customers", r.customerId),
      "帳單人員／會員連結遺失",
    );
    for (const l of r.items) {
      fail(
        refs(l.kind === "product" ? "products" : "services", l.itemId) &&
          !!l.itemId &&
          refs("staff", l.assistantId),
        "帳單項目連結遺失",
      );
      fail(l.assistanceBase === l.revenue - l.material, "協助費基礎不一致");
      const expected =
        l.kind === "service" && l.assistantId
          ? l.assistMode === "percent"
            ? Math.round((l.assistanceBase * percent(l.assistValue)) / 100)
            : money(l.assistValue) * l.quantity
          : 0;
      fail(l.assistance === expected && l.assistance >= 0, "協助費不一致");
      if (l.kind === "product")
        fail(
          l.virtual === 0 &&
            l.actual === 0 &&
            l.commission === 0 &&
            l.retailRevenue === l.revenue &&
            l.retailBonus ===
              Math.round(((l.revenue - l.material) * l.rate) / 100),
          "販賣金額不一致",
        );
      else fail(l.retailRevenue === 0 && l.retailBonus === 0, "服務混入販賣");
    }
  }
  for (const m of d.movements) {
    fail(
      validDate(m.date) && refs("products", m.productId) && !!m.productId,
      "庫存異動格式錯誤",
    );
    money(m.quantity, "庫存異動", -100000000);
    money(m.unitCost);
    if (m.type === "進貨") {
      money(m.purchaseTotal);
      fail(purchaseOutstanding(d, m) >= 0, "貨款超付");
    }
  }
  const uniquePayroll = new Set();
  for (const p of d.payrolls) {
    fail(
      refs("staff", p.staffId) &&
        !!p.staffId &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(p.month),
      "薪資來源無效",
    );
    fail(!uniquePayroll.has(p.staffId + p.month), "同月份薪資條重複");
    uniquePayroll.add(p.staffId + p.month);
    const payments = d.expenses.filter(
      (e) => eligible(e) && e.type === "薪資付款" && e.sourceId === p.id,
    );
    fail(
      p.status === "paid"
        ? payments.length === 1 && payments[0].amount === payrollTotal(p)
        : payments.length === 0,
      "薪資付款不一致",
    );
  }
  for (const e of d.expenses) {
    if (e.staffId) fail(refs("staff", e.staffId), "支出人員遺失");
    if (e.type === "進貨付款")
      fail(
        d.movements.some((m) => m.id === e.sourceId && m.type === "進貨"),
        "支出缺少進貨來源",
      );
    if (e.type === "薪資付款")
      fail(
        d.payrolls.some((p) => p.id === e.sourceId && p.status === "paid"),
        "支出缺少已付薪資來源",
      );
  }
  return d;
}

// Prepaid balances are liabilities until consumption. Every movement is immutable.
export function walletBalance(db,id){return (db.walletLedger||[]).filter(x=>x.customerId===id).reduce((s,x)=>s+x.amount,0)}
export function ensureWalletDate(db,id,date){fail(validDate(date),"日期無效");const last=(db.walletLedger||[]).filter(x=>x.customerId===id).map(x=>x.date).sort().at(-1);fail(!last||date>=last,"儲值交易不可早於該會員最近一筆流水，請核對日期");}
export function walletTransaction(db,form){
 fail(db.customers.some(c=>c.id===form.customerId&&(active(c)||form.type==="餘額退款")),"請選擇有效會員");
 fail(["儲值收款","餘額退款"].includes(form.type),"儲值類型無效");
 fail(db.settings.payments.includes(form.payment),"請選擇有效付款方式");
 fail(!(db.walletLedger||[]).some(x=>x.id===form.id),"此筆儲值交易已儲存");
 const amount=money(form.amount,"金額",1);ensureWalletDate(db,form.customerId,form.date);
 if(form.type==="餘額退款"){fail(form.note?.trim(),"退款需填寫原因");fail(walletBalance(db,form.customerId)>=amount,"退款不可超過未用餘額");}
 const delta=form.type==="儲值收款"?amount:-amount;
 const row={id:form.id||uid("WAL"),customerId:form.customerId,date:form.date,type:form.type,amount:delta,cashDelta:delta,payment:form.payment,note:form.note?.trim()||"",at:new Date().toISOString()};db.walletLedger.push(row);return row;
}
export function reverseTopup(db,id,note){
 const row=db.walletLedger.find(x=>x.id===id);fail(row?.type==="儲值收款","僅可作廢儲值收款");fail(note?.trim(),"請填寫作廢原因");fail(!db.walletLedger.some(x=>x.reverses===id),"此筆儲值已作廢");fail(walletBalance(db,row.customerId)>=row.amount,"餘額不足，不能作廢已使用的儲值");ensureWalletDate(db,row.customerId,today());
 db.walletLedger.push({id:uid("WAL"),customerId:row.customerId,date:today(),type:"儲值作廢",amount:-row.amount,cashDelta:-row.amount,payment:row.payment,reverses:id,note:note.trim(),at:new Date().toISOString()});
}
export function validateLedger(db){
 fail(Array.isArray(db.walletLedger)&&Array.isArray(db.cashLedger),"備份缺少預收流水");const ids=new Set(),balances={},last={};
 for(const w of db.walletLedger){fail(w&&typeof w.id==="string"&&!ids.has(w.id),"儲值流水編號重複或無效");ids.add(w.id);fail(db.customers.some(c=>c.id===w.customerId),"儲值會員不存在");fail(validDate(w.date),"儲值日期無效");money(w.amount,"儲值異動",-100000000);money(w.cashDelta,"儲值收付款",-100000000);fail(!last[w.customerId]||w.date>=last[w.customerId],"儲值流水日期順序錯誤");last[w.customerId]=w.date;
 fail(["儲值收款","餘額退款","消費扣款","作廢退回","儲值作廢"].includes(w.type),"儲值類型無效");
 if(["儲值收款","餘額退款","儲值作廢"].includes(w.type)){fail(w.amount===w.cashDelta,"儲值收付款不一致");fail(w.type==="儲值收款"?w.amount>0:w.amount<0,"儲值正負金額錯誤");}else{fail(w.cashDelta===0,"消費儲值不可重複算現金");const r=db.records.find(r=>r.id===w.recordId&&r.customerId===w.customerId);fail(r&&w.amount===(w.type==="消費扣款"?-r.walletUsed:r.walletUsed),"儲值缺少對應帳單");if(w.type==="作廢退回")fail(r.status==="void","非作廢帳單不可退回");}
 if(w.type==="儲值作廢"){const old=db.walletLedger.find(x=>x.id===w.reverses&&x.type==="儲值收款");fail(old&&old.customerId===w.customerId&&old.amount===-w.amount,"作廢儲值來源錯誤");fail(db.walletLedger.filter(x=>x.reverses===w.reverses).length===1,"重複作廢儲值");}
 balances[w.customerId]=(balances[w.customerId]||0)+w.amount;fail(balances[w.customerId]>=0,"儲值餘額不可為負");}
 for(const r of db.records){if(r.walletUsed===undefined)continue;money(r.walletUsed);money(r.externalPaid);fail(r.walletUsed+r.externalPaid===r.total,"付款拆分不一致");const debits=db.walletLedger.filter(w=>w.recordId===r.id&&w.type==="消費扣款"),credits=db.walletLedger.filter(w=>w.recordId===r.id&&w.type==="作廢退回");fail(debits.length===(r.walletUsed?1:0)&&credits.length===(r.walletUsed&&r.status==="void"?1:0),"帳單儲值流水缺漏或重複");}
 const cashIds=new Set();for(const c of db.cashLedger){fail(c.id&&!cashIds.has(c.id)&&validDate(c.date),"收款流水無效");cashIds.add(c.id);money(c.amount,"收款流水",-100000000);const r=db.records.find(r=>r.id===c.recordId);fail(r,"收款來源不存在");fail(["消費收款","作廢退款"].includes(c.type),"收款類型無效");fail(c.amount===(c.type==="消費收款"?1:-1)*(r.externalPaid??r.total),"收款金額不一致");if(c.type==="作廢退款")fail(r.status==="void","退款來源未作廢");}
 for(const r of db.records){if(r.externalPaid===undefined)continue;fail(db.cashLedger.filter(c=>c.recordId===r.id&&c.type==="消費收款").length===1,"帳單收款流水缺漏或重複");fail(db.cashLedger.filter(c=>c.recordId===r.id&&c.type==="作廢退款").length===(r.status==="void"?1:0),"作廢退款流水缺漏或重複");}
}
export function cashReport(db,start,end){fail(validDate(start)&&validDate(end)&&start<=end,"請核對日期起訖");const within=x=>x.date>=start&&x.date<=end;
 const old=db.records.filter(r=>r.externalPaid===undefined&&within(r)&&(eligible(r)||db.cashLedger.some(c=>c.recordId===r.id&&c.type==="作廢退款"))).map(r=>({amount:r.total,payment:r.payment,type:"舊版消費收款",date:r.date}));
 const rows=[...old,...db.cashLedger.filter(within),...db.walletLedger.filter(w=>within(w)&&w.cashDelta).map(w=>({...w,amount:w.cashDelta}))];
 const expenses=db.expenses.filter(e=>eligible(e)&&within(e));return {income:rows.reduce((s,r)=>s+r.amount,0),out:expenses.reduce((s,e)=>s+e.amount,0),rows,expenses,prepaid:db.walletLedger.filter(w=>w.date<=end).reduce((s,w)=>s+w.amount,0)};
}
export function profitReport(db,start,end){const summary=summarize(db,start,end),expenses=db.expenses.filter(e=>eligible(e)&&e.date>=start&&e.date<=end&&!['進貨付款','薪資付款','員工借支'].includes(e.type));const operating=expenses.reduce((s,e)=>s+e.amount,0);const months=[];for(let m=start.slice(0,7);m<=end.slice(0,7);){months.push(m);let [y,n]=m.split('-').map(Number);m=n===12?(y+1)+'-01':y+'-'+String(n+1).padStart(2,'0');}
 let missing=summary.reviewCount,fixed=0;for(const month of months){const first=month+'-01',[y,m]=month.split('-').map(Number),last=month+'-'+new Date(y,m,0).getDate();const salaried=db.staff.filter(s=>!s.archived&&[s.baseSalary,s.jobBonus,s.allowance,s.attendanceBonus].some(x=>Number(x)>0));if(first<start||last>end){if(salaried.length)missing++;continue;}for(const person of salaried){const p=db.payrolls.find(p=>p.staffId===person.id&&p.month===month&&p.status!=='draft');if(!p)missing++;}
 for(const p of db.payrolls.filter(p=>p.month===month&&p.status!=='draft'))fixed+=p.baseSalary+p.jobBonus+p.allowance+p.attendanceBonus+p.adjustment;
 }const variablePay=summary.commission+summary.assistance+summary.retailBonus;const margin=summary.revenue-summary.material-variablePay;return {summary,operating,fixed,variablePay,margin,missing,profit:missing?null:margin-operating-fixed};}
