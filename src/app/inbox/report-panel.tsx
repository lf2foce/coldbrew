"use client";

import { useEffect, useState } from "react";
import { AGENT_ID, BRAND } from "@/lib/brand";

interface CampaignStat {
  name: string;
  source: string;
  spend: number;
  visitors: number;
  leads: number;
  deals: number;
  revenue: number;
  roas: number;
}

interface EventMetric {
  key: string;
  name: string;
  icon: string;
  count: number;
  rate: number;
  color: string;
}

interface LiveEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  timeAgo: string;
  icon: string;
  badgeColor: string;
}

interface AnalyticsOverview {
  has_data: boolean;
  is_connected: boolean;
  last_received_at: string | null;
  site_key: string;
  allowed_origins: string[];
  active_users: number;
  today_visitors: number;
  today_pageviews: number;
  range_visitors: number;
  range_pageviews: number;
  conversion_count: number;
  conversion_rate: string;
  conversion_events: Array<{ key: string; count: number; rate: number }>;
  top_sources: Array<{ source: string; visitors: number; conversions: number; share: number }>;
  top_pages: Array<{ path: string; views: number; conversions: number }>;
  live_feed: Array<{
    id: string;
    event_type: string;
    path: string | null;
    source: string | null;
    campaign: string | null;
    time_ago: string;
  }>;
}

export function ReportPanel() {
  const [viewMode, setViewMode] = useState<"analytics" | "report">("analytics");
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");
  const [downloading, setDownloading] = useState(false);
  const [realData, setRealData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch real data from backend through Coldbrew's BFF proxy
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let inFlight = false;
    const controller = new AbortController();
    setRealData(null);
    const fetchStats = async () => {
      if (stopped || inFlight || document.hidden || !AGENT_ID) return;
      inFlight = true;
      try {
        setLoading(true);
        const res = await fetch(
          `/api/py/v1/agents/${encodeURIComponent(AGENT_ID)}/analytics/overview?range=${timeRange}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AnalyticsOverview;
        if (!stopped) {
          setRealData(json);
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (!stopped && !(err instanceof DOMException && err.name === "AbortError")) {
          setLoadError("Không tải được số liệu. Kiểm tra quyền analytics:read và kết nối backend.");
        }
      } finally {
        inFlight = false;
        if (!stopped) setLoading(false);
      }
    };

    fetchStats();
    // Poll every 15s when tab is active
    timer = window.setInterval(fetchStats, 15000);

    const handleVisibility = () => {
      if (!document.hidden) fetchStats();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopped = true;
      controller.abort();
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [timeRange]);

  const hasRealData = Boolean(realData?.has_data);
  const isConnected = Boolean(realData?.is_connected);
  const isUsingDemo = !hasRealData && showDemo;

  // Dữ liệu Mock chuẩn xác toán học (dùng khi chưa có event thật hoặc bật Demo)
  const mockTotals = {
    today: { visitors: 342, pageviews: 890, conv: 18, cvr: "5.3%" },
    "7d": { visitors: 2_450, pageviews: 6_120, conv: 124, cvr: "5.1%" },
    "30d": { visitors: 9_820, pageviews: 24_800, conv: 486, cvr: "4.9%" },
  }[timeRange];

  const mockEvents: EventMetric[] = [
    {
      key: "click_zalo",
      name: "Bấm chat Zalo (zalo.me)",
      icon: "💬",
      count: timeRange === "today" ? 10 : timeRange === "7d" ? 68 : 266,
      rate: 54.8,
      color: "#0068FF",
    },
    {
      key: "click_tel",
      name: "Bấm gọi Hotline (click tel:)",
      icon: "📞",
      count: timeRange === "today" ? 5 : timeRange === "7d" ? 34 : 133,
      rate: 27.4,
      color: "#25D366",
    },
    {
      key: "form_submit_success",
      name: "Gửi form thành công",
      icon: "📝",
      count: timeRange === "today" ? 2 : timeRange === "7d" ? 14 : 55,
      rate: 11.3,
      color: "#F59E0B",
    },
    {
      key: "chat_interact",
      name: "Tương tác Chatbot AI",
      icon: "🤖",
      count: timeRange === "today" ? 1 : timeRange === "7d" ? 8 : 32,
      rate: 6.5,
      color: "#8B5CF6",
    },
  ];

  const mockSources = [
    { source: "Facebook Ads", visitors: timeRange === "today" ? 178 : timeRange === "7d" ? 1_280 : 5_106, share: 52, conversions: timeRange === "today" ? 10 : timeRange === "7d" ? 72 : 266 },
    { source: "Google Search (Paid)", visitors: timeRange === "today" ? 89 : timeRange === "7d" ? 640 : 2_553, share: 26, conversions: timeRange === "today" ? 5 : timeRange === "7d" ? 31 : 121 },
    { source: "Zalo Ads / Direct OA", visitors: timeRange === "today" ? 45 : timeRange === "7d" ? 310 : 1_277, share: 13, conversions: timeRange === "today" ? 2 : timeRange === "7d" ? 14 : 60 },
    { source: "Truy cập trực tiếp / SEO", visitors: timeRange === "today" ? 30 : timeRange === "7d" ? 220 : 884, share: 9, conversions: timeRange === "today" ? 1 : timeRange === "7d" ? 7 : 39 },
  ];

  const mockPages = [
    { path: "/du-an-biet-thu-ecopark", views: timeRange === "today" ? 310 : timeRange === "7d" ? 2_140 : 8_670, conversions: timeRange === "today" ? 8 : timeRange === "7d" ? 58 : 228 },
    { path: "/bang-gia-chinh-thuc-thang-9", views: timeRange === "today" ? 260 : timeRange === "7d" ? 1_820 : 7_230, conversions: timeRange === "today" ? 6 : timeRange === "7d" ? 42 : 164 },
    { path: "/chinh-sach-uu-dai", views: timeRange === "today" ? 140 : timeRange === "7d" ? 940 : 3_810, conversions: timeRange === "today" ? 2 : timeRange === "7d" ? 16 : 56 },
    { path: "/lien-he-tu-van", views: timeRange === "today" ? 90 : timeRange === "7d" ? 620 : 2_540, conversions: timeRange === "today" ? 1 : timeRange === "7d" ? 8 : 31 },
  ];

  const mockFeed: LiveEvent[] = [
    { id: "1", type: "click_zalo", title: "Khách bấm nhắn Zalo OA", detail: "Nguồn: Facebook Ads · Bài PR Biệt Thự", timeAgo: "2 phút trước", icon: "💬", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
    { id: "2", type: "click_tel", title: "Khách bấm gọi Hotline 0983...", detail: "Nguồn: Google Ads · Từ khóa 'giá biệt thự ecopark'", timeAgo: "6 phút trước", icon: "📞", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "3", type: "form_submit_success", title: "Khách gửi form đăng ký tư vấn thành công", detail: "Trang: /bang-gia-chinh-thuc", timeAgo: "14 phút trước", icon: "📝", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: "4", type: "click_zalo", title: "Khách bấm nhắn Zalo OA", detail: "Nguồn: Zalo Ads · Khách từ Hà Nội", timeAgo: "22 phút trước", icon: "💬", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  ];

  // Map data to display
  const activeUsers = hasRealData ? (realData?.active_users ?? 0) : isUsingDemo ? 6 : 0;
  const visitorsCount = hasRealData ? (realData?.range_visitors ?? 0) : isUsingDemo ? mockTotals.visitors : 0;
  const pageviewsCount = hasRealData ? (realData?.range_pageviews ?? 0) : isUsingDemo ? mockTotals.pageviews : 0;
  const convCount = hasRealData ? (realData?.conversion_count ?? 0) : isUsingDemo ? mockTotals.conv : 0;
  const cvrRate = hasRealData ? (realData?.conversion_rate ?? "0.0%") : isUsingDemo ? mockTotals.cvr : "0.0%";

  const eventBreakdown: EventMetric[] = hasRealData && realData?.conversion_events.length
    ? realData.conversion_events.map((ev) => ({
        key: ev.key,
        name: ev.key === "click_zalo" ? "Bấm chat Zalo (zalo.me)" : ev.key === "click_tel" ? "Bấm gọi Hotline (click tel:)" : ev.key === "form_submit_success" ? "Gửi form thành công" : ev.key === "chat_interact" ? "Tương tác Chatbot AI" : ev.key,
        icon: ev.key === "click_zalo" ? "💬" : ev.key === "click_tel" ? "📞" : ev.key === "form_submit_success" ? "📝" : ev.key === "chat_interact" ? "🤖" : "⚡",
        count: ev.count,
        rate: ev.rate,
        color: ev.key === "click_zalo" ? "#0068FF" : ev.key === "click_tel" ? "#25D366" : "#F59E0B",
      }))
    : isUsingDemo ? mockEvents : [];

  const sourcesList = hasRealData && realData?.top_sources.length ? realData.top_sources : isUsingDemo ? mockSources : [];
  const pagesList = hasRealData && realData?.top_pages.length ? realData.top_pages : isUsingDemo ? mockPages : [];
  const liveList: LiveEvent[] = hasRealData && realData?.live_feed.length
    ? realData.live_feed.map((f) => ({
        id: f.id,
        type: f.event_type,
        title: f.event_type === "click_zalo" ? "Khách bấm nhắn Zalo OA" : f.event_type === "click_tel" ? "Khách bấm gọi Hotline" : f.event_type === "form_submit_success" ? "Khách gửi biểu mẫu thành công" : f.event_type === "chat_interact" ? "Khách tương tác Chatbot AI" : f.event_type,
        detail: `Nguồn: ${f.source || "Trực tiếp"} · Trang: ${f.path || "/"}`,
        timeAgo: f.time_ago,
        icon: f.event_type === "click_zalo" ? "💬" : f.event_type === "click_tel" ? "📞" : "📝",
        badgeColor: f.event_type === "click_zalo" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      }))
    : isUsingDemo ? mockFeed : [];

  // Báo cáo Doanh thu Tháng (nd-insight v0)
  const reportSummary = {
    spend: 12_400_000,
    leads: 34,
    deals: 7,
    revenue: 91_000_000,
    roas: 7.3,
  };

  const campaigns: CampaignStat[] = [
    { name: "Chiến dịch A · Quảng cáo trọng tâm", source: "Facebook Ads", spend: 8_200_000, visitors: 1_650, leads: 24, deals: 6, revenue: 76_000_000, roas: 9.2 },
    { name: "Chiến dịch B · Tiếp cận mở rộng", source: "Google Ads", spend: 4_200_000, visitors: 800, leads: 10, deals: 1, revenue: 15_000_000, roas: 3.6 },
  ];

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 400);
  };

  const tagSnippet = `<script async src="https://app.namdigital.vn/phin.js" data-site="${realData?.site_key || "PHIN-SITE-KEY"}"></script>`;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] p-4 sm:p-6" style={{ color: "var(--wa-text)" }}>
      <div className="mx-auto w-full max-w-5xl">
        {/* Top Header & Tab Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4" style={{ borderColor: "var(--wa-border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-slate-900">
                {viewMode === "analytics" ? "Thống kê Web & Chuyển đổi" : "Báo cáo Doanh thu & ROAS"}
              </h1>
              {isConnected ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  phin.js đang gửi dữ liệu
                </span>
              ) : isUsingDemo ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  Dữ liệu minh hoạ (Demo)
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                  {hasRealData ? "Không có tín hiệu 5 phút qua" : "Chờ nhúng thẻ phin.js"}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Đo lường thời gian thực từ thẻ gắn website cho {BRAND.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chuyển chế độ: Web Analytics vs PDF Report */}
            <div className="flex rounded-lg border bg-white p-0.5 text-[12.5px] font-medium shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
              <button
                onClick={() => setViewMode("analytics")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  viewMode === "analytics"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⚡ Realtime Web</span>
              </button>
              <button
                onClick={() => setViewMode("report")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  viewMode === "report"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📄 Báo cáo PDF A4</span>
              </button>
            </div>

            {viewMode === "report" && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                style={{ background: "var(--wa-teal)" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{downloading ? "Đang chuẩn bị..." : "In / Tải PDF"}</span>
              </button>
            )}
          </div>
        </div>

        {viewMode === "analytics" && loadError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-800">
            {loadError}
          </div>
        )}

        {/* Banner hướng dẫn nhúng thẻ nếu chưa có dữ liệu thật */}
        {viewMode === "analytics" && !hasRealData && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-[13.5px] text-amber-950">Chưa nhận được sự kiện từ website của bạn</p>
                <p className="text-[12.5px] text-amber-900/90 mt-0.5">
                  Gắn mã thẻ sau vào thẻ <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11.5px]">&lt;head&gt;</code> website để bắt đầu đo lường:
                </p>
              </div>
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="self-start sm:self-auto rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-900 hover:bg-amber-50 transition"
              >
                {showDemo ? "Ẩn dữ liệu mẫu" : "Xem thử dữ liệu mẫu"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 p-2.5 text-slate-100">
              <code className="text-[12px] font-mono select-all overflow-x-auto">{tagSnippet}</code>
              <button
                onClick={() => navigator.clipboard.writeText(tagSnippet)}
                className="ml-2 shrink-0 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition"
              >
                Sao chép
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SPLITBEE-STYLE REALTIME WEB ANALYTICS */}
        {/* ========================================================================= */}
        {viewMode === "analytics" && (
          <div className="mt-5 space-y-5">
            {/* Top Filter & Realtime Active Users Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--wa-border)" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 border border-emerald-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="text-[13px] font-bold">{activeUsers} khách</span>
                  <span className="text-[12px] text-emerald-700">hoạt động 5 phút qua</span>
                </div>
                {loading && <span className="text-[11px] text-slate-400 animate-pulse">Đang cập nhật...</span>}
              </div>

              {/* Time Range Selector */}
              <div className="flex rounded-lg border bg-slate-50 p-0.5 text-[12px] font-medium" style={{ borderColor: "var(--wa-border)" }}>
                {(["today", "7d", "30d"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`rounded-md px-3 py-1 transition ${
                      timeRange === r ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r === "today" ? "Hôm nay" : r === "7d" ? "7 ngày qua" : "30 ngày qua"}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Cards Thống kê chính */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <span className="text-[12px] font-medium text-slate-500">Khách truy cập (Visitors)</span>
                <p className="mt-1 text-[22px] font-black text-slate-900">{visitorsCount.toLocaleString("vi-VN")}</p>
                <span className="text-[11px] text-slate-400">Định danh theo visitor_id</span>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <span className="text-[12px] font-medium text-slate-500">Lượt xem trang (Pageviews)</span>
                <p className="mt-1 text-[22px] font-black text-slate-900">{pageviewsCount.toLocaleString("vi-VN")}</p>
                <span className="text-[11px] text-slate-400">Gồm cả SPA navigation</span>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <span className="text-[12px] font-medium text-slate-500">Hành vi liên hệ (Events)</span>
                <p className="mt-1 text-[22px] font-black text-blue-600">{convCount}</p>
                <span className="text-[11px] text-blue-600 font-medium">Zalo + Gọi + Form</span>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <span className="text-[12px] font-medium text-slate-500">Tỷ lệ chuyển đổi (CVR)</span>
                <p className="mt-1 text-[22px] font-black text-emerald-700">{cvrRate}</p>
                <span className="text-[11px] text-emerald-600 font-medium">Liên hệ / Khách ghé</span>
              </div>
            </div>

            {/* Bảng Chi tiết Phễu Chuyển đổi (Conversion Funnel Events) */}
            <div className="rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--wa-border)" }}>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">Chi tiết hành vi liên hệ (Conversion Events)</h3>
                  <p className="text-[12px] text-slate-500">Tự động phát hiện khi khách bấm hotline, link Zalo hoặc gửi biểu mẫu</p>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-semibold text-blue-700 border border-blue-100">
                  {convCount} tương tác
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {eventBreakdown.length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-4 text-center">Chưa có sự kiện liên hệ nào trong khoảng thời gian này.</p>
                ) : (
                  eventBreakdown.map((ev) => (
                    <div key={ev.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px]">{ev.icon}</span>
                          <span className="font-semibold text-slate-900">{ev.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{ev.count} lượt</span>
                          <span className="w-12 text-right text-[12px] text-slate-400">{ev.rate}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ev.rate}%`, backgroundColor: ev.color }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2 Cột: Nguồn Traffic Ads (UTM) & Top Trang Đích */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Nguồn Traffic & Chiến dịch */}
              <div className="rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-[14.5px] font-bold text-slate-900">Nguồn truy cập (UTM Source)</h3>
                  <span className="text-[11.5px] text-slate-400">Khách / Chuyển đổi</span>
                </div>
                <div className="divide-y text-[13px]" style={{ borderColor: "var(--wa-border)" }}>
                  {sourcesList.length === 0 ? (
                    <p className="text-[13px] text-slate-400 py-4 text-center">Chưa có dữ liệu nguồn truy cập.</p>
                  ) : (
                    sourcesList.map((s) => (
                      <div key={s.source} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="font-semibold text-slate-900">{s.source}</p>
                          <p className="text-[11.5px] text-slate-400">{s.share || 0}% tổng traffic</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{(s.visitors || 0).toLocaleString("vi-VN")} khách</p>
                          <span className="text-[11.5px] font-semibold text-emerald-600">{s.conversions || 0} liên hệ</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Landing Pages */}
              <div className="rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-[14.5px] font-bold text-slate-900">Trang đích hiệu quả nhất (Landing Pages)</h3>
                  <span className="text-[11.5px] text-slate-400">Views / Chuyển đổi</span>
                </div>
                <div className="divide-y text-[13px]" style={{ borderColor: "var(--wa-border)" }}>
                  {pagesList.length === 0 ? (
                    <p className="text-[13px] text-slate-400 py-4 text-center">Chưa có dữ liệu trang đích.</p>
                  ) : (
                    pagesList.map((p) => (
                      <div key={p.path} className="flex items-center justify-between py-2.5">
                        <div className="max-w-[240px] truncate">
                          <p className="font-mono text-[12.5px] text-slate-900 truncate">{p.path}</p>
                          <p className="text-[11.5px] text-slate-400">{(p.views || 0).toLocaleString("vi-VN")} lượt xem</p>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-bold text-emerald-700 border border-emerald-100">
                            {p.conversions || 0} liên hệ
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Dòng sự kiện thời gian thực (Live Activity Stream kiểu Splitbee) */}
            <div className="rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--wa-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <h3 className="text-[14.5px] font-bold text-slate-900">Dòng sự kiện trực tiếp (Live Stream)</h3>
                </div>
                <span className="text-[12px] text-slate-400">Cập nhật mỗi 15s</span>
              </div>

              <div className="mt-3 divide-y" style={{ borderColor: "var(--wa-border)" }}>
                {liveList.length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-4 text-center">Chưa có hành vi chuyển đổi nào được ghi nhận gần đây.</p>
                ) : (
                  liveList.map((item) => (
                    <div key={item.id} className="flex items-start justify-between py-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[18px]">{item.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold text-slate-900">{item.title}</p>
                            <span className={`rounded-md border px-1.5 py-0.2 text-[10.5px] font-medium ${item.badgeColor}`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-500">{item.detail}</p>
                        </div>
                      </div>
                      <span className="text-[11.5px] font-medium text-slate-400 whitespace-nowrap">{item.timeAgo}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TỜ BÁO CÁO DOANH THU & ROAS (SPEC ND-INSIGHT V0) */}
        {/* ========================================================================= */}
        {viewMode === "report" && (
          <div className="mt-5 space-y-5">
            <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
              Báo cáo doanh thu bên dưới hiện là dữ liệu minh hoạ, chưa nối với nguồn Ads/CRM thật.
            </div>
            {/* Tờ A4 Summary Banner */}
            <div className="overflow-hidden rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
              <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: "var(--wa-border)" }}>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kết luận tháng</span>
                  <p className="mt-1 text-[17px] font-bold sm:text-[19px]" style={{ color: "var(--wa-teal)" }}>
                    Tháng 8: 12,4tr ngân sách → 34 lead → 7 đơn → 91tr doanh thu → ROAS 7.3x
                  </p>
                  <p className="mt-1 text-[13px] text-slate-600 leading-5">
                    Cứ 1 đồng ngân sách quảng cáo thu về 7,3 đồng doanh thu thực tế ghi nhận từ đội sale.
                  </p>
                </div>
                <div className="hidden rounded-xl bg-emerald-50 p-3 text-center sm:block border border-emerald-100">
                  <span className="text-[11px] font-medium text-emerald-700">ROAS kỳ này</span>
                  <p className="text-2xl font-black text-emerald-800">7.3×</p>
                </div>
              </div>

              {/* 4 Card số liệu tài chính */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
                  <span className="text-[11.5px] font-medium text-slate-500">Chi tiêu quảng cáo</span>
                  <p className="mt-1 text-[18px] font-bold text-slate-900">{reportSummary.spend.toLocaleString("vi-VN")} đ</p>
                  <span className="text-[11px] text-slate-400">Meta + Google Ads</span>
                </div>

                <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
                  <span className="text-[11.5px] font-medium text-slate-500">Khách liên hệ (Lead)</span>
                  <p className="mt-1 text-[18px] font-bold text-slate-900">{reportSummary.leads} lead</p>
                  <span className="text-[11px] text-emerald-600 font-medium">364k / lead</span>
                </div>

                <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
                  <span className="text-[11.5px] font-medium text-slate-500">Số đơn chốt</span>
                  <p className="mt-1 text-[18px] font-bold text-slate-900">{reportSummary.deals} đơn</p>
                  <span className="text-[11px] text-slate-500">Tỷ lệ chốt: 20.6%</span>
                </div>

                <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
                  <span className="text-[11.5px] font-medium text-slate-500">Doanh thu chốt</span>
                  <p className="mt-1 text-[18px] font-bold text-emerald-700">{reportSummary.revenue.toLocaleString("vi-VN")} đ</p>
                  <span className="text-[11px] text-emerald-600 font-medium">Lợi nhuận ròng tốt</span>
                </div>
              </div>
            </div>

            {/* Chi tiết từng chiến dịch */}
            <div className="rounded-2xl border bg-white p-5 shadow-xs" style={{ borderColor: "var(--wa-border)" }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--wa-border)" }}>
                <h3 className="text-[14.5px] font-bold text-slate-900">Chi tiết hiệu quả theo Chiến dịch Ads (F3)</h3>
                <span className="text-[11.5px] text-slate-400">Đối soát Ads Manager &amp; CRM</span>
              </div>
              <div className="mt-4 space-y-3">
                {campaigns.map((camp) => (
                  <div key={camp.name} className="rounded-xl border p-4 bg-slate-50/50" style={{ borderColor: "var(--wa-border)" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-[14px]">{camp.name}</p>
                          <span className="rounded-md bg-slate-200 px-1.5 py-0.2 text-[11px] font-medium text-slate-700">
                            {camp.source}
                          </span>
                        </div>
                        <p className="text-[12.5px] text-slate-500 mt-1">
                          Ngân sách: <strong>{camp.spend.toLocaleString("vi-VN")} đ</strong> · {camp.visitors} click web · {camp.leads} lead · {camp.deals} đơn chốt
                        </p>
                      </div>
                      <span className={`rounded-md px-2.5 py-1 text-[12px] font-black ${camp.roas >= 5 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                        ROAS {camp.roas}x
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[12.5px] border-t pt-2.5" style={{ borderColor: "var(--wa-border)" }}>
                      <span className="text-slate-500">Doanh thu chốt mang về:</span>
                      <span className="font-bold text-slate-900 text-[14px]">{camp.revenue.toLocaleString("vi-VN")} đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Khuyến nghị tháng tới */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-[13px] text-blue-950">
              <p className="font-bold">💡 Khuyến nghị tối ưu tháng tới:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-blue-900/90 leading-5">
                <li>Chiến dịch A đạt ROAS 9.2x vượt trội: Khuyến nghị chuyển thêm 30% ngân sách từ Chiến dịch B sang Chiến dịch A.</li>
                <li>Kênh Zalo chiếm 56% doanh thu: Đảm bảo nhân viên trực Zalo phản hồi dưới 5 phút để nâng tỷ lệ chốt.</li>
                <li>Nút Gọi điện thoại trên mobile đóng góp 28tr doanh thu: Giữ vị trí nổi bật của nút hotline ở góc dưới màn hình.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
