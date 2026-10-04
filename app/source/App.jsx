import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  useMemo,
} from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import * as C from "./core.mjs";
import {PearlGroup,SidebarMotion} from "./Glass.jsx";
const Context = createContext();
const useDB = () => useContext(Context);
const fmt = (v) => "$" + Number(v || 0).toLocaleString("zh-TW");
const iconPaths = {
  zap: "M13 2 3 14h8l-1 8 10-12h-8l1-8",
  search: "M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  package: "m3 7 9-5 9 5v10l-9 5-9-5V7l9 5 9-5 M12 12v10 M7 4l10 5",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "credit-card": "M3 5h18v14H3z M3 10h18 M7 15h3",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
};
function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] || iconPaths.settings} />
    </svg>
  );
}
function Button({ children, secondary = false, danger = false, ...props }) {
  return (
    <button
      {...props}
      className={
        "btn " +
        (secondary ? "secondary " : "") +
        (danger ? "danger " : "") +
        (props.className || "")
      }
    >
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input aria-label={label} className="input-ios" {...props} />
    </Field>
  );
}
function Select({ label, options, ...props }) {
  return (
    <Field label={label}>
      <select aria-label={label} className="input-ios" {...props}>
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </Field>
  );
}
function Header({ title, sub, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="text-gold-gradient">{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
function Empty({ children }) {
  return <div className="empty">{children || "目前沒有資料"}</div>;
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    const root = ref.current;
    const focusable = () =>
      [
        ...root.querySelectorAll('button,input,select,textarea,[tabindex="0"]'),
      ].filter((x) => !x.disabled && x.offsetParent !== null);
    (focusable()[0] || root).focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const f = focusable();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    root.addEventListener("keydown", key);
    return () => {
      root.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return createPortal(
    <div className="modal-backdrop">
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={"liquid-glass modal " + (wide ? "wide" : "")}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close" aria-label="關閉視窗" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
function Amounts({ value }) {
  return (
    <div className="metric-grid">
      {[
        ["虛業績", value.virtual],
        ["實際業績", value.actual],
        ["設計師抽成", value.commission],
      ].map(([n, v]) => (
        <div className="metric" key={n}>
          <span>{n}</span>
          <b>{fmt(v)}</b>
        </div>
      ))}
    </div>
  );
}
function DateRange({ range, setRange }) {
 const [preset,setPreset]=useState('自訂');
 const choose=n=>{setPreset(n);const d=C.today();if(n==='日')setRange({mode:'date',start:d,end:d});if(n==='月')setRange({mode:'month',start:d.slice(0,7),end:d.slice(0,7)});if(n==='年')setRange({mode:'date',start:d.slice(0,4)+'-01-01',end:d.slice(0,4)+'-12-31'})};
  return (<><PearlGroup className="pills time-presets">{['日','月','年','自訂'].map(n=><button key={n} className={'pill-toggle '+(preset===n?'active':'')} onClick={()=>choose(n)}>{n}</button>)}</PearlGroup>
    <div className="date-range">
      <Select
        label="查詢方式"
        value={range.mode}
        onChange={(e) => {
          setPreset("自訂");const mode = e.target.value;
          setRange({
            ...range,
            mode,
            start: mode === "month" ? range.start.slice(0, 7) : C.today(),
            end: mode === "month" ? range.end.slice(0, 7) : C.today(),
          });
        }}
        options={[
          { value: "date", label: "日期區間" },
          { value: "month", label: "月份區間" },
        ]}
      />
      <Input
        label="起始"
        type={range.mode}
        value={range.start}
        onChange={(e) => {setPreset("自訂");setRange({ ...range, start: e.target.value })}}
      />
      <Input
        label="結束"
        type={range.mode}
        value={range.end}
        onChange={(e) => {setPreset("自訂");setRange({ ...range, end: e.target.value })}}
      />
    </div></>
  );
}
const newRange = () => ({
  mode: "date",
  start: C.today().slice(0, 7) + "-01",
  end: C.today(),
});
function dates(range) {
  if (!range.start || !range.end) return ["", ""];
  return range.mode === "month"
    ? [
        range.start + "-01",
        new Date(
          Number(range.end.slice(0, 4)),
          Number(range.end.slice(5, 7)),
          0,
          12,
        ).toLocaleDateString("sv-SE"),
      ]
    : [range.start, range.end];
}
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function readInitial() {
  const raw = localStorage.getItem(C.STORE_KEY);
  return raw ? C.validateDB(JSON.parse(raw)) : C.emptyDB();
}
function App() {
  const [db, setDB] = useState(readInitial),
    ref = useRef(db),
    [tab, setTab] = useState("s1"),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    busyRef = useRef(false);
  ref.current = db;
  useEffect(() => {
    const change = (e) => {
      if (e.key === C.STORE_KEY && e.newValue) {
        try {
          setDB(C.validateDB(JSON.parse(e.newValue)));
          setToast("資料已由另一個視窗更新，請重新核對未送出的內容");
        } catch {
          alert("其他視窗資料格式異常，請備份並重新開啟");
        }
      }
    };
    window.addEventListener("storage", change);
    return () => window.removeEventListener("storage", change);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  async function mutate(label, fn) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const work = async () => {
        const saved = localStorage.getItem(C.STORE_KEY);
        const latest = saved ? C.validateDB(JSON.parse(saved)) : C.emptyDB();
        C.fail(
          latest.revision === ref.current.revision,
          "其他視窗已更新資料，請重新整理再操作",
        );
        const draft = C.copy(latest);
        const result = fn(draft);
        draft.revision = latest.revision + 1;
        draft.version = C.VERSION;
        draft.audit.unshift({
          id: C.uid("AUD"),
          at: new Date().toISOString(),
          action: label,
          revision: draft.revision,
        });
        C.validateDB(draft);
        if (saved) localStorage.setItem(C.PREVIOUS_KEY, saved);
        localStorage.setItem(C.STORE_KEY, JSON.stringify(draft));
        ref.current = draft;
        setDB(draft);
        setToast(label + "，已儲存");
        return result ?? true;
      };
      return navigator.locks
        ? await navigator.locks.request(C.STORE_KEY, work)
        : await work();
    } catch (e) {
      alert(e.message || "儲存失敗，資料未變更");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const [handoff,setHandoff]=useState(null),[pinned,setPinned]=useState(false);
  useEffect(()=>{document.querySelector('.page-scroll')?.scrollTo(0,0)},[tab]);
  const value = { db, mutate, busy, setTab, setToast,handoff,clearHandoff:()=>setHandoff(null),openCustomer:id=>{setHandoff({id,token:Date.now()});setTab('s1')} };
  const menus = [
    ["s1", "開單", "zap"],
    ["s2", "查單", "search"],
    ["s3", "報表", "activity"],
    ["s4", "顧客", "users"],
    ["s5", "庫存", "package"],
    ["s6", "人員", "user"],
    ["s7", "支出", "credit-card"],
    ["s8", "系統", "settings"],
  ];
  return (
    <Context.Provider value={value}>
      <div className="app-shell">
        <SidebarMotion/><aside className={"main-nav"+(pinned?" pinned":"")}>
          <button className="brand" onClick={()=>setPinned(!pinned)} aria-label="展開或收起側欄" aria-expanded={pinned}>
            S<span>{db.settings.shopName}</span>
          </button>
          <nav>
            {menus.map(([id, name, icon]) => (
              <button
                aria-current={tab === id ? "page" : undefined}
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? "selected" : ""}
              >
                <Icon name={icon} />
                <span>{name}</span>
              </button>
            ))}
          </nav>
          <small>
            10年磨一劍
            <br />
            P2.0.0 驗收版
          </small>
        </aside>
        <main className="main-area">
          <div className="status-line">
            <span>{db.settings.shopName} · 功能驗收 · 本機測試資料</span>
            <button onClick={() => setTab("s8")}>備份與說明</button>
          </div>
          <div className="liquid-glass main-glass">
            <div className="page-scroll">
              <div hidden={tab !== "s1"}>
                <Order />
              </div>
              {tab === "s2" && <Records />}
              {tab === "s3" && <Reports />}
              {tab === "s4" && <Customers />}
              {tab === "s5" && <Inventory />}
              {tab === "s6" && <Staff />}
              {tab === "s7" && <Expenses />}
              {tab === "s8" && <Settings />}
            </div>
          </div>
        </main>
        {toast && (
          <div role="status" className="toast">
            {toast}
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
function Order() {
  const { db, mutate, busy, setTab,handoff,clearHandoff } = useDB();
  const draft=useRef(readDraft(db)).current;
  const [items, setItems] = useState(draft.items||[]),
    [date, setDate] = useState(draft.date||C.today()),
    [gender, setGender] = useState(draft.gender||"女生"),
    [cat, setCat] = useState("全部"),
    [query, setQuery] = useState(draft.query||""),
    [memberMode, setMemberMode] = useState(draft.memberMode||false),
    [customerId, setCustomerId] = useState(draft.customerId||""),
    [staffId, setStaffId] = useState(draft.staffId||""),
    [payment, setPayment] = useState(draft.payment||"現金"),
    [cash, setCash] = useState(draft.cash||""),
    [edit, setEdit] = useState(null),
    [receipt, setReceipt] = useState(null),
    [confirm, setConfirm] = useState(false),
    [productQuery, setProductQuery] = useState(""),
    [orderId, setOrderId] = useState(draft.orderId||C.uid("REC")),
    [walletUsed,setWalletUsed]=useState(draft.walletUsed||0),[draftError,setDraftError]=useState("");
  useEffect(()=>{try{if(items.length)sessionStorage.setItem('es_solos_order_draft',JSON.stringify({project:C.PROJECT,items,date,gender,query,memberMode,customerId,staffId,payment,cash,orderId,walletUsed}));else sessionStorage.removeItem('es_solos_order_draft');setDraftError('')}catch{setDraftError('草稿暫存失敗，重新整理前請先完成結帳')}},[items,date,gender,query,memberMode,customerId,staffId,payment,cash,orderId,walletUsed]);
  useEffect(()=>{if(!handoff)return;const c=db.customers.find(c=>c.id===handoff.id&&C.active(c));if(c&&(!items.length||customerId===c.id||window.confirm('保留目前項目並改為這位會員？'))){setMemberMode(true);setCustomerId(c.id);setWalletUsed(0);setQuery(c.name);setWalletUsed(0);if(c.staffId)setStaffId(c.staffId);if(c.gender)setGender(c.gender)}clearHandoff()},[handoff]);
  const staff = db.staff.filter(C.active),
    customers = db.customers.filter(C.active);
  const person = db.staff.find((s) => s.id === staffId),
    customer = customers.find((c) => c.id === customerId);
  useEffect(() => {
    if (!staffId && staff.length) setStaffId(staff[0].id);
  }, [db.staff]);
  useEffect(() => {
    if (!db.settings.payments.includes(payment))
      setPayment(db.settings.payments[0] || "");
    if (!db.settings.genders.includes(gender))
      setGender(db.settings.genders[0] || "");
  }, [db.settings]);
  useEffect(() => {
    if (!db.settings.classes.includes(cat) && !["全部", "販賣"].includes(cat))
      setCat("全部");
  }, [db.settings.classes]);
  let computed = [],
    calcError = "";
  try {
    computed = items.map((i) => {
      const s = (i.kind === "product" ? db.products : db.services).find(
        (s) => s.id === i.itemId,
      );
      return C.calculateLine(
        { ...i, unitCost: s?.cost ?? i.unitCost, saleCommission: s?.comm ?? 0 },
        person || {},
        db.settings,
      );
    });
  } catch (e) {
    calcError = e.message;
  }
  const totals = C.sumLines(computed);
  const externalDue=Math.max(0,totals.revenue-Number(walletUsed||0));
  const catalog = [
    ...db.services.filter(C.active).map((s) => ({ ...s, kind: "service" })),
    ...db.products
      .filter((p) => C.active(p) && p.usage !== "店用")
      .map((p) => ({ ...p, kind: "product", cat: "販賣" })),
  ].filter(
    (s) =>
      (cat === "全部" || s.cat === cat) &&
      s.name.toLowerCase().includes(productQuery.toLowerCase()),
  );
  const add = (s) =>
    setItems([
      ...items,
      {
        id: C.uid("LINE"),
        itemId: s.id,
        kind: s.kind,
        name: s.name,
        category: s.cat,
        originalPrice: s.price,
        unitPrice: s.price,
        unitCost: s.cost,
        quantity: 1,
        assistMode: s.assistMode || "amount",
        assistValue: s.assistValue || 0,
        assistantId: "",
        saleCommission: s.comm || 0,
      },
    ]);
  async function submit() {
    const record = await mutate("結帳完成", (d) =>
      C.checkout(d, {
        id: orderId,
        date,
        gender,
        customerId: memberMode ? customerId : null,
        customer: memberMode ? "" : query,
        staffId,
        payment,
        cashIn: cash,
        walletUsed: memberMode?walletUsed:0,
        items,
      }),
    );
    if (record) {
      setReceipt(record);
      setConfirm(false);
      setItems([]);
      setQuery("");
      setCustomerId("");
      setCash("");
      setWalletUsed(0);
      setOrderId(C.uid("REC"));
    }
  }
  return (
    <>
      {items.length>0&&<div className="draft-note">{draftError||"本視窗草稿已保留"}<button onClick={()=>{if(window.confirm("清除未結帳草稿？")){setItems([]);setWalletUsed(0);setOrderId(C.uid("REC"))}}}>清除草稿</button></div>}
      <Header title="開單結帳" sub="選項在左，明細在右。服務與販賣分開計算。">
        <Input
          label="服務日期"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Header>
      {!staff.length && (
        <div className="notice">
          首次使用：請先到「人員」新增設計師，再到「系統 → 項目」新增服務。
          <Button secondary onClick={() => setTab("s6")}>
            新增人員
          </Button>
        </div>
      )}
      <div className="order-columns">
        <section className="liquid-glass panel catalog-panel">
          <PearlGroup as="div" className="pills">
            {db.settings.genders.map((t) => (
              <button
                key={t}
                className={"pill-toggle " + (gender === t ? "active" : "")}
                onClick={() => setGender(t)}
              >
                {t}
              </button>
            ))}
          </PearlGroup>
          <PearlGroup as="div" className="pills divider">
            {["全部", ...db.settings.classes, "販賣"].map((t) => (
              <button
                key={t}
                className={"pill-toggle " + (cat === t ? "active" : "")}
                onClick={() => setCat(t)}
              >
                {t}
              </button>
            ))}
          </PearlGroup>
          <Input
            label="搜尋服務／商品"
            placeholder="輸入品名"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          <div className="catalog-grid">
            {catalog.map((s) => (
              <button
                key={s.id}
                className="catalog-card"
                onClick={() => add(s)}
                style={{ "--item-color": s.color || "#D4AF37" }}
              >
                <span>
                  {s.cat}
                  {s.kind === "product" ? " · 庫存 " + s.stock : ""}
                </span>
                <h3>{s.name}</h3>
                <b>{fmt(s.price)}</b>
              </button>
            ))}
          </div>
          {!catalog.length && (
            <Empty>尚無符合的項目，可到「系統 → 項目」新增。</Empty>
          )}
        </section>
        <section className="liquid-glass panel order-detail">
          <div className="section-head">
            <h2>結帳明細</h2>
            <PearlGroup as="div" className="pills">
              <button
                className={"pill-toggle " + (!memberMode ? "active" : "")}
                onClick={() => {
                  setMemberMode(false);setWalletUsed(0);
                  setCustomerId("");
                  setQuery("");
                }}
              >
                散客
              </button>
              <button
                className={"pill-toggle " + (memberMode ? "active" : "")}
                onClick={() => {
                  setMemberMode(true);
                  setQuery("");
                }}
              >
                會員
              </button>
            </PearlGroup>
          </div>
          <div className="form-grid">
            <Select
              label="設計師"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              options={[
                { value: "", label: "請選擇" },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Input
              label={memberMode ? "會員姓名或電話" : "散客稱呼（選填）"}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCustomerId("");
              }}
              placeholder={memberMode ? "搜尋後點選會員" : "一般散客"}
            />
          </div>
          {memberMode && !customerId && query && (
            <div className="search-results">
              {customers
                .filter(
                  (c) =>
                    c.name.includes(query) || (c.phone || "").includes(query),
                )
                .slice(0, 10)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomerId(c.id);setWalletUsed(0);
                      setQuery(c.name);
                      if (staff.some((s) => s.id === c.staffId))
                        setStaffId(c.staffId);
                      if (c.gender) setGender(c.gender);
                    }}
                  >
                    <b>{c.name}</b>
                    <span>
                      {c.phone || "未留電話"} · {c.id.slice(-6)}
                    </span>
                  </button>
                ))}
              {!customers.some(
                (c) =>
                  c.name.includes(query) || (c.phone || "").includes(query),
              ) && <p>查無會員，請到顧客頁新增。</p>}
            </div>
          )}
          {customer && (
            <div className="selected-member">
              已選：{customer.name} · {customer.phone} · 累積{" "}
              {fmt(C.customerStats(db, customer.id).totalSpend)}
            </div>
          )}
          <div className="order-items">
            {items.map((i, index) => (
              <div key={i.id} className="order-item">
                <div>
                  <h3>
                    {i.name} <small>× {i.quantity}</small>
                  </h3>
                  <span>
                    {i.kind === "product"
                      ? "販賣"
                      : i.assistantId
                        ? "協助：" +
                          (db.staff.find((s) => s.id === i.assistantId)?.name ||
                            "已停用")
                        : "無協助人員"}
                  </span>
                </div>
                <b>{fmt(Number(i.unitPrice) * Number(i.quantity))}</b>
                <button
                  aria-label={"調整 " + i.name}
                  className="mini"
                  onClick={() => setEdit({ ...i })}
                >
                  調整
                </button>
                <button
                  className="mini danger"
                  aria-label={"移除 " + i.name}
                  onClick={() => setItems(items.filter((x) => x.id !== i.id))}
                >
                  ×
                </button>
              </div>
            ))}
            {!items.length && <Empty>從左側點選服務或商品</Empty>}
          </div>
          {memberMode&&customer&&<div className="wallet-order"><div className="section-head"><b>預付儲值餘額 {fmt(C.walletBalance(db,customer.id))}</b><button className="mini" onClick={()=>setWalletUsed(Math.min(C.walletBalance(db,customer.id),totals.revenue))}>扣抵</button></div><Input label="本次儲值扣款" type="number" min="0" max={Math.min(totals.revenue,C.walletBalance(db,customer.id))} value={walletUsed} onChange={e=>setWalletUsed(e.target.value)}/><p className="hint">其餘應收 {fmt(externalDue)}；儲值扣款不重複列入當期收款。</p></div>}
          <PearlGroup as="div" className="pills divider">
            {db.settings.payments.map((p) => (
              <button
                key={p}
                className={"pill-toggle " + (payment === p ? "active" : "")}
                onClick={() => setPayment(p)}
              >
                {p}
              </button>
            ))}
          </PearlGroup>
          {externalDue>0 && db.settings.cashPayments.includes(payment) && (
            <div className="form-grid cash-row">
              <Input
                label="收現金額"
                type="number"
                min="0"
                step="1"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
              <Field label="應找零錢">
                <b
                  className={
                    Number(cash) < externalDue
                      ? "text-red-500"
                      : "text-green-700"
                  }
                >
                  {Number(cash) < externalDue
                    ? "尚差 " + fmt(externalDue - Number(cash))
                    : fmt(Number(cash) - externalDue)}
                </b>
              </Field>
            </div>
          )}
          {calcError && <p className="error">{calcError}</p>}
          <details>
            <summary>業績與抽成試算</summary>
            <Amounts value={totals} />
            {Number(walletUsed)>0&&<p>儲值扣款 {fmt(walletUsed)} · 其餘收款 {fmt(externalDue)}</p>}
            <p className="hint">
              販賣收入 {fmt(totals.retailRevenue)} · 販賣獎金{" "}
              {fmt(totals.retailBonus)}。抽成以各項四捨五入至元後加總。
            </p>
          </details>
          <div className="total">
            <span>應收合計</span>
            <b>{fmt(totals.revenue)}</b>
          </div>
          <Button
            disabled={busy || !items.length || !!calcError}
            onClick={() => {
              if (memberMode && !customerId) {
                alert("請搜尋並點選會員");
                return;
              }
              setConfirm(true);
            }}
          >
            確認結帳
          </Button>
        </section>
      </div>
      {edit && (
        <Modal title={"調整：" + edit.name} onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                C.calculateLine(edit, person || {}, db.settings);
                setItems(items.map((i) => (i.id === edit.id ? edit : i)));
                setEdit(null);
              } catch (e) {
                alert(e.message);
              }
            }}
          >
            <div className="form-grid">
              <Input
                label="成交單價"
                type="number"
                min="0"
                step="1"
                required
                value={edit.unitPrice}
                onChange={(e) =>
                  setEdit({ ...edit, unitPrice: e.target.value })
                }
              />
              <Input
                label="數量"
                type="number"
                min="1"
                step="1"
                required
                value={edit.quantity}
                onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
              />
            </div>
            <PearlGroup as="div" className="pills">
              <Button
                type="button"
                secondary
                onClick={() =>
                  setEdit({ ...edit, unitPrice: edit.originalPrice })
                }
              >
                恢復原價
              </Button>
              {[9, 8.5, 8].map((n) => (
                <Button
                  type="button"
                  secondary
                  key={n}
                  onClick={() =>
                    setEdit({
                      ...edit,
                      unitPrice: Math.round((edit.originalPrice * n) / 10),
                    })
                  }
                >
                  {n} 折
                </Button>
              ))}
            </PearlGroup>
            {edit.kind === "service" && (
              <>
                <Select
                  label="協助夥伴"
                  value={edit.assistantId}
                  onChange={(e) =>
                    setEdit({ ...edit, assistantId: e.target.value })
                  }
                  options={[
                    { value: "", label: "無" },
                    ...staff
                      .filter((s) => s.id !== staffId)
                      .map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                {edit.assistantId && (
                  <>
                    <div className="form-grid">
                      <Select
                        label="協助費計算"
                        value={edit.assistMode}
                        onChange={(e) =>
                          setEdit({ ...edit, assistMode: e.target.value })
                        }
                        options={[
                          { value: "amount", label: "固定金額／每次服務" },
                          { value: "percent", label: "百分比" },
                        ]}
                      />
                      <Input
                        label={
                          edit.assistMode === "percent"
                            ? "協助費比例 %"
                            : "每次協助費 $"
                        }
                        type="number"
                        min="0"
                        max={edit.assistMode === "percent" ? 100 : undefined}
                        step={edit.assistMode === "percent" ? "0.01" : "1"}
                        value={edit.assistValue}
                        onChange={(e) =>
                          setEdit({ ...edit, assistValue: e.target.value })
                        }
                      />
                    </div>
                    <p className="notice">
                      比例基礎＝成交總額－材料總額；固定金額按服務數量計算。協助費先扣，再計設計師抽成。
                    </p>
                  </>
                )}
              </>
            )}
            <p className="hint">
              材料／成本單價 {fmt(edit.unitCost)}
              。成交金額低於成本時可能產生負業績，請核對。
            </p>
            <Button type="submit">儲存調整</Button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal title="結帳確認" onClose={() => setConfirm(false)}>
          <p>
            {date} · {person?.name || "未選設計師"} ·{" "}
            {customer?.name || query || "一般散客"}
          </p>
          <Amounts value={totals} />
            {Number(walletUsed)>0&&<p>儲值扣款 {fmt(walletUsed)} · 其餘收款 {fmt(externalDue)}</p>}
          <div className="total">
            <span>{payment}應收</span>
            <b>{fmt(totals.revenue)}</b>
          </div>
          {totals.actual < 0 && (
            <p className="error">
              實際業績為負數，抽成會按公式計算為負數，請核對後再結帳。
            </p>
          )}
          <p className="hint">
            確認後保存完整明細。需要更正時，作廢原單再重新開單。
          </p>
          <Button disabled={busy} onClick={submit}>
            {busy ? "儲存中…" : "確認收款並結帳"}
          </Button>
        </Modal>
      )}
      {receipt && <Receipt record={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
function Receipt({ record: r, onClose }) {
  const { db } = useDB();
  return (
    <Modal title="交易收據" onClose={onClose}>
      <div className="receipt-print">
        <h2>{db.settings.shopName}</h2>
        <p>
          {r.date} {r.time} · {r.customer}
        </p>
        <p className="hint">單號 {r.id}</p>
        {r.items?.map((l) => (
          <div className="receipt-line" key={l.id}>
            <span>
              {l.name} × {l.quantity}
            </span>
            <b>{fmt(l.revenue)}</b>
          </div>
        ))}
        <div className="total">
          <span>消費合計</span>
          <b>{fmt(r.total)}</b>
        </div>
        <p>儲值扣款 {fmt(r.walletUsed||0)} · {r.payment}收款 {fmt(r.externalPaid??r.total)}</p><p>感謝您的光臨</p>
        <small>交易明細，非統一發票</small>
      </div>
      <PearlGroup as="div" className="pills no-print">
        <Button secondary onClick={() => window.print()}>
          列印／另存 PDF
        </Button>
        <Button onClick={onClose}>完成</Button>
      </PearlGroup>
    </Modal>
  );
}
function RecordDetail({ r, onClose }) {
  return (
    <Modal title="單據明細" onClose={onClose} wide>
      <p>
        {r.date} · {r.customer} · {r.staff} · {r.payment} ·{" "}
        {r.status === "void" ? "已作廢" : "已結帳"}
      </p>
      {C.complete(r) ? (
        <>
          <Amounts value={r} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>項目</th>
                  <th>數量</th>
                  <th>收費</th>
                  <th>材料／成本</th>
                  <th>協助費</th>
                  <th>抽成／獎金</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.name}
                      <small>
                        {l.kind === "service" ? l.category : "販賣"}
                        {l.assistantName ? " · " + l.assistantName : ""}
                      </small>
                    </td>
                    <td>{l.quantity}</td>
                    <td>{fmt(l.revenue)}</td>
                    <td>{fmt(l.material)}</td>
                    <td>
                      {fmt(l.assistance)}
                      {l.assistantId && (
                        <small>
                          {l.assistMode === "percent"
                            ? l.assistValue + "% × " + fmt(l.assistanceBase)
                            : fmt(l.assistValue) + "／次"}
                        </small>
                      )}
                    </td>
                    <td>
                      {fmt(l.kind === "service" ? l.commission : l.retailBonus)}
                      <small>比例 {l.rate}%</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="notice">
          歷史單據明細不足，業績與薪資待核對；保留原始實收 {fmt(r.total)}
          ，不套用新規則。
        </p>
      )}
      {r.voidReason && <p className="error">作廢原因：{r.voidReason}</p>}
      <p className="hint">{r.id}</p>
    </Modal>
  );
}
function Records() {
  const { db, mutate } = useDB();
  const [range, setRange] = useState(newRange),
    [q, setQ] = useState(""),
    [sid, setSid] = useState(""),
    [status, setStatus] = useState("all"),
    [detail, setDetail] = useState(null),
    [receipt, setReceipt] = useState(null),
    [voiding, setVoiding] = useState(null),
    [reason, setReason] = useState("");
  const [a, b] = dates(range);
  const valid = C.validDate(a) && C.validDate(b) && a <= b;
  const rs = valid
    ? db.records.filter(
        (r) =>
          r.date >= a &&
          r.date <= b &&
          (!sid || r.staffId === sid) &&
          (status === "all" || r.status === status) &&
          (r.customer.includes(q) || r.id.includes(q)),
      )
    : [];
  return (
    <>
      <Header title="查單對帳" sub="查詢完整日期區間；已結帳內容保留快照。" />
      <DateRange range={range} setRange={setRange} />
      <div className="filters">
        <Input
          label="搜尋客名／單號"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          label="設計師"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          options={[
            { value: "", label: "所有人" },
            ...db.staff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="狀態"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "posted", label: "已結帳" },
            { value: "void", label: "已作廢" },
          ]}
        />
      </div>
      {!valid && <p className="error">請核對起訖日期</p>}
      <div className="liquid-glass panel">
        <div className="section-head">
          <h2>{rs.length} 筆單據</h2>
          <b>
            有效消費{" "}
            {fmt(rs.filter(C.eligible).reduce((s, r) => s + r.total, 0))}
          </b>
        </div>
        {rs.map((r) => (
          <div className="record-card" key={r.id}>
            <div>
              <span className="hint">
                {r.date} {r.time}
              </span>
              <h3>
                {r.customer} <small>{r.staff}</small>
              </h3>
              <span className="hint">
                {r.items?.map((l) => l.name).join("、") ||
                  r.services?.join("、") ||
                  "歷史明細待核對"}
              </span>
            </div>
            <div>
              <b className="record-amount">{fmt(r.total)}</b>
              <small>
                {r.payment} · {r.status === "void" ? "已作廢" : "已結帳"}
              </small>
            </div>
            <PearlGroup as="div" className="pills">
              <Button secondary onClick={() => setDetail(r)}>
                明細
              </Button>
              {C.eligible(r) && (
                <>
                  <Button secondary onClick={() => setReceipt(r)}>
                    收據
                  </Button>
                  <Button
                    secondary
                    danger
                    onClick={() => {
                      setVoiding(r);
                      setReason("");
                    }}
                  >
                    作廢
                  </Button>
                </>
              )}
            </PearlGroup>
          </div>
        ))}
        {!rs.length && <Empty>此區間沒有符合的單據</Empty>}
      </div>
      {detail && <RecordDetail r={detail} onClose={() => setDetail(null)} />}{" "}
      {receipt && <Receipt record={receipt} onClose={() => setReceipt(null)} />}{" "}
      {voiding && (
        <Modal title="作廢單據" onClose={() => setVoiding(null)}>
          <p>
            {voiding.customer} · {fmt(voiding.total)}
          </p>
          <p className="notice">
            將保留原單、回補販賣庫存及儲值扣款。另收款項需實際退還客人，系統同步登記退款。更正請另開新單。
          </p>
          <Input
            label="作廢原因（必填）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            danger
            onClick={async () => {
              if (
                await mutate("單據作廢", (d) =>
                  C.voidRecord(d, voiding.id, reason),
                )
              )
                setVoiding(null);
            }}
          >
            確認作廢
          </Button>
        </Modal>
      )}
    </>
  );
}
function Reports() {
  const { db } = useDB();
  const [drawer, setDrawer] = useState("營運報表"),
    [range, setRange] = useState(newRange),
    [sid, setSid] = useState(""),
    [detail, setDetail] = useState(null),
    [serviceDetail, setServiceDetail] = useState(null);
  const [a, b] = dates(range);
  let summary = null,
    error = "";
  try {
    summary = C.summarize(db, a, b, sid);
  } catch (e) {
    error = e.message;
  }
  return (
    <div className="report-columns">
      <PearlGroup as="aside" className="report-nav">
        <h1 className="text-gold-gradient">REPORT</h1>
        {["營運報表", "薪資表", "庫存報表", "收支摘要", "損益試算"].map((n) => (
          <button
            className={drawer === n ? "selected" : ""}
            key={n}
            onClick={() => setDrawer(n)}
          >
            {n}
          </button>
        ))}
      </PearlGroup>
      <div className="report-body">
        {drawer === "損益試算" ? <><Header title="損益試算" sub="消費業績、成本與人員報酬分開核對。"/><DateRange range={range} setRange={setRange}/>{summary?<Profit start={a} end={b}/>:<p className="error">{error}</p>}</> : drawer === "薪資表" ? (
          <Payroll />
        ) : drawer === "庫存報表" ? (
          <>
            <Header title="庫存報表" sub="即時庫存，不受交易日期篩選影響。" />
            <div className="metric-grid">
              <div className="metric">
                <span>有效品項</span>
                <b>{db.products.filter(C.active).length}</b>
              </div>
              <div className="metric">
                <span>低於安全庫存</span>
                <b>
                  {
                    db.products.filter((p) => C.active(p) && p.stock < p.safety)
                      .length
                  }
                </b>
              </div>
              <div className="metric">
                <span>庫存估值（設定成本）</span>
                <b>
                  {fmt(
                    db.products
                      .filter(C.active)
                      .reduce((s, p) => s + p.stock * p.cost, 0),
                  )}
                </b>
              </div>
            </div>
            <div className="liquid-glass panel">
              {db.products.filter(C.active).map((p) => (
                <div key={p.id} className="list-row">
                  <div>
                    <h3>{p.name}</h3>
                    <small>
                      {p.vendor || "未指定廠商"} · {p.type} · {p.usage}
                    </small>
                  </div>
                  <b className={p.stock < p.safety ? "text-red-500" : ""}>
                    {p.stock} / 安全量 {p.safety}
                  </b>
                </div>
              ))}
              {!db.products.length && <Empty />}
            </div>
          </>
        ) : (
          <>
            <Header title={drawer} sub="先看摘要，再展開明細。" />
            <DateRange range={range} setRange={setRange} />
            {drawer === "營運報表" && (
              <Select
                label="統計對象"
                value={sid}
                onChange={(e) => setSid(e.target.value)}
                options={[
                  { value: "", label: "全店" },
                  ...db.staff.map((s) => ({
                    value: s.id,
                    label: s.name + (s.archived ? "（已停用）" : ""),
                  })),
                ]}
              />
            )}{" "}
            {error ? (
              <p className="error">{error}</p>
            ) : drawer === "收支摘要" ? (
              <CashSummary start={a} end={b} />
            ) : (
              <>
                {summary.reviewCount > 0 && (
                  <p className="notice">
                    {summary.reviewCount}{" "}
                    筆歷史資料待核對：僅納入原始實收，不估算服務業績、成本與抽成。
                  </p>
                )}
                <Amounts value={summary} />
                <div className="summary-strip">
                  <span>
                    服務客次 <b>{summary.visits}</b>
                  </span>
                  <span>
                    服務數量 <b>{summary.quantity}</b>
                  </span>
                  <span>
                    販賣收入 <b>{fmt(summary.retailRevenue)}</b>
                  </span>
                  <span>
                    全部有效消費 <b>{fmt(summary.receiptRevenue)}</b>
                  </span>
                </div>
                <p className="hint">
                  服務客次＝含服務的有效帳單數；同客再次結帳另計一次。數量＝服務明細數量合計。
                </p>
                <details className="liquid-glass panel">
                  <summary>各服務金額、客次與占比</summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>服務類別</th>
                          <th>金額</th>
                          <th>客次</th>
                          <th>數量</th>
                          <th>金額占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.categories.map((c) => (
                          <tr key={c.name}>
                            <td>
                              <button
                                className="mini"
                                onClick={() => setServiceDetail(c.name)}
                              >
                                {c.name} ›
                              </button>
                            </td>
                            <td>{fmt(c.amount)}</td>
                            <td>{c.visits}</td>
                            <td>{c.quantity}</td>
                            <td>{c.share.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!summary.categories.length && <Empty />}
                  <p className="hint">
                    占比分母為折扣後服務收費，不含販賣。同單多種服務的分類客次不可相加作為全店客次。
                  </p>
                </details>
                <details className="liquid-glass panel">
                  <summary>付款方式與客群</summary><p className="hint">有效消費單的付款拆分；儲值扣款 {fmt(summary.records.reduce((s,r)=>s+(r.walletUsed||0),0))}。當期儲值收款與退款請看收支摘要。</p>
                  <div className="form-grid">
                    <div>
                      {[...new Set([...db.settings.payments,...summary.records.map((r) => r.payment)])].map(
                        (p) => (
                          <div className="list-row" key={p}>
                            <span>{p}</span>
                            <b>
                              {fmt(
                                summary.records
                                  .filter((r) => r.payment === p)
                                  .reduce((s, r) => s + (r.externalPaid??r.total), 0),
                              )}
                            </b>
                          </div>
                        ),
                      )}
                    </div>
                    <div>
                      {[
                        ...new Set(
                          summary.records.map((r) => r.gender || "未記錄"),
                        ),
                      ].map((g) => {
                        const n = summary.records.filter(
                          (r) => (r.gender || "未記錄") === g,
                        ).length;
                        return (
                          <div className="list-row" key={g}>
                            <span>{g}</span>
                            <b>
                              {n} 單 ·{" "}
                              {((n / (summary.receipts || 1)) * 100).toFixed(1)}
                              %
                            </b>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
                <details className="liquid-glass panel">
                  <summary>交易明細（{summary.receipts} 筆）</summary>
                  {summary.records.map((r) => (
                    <button
                      key={r.id}
                      className="list-row clickable"
                      onClick={() => setDetail(r)}
                    >
                      <span>
                        {r.date} · {r.customer} · {r.staff}
                      </span>
                      <b>{fmt(r.total)}</b>
                    </button>
                  ))}
                </details>
              </>
            )}
          </>
        )}
        {detail && <RecordDetail r={detail} onClose={() => setDetail(null)} />}{" "}
        {serviceDetail && summary && (
          <ServiceBreakdown
            category={serviceDetail}
            records={summary.records}
            onClose={() => setServiceDetail(null)}
          />
        )}
      </div>
    </div>
  );
}
function ServiceBreakdown({ category, records, onClose }) {
  const lines = records
    .filter(C.complete)
    .flatMap((r) => r.items)
    .filter((l) => l.kind === "service" && l.category === category);
  const ids = [...new Set(lines.map((l) => l.itemId))];
  const total = lines.reduce((a, l) => a + l.revenue, 0);
  return (
    <Modal title={category + " · 各項服務"} onClose={onClose} wide>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>服務品名</th>
              <th>收費</th>
              <th>數量</th>
              <th>客次</th>
              <th>類別內占比</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const ls = lines.filter((l) => l.itemId === id),
                amount = ls.reduce((a, l) => a + l.revenue, 0);
              return (
                <tr key={id}>
                  <td>{ls[0].name}</td>
                  <td>{fmt(amount)}</td>
                  <td>{ls.reduce((a, l) => a + l.quantity, 0)}</td>
                  <td>
                    {
                      records.filter((r) =>
                        r.items?.some((l) => l.itemId === id),
                      ).length
                    }
                  </td>
                  <td>{(total ? (amount / total) * 100 : 0).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">
        按帳單保存的成交金額加總；占比以此服務類別金額為分母。
      </p>
    </Modal>
  );
}
function CashSummary({ start, end }) {
  const { db } = useDB();
  const cash=C.cashReport(db,start,end),income=cash.income,expenses=cash.expenses,out=cash.out;
  return (
    <>
      <div className="metric-grid">
        {[
          ["當期收款淨額", income],
          ["已登記付款", out],
          ["收支差額", income - out],
        ].map(([n, v]) => (
          <div className="metric" key={n}>
            <span>{n}</span>
            <b>{fmt(v)}</b>
          </div>
        ))}
      </div>
      <p className="notice">
        儲值收款在收款日計入；消費時僅計額外收款，作廢退款按退款日扣除。期末未消費預收餘額 {fmt(cash.prepaid)}。此頁是收付款摘要。進貨付款、借支與薪資付款各列一次；店內耗用只記庫存，不再當成付款。尚欠貨款、未付薪資不計入已付款；這個差額不等於會計淨利。
      </p>
      <details className="liquid-glass panel"><summary>收款方式明細</summary>{[...new Set([...db.settings.payments,...cash.rows.map(r=>r.payment)])].map(p=><div className="list-row" key={p}><span>{p}</span><b>{fmt(cash.rows.filter(r=>r.payment===p).reduce((s,r)=>s+r.amount,0))}</b></div>)}</details>
      <details className="liquid-glass panel" open>
        <summary>付款分類</summary>
        {[...new Set(expenses.map((e) => e.type))].map((t) => (
          <div className="list-row" key={t}>
            <span>{t}</span>
            <b>
              {fmt(
                expenses
                  .filter((e) => e.type === t)
                  .reduce((s, e) => s + e.amount, 0),
              )}
            </b>
          </div>
        ))}
        {!expenses.length && <Empty />}
      </details>
    </>
  );
}
function Payroll() {
  const { db, mutate } = useDB();
  const [month, setMonth] = useState(C.today().slice(0, 7)),
    [sid, setSid] = useState(""),
    [view, setView] = useState(null),
    [payDate, setPayDate] = useState(C.today());
  const ps = db.payrolls.filter((p) => p.month === month);
  const current = view ? db.payrolls.find((p) => p.id === view) : null;
  async function generate() {
    const id = await mutate("產生薪資草稿", (d) => {
      C.fail(sid, "請選擇人員");
      const existing = d.payrolls.find(
        (p) => p.staffId === sid && p.month === month,
      );
      C.fail(
        !existing || existing.status === "draft",
        "此月份薪資已確認，不可覆寫",
      );
      const p = C.payrollDraft(d, sid, month);
      d.payrolls = d.payrolls.filter((x) => x.id !== existing?.id);
      d.payrolls.unshift(p);
      return p.id;
    });
    if (id) setView(id);
  }
  return (
    <>
      <Header title="薪資表" sub="草稿核對 → 已確認 → 登記付款。" />
      <div className="filters">
        <Input
          label="薪資月份"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <Select
          label="人員"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          options={[
            { value: "", label: "請選擇" },
            ...db.staff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Button onClick={generate}>產生／重算草稿</Button>
      </div>
      <p className="hint">
        草稿重算會重新帶入帳目並清除手動核對。全勤預設
        0，需逐月核對；確認後鎖定相關月份交易。
      </p>
      {ps.map((p) => (
        <div key={p.id} className="liquid-glass panel payroll-card">
          <div>
            <h2>{p.staffName}</h2>
            <span className={"badge " + (p.reviewCount ? "warning" : "")}>
              {p.status === "draft"
                ? "草稿"
                : p.status === "confirmed"
                  ? "已確認"
                  : "已付"}
            </span>
            {p.reviewCount > 0 && <small className="error">資料待核對</small>}
          </div>
          <div>
            <span className="hint">應付薪資</span>
            <b className="record-amount">{fmt(C.payrollTotal(p))}</b>
          </div>
          <Button
            secondary
            onClick={() => {
              setView(p.id);
              setPayDate(C.today());
            }}
          >
            查看薪資條
          </Button>
        </div>
      ))}
      {!ps.length && <Empty>此月份尚未產生薪資條</Empty>}
      {current && (
        <Modal
          title={current.month + " " + current.staffName + " 薪資條"}
          onClose={() => setView(null)}
          wide
        >
          <div className="receipt-print">
            <h2 className="print-only">{db.settings.shopName}｜{current.month} {current.staffName} 薪資條</h2>
            <p className="badge">
              {current.status === "draft"
                ? "草稿"
                : current.status === "confirmed"
                  ? "已確認"
                  : "已付"}
            </p>
            {current.reviewCount > 0 && (
              <p className="notice">
                有歷史明細或薪酬規則不足，請核對來源。此草稿不能確認或付款。
              </p>
            )}
            <div className="form-grid">
              {[
                ["baseSalary", "底薪"],
                ["jobBonus", "加給"],
                ["allowance", "津貼"],
                ["attendanceBonus", "本月全勤"],
                ["serviceCommission", "服務抽成"],
                ["retailBonus", "販賣獎金"],
                ["assistance", "協助收入"],
                ["advance", "已借支（扣除）"],
                ["adjustment", "其他加扣（負數為扣）"],
              ].map(([k, label]) => (
                <div className="list-row" key={k}>
                  <span>{label}</span>
                  <b>{fmt(current[k])}</b>
                </div>
              ))}
            </div>
            <div className="total">
              <span>應付薪資</span>
              <b>{fmt(C.payrollTotal(current))}</b>
            </div>
            <p>備註：{current.note || "無"}</p>
            {current.paidAt && <p>付款日期：{current.paidAt}</p>}
          </div>
          {current.status === "draft" && (
            <PayrollEdit key={current.id + current.generatedAt} p={current} />
          )}
          <PearlGroup as="div" className="pills no-print">
            {current.status === "draft" && (
              <Button
                disabled={!!current.reviewCount}
                onClick={() =>
                  mutate("確認薪資", (d) => C.confirmPayroll(d, current.id))
                }
              >
                確認薪資條
              </Button>
            )}
            {current.status === "confirmed" && (
              <>
                <Button
                  secondary
                  onClick={() =>
                    mutate("撤回薪資確認", (d) => {
                      const p = d.payrolls.find((p) => p.id === current.id);
                      C.fail(p.status === "confirmed", "僅已確認薪資可撤回");
                      p.status = "draft";
                      p.checked = false;
                    })
                  }
                >
                  撤回為草稿
                </Button>
                <Input
                  label="付款日期"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (confirm("確認已實際支付？將自動登記一次薪資支出。"))
                      mutate("薪資已付", (d) =>
                        C.payPayroll(d, current.id, payDate),
                      );
                  }}
                >
                  登記已付
                </Button>
              </>
            )}
            <Button secondary onClick={() => window.print()}>
              列印薪資條
            </Button>
          </PearlGroup>
          <p className="hint no-print">
            已付薪資不提供直接覆寫；更正及追補流程留待第二階段驗收。
          </p>
        </Modal>
      )}
    </>
  );
}
function PayrollEdit({ p }) {
  const { mutate } = useDB();
  const [f, setF] = useState({
    attendanceBonus: p.attendanceBonus,
    adjustment: p.adjustment,
    note: p.note,
    checked: p.checked || false,
  });
  return (
    <form
      className="panel no-print"
      onSubmit={async (e) => {
        e.preventDefault();
        await mutate("儲存薪資核對", (d) => {
          const x = d.payrolls.find((x) => x.id === p.id);
          C.fail(x.status === "draft", "薪資狀態已變更");
          x.attendanceBonus = C.money(f.attendanceBonus, "全勤");
          x.adjustment = C.money(f.adjustment, "加扣項", -100000000);
          C.fail(
            Number(f.adjustment) === 0 || f.note.trim(),
            "有加扣項時須寫備註",
          );
          x.note = f.note;
          x.checked = f.checked;
        });
      }}
    >
      <p className="hint">
        設定全勤參考：{fmt(p.attendanceSuggested)}
        。底薪／加給／津貼若不符，先修改人員設定後重算草稿。
      </p>
      <div className="form-grid">
        <Input
          label="本月全勤"
          type="number"
          min="0"
          step="1"
          value={f.attendanceBonus}
          onChange={(e) => setF({ ...f, attendanceBonus: e.target.value })}
        />
        <Input
          label="其他加扣"
          type="number"
          step="1"
          value={f.adjustment}
          onChange={(e) => setF({ ...f, adjustment: e.target.value })}
        />
      </div>
      <Input
        label="核對備註"
        value={f.note}
        onChange={(e) => setF({ ...f, note: e.target.value })}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          checked={f.checked}
          onChange={(e) => setF({ ...f, checked: e.target.checked })}
        />
        已核對本月底薪、全勤、加扣項與借支
      </label>
      <Button secondary type="submit">
        儲存核對內容
      </Button>
    </form>
  );
}
function Customers() {
  const { db, mutate,openCustomer } = useDB();
  const [view,setView]=useState("顧客資料");
  const [q, setQ] = useState(""),
    [sid, setSid] = useState(""),
    [edit, setEdit] = useState(null),
    [history, setHistory] = useState(null),
    [detail, setDetail] = useState(null),
    [showArchived, setShowArchived] = useState(false);
  const filtered = db.customers.filter(
    (c) =>
      (showArchived || C.active(c)) &&
      (!sid || c.staffId === sid) &&
      (c.name.includes(q) || (c.phone || "").includes(q)),
  );
  const blank = () => ({
    id: C.uid("CUS"),
    name: "",
    phone: "",
    staffId: "",
    gender: db.settings.genders[0] || "",
    tags: [],
    birthday: "",
    note: "",
    color: "#D4AF37",
  });
  return (
    <>
      <PearlGroup className="pills">{['顧客資料','預付儲值'].map(n=><button key={n} className={'pill-toggle '+(view===n?'active':'')} onClick={()=>setView(n)}>{n}</button>)}</PearlGroup>
      {view==='預付儲值'?<Wallet/>:<>
      <Header title="顧客" sub="會員以獨立編號連動，修改姓名不影響消費紀錄。">
        <Button onClick={() => setEdit(blank())}>＋新增顧客</Button>
      </Header>
      <div className="filters">
        <Input
          label="搜尋姓名或電話"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          label="指定設計師"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          options={[
            { value: "", label: "所有人" },
            ...db.staff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          含已停用
        </label>
      </div>
      <div className="entity-grid">
        {filtered.map((c) => {
          const stats = C.customerStats(db, c.id);
          return (
            <div
              key={c.id}
              className="liquid-glass entity-card"
              style={{ "--item-color": c.color }}
            >
              <div className="section-head">
                <h2>{c.name}</h2>
                <Button secondary onClick={() => setEdit(C.copy(c))}>
                  編輯
                </Button>
              </div>
              <PearlGroup as="div" className="pills">
                {c.tags.map((id) => {
                  const t = db.settings.customerTags.find((t) => t.id === id);
                  return (
                    t && (
                      <span
                        key={id}
                        className="badge"
                        style={{ background: t.color, color: "#fff" }}
                      >
                        {t.name}
                      </span>
                    )
                  );
                })}
                {c.archived && <span className="badge warning">已停用</span>}
              </PearlGroup>
              <div className="list-row">
                <span>電話</span>
                <b>{c.phone || "未設定"}</b>
              </div>
              <div className="list-row">
                <span>指定設計師</span>
                <b>
                  {db.staff.find((s) => s.id === c.staffId)?.name || "未指定"}
                </b>
              </div>
              <div className="list-row">
                <span>累積消費</span>
                <b className="gold">{fmt(stats.totalSpend)}</b>
              </div>
              <div className="list-row">
                <span>服務客次</span>
                <b>{stats.visitCount}</b>
              </div>
              <p className="hint">最近消費：{stats.lastVisit || "尚無紀錄"}</p>
              <p className="note">{c.note || "無備註"}</p>
              {C.active(c)&&<Button onClick={()=>openCustomer(c.id)}>帶入開單</Button>}
              <Button secondary onClick={() => setHistory(c.id)}>
                消費紀錄
              </Button>
            </div>
          );
        })}
      </div>
      {!filtered.length && <Empty>尚無符合的顧客</Empty>}
      {edit && (
        <Modal title="顧客資料" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate("儲存顧客", (d) => {
                  C.fail(edit.name.trim(), "請輸入姓名");
                  C.fail(
                    !edit.birthday || C.validDate(edit.birthday),
                    "生日無效",
                  );
                  const old = d.customers.find((c) => c.id === edit.id);
                  if (old)
                    Object.assign(old, { ...edit, name: edit.name.trim() });
                  else d.customers.push({ ...edit, name: edit.name.trim() });
                })
              )
                setEdit(null);
            }}
          >
            <div className="form-grid">
              <Input
                label="姓名"
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
              <Input
                label="電話"
                type="tel"
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
              <Select
                label="指定設計師"
                value={edit.staffId}
                onChange={(e) => setEdit({ ...edit, staffId: e.target.value })}
                options={[
                  { value: "", label: "不指定" },
                  ...db.staff
                    .filter((s) => C.active(s) || s.id === edit.staffId)
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Select
                label="客群"
                value={edit.gender}
                onChange={(e) => setEdit({ ...edit, gender: e.target.value })}
                options={db.settings.genders}
              />
              <Input
                label="生日"
                type="date"
                value={edit.birthday}
                onChange={(e) => setEdit({ ...edit, birthday: e.target.value })}
              />
              <Input
                label="代表色"
                type="color"
                value={edit.color}
                onChange={(e) => setEdit({ ...edit, color: e.target.value })}
              />
            </div>
            <Field label="會員標籤">
              <PearlGroup as="div" className="pills">
                {db.settings.customerTags.map((t) => (
                  <label className="checkbox" key={t.id}>
                    <input
                      type="checkbox"
                      checked={edit.tags.includes(t.id)}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          tags: e.target.checked
                            ? [...edit.tags, t.id]
                            : edit.tags.filter((id) => id !== t.id),
                        })
                      }
                    />
                    {t.name}
                  </label>
                ))}
              </PearlGroup>
            </Field>
            <Input
              label="備註"
              value={edit.note}
              onChange={(e) => setEdit({ ...edit, note: e.target.value })}
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!edit.archived}
                onChange={(e) =>
                  setEdit({ ...edit, archived: e.target.checked })
                }
              />
              停用（保留消費紀錄）
            </label>
            <Button type="submit">儲存顧客</Button>
          </form>
        </Modal>
      )}
      {history && (
        <Modal title="會員消費紀錄" onClose={() => setHistory(null)}>
          {C.customerStats(db, history).history.map((r) => (
            <button
              className="list-row clickable"
              key={r.id}
              onClick={() => {
                setHistory(null);
                setDetail(r);
              }}
            >
              <span>
                {r.date} · {r.staff}
              </span>
              <b>{fmt(r.total)}</b>
            </button>
          ))}
          {!C.customerStats(db, history).history.length && <Empty />}
        </Modal>
      )}
      {detail && <RecordDetail r={detail} onClose={() => setDetail(null)} />}
    </>}
    </>
  );
}
function Staff() {
  const { db, mutate } = useDB();
  const [edit, setEdit] = useState(null);
  const blank = () => ({
    id: C.uid("STAFF"),
    name: "",
    role: "設計師",
    baseSalary: 0,
    jobBonus: 0,
    attendanceBonus: 0,
    allowance: 0,
    commissionType: "全店統一",
    commissionValue: 50,
    salaryEffectiveMonth: C.today().slice(0, 7),
    color: "#D4AF37",
    note: "",
  });
  return (
    <>
      <Header title="人員管理" sub="薪酬規則用於新交易；舊帳保留原比例。">
        <Button onClick={() => setEdit(blank())}>＋新增夥伴</Button>
      </Header>
      <div className="entity-grid">
        {db.staff.map((s) => (
          <div
            key={s.id}
            className="liquid-glass entity-card"
            style={{ "--item-color": s.color }}
          >
            <div className="section-head">
              <span
                className="badge"
                style={{ background: s.color, color: "#fff" }}
              >
                {s.role}
                {s.archived ? " · 已停用" : ""}
              </span>
              <Button secondary onClick={() => setEdit(C.copy(s))}>
                編輯
              </Button>
            </div>
            <h2>{s.name}</h2>
            <div className="form-grid">
              {[
                ["底薪", s.baseSalary],
                ["全勤", s.attendanceBonus],
                ["加給", s.jobBonus],
                ["津貼", s.allowance],
              ].map(([n, v]) => (
                <div className="metric small" key={n}>
                  <span>{n}</span>
                  <b>{fmt(v)}</b>
                </div>
              ))}
            </div>
            <p>
              服務比例：
              {s.commissionType === "個別設定"
                ? s.commissionValue
                : db.settings.defaultCommission}
              % <small>（{s.commissionType}）</small>
            </p>
            <p className="note">{s.note || "無備註"}</p>
          </div>
        ))}
      </div>
      {!db.staff.length && <Empty>請新增第一位設計師</Empty>}
      {edit && (
        <Modal title="夥伴與薪酬設定" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate("儲存人員", (d) => {
                  C.fail(edit.name.trim(), "請輸入姓名");
                  C.fail(edit.role.trim(), "請輸入職位");
                  const s = { ...edit, name: edit.name.trim() };
                  for (const k of [
                    "baseSalary",
                    "jobBonus",
                    "attendanceBonus",
                    "allowance",
                  ])
                    s[k] = C.money(s[k], k);
                  s.commissionValue = C.percent(s.commissionValue);
                  C.fail(
                    /^\d{4}-(0[1-9]|1[0-2])$/.test(s.salaryEffectiveMonth),
                    "薪酬有效月份無效",
                  );
                  const old = d.staff.find((x) => x.id === s.id);
                  if (old) Object.assign(old, s);
                  else d.staff.push(s);
                })
              )
                setEdit(null);
            }}
          >
            <div className="form-grid">
              <Input
                label="姓名"
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
              <Input
                label="職位（可自訂）"
                required
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value })}
              />
              {[
                ["baseSalary", "底薪"],
                ["jobBonus", "固定加給"],
                ["attendanceBonus", "全勤參考金額"],
                ["allowance", "固定津貼"],
              ].map(([k, n]) => (
                <Input
                  key={k}
                  label={n}
                  type="number"
                  min="0"
                  step="1"
                  value={edit[k]}
                  onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                />
              ))}
            </div>
            <Input
              label="目前薪酬規則適用起月"
              type="month"
              required
              value={edit.salaryEffectiveMonth}
              onChange={(e) =>
                setEdit({ ...edit, salaryEffectiveMonth: e.target.value })
              }
            />
            <p className="hint">
              早於適用起月的薪資標示待核對。修改底薪時，請同步更新起月；已確認薪資保持原快照。
            </p>
            <Select
              label="服務抽成來源"
              value={edit.commissionType}
              onChange={(e) =>
                setEdit({ ...edit, commissionType: e.target.value })
              }
              options={["全店統一", "個別設定"]}
            />
            {edit.commissionType === "個別設定" && (
              <Input
                label="實際業績抽成 %"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={edit.commissionValue}
                onChange={(e) =>
                  setEdit({ ...edit, commissionValue: e.target.value })
                }
              />
            )}
            <p className="notice">
              服務抽成＝（折扣後服務收費－材料－協助費）×
              設計師比例。販賣獎金使用商品設定，另外列示。
            </p>
            <Input
              label="代表色"
              type="color"
              value={edit.color}
              onChange={(e) => setEdit({ ...edit, color: e.target.value })}
            />
            <Input
              label="備註"
              value={edit.note}
              onChange={(e) => setEdit({ ...edit, note: e.target.value })}
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!edit.archived}
                onChange={(e) =>
                  setEdit({ ...edit, archived: e.target.checked })
                }
              />
              停用（歷史業績與薪資保留）
            </label>
            <Button type="submit">儲存人員</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ItemEditor({ item, kind, onClose }) {
  const { db, mutate } = useDB();
  const product = kind === "product";
  const [f, setF] = useState(
    item || {
      id: C.uid(product ? "PROD" : "SERV"),
      name: "",
      price: 0,
      cost: 0,
      color: "#D4AF37",
      cat: db.settings.classes[0] || "",
      assistMode: "amount",
      assistValue: 0,
      comm: 0,
      stock: 0,
      safety: 0,
      vendor: db.settings.vendors[0] || "",
      type: db.settings.productTypes[0] || "其他",
      usage: "販賣",
    },
  );
  const exists = (product ? db.products : db.services).some(
    (s) => s.id === f.id,
  );
  return (
    <Modal title={product ? "商品設定" : "服務設定"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate("儲存" + (product ? "商品" : "服務"), (d) => {
              C.fail(f.name.trim(), "請輸入品名");
              const x = {
                ...f,
                name: f.name.trim(),
                price: C.money(f.price, "售價"),
                cost: C.money(f.cost, "成本"),
              };
              if (product) {
                x.safety = C.money(f.safety, "安全庫存");
                x.comm = C.percent(f.comm, "販賣獎金比例");
                C.fail(
                  ["販賣", "店用", "兩用"].includes(x.usage),
                  "請選擇用途",
                );
                C.fail(x.type, "請先建立商品種類");
                const old = d.products.find((p) => p.id === x.id);
                if (old) {
                  x.stock = old.stock;
                  Object.assign(old, x);
                } else {
                  x.stock = C.money(f.stock, "初始庫存");
                  d.products.push(x);
                  if (x.stock)
                    d.movements.unshift({
                      id: C.uid("MOV"),
                      date: C.today(),
                      productId: x.id,
                      name: x.name,
                      type: "期初庫存",
                      quantity: x.stock,
                      unitCost: x.cost,
                      note: "建立商品期初量",
                    });
                }
              } else {
                x.assistValue =
                  f.assistMode === "percent"
                    ? C.percent(f.assistValue, "協助費比例")
                    : C.money(f.assistValue, "協助費");
                C.fail(d.settings.classes.includes(f.cat), "請選擇服務類別");
                const old = d.services.find((s) => s.id === x.id);
                if (old) Object.assign(old, x);
                else d.services.push(x);
              }
            })
          )
            onClose();
        }}
      >
        <Input
          label="項目品名"
          required
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <div className="form-grid">
          <Input
            label="售價／每件"
            type="number"
            min="0"
            step="1"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
          />
          <Input
            label={product ? "參考成本／每件" : "材料成本／每次"}
            type="number"
            min="0"
            step="1"
            value={f.cost}
            onChange={(e) => setF({ ...f, cost: e.target.value })}
          />
          <Input
            label="項目顏色"
            type="color"
            value={f.color}
            onChange={(e) => setF({ ...f, color: e.target.value })}
          />
          {product ? (
            <Select
              label="用途"
              value={f.usage}
              onChange={(e) => setF({ ...f, usage: e.target.value })}
              options={["販賣", "店用", "兩用"]}
            />
          ) : (
            <Select
              label="服務類別"
              value={f.cat}
              onChange={(e) => setF({ ...f, cat: e.target.value })}
              options={db.settings.classes}
            />
          )}
        </div>
        {product ? (
          <>
            <div className="form-grid">
              <Select
                label="廠商"
                value={f.vendor}
                onChange={(e) => setF({ ...f, vendor: e.target.value })}
                options={[
                  { value: "", label: "未指定" },
                  ...db.settings.vendors,
                ]}
              />
              <Select
                label="商品種類"
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value })}
                options={db.settings.productTypes}
              />
              <Input
                label="安全庫存"
                type="number"
                min="0"
                step="1"
                value={f.safety}
                onChange={(e) => setF({ ...f, safety: e.target.value })}
              />
              {!exists && (
                <Input
                  label="期初庫存（不登記付款）"
                  type="number"
                  min="0"
                  step="1"
                  value={f.stock}
                  onChange={(e) => setF({ ...f, stock: e.target.value })}
                />
              )}
            </div>
            <Input
              label="販賣毛利獎金 %"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={f.comm}
              onChange={(e) => setF({ ...f, comm: e.target.value })}
            />
            <p className="hint">
              販賣獎金＝（成交價－參考成本）×
              比例。進貨價格另存當批，不自動覆蓋參考成本；第一版尚未採用移動平均成本。
            </p>
          </>
        ) : (
          <>
            <div className="form-grid">
              <Select
                label="預設協助費方式"
                value={f.assistMode}
                onChange={(e) => setF({ ...f, assistMode: e.target.value })}
                options={[
                  { value: "amount", label: "固定金額／每次" },
                  { value: "percent", label: "百分比" },
                ]}
              />
              <Input
                label={
                  f.assistMode === "percent" ? "預設協助費 %" : "每次協助費 $"
                }
                type="number"
                min="0"
                max={f.assistMode === "percent" ? 100 : undefined}
                step={f.assistMode === "percent" ? "0.01" : "1"}
                value={f.assistValue}
                onChange={(e) => setF({ ...f, assistValue: e.target.value })}
              />
            </div>
            <p className="notice">
              僅選擇協助人員時才計費。百分比基礎＝折扣後收費－材料。設計師比例由人員／全店設定統一管理。
            </p>
          </>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={!!f.archived}
            onChange={(e) => setF({ ...f, archived: e.target.checked })}
          />
          停用（保留庫存、交易與歷史）
        </label>
        <Button type="submit">儲存項目</Button>
      </form>
    </Modal>
  );
}
function Inventory() {
  const { db } = useDB();
  const [tab, setTab] = useState("總覽"),
    [q, setQ] = useState(""),
    [vendor, setVendor] = useState(""),
    [type, setType] = useState(""),
    [usage, setUsage] = useState(""),
    [low, setLow] = useState(false),
    [edit, setEdit] = useState(null),
    [adding, setAdding] = useState(false),
    [move, setMove] = useState(null),
    [range, setRange] = useState(newRange);
  const [a, b] = dates(range);
  const products = db.products.filter(
    (p) =>
      C.active(p) &&
      p.name.includes(q) &&
      (!vendor || p.vendor === vendor) &&
      (!type || p.type === type) &&
      (!usage || p.usage === usage) &&
      (!low || p.stock < p.safety),
  );
  const logs = db.movements.filter(
    (m) => m.date >= a && m.date <= b && m.name.includes(q),
  );
  return (
    <>
      <Header
        title="庫存管理"
        sub="廠商、種類與用途分開。進貨付款與店內耗用分開記錄。"
      >
        <Button onClick={() => setAdding(true)}>＋新增商品</Button>
      </Header>
      <PearlGroup as="div" className="pills">
        {["總覽", "異動紀錄"].map((t) => (
          <button
            className={"pill-toggle " + (tab === t ? "active" : "")}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </PearlGroup>
      <div className="filters">
        <Input
          label="搜尋商品"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {tab === "總覽" && (
          <>
            <Select
              label="廠商"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              options={[{ value: "", label: "全部" }, ...db.settings.vendors]}
            />
            <Select
              label="種類"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "", label: "全部" },
                ...db.settings.productTypes,
              ]}
            />
            <Select
              label="用途"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              options={[{ value: "", label: "全部" }, "販賣", "店用", "兩用"]}
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={low}
                onChange={(e) => setLow(e.target.checked)}
              />
              低於安全量
            </label>
          </>
        )}
      </div>
      {tab === "總覽" ? (
        <>
          <div className="entity-grid">
            {products.map((p) => (
              <div
                key={p.id}
                className="liquid-glass entity-card"
                style={{ "--item-color": p.color }}
              >
                <div className="section-head">
                  <span className="badge">
                    {p.type} · {p.usage}
                  </span>
                  <Button secondary onClick={() => setEdit(p)}>
                    編輯
                  </Button>
                </div>
                <h2>{p.name}</h2>
                <p className="hint">{p.vendor || "未指定廠商"}</p>
                <div className="total">
                  <span>現有庫存</span>
                  <b className={p.stock < p.safety ? "text-red-500" : ""}>
                    {p.stock}
                  </b>
                </div>
                <p className="hint">
                  安全量 {p.safety} · 成本 {fmt(p.cost)} · 售價 {fmt(p.price)}
                </p>
                <PearlGroup as="div" className="pills">
                  <Button
                    secondary
                    onClick={() => setMove({ productId: p.id, type: "進貨" })}
                  >
                    進貨
                  </Button>
                  <Button
                    secondary
                    onClick={() =>
                      setMove({ productId: p.id, type: "店內耗用" })
                    }
                  >
                    領用／盤點
                  </Button>
                </PearlGroup>
              </div>
            ))}
          </div>
          {!products.length && <Empty />}
        </>
      ) : (
        <>
          <DateRange range={range} setRange={setRange} />
          {a > b && <p className="error">日期起訖錯誤</p>}
          <div className="table-wrap liquid-glass panel">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>類型／商品</th>
                  <th>數量</th>
                  <th>人員／備註</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((m) => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>
                      {m.type}
                      <small>{m.name}</small>
                    </td>
                    <td>
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                    <td>
                      {m.staff || ""}
                      <small>{m.note}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs.length && <Empty />}
          </div>
        </>
      )}
      {(edit || adding) && (
        <ItemEditor
          kind="product"
          item={edit}
          onClose={() => {
            setEdit(null);
            setAdding(false);
          }}
        />
      )}
      {move && <StockModal initial={move} onClose={() => setMove(null)} />}
    </>
  );
}
function StockModal({ initial, onClose }) {
  const { db, mutate } = useDB();
  const p = db.products.find((p) => p.id === initial.productId);
  const [f, setF] = useState({
    ...initial,
    date: C.today(),
    quantity: 1,
    unitCost: p.cost,
    paidAmount: 0,
    staffId: "",
    note: "",
  });
  const purchase = f.type === "進貨";
  return (
    <Modal title={p.name + " · 庫存異動"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await mutate("儲存庫存異動", (d) => C.stockMove(d, f))) onClose();
        }}
      >
        <div className="form-grid">
          <Input
            label="日期"
            type="date"
            required
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
          <Select
            label="類型"
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
            options={["進貨", "店內耗用", "人員領用", "盤點增加", "盤點減少"]}
          />
          <Input
            label="數量（整件／次）"
            type="number"
            min="1"
            step="1"
            value={f.quantity}
            onChange={(e) => setF({ ...f, quantity: e.target.value })}
          />
          {purchase && (
            <Input
              label="本批進貨單價"
              type="number"
              min="0"
              step="1"
              value={f.unitCost}
              onChange={(e) => setF({ ...f, unitCost: e.target.value })}
            />
          )}
        </div>
        {purchase ? (
          <>
            <p>進貨總額 {fmt(Number(f.quantity) * Number(f.unitCost))}</p>
            <Input
              label="本次已付款（未付款填 0）"
              type="number"
              min="0"
              step="1"
              value={f.paidAmount}
              onChange={(e) => setF({ ...f, paidAmount: e.target.value })}
            />
            <p className="notice">
              已付款會自動產生一筆支出；尚欠款可到「支出 →
              待付貨款」補登，不要再次手動登記同筆貨款。
            </p>
          </>
        ) : (
          <p className="notice">
            領用／盤點只變動庫存，不新增現金支出。不得超額領用；盤點必填原因。
          </p>
        )}
        {f.type === "人員領用" && (
          <Select
            label="領用人員"
            value={f.staffId}
            onChange={(e) => setF({ ...f, staffId: e.target.value })}
            options={[
              { value: "", label: "請選擇" },
              ...db.staff
                .filter(C.active)
                .map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        )}
        <Input
          label="備註／盤點原因"
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
        <Button type="submit">確認記錄</Button>
      </form>
    </Modal>
  );
}
function Expenses() {
  const { db, mutate } = useDB();
  const [range, setRange] = useState(newRange),
    [type, setType] = useState(""),
    [q, setQ] = useState(""),
    [form, setForm] = useState(null),
    [reason, setReason] = useState(""),
    [voiding, setVoiding] = useState(null);
  const [a, b] = dates(range);
  const ex = db.expenses.filter(
    (e) =>
      e.date >= a &&
      e.date <= b &&
      (!type || e.type === type) &&
      (e.note || "").includes(q),
  );
  const outstanding = db.movements.filter(
    (m) => m.type === "進貨" && C.purchaseOutstanding(db, m) > 0,
  );
  return (
    <>
      <Header title="支出" sub="進貨、借支、薪資付款各有來源，避免重複列支。">
        <Button
          onClick={() =>
            setForm({
              date: C.today(),
              type: db.settings.expenseTypes[0] || "其他",
              amount: "",
              staffId: "",
              note: "",
            })
          }
        >
          ＋新增支出
        </Button>
      </Header>
      <DateRange range={range} setRange={setRange} />
      <div className="filters">
        <Select
          label="分類"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: "", label: "全部" },
            ...new Set([
              ...db.settings.expenseTypes,
              "進貨付款",
              "員工借支",
              "薪資付款",
            ]),
          ]}
        />
        <Input
          label="搜尋備註"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="liquid-glass panel">
        <div className="section-head">
          <h2>支出明細</h2>
          <b>{fmt(ex.filter(C.eligible).reduce((s, e) => s + e.amount, 0))}</b>
        </div>
        {a > b && <p className="error">日期起訖錯誤</p>}
        {ex.map((e) => (
          <div className="record-card" key={e.id}>
            <div>
              <small>
                {e.date} · {e.status === "void" ? "已作廢" : "已記錄"}
              </small>
              <h3>{e.type}</h3>
              <p>
                {e.note || "無備註"}
                {e.staffId
                  ? " · " + db.staff.find((s) => s.id === e.staffId)?.name
                  : ""}
              </p>
              {e.voidReason && <small>{e.voidReason}</small>}
            </div>
            <b className="record-amount">{fmt(e.amount)}</b>
            {C.eligible(e) && e.type !== "薪資付款" && (
              <Button
                secondary
                danger
                onClick={() => {
                  setVoiding(e);
                  setReason("");
                }}
              >
                作廢
              </Button>
            )}
          </div>
        ))}
        {!ex.length && <Empty />}
      </div>
      <details className="liquid-glass panel">
        <summary>待付貨款（全部日期，共 {outstanding.length} 筆）</summary>
        {outstanding.map((m) => (
          <div className="list-row" key={m.id}>
            <div>
              {m.date} · {m.name}
              <small>
                進貨總額 {fmt(m.purchaseTotal)} · 尚欠{" "}
                {fmt(C.purchaseOutstanding(db, m))}
              </small>
            </div>
            <Button
              secondary
              onClick={() =>
                setForm({
                  date: C.today(),
                  type: "進貨付款",
                  sourceId: m.id,
                  amount: C.purchaseOutstanding(db, m),
                  note: m.name + " 貨款",
                })
              }
            >
              補登付款
            </Button>
          </div>
        ))}
        {!outstanding.length && <Empty />}
      </details>
      {form && (
        <Modal
          title={form.sourceId ? "進貨付款" : "新增支出"}
          onClose={() => setForm(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await mutate("儲存支出", (d) => C.addExpense(d, form)))
                setForm(null);
            }}
          >
            <div className="form-grid">
              <Input
                label="付款日期"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {!form.sourceId && (
                <Select
                  label="類別"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  options={[...db.settings.expenseTypes, "員工借支"]}
                />
              )}
              <Input
                label="金額"
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            {form.type === "員工借支" && (
              <Select
                label="借支人員"
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                options={[
                  { value: "", label: "請選擇" },
                  ...db.staff
                    .filter(C.active)
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            )}
            <Input
              label="備註"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <Button type="submit">確認儲存</Button>
          </form>
        </Modal>
      )}
      {voiding && (
        <Modal title="作廢支出" onClose={() => setVoiding(null)}>
          <p>
            {voiding.type} {fmt(voiding.amount)}
          </p>
          <Input
            label="原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            danger
            onClick={async () => {
              if (
                await mutate("作廢支出", (d) => {
                  C.fail(reason.trim(), "請填原因");
                  const e = d.expenses.find((e) => e.id === voiding.id);
                  C.fail(
                    e && C.eligible(e) && e.type !== "薪資付款",
                    "支出不能作廢",
                  );
                  if (e.type === "員工借支")
                    C.ensureUnlocked(d, e.date, [e.staffId]);
                  e.status = "void";
                  e.voidReason = reason.trim();
                })
              )
                setVoiding(null);
            }}
          >
            確認作廢
          </Button>
        </Modal>
      )}
    </>
  );
}
function Settings() {
  const { db, mutate } = useDB();
  const [menu, setMenu] = useState("項目"),
    [kind, setKind] = useState("service"),
    [edit, setEdit] = useState(null),
    [adding, setAdding] = useState(false),
    [q, setQ] = useState("");
  const items = (kind === "service" ? db.services : db.products).filter((s) =>
    s.name.includes(q),
  );
  return (
    <div className="report-columns">
      <PearlGroup as="aside" className="report-nav">
        <h1 className="text-gold-gradient">Admin</h1>
        {["項目", "標籤與分類", "一般設定", "備份與還原", "雲端銜接", "版本與說明"].map(
          (n) => (
            <button
              className={menu === n ? "selected" : ""}
              key={n}
              onClick={() => setMenu(n)}
            >
              {n}
            </button>
          ),
        )}
      </PearlGroup>
      <section className="report-body">
        {menu === "項目" ? (
          <>
            <Header title="項目設定">
              <Button onClick={() => setAdding(true)}>
                ＋新增{kind === "service" ? "服務" : "商品"}
              </Button>
            </Header>
            <PearlGroup as="div" className="pills">
              {[
                ["service", "服務項目"],
                ["product", "產品販賣"],
              ].map(([k, n]) => (
                <button
                  key={k}
                  className={"pill-toggle " + (kind === k ? "active" : "")}
                  onClick={() => setKind(k)}
                >
                  {n}
                </button>
              ))}
            </PearlGroup>
            <Input
              label="搜尋品名"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="entity-grid two">
              {items.map((s) => (
                <div
                  className="liquid-glass entity-card"
                  key={s.id}
                  style={{ "--item-color": s.color }}
                >
                  <div className="section-head">
                    <span className="badge">
                      {kind === "service" ? s.cat : s.type}
                      {s.archived ? " · 已停用" : ""}
                    </span>
                    <Button secondary onClick={() => setEdit(s)}>
                      編輯
                    </Button>
                  </div>
                  <h2>{s.name}</h2>
                  <div className="total">
                    <span>售價</span>
                    <b>{fmt(s.price)}</b>
                  </div>
                  <p className="hint">
                    成本 {fmt(s.cost)} ·{" "}
                    {kind === "service"
                      ? "協助費 " +
                        s.assistValue +
                        (s.assistMode === "percent" ? "%" : "／次")
                      : "販賣獎金 " + s.comm + "%"}
                  </p>
                </div>
              ))}
            </div>
            {!items.length && <Empty />}
          </>
        ) : menu === "標籤與分類" ? (
          <>
            <Header
              title="標籤與分類"
              sub="設定儲存後，開單與其他頁面同步使用。"
            />
            <TagLists />
          </>
        ) : menu === "一般設定" ? (
          <GeneralSettings />
        ) : menu === "雲端銜接" ? <CloudDraft/> : menu === "備份與還原" ? (
          <Backup />
        ) : (
          <>
            <Header title="版本與說明" />
            <div className="liquid-glass panel">
              <h2>10年磨一劍 · P2.0.0</h2>
              <p className="notice">
                整套功能整合驗收版，尚非可販售正式版。
              </p>
              <ol className="instructions">
                <li>人員：新增設計師、設定比例與薪酬。</li>
                <li>系統：建立服務、商品、付款方式與標籤。</li>
                <li>顧客：新增會員；開單時搜尋後點選。</li>
                <li>庫存：販賣品先建立期初量或進貨。</li>
                <li>開單：加入項目、調整折扣與協助費、填收現，再確認結帳。</li>
                <li>查單：看完整明細。更正採作廢重開，保留紀錄。</li>
                <li>報表 → 薪資表：產生草稿、核對、確認、登記已付。</li>
                <li>
                  每天結束請匯出備份；換檔案、換瀏覽器或換設備前也要備份。
                </li>
              </ol>
              <p>
                本版可離線開啟，使用目前瀏覽器的本機資料。不是雲端同步；建議單一視窗操作。無痕模式、清除瀏覽器資料或更換檔案位置可能失去資料入口。
              </p>
              <p>
                未連接原檔的雲端店號，也不讀取其他 POS
                的設定。只接受本專案備份。需要正式多店帳號、權限、授權及更新服務，須完成後續雲端銜接階段。
              </p>
              <p>
                本版收據使用列印／PDF；手機 QR
                收據需有正式可存取網址，留待交付階段驗收。
              </p>
              <p>
                商品與庫存以整件計算；參考成本、當批進價分開保存。已加入預付儲值與管理用損益試算；部分退貨、已付薪資更正及正式雲端接替仍待後續驗收。
              </p>
              <details>
                <summary>最近操作紀錄</summary>
                {db.audit.slice(0, 40).map((x) => (
                  <div className="list-row" key={x.id}>
                    <span>{x.action}</span>
                    <small>{new Date(x.at).toLocaleString("zh-TW")}</small>
                  </div>
                ))}
              </details>
            </div>
          </>
        )}
        {(edit || adding) && (
          <ItemEditor
            kind={kind}
            item={edit}
            onClose={() => {
              setEdit(null);
              setAdding(false);
            }}
          />
        )}
      </section>
    </div>
  );
}
function GeneralSettings() {
  const { db, mutate } = useDB();
  const [name, setName] = useState(db.settings.shopName),
    [rate, setRate] = useState(db.settings.defaultCommission);
  return (
    <>
      <Header title="一般設定" />
      <form
        className="liquid-glass panel"
        onSubmit={(e) => {
          e.preventDefault();
          mutate("儲存一般設定", (d) => {
            C.fail(name.trim(), "請輸入店名");
            d.settings.shopName = name.trim();
            d.settings.defaultCommission = C.percent(rate, "全店抽成比例");
          });
        }}
      >
        <Input
          label="顯示店名／收據抬頭"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="全店服務抽成 %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <p className="notice">
          僅影響之後的新帳。設為「個別設定」的人員使用自己的比例；歷史帳單與已確認薪資不會被重算。
        </p>
        <Button type="submit">儲存設定</Button>
      </form>
    </>
  );
}
function TagLists() {
  const { db, mutate } = useDB();
  const [modal, setModal] = useState(null),
    [text, setText] = useState(""),
    [color, setColor] = useState("#D4AF37"),
    [cashFlag, setCashFlag] = useState(false);
  const lists = [
    ["genders", "客群"],
    ["classes", "服務類別"],
    ["payments", "付款方式"],
    ["vendors", "廠商"],
    ["productTypes", "商品種類"],
    ["expenseTypes", "支出分類"],
    ["customerTags", "會員標籤與顏色"],
  ];
  const open = (key, value) => {
    setModal({ key, old: value });
    setCashFlag(key === "payments" && db.settings.cashPayments.includes(value));
    setText(value && typeof value === "object" ? value.name : value || "");
    setColor(value && typeof value === "object" ? value.color : "#D4AF37");
  };
  function remap(d, key, old, val) {
    const pairs = {
      genders: ["customers", "gender"],
      classes: ["services", "cat"],
      vendors: ["products", "vendor"],
      productTypes: ["products", "type"],
    };
    if (pairs[key]) {
      const [list, field] = pairs[key];
      for (const x of d[list]) if (x[field] === old) x[field] = val;
    }
  }
  return (
    <>
      {lists.map(([key, title]) => (
        <details
          className="liquid-glass panel"
          key={key}
          open={key === "genders" || key === "payments"}
        >
          <summary>
            {title}（{db.settings[key].length}）
          </summary>
          <div className="tag-list">
            {db.settings[key].map((t) => (
              <div className="tag-entry" key={t.id || t}>
                <span
                  style={
                    typeof t === "object"
                      ? { borderLeft: "5px solid " + t.color, paddingLeft: 8 }
                      : {}
                  }
                >
                  {t.name || t}
                </span>
                <button className="mini" onClick={() => open(key, t)}>
                  修改
                </button>
                <button
                  className="mini danger"
                  onClick={() => {
                    if (confirm("移除此選項？歷史交易名稱仍會保留。"))
                      mutate("移除" + title, (d) => {
                        if (
                          [
                            "genders",
                            "classes",
                            "payments",
                            "productTypes",
                            "expenseTypes",
                          ].includes(key)
                        )
                          C.fail(
                            d.settings[key].length > 1,
                            "至少保留一個選項",
                          );
                        if (key === "classes")
                          C.fail(
                            !d.services.some((s) => C.active(s) && s.cat === t),
                            "仍有啟用服務使用此類別，請先修改服務",
                          );
                        if (key === "productTypes")
                          C.fail(
                            !d.products.some(
                              (p) => C.active(p) && p.type === t,
                            ),
                            "仍有商品使用此種類",
                          );
                        if (key === "customerTags")
                          C.fail(
                            !d.customers.some((c) => c.tags.includes(t.id)),
                            "仍有顧客使用此標籤，請先取消標記",
                          );
                        if (key === "genders")
                          C.fail(
                            !d.customers.some(
                              (c) => C.active(c) && c.gender === t,
                            ),
                            "仍有顧客使用此客群",
                          );
                        if (key === "vendors")
                          C.fail(
                            !d.products.some(
                              (p) => C.active(p) && p.vendor === t,
                            ),
                            "仍有商品使用此廠商",
                          );
                        d.settings[key] = d.settings[key].filter(
                          (x) => (x.id || x) !== (t.id || t),
                        );
                        if (key === "payments")
                          d.settings.cashPayments =
                            d.settings.cashPayments.filter((x) => x !== t);
                      });
                  }}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
          <Button secondary onClick={() => open(key, null)}>
            ＋新增{title}
          </Button>
        </details>
      ))}
      {modal && (
        <Modal title="設定選項" onClose={() => setModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate("儲存設定選項", (d) => {
                  const name = text.trim();
                  C.fail(name, "請輸入名稱");
                  const array = d.settings[modal.key],
                    isTag = modal.key === "customerTags";
                  C.fail(
                    !array.some(
                      (x) =>
                        (isTag ? x.name : x) === name &&
                        (isTag ? x.id !== modal.old?.id : x !== modal.old),
                    ),
                    "名稱重複",
                  );
                  if (modal.key === "classes")
                    C.fail(
                      !["全部", "販賣"].includes(name),
                      "此名稱保留給系統使用",
                    );
                  if (modal.key === "expenseTypes")
                    C.fail(
                      !["員工借支", "進貨付款", "薪資付款"].includes(name),
                      "請使用系統對應的連動流程",
                    );
                  if (modal.old) {
                    d.settings[modal.key] = array.map((x) =>
                      (isTag ? x.id === modal.old.id : x === modal.old)
                        ? isTag
                          ? { ...x, name, color }
                          : name
                        : x,
                    );
                    if (!isTag) remap(d, modal.key, modal.old, name);
                  } else
                    array.push(
                      isTag ? { id: C.uid("TAG"), name, color } : name,
                    );
                  if (modal.key === "payments") {
                    d.settings.cashPayments = d.settings.cashPayments.filter(
                      (x) => x !== modal.old && x !== name,
                    );
                    if (cashFlag) d.settings.cashPayments.push(name);
                  }
                })
              )
                setModal(null);
            }}
          >
            <Input
              label="名稱"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {modal.key === "payments" && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={cashFlag}
                  onChange={(e) => setCashFlag(e.target.checked)}
                />
                現金類（顯示收現與找零）
              </label>
            )}
            {modal.key === "customerTags" && (
              <Input
                label="標籤顏色"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            )}
            <Button type="submit">儲存選項</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Backup() {
  const { db, mutate } = useDB();
  const [candidate, setCandidate] = useState(null),
    [fileError, setFileError] = useState("");
  const serialize = (d) =>
    JSON.stringify(
      {
        format: "TENYEAR_BACKUP",
        exportedAt: new Date().toISOString(),
        appVersion: C.VERSION,
        data: d,
      },
      null,
      2,
    );
  return (
    <>
      <Header title="備份與還原" sub="僅接受本專案資料，還原前先核對內容。" />
      <div className="liquid-glass panel">
        <h2>匯出完整備份</h2>
        <p>
          {db.records.length} 筆帳單 · {db.customers.length} 位顧客 ·{" "}
          {db.products.length} 種商品 · {db.payrolls.length} 張薪資條
        </p>
        <p className="hint">
          包含停用、作廢、薪資與異動紀錄。匯出檔含顧客及薪資資料，請自行妥善保存。
        </p>
        <Button
          onClick={() =>
            download("10年磨一劍-備份-" + C.today() + ".json", serialize(db))
          }
        >
          下載完整備份 JSON
        </Button>
      </div>
      <div className="liquid-glass panel">
        <h2>還原備份</h2>
        <Input
          label="選擇本專案備份"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            setCandidate(null);
            setFileError("");
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              C.fail(f.size <= 15 * 1024 * 1024, "檔案過大，請核對備份來源");
              const parsed = JSON.parse(await f.text());
              C.fail(
                parsed.format === "TENYEAR_BACKUP",
                "不是本專案匯出的備份",
              );
              C.validateDB(parsed.data);
              setCandidate({
                name: f.name,
                data: parsed.data,
                exportedAt: parsed.exportedAt,
              });
            } catch (err) {
              setFileError(err.message);
            } finally {
              e.target.value = "";
            }
          }}
        />
        {fileError && <p className="error">{fileError}</p>}
        {candidate && (
          <>
            <p>檔案：{candidate.name}</p>
            <p>
              帳單 {candidate.data.records.length} 筆 · 顧客{" "}
              {candidate.data.customers.length} 位 · 商品{" "}
              {candidate.data.products.length} 種 · 薪資條{" "}
              {candidate.data.payrolls.length} 張
            </p>
            <p className="notice">
              還原會整份取代目前本機資料，不合併。請先下載目前備份；還原前也會保留一份本機回復點。
            </p>
            <Button
              danger
              onClick={async () => {
                if (!confirm("已下載目前備份，確定以此檔案取代所有本機資料？"))
                  return;
                const ok = await mutate("還原備份", (d) => {
                  const revision = d.revision;
                  Object.assign(d, C.copy(candidate.data), { revision });
                });
                if (ok) {
                  setCandidate(null);
                  sessionStorage.removeItem("es_solos_order_draft");window.location.reload();
                }
              }}
            >
              確認還原此備份
            </Button>
          </>
        )}
      </div>
      <details className="liquid-glass panel">
        <summary>上一次寫入前的回復點</summary>
        <p>
          僅保留最近一次變更前的資料，不取代每日外部備份。此操作只下載，不立即覆蓋。
        </p>
        <Button
          secondary
          onClick={() => {
            try {
              const s = localStorage.getItem(C.PREVIOUS_KEY);
              C.fail(s, "目前沒有回復點");
              const d = C.validateDB(JSON.parse(s));
              download(
                "10年磨一劍-回復點-" + C.today() + ".json",
                serialize(d),
              );
            } catch (e) {
              alert(e.message);
            }
          }}
        >
          下載回復點
        </Button>
      </details>
    </>
  );
}
class Boundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>資料尚未載入</h1>
        <p>偵測到本機資料或儲存環境異常，系統沒有清除你的資料。</p>
        <p>{this.state.error.message}</p>
        <button
          onClick={() => {
            try {
              download(
                "10年磨一劍-原始資料救援.json",
                localStorage.getItem(C.STORE_KEY) || "{}",
              );
            } catch {
              alert("瀏覽器不允許讀取本機資料");
            }
          }}
        >
          下載原始資料供核對
        </button>
        <p>請使用一般瀏覽器視窗開啟，或將救援檔交回檢查。</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <App />
  </Boundary>,
);

function readDraft(db){try{const d=JSON.parse(sessionStorage.getItem('es_solos_order_draft')||'null');return d&&d.project===C.PROJECT&&Array.isArray(d.items)&&!db.records.some(r=>r.id===d.orderId)?d:{}}catch{return {}}}
function Wallet(){const {db,mutate,busy}=useDB();const [query,setQuery]=useState(''),[id,setId]=useState(''),[type,setType]=useState('儲值收款'),[amount,setAmount]=useState(''),[payment,setPayment]=useState(db.settings.payments[0]),[date,setDate]=useState(C.today()),[note,setNote]=useState(''),[transactionId,setTransactionId]=useState(C.uid('WAL')),[confirm,setConfirm]=useState(false),[reversal,setReversal]=useState(null),[reason,setReason]=useState('');const people=db.customers.filter(c=>(C.active(c)||C.walletBalance(db,c.id)>0)&&(c.name.includes(query)||(c.phone||'').includes(query))),person=db.customers.find(c=>c.id===id),balance=C.walletBalance(db,id),rows=db.walletLedger.filter(w=>w.customerId===id).slice().reverse();
return <><Header title="預付儲值" sub="先收款、後消費；每筆扣款與退回都留紀錄。"/><div className="order-columns"><section className="liquid-glass panel"><Input label="搜尋會員姓名或電話" value={query} onChange={e=>setQuery(e.target.value)}/><Select label="儲值會員" value={id} onChange={e=>setId(e.target.value)} options={[{value:'',label:'請選擇會員'},...people.map(c=>({value:c.id,label:c.name+' · '+(c.phone||c.id.slice(-6))+(c.archived?'（停用）':'')}))]}/><div className="metric"><span>未消費預收餘額</span><b>{fmt(balance)}</b></div><PearlGroup className="pills">{['儲值收款','餘額退款'].map(n=><button key={n} className={'pill-toggle '+(type===n?'active':'')} onClick={()=>setType(n)}>{n}</button>)}</PearlGroup><form onSubmit={e=>{e.preventDefault();setConfirm(true)}}><Input label="交易日期" type="date" required value={date} onChange={e=>setDate(e.target.value)}/><Input label={type==='儲值收款'?'儲值金額':'退款金額'} type="number" min="1" step="1" required value={amount} onChange={e=>setAmount(e.target.value)}/><Select label={type==='儲值收款'?'收款方式':'退款方式'} value={payment} onChange={e=>setPayment(e.target.value)} options={db.settings.payments}/><Input label="備註／退款原因" required={type==='餘額退款'} value={note} onChange={e=>setNote(e.target.value)}/><Button type="submit" disabled={!person||busy}>核對{type}</Button></form><p className="hint">本版按實收金額儲值，不含贈送金與效期規則。餘額退款限未消費部分。</p></section><section className="liquid-glass panel"><h2>儲值流水</h2>{!person?<Empty>先選擇會員</Empty>:!rows.length?<Empty>尚無儲值紀錄</Empty>:rows.map(w=><div className="wallet-row" key={w.id}><div className="section-head"><b>{w.type}</b><b className={w.amount<0?'negative':''}>{w.amount>0?'+':''}{fmt(w.amount)}</b></div><p>{w.date} · {w.payment||'儲值帳戶'}</p><p>{w.note}</p>{w.recordId&&<small>對應單號 {w.recordId}</small>}{w.type==='儲值收款'&&!db.walletLedger.some(x=>x.reverses===w.id)&&<Button secondary onClick={()=>{setReversal(w);setReason('')}}>作廢此筆儲值</Button>}</div>)}</section></div>
{confirm&&<Modal title="核對預收款" onClose={()=>setConfirm(false)}><h2>{person?.name} · {type}</h2><div className="total"><b>{fmt(amount)}</b></div><p>{date} · {payment}</p><p>{note}</p><Button disabled={busy} onClick={async()=>{if(await mutate(type,d=>C.walletTransaction(d,{id:transactionId,customerId:id,type,date,amount,payment,note}))){setAmount('');setNote('');setTransactionId(C.uid('WAL'));setConfirm(false)}}}>確認{type}</Button></Modal>}
{reversal&&<Modal title="作廢儲值收款" onClose={()=>setReversal(null)}><p>退回 {fmt(reversal.amount)}，保留原始流水；餘額不足時不允許作廢。</p><Input label="作廢儲值原因" value={reason} onChange={e=>setReason(e.target.value)}/><Button danger disabled={busy||!reason.trim()} onClick={async()=>{if(await mutate('作廢儲值',d=>C.reverseTopup(d,reversal.id,reason)))setReversal(null)}}>確認作廢儲值</Button></Modal>}</>}
function Profit({start,end}){const {db}=useDB();let p;try{p=C.profitReport(db,start,end)}catch(e){return <p className="error">{e.message}</p>}return <><div className="metric-grid">{[['消費收入',p.summary.revenue],['服務材料＋販賣成本',p.summary.material],['變動人員報酬',p.variablePay]].map(([n,v])=><div className="metric" key={n}><span>{n}</span><b>{fmt(v)}</b></div>)}</div><div className="liquid-glass panel"><div className="list-row"><span>扣成本及變動報酬後</span><b>{fmt(p.margin)}</b></div><div className="list-row"><span>已登記營運費用</span><b>{fmt(p.operating)}</b></div><div className="list-row"><span>已確認固定薪酬與加扣項</span><b>{fmt(p.fixed)}</b></div><div className="total"><span>管理用損益試算</span><b>{p.profit===null?'待核對':fmt(p.profit)}</b></div>{p.missing>0&&<p className="notice">有 {p.missing} 項待核對：歷史明細不足、期間非完整月份，或固定薪酬尚未確認。補齊前不呈現確定損益。</p>}<details><summary>計算口徑</summary><p>消費收入－服務材料與販賣成本－服務抽成、協助費及販賣獎金－營運費用－固定薪酬。儲值收款不列消費收入，進貨付款不再重扣成本，薪資付款不重扣已列的人員報酬，借支也不另當費用。</p><p>店內耗用作庫存流量核對，服務材料以單據成本計算，避免兩邊重扣。此為管理試算；未登記費用、稅費、折舊及未耗用成本分攤尚不在其中。</p></details></div></>}

function CloudDraft(){const {db,mutate}=useDB();const [f,setF]=useState(db.settings.cloudDraft||{projectId:'salonsystem-71566',salonId:'',apiKey:'',authDomain:'salonsystem-71566.firebaseapp.com'});return <><Header title="雲端銜接預留" sub="先完成本套功能，再以舊資料副本做接替驗收。"/><div className="liquid-glass panel"><p className="notice">尚未啟用雲端。此處僅保存連線草稿，不登入、不讀寫原店資料。</p><form onSubmit={async e=>{e.preventDefault();await mutate('保存雲端銜接草稿',d=>{d.settings.cloudDraft={...f}})}}>{[['projectId','Firebase 專案 ID'],['salonId','店號'],['authDomain','驗證網域'],['apiKey','Web API Key']].map(([k,n])=><Input key={k} label={n} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/>)}<Button type="submit">保存設定草稿</Button></form><p className="hint">不要在此填個人帳號密碼或服務帳戶私鑰。原作連線與授權程式已保留在備份版本；正式銜接時另核對資料欄位與權限。</p></div></>}
