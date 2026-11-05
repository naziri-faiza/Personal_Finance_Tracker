import { useState, useMemo } from "react";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";

const PALETTE = [
  "#34d399", // emerald
  "#fb7185", // rose
  "#38bdf8", // sky
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#f472b6", // pink
  "#2dd4bf", // teal
  "#818cf8", // indigo
  "#f97316", // orange
  "#a3e635", // lime
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export function MonthlyComparisonChart({ transactions = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const monthlyData = useMemo(() => {
    if (!transactions.length) return [];

    const map = new Map();

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = d.getMonth(); // 0-11
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      if (!map.has(key)) {
        map.set(key, { key, label, year, month, income: 0, expense: 0, count: 0 });
      }

      const item = map.get(key);
      const val = Number(tx.amount || 0);
      if (tx.type === "income") {
        item.income += val;
      } else if (tx.type === "expense") {
        item.expense += val;
      }
      item.count += 1;
    });

    // Sort chronologically
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [transactions]);

  if (!monthlyData.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-slate-400">
        <BarChart3 className="mb-2 text-slate-500" size={32} />
        <p className="text-sm font-medium text-slate-300">No monthly data available</p>
        <p className="mt-1 text-xs text-slate-500">
          Add income or expense transactions with dates to view monthly trends.
        </p>
      </div>
    );
  }

  // Calculate scales
  const maxVal = Math.max(
    ...monthlyData.map((d) => Math.max(d.income, d.expense)),
    100
  );

  const chartHeight = 180;
  const paddingX = 20;
  const groupWidth = Math.max(48, Math.min(80, (500 - paddingX * 2) / monthlyData.length));
  const svgWidth = Math.max(480, monthlyData.length * groupWidth + paddingX * 2);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            <span className="text-slate-300">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-400" />
            <span className="text-slate-300">Expenses</span>
          </div>
        </div>

        {hoveredBar && (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#09090b] px-3 py-1 font-mono text-[11px]">
            <span className="text-slate-400">{hoveredBar.label}:</span>
            <span className="text-emerald-400">+{money(hoveredBar.income)}</span>
            <span className="text-rose-400">-{money(hoveredBar.expense)}</span>
            <span className={`font-semibold ${hoveredBar.income >= hoveredBar.expense ? "text-emerald-300" : "text-rose-300"}`}>
              Net: {money(hoveredBar.income - hoveredBar.expense)}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight + 40}`}
          className="h-60 w-full min-w-[480px]"
          preserveAspectRatio="none"
        >
          {/* Subtle grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * (chartHeight - 20) + 10;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX}
                  y={y - 4}
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {money(maxVal * ratio)}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {monthlyData.map((d, index) => {
            const groupX = paddingX + index * groupWidth + (groupWidth - 40) / 2;
            const incHeight = maxVal > 0 ? (d.income / maxVal) * (chartHeight - 20) : 0;
            const expHeight = maxVal > 0 ? (d.expense / maxVal) * (chartHeight - 20) : 0;
            const incY = chartHeight - incHeight + 10;
            const expY = chartHeight - expHeight + 10;
            const isHovered = hoveredBar?.key === d.key;

            return (
              <g
                key={d.key}
                onMouseEnter={() => setHoveredBar(d)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredBar && !isHovered ? 0.45 : 1}
              >
                {/* Background hover highlight */}
                <rect
                  x={groupX - 6}
                  y={10}
                  width={46}
                  height={chartHeight + 20}
                  fill={isHovered ? "rgba(255,255,255,0.04)" : "transparent"}
                  rx={6}
                />

                {/* Income Bar */}
                <rect
                  x={groupX}
                  y={incY}
                  width={15}
                  height={Math.max(incHeight, 2)}
                  fill="#34d399"
                  rx={3}
                  className="transition-all duration-300"
                />

                {/* Expense Bar */}
                <rect
                  x={groupX + 18}
                  y={expY}
                  width={15}
                  height={Math.max(expHeight, 2)}
                  fill="#fb7185"
                  rx={3}
                  className="transition-all duration-300"
                />

                {/* Month Label */}
                <text
                  x={groupX + 16}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  fill={isHovered ? "#34d399" : "rgba(255,255,255,0.6)"}
                  fontSize="11"
                  fontWeight={isHovered ? "600" : "400"}
                  fontFamily="sans-serif"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function CategoryDonutChart({ transactions = [] }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const { breakdown, totalExpenses, slices } = useMemo(() => {
    const expenseTxs = transactions.filter((t) => t.type === "expense");
    const total = expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const map = {};
    expenseTxs.forEach((t) => {
      const cat = t.category || "Uncategorized";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });

    const list = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount], idx) => {
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return {
          category,
          amount,
          percentage: pct,
          color: PALETTE[idx % PALETTE.length],
        };
      });

    const { slices: computedSlices } = list.reduce(
      (acc, item) => {
        const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -acc.offset;
        acc.slices.push({
          ...item,
          strokeDasharray,
          strokeDashoffset,
        });
        acc.offset += (item.percentage / 100) * circumference;
        return acc;
      },
      { slices: [], offset: 0 }
    );

    return { breakdown: list, totalExpenses: total, slices: computedSlices };
  }, [transactions, circumference]);

  if (!breakdown.length || totalExpenses <= 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-slate-400">
        <PieIcon className="mb-2 text-slate-500" size={32} />
        <p className="text-sm font-medium text-slate-300">No expense data</p>
        <p className="mt-1 text-xs text-slate-500">
          Track expenses under different categories to see the breakdown.
        </p>
      </div>
    );
  }

  const activeItem = hoveredCategory || breakdown[0];

  return (
    <div className="grid gap-6 sm:grid-cols-[180px_1fr] items-center">
      {/* SVG Donut */}
      <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90 transform">
          {/* Base track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="20"
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredCategory?.category === slice.category;
            return (
              <circle
                key={slice.category}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? "24" : "19"}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredCategory(slice)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            );
          })}
        </svg>

        {/* Donut Center Display */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 truncate max-w-[100px]">
            {activeItem?.category}
          </p>
          <p className="mt-0.5 text-base font-bold text-white">
            {money(activeItem?.amount)}
          </p>
          <p className="text-[11px] font-medium text-slate-400">
            {activeItem?.percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Legend & List */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {breakdown.map((item) => {
          const isSelected = activeItem?.category === item.category;
          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredCategory(item)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition cursor-pointer text-xs ${
                isSelected
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/5 bg-[#09090b] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-200 truncate">
                  {item.category}
                </span>
              </div>

              <div className="flex items-center gap-2 pl-2">
                <span className="font-semibold text-rose-300">
                  {money(item.amount)}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
