"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Copy,
  Download,
  Key,
  CheckCircle,
  XCircle,
  HelpCircle,
  X,
  Trash2,
  Filter,
} from "lucide-react";

const PROVIDERS = [
  { id: "ftmo", label: "FTMO" },
  { id: "fintokei", label: "Fintokei" },
  { id: "topstep", label: "TopStep" },
  { id: "tradeify", label: "Tradeify" },
  { id: "lucidtrading", label: "Lucid Trading" },
];

function DashboardTab({
  connection,
}: {
  connection: BrokerConnection | null;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const res = await api.get<DashboardData>(
        `/api/v1/broker/connections/${connection.id}/dashboard`
      );
      setData(res);
    } catch (err) {
      console.error("[Journal] fetchDashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30s to pick up EA-pushed trades
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await api.post(`/api/v1/broker/connections/${connection.id}/sync`);
      await fetchDashboard();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Sync failed";
      setSyncError(msg);
      console.error("[Journal] handleSync error:", err);
      setTimeout(() => setSyncError(null), 5000);
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
      value: formatPnl(data.kpi.total_pnl ?? 0),
      color:
        (data.kpi.total_pnl ?? 0) >= 0 ? "text-success-400" : "text-error-400",
      icon: TrendingUp,
    },
    {
      label: t("journal.winRate"),
      value: `${(data.kpi.win_rate ?? 0).toFixed(1)}%`,
      color: (data.kpi.win_rate ?? 0) >= 50 ? "text-success-400" : "text-warning-400",
      icon: Target,
    },
    {
      label: t("journal.profitFactor"),
      value: (data.kpi.profit_factor ?? 0).toFixed(2),
      color:
        (data.kpi.profit_factor ?? 0) >= 1 ? "text-success-400" : "text-error-400",
      icon: BarChart3,
    },
    {
      label: t("journal.totalTrades"),
      value: (data.kpi.total_trades ?? 0).toString(),
      color: "text-brand-400",
      icon: Activity,
    },
    {
      label: t("journal.avgWin"),
      value: `+${(data.kpi.average_win ?? 0).toFixed(2)}`,
      color: "text-success-400",
      icon: TrendingUp,
    },
    {
      label: t("journal.avgLoss"),
      value: (data.kpi.average_loss ?? 0).toFixed(2),
      color: "text-error-400",
      icon: TrendingDown,
    },
    {
      label: t("journal.maxDrawdown"),
      value: `${(data.kpi.max_drawdown ?? 0).toFixed(2)}%`,
      color: "text-error-400",
      icon: AlertTriangle,
    },
    {
      label: t("journal.openPositions"),
      value: (data.open_positions?.length ?? 0).toString(),
      color: "text-brand-400",
      icon: Users,
    },
  ];

  const maxPnl = Math.max(
    ...(data.daily_pnl ?? []).map((d) => Math.abs(d.total_pnl ?? 0)),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        {syncError && (
          <span className="flex items-center gap-1.5 text-sm text-error-400">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {syncError}
          </span>
        )}
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
          {(data.daily_pnl ?? []).slice(-30).map((day, idx) => {
            const heightPercent = Math.max(
              (Math.abs(day.total_pnl ?? 0) / maxPnl) * 100,
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
                    (day.total_pnl ?? 0) >= 0 ? "bg-success-500" : "bg-error-500"
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
              {(data.recent_trades ?? []).slice(0, 10).map((trade) => (
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

function TradesTab({ connection, dataSource = "all" }: { connection: BrokerConnection | null; dataSource?: "all" | "csv" | "ea" }) {
  const { t, locale } = useI18n();
  const [trades, setTrades] = useState<BrokerTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const fetchTrades = useCallback(() => {
    if (!connection) return;
    setLoading(true);
    api
      .get<{ trades: BrokerTrade[]; total: number }>(
        `/api/v1/broker/connections/${connection.id}/trades`
      )
      .then((res) => setTrades(Array.isArray(res) ? res : res.trades ?? []))
      .catch((err) => console.error("[Journal] fetchTrades error:", err))
      .finally(() => setLoading(false));
  }, [connection]);

  useEffect(() => {
    fetchTrades();
    // Auto-refresh every 30s to pick up EA-pushed trades
    const interval = setInterval(fetchTrades, 30_000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (filter !== "all") result = result.filter((t) => t.status === filter);
    if (dataSource !== "all") {
      result = result.filter((t) => {
        const src = (t.metadata?.source as string | undefined) ?? "unknown";
        return src === dataSource;
      });
    }
    return result;
  }, [trades, filter, dataSource]);

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
      <div className="flex items-center gap-2">
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
        <button
          onClick={fetchTrades}
          disabled={loading}
          title={t("journal.refresh") ?? "Refresh"}
          className="ml-auto p-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
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

  const fetchStats = useCallback(() => {
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

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30s to pick up EA-pushed trades
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

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
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [uploadingCsvId, setUploadingCsvId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [eaGeneratingId, setEaGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showEaInfo, setShowEaInfo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const handleDelete = async (connectionId: string, label: string) => {
    if (!confirm(`Eliminare la connessione "${label}"? Tutti i trade associati verranno rimossi.`)) return;
    setDeletingId(connectionId);
    setDeleteFeedback(null);
    try {
      await api.delete(`/api/v1/broker/connections/${connectionId}`);
      setDeleteFeedback({ id: connectionId, ok: true, msg: "Connessione eliminata" });
      onConnectionChange();
    } catch (err) {
      console.error("[Journal] handleDelete error:", err);
      const msg = err instanceof Error ? err.message : "Errore durante l'eliminazione";
      setDeleteFeedback({ id: connectionId, ok: false, msg });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !accountId) return;
    setSubmitting(true);
    try {
      await api.post("/api/v1/broker/connections", {
        provider: selectedProvider,
        account_identifier: accountId,
        credentials: {},
      });
      setSelectedProvider("");
      setAccountId("");
      onConnectionChange();
    } catch (err) {
      console.error("[Journal] handleSubmit (new connection) error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    setSyncFeedback(null);
    try {
      await api.post(`/api/v1/broker/connections/${connectionId}/sync`);
      setSyncFeedback({ id: connectionId, ok: true, msg: "Sincronizzazione completata" });
      onConnectionChange();
    } catch (err) {
      console.error("[Journal] handleSync error:", err);
      const msg = err instanceof Error ? err.message : "Errore durante la sincronizzazione";
      setSyncFeedback({ id: connectionId, ok: false, msg });
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
    setCsvFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload(
        `/api/v1/broker/connections/${connectionId}/import-csv`,
        formData
      ) as { trades_imported?: number };
      setCsvFeedback({
        id: connectionId,
        ok: true,
        msg: `${res?.trades_imported ?? "?"} trade importati con successo`,
      });
      onConnectionChange();
    } catch (err: unknown) {
      console.error("[Journal] CSV import error:", err);
      const msg = err instanceof Error ? err.message : "Errore durante l'import CSV";
      setCsvFeedback({ id: connectionId, ok: false, msg });
    } finally {
      setUploadingCsvId(null);
      e.target.value = "";
    }
  };

  const handleGenerateEaToken = async (connectionId: string) => {
    setEaGeneratingId(connectionId);
    try {
      await api.post(`/api/v1/broker/connections/${connectionId}/ea-token`);
      onConnectionChange();
    } catch (err) {
      console.error("[Journal] handleGenerateEaToken error:", err);
    } finally {
      setEaGeneratingId(null);
    }
  };

  const copyToken = async (token: string, connId: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(connId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadEa = async (conn: BrokerConnection, version: "mq4" | "mq5") => {
    const token = conn.metadata?.ea_token as string | undefined;
    if (!token) return;
    // The EA calls /api/v1/broker/ea/push directly on the BROKER SERVICE backend,
    // NOT the frontend and NOT the gateway. This avoids extra hops and ensures
    // the EA always reaches the correct endpoint.
    const brokerServiceUrl = (
      process.env.NEXT_PUBLIC_BROKER_SERVICE_URL ||
      process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
      (window.location.hostname === "localhost" ? "http://localhost:8005" : "")
    ).replace(/\/+$/, "");
    if (!brokerServiceUrl) {
      alert("NEXT_PUBLIC_BROKER_SERVICE_URL non configurato. Contatta l'amministratore.");
      return;
    }
    const res = await fetch(`/ea/FAL_Journal.${version}`);
    let content = await res.text();
    content = content.replace("%%GATEWAY_URL%%", brokerServiceUrl);
    content = content.replace("%%EA_TOKEN%%", token);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FAL_Journal_${conn.account_identifier}.${version}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* EA Info Modal */}
      {showEaInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowEaInfo(false)}
        >
          <div
            className="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
                <Key className="h-4 w-4 text-brand-400" />
                Come funziona l&rsquo;EA
              </h3>
              <button
                onClick={() => setShowEaInfo(false)}
                className="text-surface-500 hover:text-surface-300 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-3 text-sm text-surface-300">
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold shrink-0">1.</span>
                <span>Il file <code className="text-brand-300">.mq4</code> si scarica <strong>una volta sola</strong> e resta permanentemente in MetaTrader. Non serve ri-scaricarlo ad ogni sessione.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold shrink-0">2.</span>
                <span>L&rsquo;EA invia i trade chiusi in automatico ogni 60 secondi finché MetaTrader è aperto. Non devi fare nulla.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold shrink-0">3.</span>
                <span>Il token è incorporato nel file. Se premi <strong>Rigenera</strong>, il vecchio token non funzionerà più e dovrai ri-scaricare il <code className="text-brand-300">.mq4</code> aggiornato e copiarlo su MetaTrader.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold shrink-0">4.</span>
                <span>Per la prima installazione: copia il file in <code className="text-surface-400">MQL4/Experts/</code> (MT4) o <code className="text-surface-400">MQL5/Experts/</code> (MT5), apri MetaEditor, premi <kbd className="bg-surface-800 px-1 rounded">F7</kbd> per compilare, poi trascina l&rsquo;EA su un grafico.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold shrink-0">5.</span>
                <span>Aggiungi l&rsquo;URL del server alla whitelist: <em>Strumenti → Opzioni → Expert Advisor → Consenti WebRequest per i seguenti URL</em>.</span>
              </li>
            </ul>
            <button
              onClick={() => setShowEaInfo(false)}
              className="btn-primary w-full text-sm"
            >
              Capito
            </button>
          </div>
        </div>
      )}

      {connections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-200">
            {t("journal.existingConnections")}
          </h3>
          {connections.map((conn) => {
            const eaToken = conn.metadata?.ea_token as string | undefined;
            return (
              <div key={conn.id} className="card flex flex-col gap-3">
                {/* Main row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        conn.connection_status === "active"
                          ? "bg-success-500"
                          : conn.connection_status === "error"
                            ? "bg-error-500"
                            : "bg-surface-500"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-surface-100">
                        {conn.provider.toUpperCase()} — {conn.account_identifier}
                      </p>
                      <p className="text-xs text-surface-500">
                        {conn.last_sync_at
                          ? `${t("journal.lastSync")}: ${formatDateTime(conn.last_sync_at, locale)}`
                          : t("journal.neverSynced")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                    {/* CSV Upload */}
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleCsvUpload(conn.id, e)}
                      className="hidden"
                      id={`csv-${conn.id}`}
                    />
                    <button
                      onClick={() => document.getElementById(`csv-${conn.id}`)?.click()}
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
                    {/* EA Token button (only if no token yet) */}
                    {!eaToken && (
                      <button
                        onClick={() => handleGenerateEaToken(conn.id)}
                        disabled={eaGeneratingId === conn.id}
                        className="btn-secondary text-xs py-1.5"
                        title="Genera Token EA per MT4/MT5"
                      >
                        {eaGeneratingId === conn.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Key className="h-3.5 w-3.5" />
                        )}
                        EA Token
                      </button>
                    )}
                    {/* Delete connection */}
                    <button
                      onClick={() => handleDelete(conn.id, `${conn.provider.toUpperCase()} — ${conn.account_identifier}`)}
                      disabled={deletingId === conn.id}
                      className="btn-secondary text-xs py-1.5 text-error-400 hover:bg-error-500/10 border-error-500/30"
                      title="Elimina connessione"
                    >
                      {deletingId === conn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Elimina
                    </button>
                  </div>
                </div>

                {/* Sync feedback */}
                {syncFeedback?.id === conn.id && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                      syncFeedback.ok
                        ? "bg-success-500/10 text-success-400"
                        : "bg-error-500/10 text-error-400"
                    )}
                  >
                    {syncFeedback.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {syncFeedback.msg}
                  </div>
                )}

                {/* Delete feedback */}
                {deleteFeedback?.id === conn.id && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                      deleteFeedback.ok
                        ? "bg-success-500/10 text-success-400"
                        : "bg-error-500/10 text-error-400"
                    )}
                  >
                    {deleteFeedback.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {deleteFeedback.msg}
                  </div>
                )}

                {/* CSV feedback */}
                {csvFeedback?.id === conn.id && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                      csvFeedback.ok
                        ? "bg-success-500/10 text-success-400"
                        : "bg-error-500/10 text-error-400"
                    )}
                  >
                    {csvFeedback.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {csvFeedback.msg}
                  </div>
                )}

                {/* EA section — visible once token is generated */}
                {eaToken && (
                  <div className="border-t border-surface-700 pt-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-surface-400">EA per MT4/MT5</p>
                      <button
                        onClick={() => setShowEaInfo(true)}
                        className="text-surface-500 hover:text-brand-400 transition-colors"
                        title="Come funziona l'EA?"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* EA Token row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-surface-500 w-16 shrink-0">Token:</span>
                      <code className="text-xs font-mono text-brand-300 bg-surface-800 px-2 py-1 rounded select-all">
                        {eaToken.slice(0, 20)}…
                      </code>
                      <button
                        onClick={() => copyToken(eaToken, conn.id)}
                        className="btn-secondary text-xs py-1"
                      >
                        {copiedId === conn.id ? (
                          <CheckCircle className="h-3 w-3 text-success-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedId === conn.id ? "Copiato!" : "Copia"}
                      </button>
                    </div>
                    {/* EA Server URL row — so user can verify it's correct */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-surface-500 w-16 shrink-0">URL EA:</span>
                      <code className="text-xs font-mono text-surface-400 bg-surface-800 px-2 py-1 rounded break-all">
                        {(process.env.NEXT_PUBLIC_BROKER_SERVICE_URL || process.env.NEXT_PUBLIC_API_GATEWAY_URL || "⚠ URL non configurato").replace(/\/+$/, "")}
                        /api/v1/broker/ea/push
                      </code>
                    </div>
                    {/* Download buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => downloadEa(conn, "mq4")}
                        className="btn-secondary text-xs py-1"
                      >
                        <Download className="h-3 w-3" />
                        MT4 (.mq4)
                      </button>
                      <button
                        onClick={() => downloadEa(conn, "mq5")}
                        className="btn-secondary text-xs py-1"
                      >
                        <Download className="h-3 w-3" />
                        MT5 (.mq5)
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Rigenerando il token, quello vecchio verrà invalidato e l'EA attuale smetterà di funzionare. Dovrai re-scaricare il .mq4 e aggiornarlo su MT4. Continuare?")) {
                            handleGenerateEaToken(conn.id);
                          }
                        }}
                        disabled={eaGeneratingId === conn.id}
                        className="text-xs text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1"
                        title="Rigenera token EA"
                      >
                        {eaGeneratingId === conn.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Rigenera
                      </button>
                    </div>
                    <p className="text-xs text-surface-500 leading-relaxed">
                      1. Scarica il file per la tua piattaforma (.mq4 = MT4, .mq5 = MT5)<br />
                      2. Copialo in <code className="text-surface-400">MQL4/Experts/</code> o <code className="text-surface-400">MQL5/Experts/</code><br />
                      3. Compila con F7 in MetaEditor, trascina su un grafico<br />
                      4. <span className="text-surface-400">Strumenti &rarr; Opzioni &rarr; Expert Advisor</span> → aggiungi il server alla whitelist WebRequest
                    </p>
                  </div>
                )}
              </div>
            );
          })}
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
                onClick={() => setSelectedProvider(p.id)}
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
            <p className="text-xs text-surface-500">
              Dopo aver aggiunto la connessione potrai caricare un CSV o configurare l&rsquo;EA per MT4/MT5.
            </p>
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
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [dataSourcePref, setDataSourcePref] = useState<Record<string, "all" | "csv" | "ea">>({});

  const fetchConnections = useCallback(async () => {
    try {
      const data = await api.get<{ connections: BrokerConnection[]; total: number }>(
        "/api/v1/broker/connections"
      );
      console.debug("[Journal] fetchConnections result:", data);
      const list = Array.isArray(data) ? data : data.connections ?? [];
      setConnections(list);
      // Auto-select first active if nothing selected yet
      setSelectedConnectionId((prev) => {
        if (prev && list.find((c) => c.id === prev)) return prev;
        const active = list.find((c) => c.connection_status === "active") || list[0];
        return active ? active.id : null;
      });
    } catch (err) {
      console.error("[Journal] fetchConnections error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const selectedConnection = useMemo(
    () => connections.find((c) => c.id === selectedConnectionId) || connections[0] || null,
    [connections, selectedConnectionId]
  );

  const currentSource: "all" | "csv" | "ea" =
    selectedConnection ? (dataSourcePref[selectedConnection.id] ?? "all") : "all";

  const setSource = (source: "all" | "csv" | "ea") => {
    if (!selectedConnection) return;
    setDataSourcePref((prev) => ({ ...prev, [selectedConnection.id]: source }));
  };

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
      <p className="text-sm text-surface-400 mb-4">
        {t("journal.subtitle")}
      </p>

      {/* Connection selector */}
      {connections.length > 0 && (
        <div className="mb-5 space-y-2">
          {/* Connection pills */}
          {connections.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {connections.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => setSelectedConnectionId(conn.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    selectedConnection?.id === conn.id
                      ? "bg-brand-500 text-white"
                      : "bg-surface-800 text-surface-300 hover:bg-surface-700"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      conn.connection_status === "active"
                        ? "bg-success-400"
                        : conn.connection_status === "error"
                          ? "bg-error-400"
                          : "bg-surface-500"
                    )}
                  />
                  {conn.provider.toUpperCase()} — {conn.account_identifier}
                </button>
              ))}
            </div>
          )}
          {/* Data source filter */}
          {selectedConnection && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Origine:
              </span>
              {(["all", "csv", "ea"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSource(src)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    currentSource === src
                      ? "bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40"
                      : "bg-surface-800 text-surface-400 hover:bg-surface-700"
                  )}
                >
                  {src === "all" ? "Tutti" : src === "csv" ? "CSV" : "EA (MT4/MT5)"}
                </button>
              ))}
              {currentSource !== "all" && (
                <span className="text-xs text-surface-500 ml-1">
                  (filtro applicato ai Trade)
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
        <DashboardTab connection={selectedConnection} />
      )}
      {activeTab === "trades" && (
        <TradesTab connection={selectedConnection} dataSource={currentSource} />
      )}
      {activeTab === "calendar" && (
        <CalendarTab connection={selectedConnection} />
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
