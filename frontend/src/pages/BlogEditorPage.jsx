import React, { useEffect, useState } from "react";
import BlogForm from "../components/blog/BlogForm";
import { createBlog, updateBlog, getBlogById } from "../services/blogService";
import { useNavigate, useParams } from "react-router-dom";

const BlogEditorPage = () => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    status: "DRAFT",
    workspace: 1,
    author: 1
  });

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      getBlogById(id).then(res => setForm(res.data));
    }
  }, [id]);

  const handleSubmit = async () => {
    if (id) {
      await updateBlog(id, form);
    } else {
      await createBlog(form);
    }
    navigate("/blogs");
  };

  return <BlogForm form={form} setForm={setForm} onSubmit={handleSubmit} />;
};

export default BlogEditorPage;