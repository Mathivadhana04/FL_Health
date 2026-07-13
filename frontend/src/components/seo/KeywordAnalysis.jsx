// components/seo/KeywordAnalysis.jsx
import React from "react";

export default function KeywordAnalysis({ data }) {
  return (
    <div>
      <h3>Keyword Density</h3>
      <pre>{data}</pre>
    </div>
  );
}