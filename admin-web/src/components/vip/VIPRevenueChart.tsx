interface RevenuePoint {
  date: string;
  revenue: number;
}

interface VIPRevenueChartProps {
  points: RevenuePoint[];
  compact?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string, monthOnly = false) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", monthOnly ? { month: "short" } : { day: "2-digit", month: "2-digit" }).format(date);
}

export function VIPRevenueChart({ points, compact = false }: VIPRevenueChartProps) {
  const width = 760;
  const height = compact ? 120 : 180;
  const padding = compact ? 8 : 12;
  const max = Math.max(...points.map((point) => point.revenue), 1);
  const plottedPoints = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2),
    y: height - padding - (point.revenue / max) * (height - padding * 2),
  }));
  const polyline = plottedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = plottedPoints.length
    ? `M ${plottedPoints[0].x} ${height} L ${polyline.replaceAll(" ", " L ")} L ${plottedPoints[plottedPoints.length - 1].x} ${height} Z`
    : "";
  const markerStep = Math.max(1, Math.ceil(plottedPoints.length / (compact ? 5 : 7)));
  const markers = plottedPoints.filter((_, index) => index === 0 || index === plottedPoints.length - 1 || index % markerStep === 0);
  return (
    <div className={compact ? "mt-3" : "mt-5"}>
      <div className={compact ? "h-33" : "h-54.5"}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ doanh thu VIP" className="h-full w-full overflow-visible">
          {[0.2, 0.4, 0.6, 0.8].map((fraction) => {
            const y = height * fraction;
            return <line key={fraction} x1="0" x2={width} y1={y} y2={y} stroke="#e8edf6" strokeWidth="1" />;
          })}
          {area ? <path d={area} fill="#dfe8ff" opacity="0.7" /> : null}
          {polyline ? <polyline points={polyline} fill="none" stroke="#3d5af1" strokeWidth={compact ? "2.5" : "3"} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {markers.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r={compact ? "3" : "4"} fill="#ffffff" stroke="#3d5af1" strokeWidth="2"><title>{`${formatDate(point.date)}: ${formatCurrency(point.revenue)}`}</title></circle>)}
        </svg>
      </div>
      <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-slate-500">
        {markers.map((point) => <span key={point.date}>{formatDate(point.date, compact)}</span>)}
      </div>
    </div>
  );
}
