// components/dashboard/MetricCard.jsx
import React from "react";

export default function MetricCard({ title, value }) {
  return (
    <div>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}