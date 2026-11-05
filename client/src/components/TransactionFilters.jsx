import { Search, X, RotateCcw, Filter } from "lucide-react";

export function TransactionFilters({
  filters,
  onChange,
  onClear,
  availableCategories = [],
  totalCount = 0,
  filteredCount = 0,
}) {
  const isFiltered =
    filters.type !== "all" ||
    filters.category !== "all" ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.search.trim());

  const handleUpdate = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Filter size={16} className="text-emerald-400" />
          <span>Filter Transactions</span>
          {isFiltered && (
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredCount}</strong> of{" "}
            <strong>{totalCount}</strong>
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search by title or note */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleUpdate("search", e.target.value)}
            placeholder="Search title or note..."
            className="w-full rounded-xl border border-white/10 bg-[#09090b] py-2 pl-9 pr-8 text-xs text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-400"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleUpdate("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={filters.type}
            onChange={(e) => handleUpdate("type", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-400"
          >
            <option value="all">All Types (Income & Expense)</option>
            <option value="income">Income Only (+)</option>
            <option value="expense">Expense Only (-)</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={filters.category}
            onChange={(e) => handleUpdate("category", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-400"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Group */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleUpdate("startDate", e.target.value)}
              title="Start Date"
              aria-label="Start Date"
              className="w-full rounded-xl border border-white/10 bg-[#09090b] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-400"
            />
          </div>
          <span className="text-xs text-slate-500">to</span>
          <div className="relative flex-1">
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleUpdate("endDate", e.target.value)}
              title="End Date"
              aria-label="End Date"
              className="w-full rounded-xl border border-white/10 bg-[#09090b] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] text-slate-500">Applied:</span>

          {filters.search.trim() && (
            <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
              Query: &quot;{filters.search}&quot;
              <button
                type="button"
                onClick={() => handleUpdate("search", "")}
                className="hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {filters.type !== "all" && (
            <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
              Type: {filters.type}
              <button
                type="button"
                onClick={() => handleUpdate("type", "all")}
                className="hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {filters.category !== "all" && (
            <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
              Category: {filters.category}
              <button
                type="button"
                onClick={() => handleUpdate("category", "all")}
                className="hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {(filters.startDate || filters.endDate) && (
            <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
              Date: {filters.startDate || "Any"} → {filters.endDate || "Present"}
              <button
                type="button"
                onClick={() => {
                  handleUpdate("startDate", "");
                  handleUpdate("endDate", "");
                }}
                className="hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
