// components/dashboard/AiUsageChart.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

export default function AiUsageChart({ data }) {
  const chartData = [
    { name: "AI Requests", value: data.aiRequests },
    { name: "SEO Reports", value: data.seoReports }
  ];

  return (
    <PieChart width={400} height={300}>
      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100} />
      <Tooltip />
    </PieChart>
  );
}