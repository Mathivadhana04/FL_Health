// pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { getDashboardMetrics } from "../services/analyticsService";
import MetricCard from "../components/dashboard/MetricCard";
import BlogStatusChart from "../components/dashboard/BlogStatusChart";
import AiUsageChart from "../components/dashboard/AiUsageChart";
import DashboardSummary from "../components/dashboard/DashboardSummary";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboardMetrics().then(setData);
  }, []);

  return (
    <div>
      <h2>Analytics Dashboard</h2>

      {data && (
        <>
          <DashboardSummary data={data} />
          <MetricCard title="Total Blogs" value={data.totalBlogs} />
          <MetricCard title="Published" value={data.publishedBlogs} />
          <MetricCard title="Drafts" value={data.draftBlogs} />
          <MetricCard title="AI Requests" value={data.aiRequests} />
          <MetricCard title="SEO Reports" value={data.seoReports} />

          <BlogStatusChart data={data} />
          <AiUsageChart data={data} />
        </>
      )}
    </div>
  );
}