// pages/SeoReportPage.jsx
import React, { useState } from "react";
import SeoScoreCard from "../components/seo/SeoScoreCard";
import KeywordAnalysis from "../components/seo/KeywordAnalysis";
import SeoSuggestions from "../components/seo/SeoSuggestions";
import { analyzeSeo } from "../services/seoService";

export default function SeoReportPage() {
  const [content, setContent] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    const res = await analyzeSeo({ content, focusKeyword });
    setResult(res);
  };

  return (
    <div>
      <h2>SEO Report</h2>

      <textarea value={content} onChange={(e) => setContent(e.target.value)} />

      <input
        value={focusKeyword}
        onChange={(e) => setFocusKeyword(e.target.value)}
        placeholder="Focus keyword"
      />

      <button onClick={handleAnalyze}>Analyze</button>

      {result && (
        <>
          <SeoScoreCard score={result.seoScore} />
          <KeywordAnalysis data={result.keywordDensity} />
          <SeoSuggestions suggestions={result.suggestedKeywords} />
        </>
      )}
    </div>
  );
}