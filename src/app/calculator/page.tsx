"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Calculator,
  Target,
  Landmark,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const CURRENCY_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CHF",
  "EUR/GBP",
  "NZD/USD",
  "USD/CAD",
];

const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP"];

const LEVERAGE_OPTIONS = [
  { label: "1:10", value: 10 },
  { label: "1:20", value: 20 },
  { label: "1:50", value: 50 },
  { label: "1:100", value: 100 },
  { label: "1:200", value: 200 },
  { label: "1:500", value: 500 },
];

function getPipValue(pair: string): number {
  const usdQuotePairs = ["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD"];
  if (usdQuotePairs.includes(pair)) return 10;
  if (pair === "USD/JPY") return 6.7;
  if (pair === "USD/CHF") return 11;
  return 10;
}

function PositionSizeCalculator() {
  const { t } = useI18n();
  const [accountBalance, setAccountBalance] = useState<string>("10000");
  const [riskPercent, setRiskPercent] = useState<string>("1");
  const [stopLossPips, setStopLossPips] = useState<string>("");
  const [currencyPair, setCurrencyPair] = useState("EUR/USD");
  const [accountCurrency, setAccountCurrency] = useState("USD");

  const results = useMemo(() => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const slPips = parseFloat(stopLossPips);
    if (!balance || !risk || !slPips || slPips <= 0) return null;

    const pipValue = getPipValue(currencyPair);
    const riskAmount = balance * (risk / 100);
    const lotSize = riskAmount / (slPips * pipValue);

    return {
      standardLots: lotSize,
      miniLots: lotSize * 10,
      microLots: lotSize * 100,
      riskAmount,
      pipValue,
    };
  }, [accountBalance, riskPercent, stopLossPips, currencyPair]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t("calculator.accountBalance")}</label>
          <input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            className="input-field"
            placeholder="10000"
          />
        </div>
        <div>
          <label className="label">{t("calculator.riskPercent")}</label>
          <input
            type="number"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            className="input-field"
            placeholder="1"
            step="0.1"
          />
        </div>
        <div>
          <label className="label">{t("calculator.stopLossPips")}</label>
          <input
            type="number"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
            className="input-field"
            placeholder="20"
          />
        </div>
        <div>
          <label className="label">{t("calculator.currencyPair")}</label>
          <select
            value={currencyPair}
            onChange={(e) => setCurrencyPair(e.target.value)}
            className="input-field"
          >
            {CURRENCY_PAIRS.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("calculator.accountCurrency")}</label>
          <select
            value={accountCurrency}
            onChange={(e) => setAccountCurrency(e.target.value)}
            className="input-field"
          >
            {ACCOUNT_CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          <div className="card">
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.standardLots")}
            </p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {results.standardLots.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.miniLots")}
            </p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {results.miniLots.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.microLots")}
            </p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {results.microLots.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.riskAmount")}
            </p>
            <p className="text-2xl font-bold text-warning-400 mt-1">
              ${results.riskAmount.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.pipValue")}
            </p>
            <p className="text-2xl font-bold text-surface-100 mt-1">
              ${results.pipValue.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRewardCalculator() {
  const { t } = useI18n();
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [positionSize, setPositionSize] = useState<string>("1");
  const [pairType, setPairType] = useState<"standard" | "jpy">("standard");

  const results = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const size = parseFloat(positionSize);
    if (!entry || !sl || !tp || !size) return null;

    const multiplier = pairType === "jpy" ? 100 : 10000;
    const riskPips = Math.abs(entry - sl) * multiplier;
    const rewardPips = Math.abs(tp - entry) * multiplier;
    if (riskPips === 0) return null;

    const ratio = rewardPips / riskPips;
    const pipValue = pairType === "jpy" ? 6.7 : 10;
    const potentialLoss = riskPips * pipValue * size;
    const potentialProfit = rewardPips * pipValue * size;
    const totalRange = riskPips + rewardPips;
    const riskBarPercent = (riskPips / totalRange) * 100;

    return {
      riskPips,
      rewardPips,
      ratio,
      potentialLoss,
      potentialProfit,
      riskBarPercent,
    };
  }, [entryPrice, stopLoss, takeProfit, positionSize, pairType]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t("calculator.entryPrice")}</label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="input-field"
            placeholder="1.1050"
            step="0.0001"
          />
        </div>
        <div>
          <label className="label">{t("calculator.stopLoss")}</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="input-field"
            placeholder="1.1000"
            step="0.0001"
          />
        </div>
        <div>
          <label className="label">{t("calculator.takeProfit")}</label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="input-field"
            placeholder="1.1150"
            step="0.0001"
          />
        </div>
        <div>
          <label className="label">{t("calculator.positionSizeLots")}</label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            className="input-field"
            placeholder="1"
            step="0.01"
          />
        </div>
        <div>
          <label className="label">{t("calculator.pairType")}</label>
          <select
            value={pairType}
            onChange={(e) =>
              setPairType(e.target.value as "standard" | "jpy")
            }
            className="input-field"
          >
            <option value="standard">Standard (EUR/USD, GBP/USD...)</option>
            <option value="jpy">JPY Pairs (USD/JPY, EUR/JPY...)</option>
          </select>
        </div>
      </div>

      {results && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-surface-400 uppercase tracking-wide">
                {t("calculator.rrRatio")}
              </p>
              <p
                className={cn(
                  "text-2xl font-bold mt-1",
                  results.ratio >= 1 ? "text-success-400" : "text-error-400"
                )}
              >
                1:{results.ratio.toFixed(2)}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-surface-400 uppercase tracking-wide">
                {t("calculator.potentialProfit")}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-5 w-5 text-success-400" />
                <p className="text-2xl font-bold text-success-400">
                  +${results.potentialProfit.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="card text-center">
              <p className="text-xs text-surface-400 uppercase tracking-wide">
                {t("calculator.potentialLoss")}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown className="h-5 w-5 text-error-400" />
                <p className="text-2xl font-bold text-error-400">
                  -${results.potentialLoss.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between text-sm text-surface-400 mb-2">
              <span>{t("calculator.risk")}: {results.riskPips.toFixed(1)} pips</span>
              <span>{t("calculator.reward")}: {results.rewardPips.toFixed(1)} pips</span>
            </div>
            <div className="w-full h-6 rounded-lg overflow-hidden flex">
              <div
                className="bg-error-500 h-full transition-all duration-300"
                style={{ width: `${results.riskBarPercent}%` }}
              />
              <div
                className="bg-success-500 h-full transition-all duration-300"
                style={{ width: `${100 - results.riskBarPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
              <span>{t("calculator.stopLoss")}</span>
              <span>{t("calculator.entry")}</span>
              <span>{t("calculator.takeProfit")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MarginCalculator() {
  const { t } = useI18n();
  const [positionSize, setPositionSize] = useState<string>("1");
  const [leverage, setLeverage] = useState<number>(100);
  const [contractSize, setContractSize] = useState<string>("100000");

  const requiredMargin = useMemo(() => {
    const size = parseFloat(positionSize);
    const contract = parseFloat(contractSize);
    if (!size || !leverage || !contract) return null;
    return (size * contract) / leverage;
  }, [positionSize, leverage, contractSize]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t("calculator.positionSizeLots")}</label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            className="input-field"
            placeholder="1"
            step="0.01"
          />
        </div>
        <div>
          <label className="label">{t("calculator.leverage")}</label>
          <select
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="input-field"
          >
            {LEVERAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("calculator.contractSize")}</label>
          <input
            type="number"
            value={contractSize}
            onChange={(e) => setContractSize(e.target.value)}
            className="input-field"
            placeholder="100000"
          />
        </div>
      </div>

      {requiredMargin !== null && (
        <div className="animate-fade-in">
          <div className="card text-center">
            <Landmark className="h-8 w-8 text-brand-400 mx-auto mb-2" />
            <p className="text-xs text-surface-400 uppercase tracking-wide">
              {t("calculator.requiredMargin")}
            </p>
            <p className="text-3xl font-bold text-brand-400 mt-1">
              ${requiredMargin.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    "position" | "riskreward" | "margin"
  >("position");

  const tabs = [
    {
      key: "position" as const,
      label: t("calculator.positionSize"),
      icon: Calculator,
    },
    {
      key: "riskreward" as const,
      label: t("calculator.riskReward"),
      icon: Target,
    },
    {
      key: "margin" as const,
      label: t("calculator.margin"),
      icon: Landmark,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-surface-100 mb-1">
        {t("calculator.title")}
      </h1>
      <p className="text-sm text-surface-400 mb-6">
        {t("calculator.subtitle")}
      </p>

      <div className="flex gap-1 mb-6 border-b border-surface-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
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

      {activeTab === "position" && <PositionSizeCalculator />}
      {activeTab === "riskreward" && <RiskRewardCalculator />}
      {activeTab === "margin" && <MarginCalculator />}
    </div>
  );
}
