"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

interface CampaignStat {
  name: string;
  spend: number;
  leads: number;
  deals: number;
  revenue: number;
  roas: number;
}

interface ChannelStat {
  channel: string;
  icon: string;
  clicks: number;
  deals: number;
  revenue: number;
}

export function ReportPanel() {
  const [period, setPeriod] = useState("2026-08");
  const [downloading, setDownloading] = useState(false);

  // Dữ liệu mẫu tháng 8/2026 chuẩn theo spec nd-insight
  const summary = {
    spend: 12_400_000,
    leads: 34,
    deals: 7,
    revenue: 91_000_000,
    roas: 7.3,
  };

  const channels: ChannelStat[] = [
    { channel: "Zalo (click link / OA)", icon: "💬", clicks: 19, deals: 4, revenue: 51_000_000 },
    { channel: "Gọi điện (click tel:)", icon: "📞", clicks: 8, deals: 2, revenue: 28_000_000 },
    { channel: "Điền form website", icon: "📝", clicks: 7, deals: 1, revenue: 12_000_000 },
  ];

  const campaigns: CampaignStat[] = [
    { name: "Chiến dịch A · Quảng cáo trọng tâm", spend: 8_200_000, leads: 24, deals: 6, revenue: 76_000_000, roas: 9.2 },
    { name: "Chiến dịch B · Tiếp cận mở rộng", spend: 4_200_000, leads: 10, deals: 1, revenue: 15_000_000, roas: 3.6 },
  ];

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 400);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f0f2f5] p-4 sm:p-6" style={{ color: "var(--wa-text)" }}>
      {/* Header Bar */}
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-slate-900">Báo cáo hiệu quả &amp; doanh thu</h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                nd-insight v0
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Quy kết chi phí quảng cáo $\rightarrow$ lead liên hệ $\rightarrow$ đơn chốt cho {BRAND.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border bg-white px-3 py-1.5 text-[13px] font-medium shadow-sm outline-none"
              style={{ borderColor: "var(--wa-border)" }}
            >
              <option value="2026-08">Tháng 08 / 2026</option>
              <option value="2026-09">Tháng 09 / 2026 (Hiện tại)</option>
            </select>

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
              <span>{downloading ? "Đang chuẩn bị..." : "Tải báo cáo (A4)"}</span>
            </button>
          </div>
        </div>

        {/* Tờ A4 Summary Banner */}
        <div className="mt-5 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--wa-border)" }}>
          <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: "var(--wa-border)" }}>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kết luận tháng</span>
              <p className="mt-1 text-[17px] font-bold sm:text-[19px]" style={{ color: "var(--wa-teal)" }}>
                Tháng 8: 12,4tr ngân sách $\rightarrow$ 34 lead $\rightarrow$ 7 đơn $\rightarrow$ 91tr doanh thu $\rightarrow$ ROAS 7.3x
              </p>
              <p className="mt-1 text-[13px] text-slate-600 leading-5">
                Cứ 1 đồng ngân sách quảng cáo thu về 7,3 đồng doanh thu thực tế ghi nhận từ sale.
              </p>
            </div>
            <div className="hidden rounded-xl bg-emerald-50 p-3 text-center sm:block">
              <span className="text-[11px] font-medium text-emerald-700">ROAS kỳ này</span>
              <p className="text-2xl font-black text-emerald-800">7.3×</p>
            </div>
          </div>

          {/* 4 Card số liệu chính */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
              <span className="text-[11.5px] font-medium text-slate-500">Chi tiêu quảng cáo</span>
              <p className="mt-1 text-[18px] font-bold text-slate-900">
                {summary.spend.toLocaleString("vi-VN")} đ
              </p>
              <span className="text-[11px] text-slate-400">Meta + Google Ads</span>
            </div>

            <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
              <span className="text-[11.5px] font-medium text-slate-500">Khách liên hệ (Lead)</span>
              <p className="mt-1 text-[18px] font-bold text-slate-900">
                {summary.leads} lead
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">364k / lead</span>
            </div>

            <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
              <span className="text-[11.5px] font-medium text-slate-500">Số đơn chốt</span>
              <p className="mt-1 text-[18px] font-bold text-slate-900">
                {summary.deals} đơn
              </p>
              <span className="text-[11px] text-slate-500">Tỷ lệ chốt: 20.6%</span>
            </div>

            <div className="rounded-xl border bg-slate-50/60 p-3.5" style={{ borderColor: "var(--wa-border)" }}>
              <span className="text-[11.5px] font-medium text-slate-500">Doanh thu chốt</span>
              <p className="mt-1 text-[18px] font-bold text-emerald-700">
                {summary.revenue.toLocaleString("vi-VN")} đ
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Lãi gộp ước tính cao</span>
            </div>
          </div>
        </div>

        {/* 2 Cột: Kênh & Chiến dịch */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Bảng phân bổ theo Kênh tiếp xúc (F2) */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--wa-border)" }}>
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-[14.5px] font-bold text-slate-900">Phân bổ theo Kênh liên hệ</h3>
              <span className="text-[11.5px] text-slate-400">Đo từ `nd-tag`</span>
            </div>
            <div className="divide-y text-[13px]" style={{ borderColor: "var(--wa-border)" }}>
              {channels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[18px]">{c.icon}</span>
                    <div>
                      <p className="font-medium text-slate-900">{c.channel}</p>
                      <p className="text-[11.5px] text-slate-500">{c.clicks} lượt bấm · {c.deals} đơn chốt</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{c.revenue.toLocaleString("vi-VN")} đ</p>
                    <span className="text-[11px] text-slate-400">
                      {Math.round((c.revenue / summary.revenue) * 100)}% doanh thu
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng phân bổ theo Chiến dịch Ads (F3) */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--wa-border)" }}>
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-[14.5px] font-bold text-slate-900">Hiệu quả theo Chiến dịch Ads</h3>
              <span className="text-[11.5px] text-slate-400">Khuyên dùng tháng sau</span>
            </div>
            <div className="space-y-3">
              {campaigns.map((camp) => (
                <div key={camp.name} className="rounded-xl border p-3.5 bg-slate-50/50" style={{ borderColor: "var(--wa-border)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-[13.5px]">{camp.name}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        Ngân sách: {camp.spend.toLocaleString("vi-VN")} đ · {camp.leads} lead · {camp.deals} đơn
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${camp.roas >= 5 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                      ROAS {camp.roas}x
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[12px] border-t pt-2" style={{ borderColor: "var(--wa-border)" }}>
                    <span className="text-slate-500">Doanh thu thu về:</span>
                    <span className="font-bold text-slate-900">{camp.revenue.toLocaleString("vi-VN")} đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Khuyến nghị tháng tới */}
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-[13px] text-blue-900">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <span>💡 Khuyến nghị tối ưu tháng 9:</span>
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-blue-900/90 leading-5">
            <li>Chiến dịch A đạt ROAS 9.2x vượt trội: Khuyến nghị chuyển thêm 30% ngân sách từ Chiến dịch B sang Chiến dịch A.</li>
            <li>Kênh Zalo chiếm 56% doanh thu: Đảm bảo nhân viên trực Zalo phản hồi dưới 5 phút để nâng tỷ lệ chốt.</li>
            <li>Nút Gọi điện thoại trên mobile đóng góp 28tr doanh thu: Giữ vị trí nổi bật của nút hotline ở góc dưới màn hình.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
