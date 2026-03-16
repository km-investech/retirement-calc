import { useState, useMemo } from "react";

const fmtM = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000000) return (n / 100000000).toFixed(1) + "억";
  if (abs >= 10000) return Math.round(n / 10000) + "만";
  return Math.round(n).toLocaleString();
};
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

const F = ({ label, value, onChange, unit, step = 1, hint, narrow }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, minWidth: 0 }}>
      <label style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap", flexShrink: 0, ...(narrow ? {} : { flex: "0 0 88px" }) }}>
        {label}{hint && <span style={{ color: "#bbb", fontSize: 10, marginLeft: 3 }}>{hint}</span>}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "#f5f6f8", borderRadius: 7, overflow: "hidden", border: "1px solid #eee", minWidth: 0, flex: 1 }}>
        <input type="number" value={focused && value === 0 ? "" : value} step={step}
          onFocus={() => setFocused(true)}
          onBlur={e => { setFocused(false); if (e.target.value === "") onChange(0); }}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          style={{ flex: 1, border: "none", background: "transparent", padding: "7px 6px", fontSize: 13, outline: "none", textAlign: "right", minWidth: 0, color: "#222", width: 40 }} />
        <span style={{ fontSize: 11, color: "#bbb", padding: "0 6px", whiteSpace: "nowrap", flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  );
};

const FRow = ({ items }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 7 }}>
    {items.map((item, i) => (
      <div key={i} style={{ flex: 1, minWidth: 0 }}>
        <F {...item} narrow />
      </div>
    ))}
  </div>
);

const G = ({ title, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 7 }}>{title}</div>
    {children}
  </div>
);

const InfoRow = ({ label, value, color = "#555", bold, sub }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginBottom: 6 }}>
    <span style={{ color: "#888", whiteSpace: "nowrap" }}>{label}{sub && <span style={{ fontSize: 10, color: "#bbb", marginLeft: 4 }}>{sub}</span>}</span>
    <span style={{ fontWeight: bold ? 700 : 500, color, marginLeft: 8, textAlign: "right" }}>{value}</span>
  </div>
);

function calcAt(p, retireAge, overrideInvest) {
  const { lifeExpect, monthlyIncome, monthlySpend,
    investReturn, propertyGrowth,
    pensionAge, monthlyPension, pensionAge2, monthlyPension2, rentalIncome } = p;
  const investAsset = overrideInvest !== undefined ? overrideInvest : p.investAsset;
  const propertyAsset = overrideInvest !== undefined ? (p.investAsset + p.propertyAsset - overrideInvest) : p.propertyAsset;

  const mr = investReturn / 100 / 12;
  const mSave = (monthlyIncome - monthlySpend) * 10000;
  const ytr = Math.max(0, retireAge - p.currentAge);
  const m2r = ytr * 12;

  let fa = investAsset * 10000;
  if (mr > 0) fa = fa * Math.pow(1 + mr, m2r) + (mSave > 0 ? mSave * (Math.pow(1 + mr, m2r) - 1) / mr : 0);
  else fa += mSave > 0 ? mSave * m2r : 0;

  const propVal = propertyAsset * 10000 * Math.pow(1 + propertyGrowth / 100, ytr);
  const netAsset = fa + propVal - p.loanAmount * 10000;
  const investIncome = fa * (investReturn / 100) / 12;

  const simulate = (spend) => {
    let asset = fa;
    for (let age = retireAge; age < lifeExpect; age++) {
      for (let m = 0; m < 12; m++) {
        const pen1 = age >= pensionAge ? monthlyPension * 10000 : 0;
        const pen2 = (pensionAge2 > 0 && age >= pensionAge2) ? monthlyPension2 * 10000 : 0;
        const fixed = rentalIncome * 10000;
        asset = asset * (1 + mr) + pen1 + pen2 + fixed - spend;
        if (asset < 0) return false;
      }
    }
    return true;
  };

  let lo = 0, hi = 50000 * 10000, spend = 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (simulate(mid)) { spend = mid; lo = mid; } else hi = mid;
  }

  const exhaustAge = (() => {
    let asset = fa;
    for (let age = retireAge; age <= 120; age++) {
      for (let m = 0; m < 12; m++) {
        const pen1 = age >= pensionAge ? monthlyPension * 10000 : 0;
        const pen2 = (pensionAge2 > 0 && age >= pensionAge2) ? monthlyPension2 * 10000 : 0;
        asset = asset * (1 + mr) + pen1 + pen2 + rentalIncome * 10000 - spend;
        if (asset < 0) return age;
      }
    }
    return "120+";
  })();

  return { fa, propVal, netAsset, spend, investIncome, exhaustAge };
}

export default function App() {
  const [mode, setMode] = useState("A");
  const [tab, setTab] = useState("input");
  const [p, setP] = useState({
    currentAge: 35, lifeExpect: 90,
    monthlyIncome: 400, monthlySpend: 200,
    investAsset: 5000, propertyAsset: 50000, loanAmount: 20000,
    investReturn: 5, propertyGrowth: 2,
    pensionAge: 65, monthlyPension: 100,
    pensionAge2: 0, monthlyPension2: 0,
    rentalIncome: 0,
    targetSpend: 300, targetRetireAge: 55,
    // 리밸런싱 탭
    rbRetireAge: 55, rbTargetSpend: 300, rbConvertPct: 0,
  });
  const set = k => v => setP(prev => ({ ...prev, [k]: v }));

  const mSave = (p.monthlyIncome - p.monthlySpend) * 10000;

  const findEarliestAge = (targetSpend) => {
    const target = targetSpend * 10000;
    for (let age = p.currentAge + 1; age <= 80; age++) {
      const res = calcAt(p, age);
      if (res.spend >= target) return { age, ...res };
    }
    return null;
  };

  const resultA = useMemo(() => findEarliestAge(p.targetSpend), [p]);
  const resultB = useMemo(() => calcAt(p, p.targetRetireAge), [p]);

  // 리밸런싱 계산
  const rbResult = useMemo(() => {
    const totalMovable = p.investAsset + p.propertyAsset; // 만원
    // 슬라이더: 부동산 → 투자자산 전환 비율 (0~100%)
    // rbConvertPct: 부동산에서 몇 %를 투자자산으로 전환
    const converted = Math.round(p.propertyAsset * p.rbConvertPct / 100);
    const newInvest = p.investAsset + converted;
    const newProp = p.propertyAsset - converted;

    const base = calcAt(p, p.rbRetireAge);
    const adj = calcAt({ ...p, investAsset: newInvest, propertyAsset: newProp }, p.rbRetireAge);

    // 목표 달성을 위한 최적 전환 비율 자동 탐색
    let optPct = null;
    const target = p.rbTargetSpend * 10000;
    if (adj.spend < target) {
      for (let pct = 0; pct <= 100; pct++) {
        const cv = Math.round(p.propertyAsset * pct / 100);
        const r = calcAt({ ...p, investAsset: p.investAsset + cv, propertyAsset: p.propertyAsset - cv }, p.rbRetireAge);
        if (r.spend >= target) { optPct = pct; break; }
      }
    } else {
      optPct = p.rbConvertPct;
    }

    return { base, adj, converted, newInvest, newProp, optPct };
  }, [p]);

  const accentColor = mode === "A" ? "#4f8ef7" : "#34c48b";
  const modeBtn = (active, color) => ({
    flex: 1, padding: "9px 8px", fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? color : "#f5f6f8", color: active ? "#fff" : "#aaa",
    border: "none", borderRadius: 9, cursor: "pointer", lineHeight: 1.4, transition: "all 0.15s"
  });
  const tabBtn = (active) => ({
    flex: 1, padding: "7px 0", fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? "#fff" : "transparent", color: active ? "#222" : "#aaa",
    border: "none", borderRadius: 8, cursor: "pointer", boxShadow: active ? "0 1px 4px #0001" : "none",
  });

  const Timeline = ({ items }) => (
    <div>
      {items.filter(Boolean).map(({ age, label, color }, i, arr) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < arr.length - 1 ? 6 : 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{age}</div>
          <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
          <div style={{ fontSize: 11, color: "#888" }}>{label}</div>
        </div>
      ))}
    </div>
  );

  const ResultPanel = ({ res, retireAge }) => {
    if (!res) return (
      <div style={{ background: "#fff4f4", borderRadius: 12, padding: "20px", textAlign: "center", border: "1.5px solid #f47f7f" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e05555", marginBottom: 6 }}>80세 이내 달성이 어렵습니다</div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.7 }}>목표 지출을 낮추거나<br />저축·수익률을 높여보세요</div>
      </div>
    );
    const spendM = Math.round(res.spend / 10000);
    const investIncomeM = Math.round(res.investIncome / 10000);
    const exhaustOk = res.exhaustAge === "120+" || res.exhaustAge > p.lifeExpect;
    const timelineItems = [
      { age: p.currentAge, label: "현재", color: "#aaa" },
      { age: retireAge, label: mode === "A" ? "은퇴 가능" : "은퇴 목표", color: accentColor },
      p.pensionAge > retireAge && { age: p.pensionAge, label: "연금 1 수령", color: "#a78bfa" },
      p.pensionAge2 > 0 && p.pensionAge2 > retireAge && { age: p.pensionAge2, label: "연금 2 수령", color: "#f7a94f" },
      { age: p.lifeExpect, label: "기대수명", color: "#ddd" },
    ];
    return (
      <div>
        <div style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}cc)`, borderRadius: 14, padding: "18px 20px", marginBottom: 14, color: "#fff" }}>
          {mode === "A" ? (<>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>목표 월 지출 {fmt(p.targetSpend)}만원 달성 가능한 최조 은퇴</div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{res.age}<span style={{ fontSize: 18, fontWeight: 400 }}>세</span></div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>지금부터 {res.age - p.currentAge}년 후</div>
          </>) : (<>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>{retireAge}세 은퇴 시 월 사용 가능액</div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{fmt(spendM)}<span style={{ fontSize: 18, fontWeight: 400 }}>만원</span></div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>현재 월 지출 {fmt(p.monthlySpend)}만원 대비 {spendM >= p.monthlySpend ? "+" + fmt(spendM - p.monthlySpend) : "-" + fmt(p.monthlySpend - spendM)}만원</div>
          </>)}
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", marginBottom: 10, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 10 }}>은퇴 시 자산</div>
          <InfoRow label="투자자산" value={fmtM(res.fa) + "원"} color="#4f8ef7" bold />
          <InfoRow label="부동산 자산" value={fmtM(res.propVal) + "원"} color="#f7a94f" />
          <InfoRow label="대출금" value={"- " + fmtM(p.loanAmount * 10000) + "원"} color="#f47f7f" />
          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 6, paddingTop: 6 }}>
            <InfoRow label="순자산" value={fmtM(res.netAsset) + "원"} color="#222" bold />
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", marginBottom: 10, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 10 }}>은퇴 후 월 소득 구성 ({retireAge}세 기준)</div>
          <InfoRow label={`투자 수익 (연 ${p.investReturn}%)`} value={fmt(investIncomeM) + "만원"} color="#4f8ef7" sub="이자·배당 포함" />
          {p.monthlyPension > 0 && <InfoRow label={`연금 1 (${p.pensionAge}세~)`} value={retireAge >= p.pensionAge ? fmt(p.monthlyPension) + "만원" : "수령 전"} color={retireAge >= p.pensionAge ? "#a78bfa" : "#ccc"} />}
          {p.pensionAge2 > 0 && p.monthlyPension2 > 0 && <InfoRow label={`연금 2 (${p.pensionAge2}세~)`} value={retireAge >= p.pensionAge2 ? fmt(p.monthlyPension2) + "만원" : "수령 전"} color={retireAge >= p.pensionAge2 ? "#f7a94f" : "#ccc"} />}
          {p.rentalIncome > 0 && <InfoRow label="추가 소득" value={fmt(p.rentalIncome) + "만원"} color="#34c48b" />}
          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 6, paddingTop: 6 }}>
            <InfoRow label="월 지출 가능액" value={fmt(spendM) + "만원"} color={accentColor} bold />
            <InfoRow label="자산 소진 예상" value={res.exhaustAge + (res.exhaustAge !== "120+" ? "세" : "")} color={exhaustOk ? "#34c48b" : "#f47f7f"} sub={"기대수명 " + p.lifeExpect + "세"} />
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 10 }}>라이프 타임라인</div>
          <Timeline items={timelineItems} />
        </div>
      </div>
    );
  };

  // ── 리밸런싱 탭 ──
  const RbTab = () => {
    const { base, adj, converted, newInvest, newProp, optPct } = rbResult;
    const baseSpendM = Math.round(base.spend / 10000);
    const adjSpendM = Math.round(adj.spend / 10000);
    const diff = adjSpendM - baseSpendM;
    const targetMet = adjSpendM >= p.rbTargetSpend;
    const convertedAmt = converted * 10000; // 원 단위

    // 비율 바 계산 (은퇴 시 기준)
    const totalVal = adj.fa + adj.propVal;
    const investPct = totalVal > 0 ? (adj.fa / totalVal * 100) : 0;
    const propPct = 100 - investPct;

    return (
      <div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", marginBottom: 12, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 10 }}>시뮬레이션 조건</div>
          <FRow items={[
            { label: "목표 은퇴 나이", value: p.rbRetireAge, onChange: set("rbRetireAge"), unit: "세" },
            { label: "목표 월 지출액", value: p.rbTargetSpend, onChange: set("rbTargetSpend"), unit: "만원", step: 10 },
          ]} />
        </div>

        {/* 슬라이더 */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", marginBottom: 12, border: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1 }}>부동산 → 투자자산 전환</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7" }}>{p.rbConvertPct}%</div>
          </div>
          <input type="range" min={0} max={100} value={p.rbConvertPct}
            onChange={e => set("rbConvertPct")(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4f8ef7", marginBottom: 8 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 12 }}>
            <span>전환 없음</span>
            <span>전액 전환</span>
          </div>
          {converted > 0 && (
            <div style={{ background: "#f0f7ff", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#4f8ef7", marginBottom: 10 }}>
              부동산 <strong>{fmtM(convertedAmt)}원</strong> → 투자자산으로 전환
            </div>
          )}

          {/* 전환 후 자산 구성 바 */}
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5 }}>은퇴 시 자산 구성 (전환 후)</div>
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 18, marginBottom: 4 }}>
            <div style={{ width: investPct + "%", background: "#4f8ef7", transition: "width 0.3s" }} />
            <div style={{ width: propPct + "%", background: "#f7a94f", transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            <span style={{ color: "#4f8ef7" }}>● 투자자산 {investPct.toFixed(0)}% ({fmtM(adj.fa)}원)</span>
            <span style={{ color: "#f7a94f" }}>● 부동산 {propPct.toFixed(0)}% ({fmtM(adj.propVal)}원)</span>
          </div>
        </div>

        {/* 결과 비교 */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "13px 15px", marginBottom: 12, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 10 }}>월 지출 가능액 비교</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div style={{ background: "#f7f8fc", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>전환 전</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#888" }}>{fmt(baseSpendM)}<span style={{ fontSize: 12 }}>만원</span></div>
            </div>
            <div style={{ background: targetMet ? "#eafaf2" : "#f0f7ff", borderRadius: 8, padding: "10px 12px", border: `1.5px solid ${targetMet ? "#34c48b" : "#4f8ef7"}30` }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>전환 후</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: targetMet ? "#34c48b" : "#4f8ef7" }}>{fmt(adjSpendM)}<span style={{ fontSize: 12 }}>만원</span></div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
            <span style={{ color: "#888" }}>목표 대비</span>
            <span style={{ fontWeight: 700, color: targetMet ? "#34c48b" : "#f47f7f" }}>
              {targetMet ? `목표 달성 (+${fmt(adjSpendM - p.rbTargetSpend)}만원 여유)` : `${fmt(p.rbTargetSpend - adjSpendM)}만원 부족`}
            </span>
          </div>
          {diff !== 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6 }}>
              <span style={{ color: "#888" }}>전환으로 인한 변화</span>
              <span style={{ fontWeight: 700, color: diff > 0 ? "#34c48b" : "#f47f7f" }}>
                {diff > 0 ? "+" : ""}{fmt(diff)}만원/월
              </span>
            </div>
          )}
        </div>

        {/* 추천 전환 비율 */}
        <div style={{ background: optPct !== null && optPct <= p.rbConvertPct ? "#eafaf2" : "#fff8ec", borderRadius: 10, padding: "13px 15px", marginBottom: 12, border: `1px solid ${optPct !== null && optPct <= p.rbConvertPct ? "#34c48b" : "#f7a94f"}30` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 8 }}>💡 자동 추천</div>
          {optPct !== null ? (
            targetMet && p.rbConvertPct <= optPct + 1 ? (
              <div style={{ fontSize: 13, color: "#34c48b", fontWeight: 600 }}>
                ✅ 현재 설정으로 목표 달성 가능합니다
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                  부동산의 <strong style={{ color: "#f7a94f", fontSize: 16 }}>{optPct}%</strong>를 전환하면 목표 달성
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  전환 금액: <strong>{fmtM(p.propertyAsset * optPct / 100 * 10000)}원</strong>
                  <span style={{ color: "#bbb", marginLeft: 6 }}>({fmtM(p.propertyAsset * 10000)}원 중)</span>
                </div>
                <button onClick={() => set("rbConvertPct")(optPct)}
                  style={{ marginTop: 10, padding: "7px 14px", background: "#f7a94f", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  추천 비율 적용
                </button>
              </div>
            )
          ) : (
            <div style={{ fontSize: 12, color: "#e05555" }}>
              부동산을 전액 전환해도 목표 달성이 어렵습니다.<br />
              <span style={{ color: "#aaa" }}>은퇴 나이를 늦추거나 목표 지출을 조정해보세요.</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: "#ccc", textAlign: "center", lineHeight: 1.7 }}>
          본 계산기는 참고용이며 실제 은퇴 설계는<br />금융 전문가와 상담하시길 권장합니다
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Pretendard',sans-serif", background: "#f7f8fc", minHeight: "100vh" }}>
      <div style={{ background: "#fff", padding: "14px 20px 10px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#222" }}>
              🏦 은퇴 계산기 <span style={{ fontSize: 11, color: "#bbb", fontWeight: 400 }}>v1.1</span> <span style={{ fontSize: 11, color: "#bbb", fontWeight: 400 }}>by KM</span>
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3, lineHeight: 1.5 }}>적절한 은퇴 시기를 파악해서 과하게 일하지 않도록 미리 대비하기 위해 제작함.</div>
          </div>
          {tab !== "rebalance" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button style={modeBtn(mode === "A", "#4f8ef7")} onClick={() => { setMode("A"); setTab("input"); }}>
                🎯 목표 지출 입력<br /><span style={{ fontSize: 10, opacity: 0.85 }}>가능한 은퇴 나이 계산</span>
              </button>
              <button style={modeBtn(mode === "B", "#34c48b")} onClick={() => { setMode("B"); setTab("input"); }}>
                📅 은퇴 나이 설정<br /><span style={{ fontSize: 10, opacity: 0.85 }}>월 지출 가능액 계산</span>
              </button>
            </div>
          )}
          <div style={{ display: "flex", background: "#f5f6f8", borderRadius: 10, padding: 3 }}>
            {[["input","입력"], ["result","결과"], ["rebalance","시뮬레이션"]].map(([t, label]) => (
              <div key={t} style={{ flex: 1, position: "relative" }}
                onMouseEnter={e => { if (t === "rebalance") e.currentTarget.querySelector(".tooltip").style.display = "block"; }}
                onMouseLeave={e => { if (t === "rebalance") e.currentTarget.querySelector(".tooltip").style.display = "none"; }}>
                <button style={{ ...tabBtn(tab === t), width: "100%" }} onClick={() => setTab(t)}>{label}</button>
                {t === "rebalance" && (
                  <div className="tooltip" style={{
                    display: "none", position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                    transform: "translateX(-50%)", background: "#333", color: "#fff",
                    fontSize: 11, lineHeight: 1.6, padding: "8px 11px", borderRadius: 8,
                    whiteSpace: "nowrap", zIndex: 100, pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                  }}>
                    자산 재배분을 통해 은퇴 시기나<br />은퇴 후 지출 가능액을 조절해보세요.
                    <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "#333", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "18px 16px 40px" }}>
        {tab === "input" && (
          <div>
            <G title="기본 정보">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[["현재 나이", "currentAge", "세"], ["기대 수명", "lifeExpect", "세"]].map(([l, k, u]) => {
                  const [fc, setFc] = useState(false);
                  return (
                    <div key={k} style={{ background: "#f5f6f8", borderRadius: 8, padding: "9px 10px 7px", border: "1px solid #eee" }}>
                      <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>{l}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                        <input type="number" value={fc && p[k] === 0 ? "" : p[k]}
                          onFocus={() => setFc(true)}
                          onBlur={e => { setFc(false); if (e.target.value === "") set(k)(0); }}
                          onChange={e => set(k)(e.target.value === "" ? 0 : Number(e.target.value))}
                          style={{ width: "100%", border: "none", background: "transparent", fontSize: 20, fontWeight: 700, color: "#222", outline: "none", padding: 0 }} />
                        <span style={{ fontSize: 11, color: "#aaa" }}>{u}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {mode === "A"
                ? <F label="목표 월 지출액" value={p.targetSpend} onChange={set("targetSpend")} unit="만원" step={10} hint="은퇴 후 원하는 월 지출" />
                : <F label="목표 은퇴 나이" value={p.targetRetireAge} onChange={set("targetRetireAge")} unit="세" hint="이 나이에 은퇴 시뮬레이션" />
              }
            </G>
            <G title="현재 소득 / 지출">
              <F label="세후 월 소득" value={p.monthlyIncome} onChange={set("monthlyIncome")} unit="만원" step={10} />
              <F label="월 지출" value={p.monthlySpend} onChange={set("monthlySpend")} unit="만원" step={10} hint="고정비+변동비 합산" />
              <div style={{ display: "flex", justifyContent: "space-between", background: "#f0f7ff", borderRadius: 7, padding: "7px 10px", fontSize: 12 }}>
                <span style={{ color: "#888" }}>월 저축 가능액</span>
                <strong style={{ color: "#4f8ef7" }}>{fmtM(mSave)}원</strong>
              </div>
            </G>
            <G title="현재 자산">
              <F label="투자자산" value={p.investAsset} onChange={set("investAsset")} unit="만원" step={100} hint="예금·주식·펀드 등" />
              <F label="부동산 자산" value={p.propertyAsset} onChange={set("propertyAsset")} unit="만원" step={500} hint="실거주·투자 포함" />
              <F label="대출금" value={p.loanAmount} onChange={set("loanAmount")} unit="만원" step={500} />
            </G>
            <G title="투자 수익률">
              <FRow items={[
                { label: "투자 수익률", value: p.investReturn, onChange: set("investReturn"), unit: "%", step: 0.5 },
                { label: "부동산 상승률", value: p.propertyGrowth, onChange: set("propertyGrowth"), unit: "%", step: 0.5 },
              ]} />
            </G>
            <G title="은퇴 후 수입">
              <FRow items={[
                { label: "연금 1 나이", value: p.pensionAge, onChange: set("pensionAge"), unit: "세" },
                { label: "월 수령액", value: p.monthlyPension, onChange: set("monthlyPension"), unit: "만원", step: 10 },
              ]} />
              <FRow items={[
                { label: "연금 2 나이", value: p.pensionAge2, onChange: set("pensionAge2"), unit: "세", hint: "(0=없음)" },
                { label: "월 수령액", value: p.monthlyPension2, onChange: set("monthlyPension2"), unit: "만원", step: 10 },
              ]} />
              <F label="추가 소득" value={p.rentalIncome} onChange={set("rentalIncome")} unit="만원/월" step={5} hint="임대·배당·부업 등" />
            </G>
            <button onClick={() => setTab("result")}
              style={{ width: "100%", padding: "12px", background: accentColor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {mode === "A" ? "가능한 은퇴 나이 계산 →" : "월 지출 가능액 계산 →"}
            </button>
          </div>
        )}
        {tab === "result" && (
          <div>
            <ResultPanel res={mode === "A" ? resultA : resultB} retireAge={mode === "A" ? resultA?.age : p.targetRetireAge} />
            <div style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
              본 계산기는 참고용이며 실제 은퇴 설계는<br />금융 전문가와 상담하시길 권장합니다
            </div>
          </div>
        )}
        {tab === "rebalance" && <RbTab />}
      </div>
    </div>
  );
}