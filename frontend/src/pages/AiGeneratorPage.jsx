import React, { useState } from "react";
import BlogGeneratorForm from "../components/ai/BlogGeneratorForm";
import GeneratedBlogView from "../components/ai/GeneratedBlogView";
import { generateBlog } from "../services/aiService";

export default function AiGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [blog, setBlog] = useState(null);

  const handleGenerate = async (formData) => {
    try {
      setLoading(true);
      const res = await generateBlog(formData);
      setBlog(res.data);
    } catch (e) {
      alert("Error generating blog");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BlogGeneratorForm onSubmit={handleGenerate} loading={loading} />
      {blog && <GeneratedBlogView blog={blog} />}
    </div>
  );
}