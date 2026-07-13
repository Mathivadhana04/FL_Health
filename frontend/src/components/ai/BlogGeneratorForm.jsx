import React, { useState } from "react";

export default function BlogGeneratorForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    topic: "",
    audience: "",
    tone: "",
    wordCount: 800,
    keywords: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit({
      ...form,
      keywords: form.keywords.split(",").map(k => k.trim())
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="topic" placeholder="Topic" onChange={handleChange} />
      <input name="audience" placeholder="Audience" onChange={handleChange} />
      <input name="tone" placeholder="Tone" onChange={handleChange} />
      <input name="wordCount" type="number" onChange={handleChange} />
      <input name="keywords" placeholder="Keywords comma separated" onChange={handleChange} />

      <button type="submit" disabled={loading}>
        {loading ? "Generating..." : "Generate Blog"}
      </button>
    </form>
  );
}