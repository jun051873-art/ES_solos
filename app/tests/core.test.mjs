import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../source/core.mjs";
const month = C.today().slice(0, 7);
function fixture() {
  const d = C.emptyDB();
  d.staff = [
    {
      id: "s",
      name: "設計師",
      commissionType: "個別設定",
      commissionValue: 50,
      salaryEffectiveMonth: month,
      baseSalary: 10000,
      jobBonus: 500,
      allowance: 200,
      attendanceBonus: 1000,
    },
    {
      id: "a",
      name: "協助人",
      commissionValue: 50,
      salaryEffectiveMonth: month,
    },
  ];
  d.services = [
    { id: "sv", name: "染髮", cat: "染髮", price: 2000, cost: 400 },
  ];
  d.products = [
    {
      id: "p",
      name: "洗髮精",
      type: "洗髮精",
      usage: "兩用",
      price: 600,
      cost: 200,
      stock: 10,
      safety: 2,
      comm: 10,
    },
  ];
  d.customers = [
    { id: "c1", name: "同名", tags: [] },
    { id: "c2", name: "同名", tags: [] },
  ];
  return d;
}
const line = {
  id: "l",
  itemId: "sv",
  kind: "service",
  name: "染髮",
  category: "染髮",
  unitPrice: 2000,
  unitCost: 400,
  quantity: 1,
  assistantId: "a",
  assistMode: "amount",
  assistValue: 100,
};
function order(d, items = [line], id = "r") {
  return C.checkout(d, {
    id,
    date: C.today(),
    staffId: "s",
    customerId: "c1",
    payment: "現金",
    cashIn: 100000,
    items,
  });
}
test("指定算例：2000－400－100＝1500，50%抽成750", () => {
  const d = fixture(),
    r = order(d);
  assert.equal(r.virtual, 2000);
  assert.equal(r.actual, 1500);
  assert.equal(r.commission, 750);
  C.validateDB(d);
});
test("協助費百分比按扣材料後計算，10%為160", () => {
  const d = fixture(),
    r = order(d, [{ ...line, assistMode: "percent", assistValue: 10 }]);
  assert.equal(r.assistance, 160);
  assert.equal(r.actual, 1440);
  assert.equal(r.commission, 720);
});
test("折扣與数量：1700×2，材料800，固定協助200", () => {
  const d = fixture(),
    r = order(d, [{ ...line, quantity: 2, unitPrice: 1700 }]);
  assert.equal(r.virtual, 3400);
  assert.equal(r.actual, 2400);
  assert.equal(r.commission, 1200);
});
test("服務與販賣分離、庫存減少、同名會員不串帳", () => {
  const d = fixture(),
    r = order(d, [
      line,
      { id: "lp", itemId: "p", kind: "product", quantity: 2, unitPrice: 600 },
    ]);
  assert.equal(r.total, 3200);
  assert.equal(r.virtual, 2000);
  assert.equal(r.retailBonus, 80);
  assert.equal(r.commission, 750);
  assert.equal(d.products[0].stock, 8);
  assert.equal(C.customerStats(d, "c1").totalSpend, 3200);
  assert.equal(C.customerStats(d, "c2").totalSpend, 0);
  d.customers[0].name = "新名字";
  assert.equal(C.customerStats(d, "c1").history.length, 1);
});
test("無協助人員不扣費；個別比例及全店比例", () => {
  const d = fixture();
  d.staff[0].commissionType = "全店統一";
  d.settings.defaultCommission = 40;
  const r = order(d, [{ ...line, assistantId: "" }]);
  assert.equal(r.assistance, 0);
  assert.equal(r.commission, 640);
});
test("作廢回補庫存並排除報表與會員金額；重複作廢拒絕", () => {
  const d = fixture();
  order(d, [
    line,
    { id: "lp", itemId: "p", kind: "product", quantity: 2, unitPrice: 600 },
  ]);
  C.voidRecord(d, "r", "測試更正");
  assert.equal(d.products[0].stock, 10);
  assert.equal(C.customerStats(d, "c1").totalSpend, 0);
  assert.equal(C.summarize(d, C.today(), C.today()).receipts, 0);
  assert.throws(() => C.voidRecord(d, "r", "再次"), /已作廢/);
});
test("拒絕少收現、重複單號、負數、超額庫存與同人協助", () => {
  const d = fixture();
  assert.throws(
    () =>
      C.checkout(d, {
        id: "x",
        date: C.today(),
        staffId: "s",
        payment: "現金",
        cashIn: 1,
        items: [line],
      }),
    /收現不足/,
  );
  assert.equal(d.records.length, 0);
  assert.throws(() => order(d, [{ ...line, assistantId: "s" }]), /相同/);
  assert.throws(() => order(d, [{ ...line, unitPrice: -1 }]), /成交/);
  assert.throws(
    () =>
      order(d, [
        {
          id: "lp",
          itemId: "p",
          kind: "product",
          quantity: 99,
          unitPrice: 600,
        },
      ]),
    /庫存不足/,
  );
  order(d);
  assert.throws(() => order(d), /重複/);
});
test("進貨部分付款、补登尾款、耗用不重複列支出", () => {
  const d = fixture();
  const m = C.stockMove(d, {
    productId: "p",
    date: C.today(),
    type: "進貨",
    quantity: 5,
    unitCost: 100,
    paidAmount: 200,
  });
  assert.equal(d.products[0].stock, 15);
  assert.equal(C.purchaseOutstanding(d, m), 300);
  C.addExpense(d, {
    date: C.today(),
    sourceId: m.id,
    type: "進貨付款",
    amount: 300,
  });
  assert.equal(C.purchaseOutstanding(d, m), 0);
  assert.throws(
    () =>
      C.addExpense(d, {
        date: C.today(),
        sourceId: m.id,
        type: "進貨付款",
        amount: 1,
      }),
    /超過/,
  );
  C.stockMove(d, {
    productId: "p",
    date: C.today(),
    type: "店內耗用",
    quantity: 3,
  });
  assert.equal(d.products[0].stock, 12);
  assert.equal(
    d.expenses.reduce((s, e) => s + e.amount, 0),
    500,
  );
  assert.equal(d.expenses.length, 2);
});
test("服務報表採真實分類金額，不以品名猜測；日期不截100筆", () => {
  const d = fixture();
  d.services.push({
    id: "sv2",
    name: "套餐X",
    cat: "剪髮",
    price: 400,
    cost: 0,
  });
  for (let i = 0; i < 105; i++)
    order(d, [{ ...line, unitPrice: 1000, assistantId: "" }], String(i));
  order(
    d,
    [{ id: "z", itemId: "sv2", kind: "service", unitPrice: 400, quantity: 1 }],
    "other",
  );
  const s = C.summarize(d, C.today(), C.today());
  assert.equal(s.receipts, 106);
  assert.equal(s.categories.find((c) => c.name === "染髮").amount, 105000);
  assert.equal(s.categories.find((c) => c.name === "剪髮").amount, 400);
});
test("薪资含底薪加給、抽成、借支；全勤需核對、付款只記一次", () => {
  const d = fixture();
  order(d);
  C.addExpense(d, {
    date: C.today(),
    type: "員工借支",
    staffId: "s",
    amount: 1000,
  });
  const p = C.payrollDraft(d, "s", month);
  d.payrolls.push(p);
  assert.equal(p.attendanceBonus, 0);
  assert.equal(p.serviceCommission, 750);
  assert.equal(C.payrollTotal(p), 10450);
  assert.throws(() => C.confirmPayroll(d, p.id), /勾選/);
  p.checked = true;
  C.confirmPayroll(d, p.id);
  assert.throws(() => C.voidRecord(d, "r", "修改"), /鎖|確認/);
  C.payPayroll(d, p.id, C.today());
  assert.equal(p.status, "paid");
  assert.equal(d.expenses.find((e) => e.type === "薪資付款").amount, 10450);
  assert.throws(() => C.payPayroll(d, p.id, C.today()), /先確認/);
});
test("協助人薪資包含協助費，不列設計師業績", () => {
  const d = fixture();
  order(d);
  const p = C.payrollDraft(d, "a", month);
  assert.equal(p.assistance, 100);
  assert.equal(p.serviceCommission, 0);
});
test("舊月薪酬與缺明細歷史單均標記待核對", () => {
  const d = fixture();
  const old = C.payrollDraft(d, "s", "2020-01");
  assert.equal(old.reviewCount, 1);
  assert.equal(old.baseSalary, 0);
  d.records.push({
    id: "legacy",
    date: C.today(),
    staffId: "s",
    staff: "設計師",
    customer: "舊客",
    total: 2000,
    status: "posted",
    payment: "現金",
  });
  const p = C.payrollDraft(d, "s", month);
  d.payrolls.push(p);
  p.checked = true;
  assert.equal(p.reviewCount, 1);
  assert.throws(() => C.confirmPayroll(d, p.id), /待核對/);
  const summary = C.summarize(d, C.today(), C.today());
  assert.equal(summary.virtual, 0);
  assert.equal(summary.receiptRevenue, 2000);
  assert.equal(summary.reviewCount, 1);
});
test("備份往返與跨專案、毀損金額拒絕", () => {
  const d = fixture();
  order(d);
  assert.deepEqual(C.validateDB(JSON.parse(JSON.stringify(d))), d);
  assert.throws(() => C.validateDB({ ...d, project: "V28" }), /禁止混用/);
  const bad = C.copy(d);
  bad.records[0].items[0].actual = 99;
  assert.throws(() => C.validateDB(bad), /不一致/);
  const dup = C.copy(d);
  dup.staff.push({ ...dup.staff[0] });
  assert.throws(() => C.validateDB(dup), /重複/);
});
test("失敗交易在副本執行，不污染原資料", () => {
  const d = fixture(),
    before = C.copy(d);
  const draft = C.copy(d);
  assert.throws(
    () =>
      C.stockMove(draft, {
        date: C.today(),
        productId: "p",
        type: "進貨",
        quantity: 3,
        unitCost: 100,
        paidAmount: 500,
      }),
    /超過/,
  );
  assert.deepEqual(d, before);
});
test("自訂現金名稱仍檢查收現及找零", () => {
  const d = fixture();
  d.settings.payments = ["門市現鈔"];
  d.settings.cashPayments = ["門市現鈔"];
  const f = {
    id: "custom-cash",
    date: C.today(),
    staffId: "s",
    payment: "門市現鈔",
    cashIn: 1900,
    items: [line],
  };
  assert.throws(() => C.checkout(d, f), /收現不足/);
  f.cashIn = 2100;
  assert.equal(C.checkout(d, f).change, 100);
});
test("備份拒絕遺失會員連結、協助費錯置與偽造已付狀態", () => {
  const d = fixture();
  order(d);
  let bad = C.copy(d);
  bad.records[0].customerId = "missing";
  assert.throws(() => C.validateDB(bad), /連結遺失/);
  bad = C.copy(d);
  bad.records[0].items[0].assistanceBase = 1;
  assert.throws(() => C.validateDB(bad), /基礎不一致/);
  const p = C.payrollDraft(d, "s", month);
  p.status = "paid";
  d.payrolls.push(p);
  assert.throws(() => C.validateDB(d), /付款不一致/);
});
