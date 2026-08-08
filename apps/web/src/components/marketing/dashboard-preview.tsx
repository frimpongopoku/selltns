import { ClipboardList, Wallet, TrendingUp, Package } from "lucide-react";
import { BrowserFrame } from "./browser-frame";

const STATS = [
  { label: "Pending order requests", value: "3", icon: ClipboardList },
  { label: "Confirmed, awaiting payment", value: "5", icon: Wallet },
  { label: "Completed revenue", value: "GH₵12,480", icon: TrendingUp },
  { label: "Active products", value: "18", icon: Package },
];

const RECENT_ORDERS = [
  { customer: "Efua Mensah", total: "GH₵420", status: "Pending review", style: "bg-amber-100 text-amber-800" },
  { customer: "Kwabena Owusu", total: "GH₵260", status: "Confirmed", style: "bg-emerald-100 text-emerald-800" },
  { customer: "Naa Adjei", total: "GH₵610", status: "Completed", style: "bg-neutral-900 text-white" },
];

export function DashboardPreview() {
  return (
    <BrowserFrame url="selltns.com/admin">
      <div className="bg-[#FBFAF8] p-5 dark:bg-[#181818] sm:p-6">
        <p className="text-sm font-semibold text-[#141414] dark:text-[#F2F1EE]">Dashboard</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[#141414]/10 bg-white p-3 dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] leading-snug font-medium text-[#66605A] dark:text-[#A8A29B]">
                  {stat.label}
                </p>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0E9F6E]/15 text-[#0E9F6E] dark:bg-[#34D399]/15 dark:text-[#34D399]">
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-lg font-bold tracking-tight text-[#141414] dark:text-[#F2F1EE]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#141414]/10 bg-white dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C]">
          <p className="border-b border-[#141414]/10 px-3 py-2 text-[11px] font-medium text-[#141414] dark:border-[#F2F1EE]/10 dark:text-[#F2F1EE]">
            Recent order requests
          </p>
          {RECENT_ORDERS.map((order) => (
            <div
              key={order.customer}
              className="flex items-center justify-between gap-2 border-b border-[#141414]/5 px-3 py-2 text-[11px] last:border-0 dark:border-[#F2F1EE]/5"
            >
              <span className="font-medium text-[#141414] dark:text-[#F2F1EE]">{order.customer}</span>
              <span className="text-[#66605A] dark:text-[#A8A29B]">{order.total}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${order.style}`}>
                {order.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
