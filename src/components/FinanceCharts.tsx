import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { copy, formatDate, formatMoney, nestedCopy } from "../lib/format";
import type {
  CategorySpending,
  CashFlowPoint,
  PublicModel,
} from "../lib/types";

export function CashFlowChart({
  model,
  data,
}: {
  model: PublicModel;
  data: CashFlowPoint[];
}) {
  return (
    <div
      className="chart-canvas"
      role="img"
      aria-label={`${copy(model, "cashFlow")}: ${data.length}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="cash-inflow" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-green)"
                stopOpacity={0.24}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-green)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="cash-outflow" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-coral)"
                stopOpacity={0.05}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-coral)"
                stopOpacity={0.22}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(model, value)}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoney(model, value)}
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => formatMoney(model, Number(value))}
            labelFormatter={(value) => formatDate(model, String(value))}
            contentStyle={{
              background: "var(--surface)",
              borderColor: "var(--line)",
              borderRadius: 4,
            }}
          />
          <Area
            type="monotone"
            dataKey="amountCents"
            name={copy(model, "netCashFlow")}
            stroke="var(--chart-green)"
            strokeWidth={2}
            fill="url(#cash-inflow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({
  model,
  data,
}: {
  model: PublicModel;
  data: CategorySpending[];
}) {
  const colors = new Map(
    model.categories.map((category) => [category.id, category.color]),
  );
  return (
    <div className="category-chart-wrap">
      <div
        className="category-chart"
        role="img"
        aria-label={copy(model, "spendingByCategory")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amountCents"
              nameKey="id"
              innerRadius="60%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="var(--surface)"
            >
              {data.map((item) => (
                <Cell key={item.id} fill={colors.get(item.id)} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(model, Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className="category-legend"
        aria-label={copy(model, "filterCategory")}
      >
        {data.map((item) => (
          <li key={item.id}>
            <span
              className="legend-dot"
              style={{ backgroundColor: colors.get(item.id) }}
              aria-hidden="true"
            />
            <span>{nestedCopy(model, "categories", item.id)}</span>
            <strong>{formatMoney(model, item.amountCents)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
