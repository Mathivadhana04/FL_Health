// components/dashboard/BlogStatusChart.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function BlogStatusChart({ data }) {
  const chartData = [
    { name: "Published", value: data.publishedBlogs },
    { name: "Draft", value: data.draftBlogs }
  ];

  return (
    <BarChart width={400} height={300} data={chartData}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" />
    </BarChart>
  );
}