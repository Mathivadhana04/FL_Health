// components/dashboard/DashboardSummary.jsx
import React from "react";

export default function DashboardSummary({ data }) {
  return (
    <div>
      <h3>Summary</h3>
      <p>Total Blogs: {data.totalBlogs}</p>
      <p>Published: {data.publishedBlogs}</p>
      <p>Drafts: {data.draftBlogs}</p>
      <p>AI Requests: {data.aiRequests}</p>
      <p>SEO Reports: {data.seoReports}</p>
    </div>
  );
}