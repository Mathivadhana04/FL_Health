import React from "react";

export default function GeneratedBlogView({ blog }) {
  return (
    <div>
      <h1>{blog.title}</h1>

      <h3>Introduction</h3>
      <p>{blog.introduction}</p>

      <h3>Main Content</h3>
      <p>{blog.mainContent}</p>

      <h3>Conclusion</h3>
      <p>{blog.conclusion}</p>

      <h3>FAQ</h3>
      <ul>
        {blog.faq?.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}