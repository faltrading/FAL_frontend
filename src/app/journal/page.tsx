"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatDateTime, formatPnl } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  BrokerConnection,
  BrokerTrade,
  DashboardData,
  DailyStat,
} from "@/lib/types";
import {
  LayoutDashboard,
  List,
  CalendarDays,
  Link2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Loader2,
  Unplug,
} from "lucide-react";

const PROVIDERS = [
  { id: "ftmo", label: "FTMO" },
  { id: "fintokei", label: "Fintokei" },
  { id: "topstep", label: "TopStep" },
  { id: "tradeify", label: "Tradeify" },
  { id: "lucid", label: "Lucid Trading" },
];

function getCredentialFields(
  provider: string
): { key: string; label: string; type: string }[] {
  if (provider === "ftmo" || provider === "fintokei") {
    return [
      { key: "platform", label: "Platform", type: "text" },
      { key: "ctrader_client_id", label: "cTrader Client ID", type: "text" },
      {
        key: "ctrader_client_secret",
        label: "cTrader Client Secret",
        type: "password",
      },
      {
        key: "ctrader_access_token",
        label: "cTrader Access Token",
        type: "password",
      },
    ];
  }
  if (provider === "topstep") {
    return [
      { key: "platform", label: "Platform", type: "text" },
      { key: "topstepx_api_key", label: "TopStepX API Key", type: "password" },
      {
        key: "topstepx_api_secret",
        label: "TopStepX API Secret",
        type: "password",
      },
    ];
  }
  if (provider === "tradeify" || provider === "lucid") {
    return [
      { key: "platform", label: "Platform", type: "text" },
      {
        key: "tradovate_username",
        label: "Tradovate Username",
        type: "text",
      },
      {
        key: "tradovate_password",
        label: "Tradovate Password",
        type: "password",
      },
    ];
  }
  return [];
}

function DashboardTab({
  connection,
}: {
  connection: BrokerConnection | null;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const res = await api.get<DashboardData>(
        `/api/v1/broker/connections/${connection.id}/dashboard`
      );
      setData(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      await api.post(`/api/v1/broker/connections/${connection.id}/sync`);
      await fetchDashboard();
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  if (!connection) {
    return (
      <div className="card text-center py-16">
        <Unplug className="h-12 w-12 text-surface-500 mx-auto mb-4" />
        <p className="text-lg font-semibold text-surface-200 mb-2">
          {t("journal.noConnection")}
        </p>
        <p className="text-sm text-surface-400">{t("journal.connectFirst")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: t("journal.totalPnl"),
      value: formatPnl(data.kpi.total_pnl),
      color:
        data.kpi.total_pnl >= 0 ? "text-success-400" : "text-error-400",
      icon: TrendingUp,
    },
    {
      label: t("journal.winRate"),
      value: `${data.kpi.win_rate.toFixed(1)}%`,
      color: data.kpi.win_rate >= 50 ? "text-success-400" : "text-warning-400",
      icon: Target,
    },
    {
      label: t("journal.profitFactor"),
      value: data.kpi.profit_factor.toFixed(2),
      color:
        data.kpi.profit_factor >= 1 ? "text-success-400" : "text-error-400",
      icon: BarChart3,
    },
    {
      label: t("journal.totalTrades"),
      value: data.kpi.total_trades.toString(),
      color: "text-brand-400",
      icon: Activity,
    },
    {
      label: t("journal.avgWin"),
      value: `+${data.kpi.average_win.toFixed(2)}`,
      color: "text-success-400",
      icon: TrendingUp,
    },
    {
      label: t("journal.avgLoss"),
      value: data.kpi.average_loss.toFixed(2),
      color: "text-error-400",
      icon: TrendingDown,
    },
    {
      label: t("journal.maxDrawdown"),
      value: `${data.kpi.max_drawdown.toFixed(2)}%`,
      color: "text-error-400",
      icon: AlertTriangle,
    },
    {
      label: t("journal.openPositions"),
      value: data.open_positions.length.toString(),
      color: "text-brand-400",
      icon: Users,
    },
  ];

  const maxPnl = Math.max(
    ...data.daily_pnl.map((d) => Math.abs(d.total_pnl)),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-secondary"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("journal.sync")}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-4 w-4 text-surface-500" />
              <p className="text-xs text-surface-400 uppercase tracking-wide">
                {kpi.label}
              </p>
            </div>
            <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-surface-200 mb-4">
          {t("journal.dailyPnl")}
        </h3>
        <div className="flex items-end gap-1 h-40">
          {data.daily_pnl.slice(-30).map((day, idx) => {
            const heightPercent = Math.max(
              (Math.abs(day.total_pnl) / maxPnl) * 100,
              2
            );
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end items-center group relative"
              >
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                  <div className="bg-surface-700 text-surface-100 text-xs rounded px-2 py-1 whitespace-nowrap">
                    {day.date}: {formatPnl(day.total_pnl)}
                  </div>
                </div>
                <div
                  className={cn(
                    "w-full min-w-[4px] rounded-t transition-all",
                    day.total_pnl >= 0 ? "bg-success-500" : "bg-error-500"
                  )}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-surface-200 mb-4">
          {t("journal.recentTrades")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 text-surface-400 font-medium">
                  {t("journal.symbol")}
                </th>
                <th className="text-left py-2 text-surface-400 font-medium">
                  {t("journal.side")}
                </th>
                <th className="text-right py-2 text-surface-400 font-medium">
                  {t("journal.volume")}
                </th>
                <th className="text-right py-2 text-surface-400 font-medium">
                  {t("journal.pnl")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recent_trades.slice(0, 10).map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-surface-700/50"
                >
                  <td className="py-2 text-surface-100">{trade.symbol}</td>
                  <td className="py-2">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        trade.side === "buy"
                          ? "bg-success-500/15 text-success-400"
                          : "bg-error-500/15 text-error-400"
                      )}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-right text-surface-300">
                    {trade.volume}
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right font-medium",
                      trade.pnl !== null && trade.pnl >= 0
                        ? "text-success-400"
                        : "text-error-400"
                    )}
                  >
                    {trade.pnl !== null ? formatPnl(trade.pnl) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TradesTab({ connection }: { connection: BrokerConnection | null }) {
  const { t, locale } = useI18n();
  const [trades, setTrades] = useState<BrokerTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    if (!connection) return;
    setLoading(true);
    api
      .get<{ trades: BrokerTrade[]; total: number }>(
        `/api/v1/broker/connections/${connection.id}/trades`
      )
      .then((res) => setTrades(Array.isArray(res) ? res : res.trades ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [connection]);

  const filteredTrades = useMemo(() => {
    if (filter === "all") return trades;
    return trades.filter((t) => t.status === filter);
  }, [trades, filter]);

  if (!connection) {
    return (
      <div className="card text-center py-16">
        <Unplug className="h-12 w-12 text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">{t("journal.noConnection")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filterOptions: { key: "all" | "open" | "closed"; label: string }[] = [
    { key: "all", label: t("journal.all") },
    { key: "open", label: t("journal.open") },
    { key: "closed", label: t("journal.closed") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === opt.key
                ? "bg-brand-500 text-white"
                : "bg-surface-800 text-surface-300 hover:bg-surface-700"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left py-2 text-surface-400 font-medium">
                {t("journal.symbol")}
              </th>
              <th className="text-left py-2 text-surface-400 font-medium">
                {t("journal.side")}
              </th>
              <th className="text-right py-2 text-surface-400 font-medium">
                {t("journal.volume")}
              </th>
              <th className="text-left py-2 text-surface-400 font-medium">
                {t("journal.openTime")}
              </th>
              <th className="text-left py-2 text-surface-400 font-medium">
                {t("journal.closeTime")}
              </th>
              <th className="text-right py-2 text-surface-400 font-medium">
                {t("journal.pnl")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-surface-700/50"
              >
                <td className="py-2 text-surface-100 font-medium">
                  {trade.symbol}
                </td>
                <td className="py-2">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      trade.side === "buy"
                        ? "bg-success-500/15 text-success-400"
                        : "bg-error-500/15 text-error-400"
                    )}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 text-right text-surface-300">
                  {trade.volume}
                </td>
                <td className="py-2 text-surface-300">
                  {formatDateTime(trade.open_time, locale)}
                </td>
                <td className="py-2 text-surface-300">
                  {trade.close_time
                    ? formatDateTime(trade.close_time, locale)
                    : "-"}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-medium",
                    trade.pnl !== null && trade.pnl >= 0
                      ? "text-success-400"
                      : "text-error-400"
                  )}
                >
                  {trade.pnl !== null ? formatPnl(trade.pnl) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTrades.length === 0 && (
          <div className="text-center py-8 text-surface-400">
            {t("journal.noTrades")}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarTab({
  connection,
}: {
  connection: BrokerConnection | null;
}) {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    if (!connection) return;
    setLoading(true);
    api
      .get<{ stats: DailyStat[]; total: number }>(
        `/api/v1/broker/connections/${connection.id}/daily-stats`
      )
      .then((res) => setStats(Array.isArray(res) ? res : res.stats ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [connection]);

  const pnlMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stat of stats) {
      map[stat.date] = stat.total_pnl;
    }
    return map;
  }, [stats]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  const weekdays = useMemo(() => {
    if (locale === "it") {
      return ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    }
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }, [locale]);

  const navigateMonth = (direction: number) => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  };

  const monthLabel = currentMonth.toLocaleDateString(
    locale === "it" ? "it-IT" : "en-US",
    { month: "long", year: "numeric" }
  );

  if (!connection) {
    return (
      <div className="card text-center py-16">
        <Unplug className="h-12 w-12 text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">{t("journal.noConnection")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="btn-ghost p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-surface-100 capitalize">
          {monthLabel}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="btn-ghost p-2"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-surface-500 py-2"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const year = currentMonth.getFullYear();
          const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
          const dayStr = String(day).padStart(2, "0");
          const dateKey = `${year}-${month}-${dayStr}`;
          const pnl = pnlMap[dateKey];
          const hasPnl = pnl !== undefined;

          return (
            <div
              key={dateKey}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors",
                hasPnl && pnl >= 0 && "bg-success-500/15",
                hasPnl && pnl < 0 && "bg-error-500/15",
                !hasPnl && "bg-surface-900/50"
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  hasPnl && pnl >= 0 && "text-success-400",
                  hasPnl && pnl < 0 && "text-error-400",
                  !hasPnl && "text-surface-500"
                )}
              >
                {day}
              </span>
              {hasPnl && (
                <span
                  className={cn(
                    "text-[10px] font-medium mt-0.5",
                    pnl >= 0 ? "text-success-400" : "text-error-400"
                  )}
                >
                  {formatPnl(pnl)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectTab({
  connections,
  onConnectionChange,
}: {
  connections: BrokerConnection[];
  onConnectionChange: () => void;
}) {
  const { t, locale } = useI18n();
  const [selectedProvider, setSelectedProvider] = useState("");
  const [accountId, setAccountId] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCsvId, setUploadingCsvId] = useState<string | null>(null);

  const credentialFields = useMemo(
    () => getCredentialFields(selectedProvider),
    [selectedProvider]
  );

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setCredentials({});
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !accountId) return;
    setSubmitting(true);
    try {
      await api.post("/api/v1/broker/connections", {
        provider: selectedProvider,
        account_identifier: accountId,
        credentials,
      });
      setSelectedProvider("");
      setAccountId("");
      setCredentials({});
      onConnectionChange();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      await api.post(`/api/v1/broker/connections/${connectionId}/sync`);
      onConnectionChange();
    } catch {
    } finally {
      setSyncingId(null);
    }
  };

  const handleCsvUpload = async (
    connectionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsvId(connectionId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(
        `/api/v1/broker/connections/${connectionId}/import-csv`,
        formData
      );
      onConnectionChange();
    } catch {
    } finally {
      setUploadingCsvId(null);
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {connections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-200">
            {t("journal.existingConnections")}
          </h3>
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    conn.connection_status === "active"
                      ? "bg-success-500"
                      : conn.connection_status === "error"
                        ? "bg-error-500"
                        : "bg-surface-500"
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-surface-100">
                    {conn.provider.toUpperCase()} - {conn.account_identifier}
                  </p>
                  <p className="text-xs text-surface-500">
                    {conn.last_sync_at
                      ? `${t("journal.lastSync")}: ${formatDateTime(
                          conn.last_sync_at,
                          locale
                        )}`
                      : t("journal.neverSynced")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncingId === conn.id}
                  className="btn-secondary text-xs py-1.5"
                >
                  {syncingId === conn.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {t("journal.sync")}
                </button>
                <div className="relative">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleCsvUpload(conn.id, e)}
                    className="hidden"
                    id={`csv-${conn.id}`}
                  />
                  <button
                    onClick={() =>
                      document.getElementById(`csv-${conn.id}`)?.click()
                    }
                    disabled={uploadingCsvId === conn.id}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {uploadingCsvId === conn.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    CSV
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-surface-200 mb-4">
          {t("journal.newConnection")}
        </h3>

        <div className="mb-4">
          <label className="label">{t("journal.provider")}</label>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  selectedProvider === p.id
                    ? "bg-brand-500 text-white"
                    : "bg-surface-700 text-surface-300 hover:bg-surface-600"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {selectedProvider && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="label">{t("journal.accountId")}</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input-field"
                placeholder={t("journal.accountIdPlaceholder")}
              />
            </div>

            {credentialFields.map((field) => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <input
                  type={field.type}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    handleCredentialChange(field.key, e.target.value)
                  }
                  className="input-field"
                />
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={submitting || !accountId}
              className="btn-primary"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("journal.connect")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "trades" | "calendar" | "connect"
  >("dashboard");
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await api.get<{ connections: BrokerConnection[]; total: number }>(
        "/api/v1/broker/connections"
      );
      setConnections(Array.isArray(data) ? data : data.connections ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const activeConnection =
    connections.find((c) => c.connection_status === "active") ||
    connections[0] ||
    null;

  const tabs = [
    {
      key: "dashboard" as const,
      label: t("journal.dashboard"),
      icon: LayoutDashboard,
    },
    { key: "trades" as const, label: t("journal.trades"), icon: List },
    {
      key: "calendar" as const,
      label: t("journal.calendar"),
      icon: CalendarDays,
    },
    { key: "connect" as const, label: t("journal.connect"), icon: Link2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-surface-100 mb-1">
        {t("journal.title")}
      </h1>
      <p className="text-sm text-surface-400 mb-6">
        {t("journal.subtitle")}
      </p>

      <div className="flex gap-1 mb-6 border-b border-surface-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-surface-200"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <DashboardTab connection={activeConnection} />
      )}
      {activeTab === "trades" && (
        <TradesTab connection={activeConnection} />
      )}
      {activeTab === "calendar" && (
        <CalendarTab connection={activeConnection} />
      )}
      {activeTab === "connect" && (
        <ConnectTab
          connections={connections}
          onConnectionChange={fetchConnections}
        />
      )}
    </div>
  );
}
