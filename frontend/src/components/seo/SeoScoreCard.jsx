// components/seo/SeoScoreCard.jsx
import React from "react";

export default function SeoScoreCard({ score }) {
  return (
    <div>
      <h3>SEO Score</h3>
      <h1>{score}</h1>
    </div>
  );
}