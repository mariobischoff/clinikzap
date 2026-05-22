'use client';

import { useMemo } from 'react';
import { TrendingUp, CheckCircle2 } from 'lucide-react';

interface Appointment {
  id: string;
  appointmentDate: string | Date | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
}

interface AnalyticsPanelProps {
  appointments: Appointment[];
}

export default function AnalyticsPanel({ appointments }: AnalyticsPanelProps) {
  // 1. Calculate Status Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
    const pending = appointments.filter((a) => a.status === 'PENDING').length;
    const canceled = appointments.filter((a) => a.status === 'CANCELED').length;

    return {
      total,
      confirmed,
      pending,
      canceled,
      confirmedPct: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      pendingPct: total > 0 ? Math.round((pending / total) * 100) : 0,
      canceledPct: total > 0 ? Math.round((canceled / total) * 100) : 0,
    };
  }, [appointments]);

  // 2. Generate Last 7 Days Booking Activity (Line / Area Chart Data)
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return days.map((day) => {
      const dayStr = day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      // Match appointment date YYYY-MM-DD
      const count = appointments.filter((app) => {
        if (!app.appointmentDate) return false;
        const appD = new Date(app.appointmentDate);
        return (
          appD.getDate() === day.getDate() &&
          appD.getMonth() === day.getMonth() &&
          appD.getFullYear() === day.getFullYear()
        );
      }).length;

      return { label: dayStr, value: count };
    });
  }, [appointments]);

  // 3. SVG Donut Chart Coordinates
  const donutData = useMemo(() => {
    const data = [
      { label: 'Confirmados', value: stats.confirmed, color: '#14b8a6' }, // Teal 500
      { label: 'Pendentes', value: stats.pending, color: '#6366f1' },    // Indigo 500
      { label: 'Cancelados', value: stats.canceled, color: '#ef4444' },   // Red 500
    ];

    const totalValue = data.reduce((sum, item) => sum + item.value, 0) || 1;
    let accumulatedAngle = 0;

    return data.map((item) => {
      const percentage = item.value / totalValue;
      const angle = percentage * 360;
      const strokeDasharray = `${(percentage * 251.2).toFixed(1)} 251.2`;
      const strokeDashoffset = `${(-accumulatedAngle / 360 * 251.2).toFixed(1)}`;
      accumulatedAngle += angle;

      return {
        ...item,
        percentage: Math.round(percentage * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [stats]);

  // 4. SVG Line/Area Coordinates Generator
  const areaChartPath = useMemo(() => {
    const width = 500;
    const height = 150;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxVal = Math.max(...chartData.map((d) => d.value), 4); // minimum ceiling of 4 for grid representation

    if (chartData.length === 0) {
      return {
        points: [],
        linePath: '',
        areaPath: '',
        chartWidth,
        chartHeight,
        padding,
        maxVal,
      };
    }

    const points = chartData.map((d, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      const y = padding + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y };
    });

    const linePath = points.reduce(
      (path, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`),
      ''
    );

    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`
      : '';

    return { points, linePath, areaPath, chartWidth, chartHeight, padding, maxVal };
  }, [chartData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Donut Chart Status Distribution */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-teal-400" />
            Distribuição por Status
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Proporção de consultas Confirmadas, Pendentes e Canceladas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
          {/* SVG Donut */}
          <div className="relative w-40 h-40 shrink-0">
            <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="20"
                cy="20"
                r="15.915"
                fill="transparent"
                stroke="#1e293b"
                strokeWidth="4"
              />
              {stats.total > 0 ? (
                donutData.map((slice, idx) => (
                  <circle
                    key={idx}
                    cx="20"
                    cy="20"
                    r="15.915"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="4.2"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-500 ease-out"
                  />
                ))
              ) : (
                <circle
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="transparent"
                  stroke="#334155"
                  strokeWidth="4"
                  strokeDasharray="251.2 251.2"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total</span>
              <span className="text-2xl font-bold text-slate-100 mt-0.5">{stats.total}</span>
            </div>
          </div>

          {/* Labels & Counts */}
          <div className="space-y-3 w-full sm:max-w-[200px]">
            {donutData.map((slice, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="text-slate-350">{slice.label}</span>
                </div>
                <div className="text-right space-x-1.5">
                  <span className="text-slate-100">{slice.value}</span>
                  <span className="text-slate-500 text-[10px]">({slice.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 2: Area / Line Chart Booking Trend */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
            Tendência de Agendamentos
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Quantidade de novas consultas agendadas ao longo dos últimos 7 dias.
          </p>
        </div>

        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-full relative h-[155px]">
            <svg viewBox="0 0 500 155" className="w-full h-full overflow-visible">
              {/* Grids and Axes */}
              {(() => {
                const { padding, chartWidth, chartHeight, maxVal } = areaChartPath;
                return (
                  <>
                    {/* Horizontal gridlines */}
                    {Array.from({ length: 4 }).map((_, i) => {
                      const y = padding + (i / 3) * chartHeight;
                      const gridVal = Math.round(maxVal - (i / 3) * maxVal);
                      return (
                        <g key={i}>
                          <line
                            x1={padding}
                            y1={y}
                            x2={padding + chartWidth}
                            y2={y}
                            stroke="#1e293b"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={padding - 8}
                            y={y + 3.5}
                            fill="#64748b"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="end"
                          >
                            {gridVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area path */}
                    {areaChartPath.areaPath && (
                      <path
                        d={areaChartPath.areaPath}
                        fill="url(#indigoGradient)"
                        opacity="0.15"
                      />
                    )}

                    {/* Line path */}
                    {areaChartPath.linePath && (
                      <path
                        d={areaChartPath.linePath}
                        fill="transparent"
                        stroke="#6366f1" // Indigo 500
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Points markers and labels */}
                    {areaChartPath.points.map((p, i) => (
                      <g key={i} className="group/dot">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#6366f1"
                          stroke="#1e1b4b"
                          strokeWidth="1.5"
                        />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          fill="#a5b4fc"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                        >
                          {chartData[i].value}
                        </text>
                      </g>
                    ))}

                    {/* X Axis dates */}
                    {chartData.map((d, i) => {
                      const x = padding + (i / (chartData.length - 1)) * chartWidth;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={padding + chartHeight + 14}
                          fill="#64748b"
                          fontSize="8"
                          fontWeight="semibold"
                          textAnchor="middle"
                        >
                          {d.label}
                        </text>
                      );
                    })}

                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
