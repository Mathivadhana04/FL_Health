import React, { useEffect, useState } from "react";
import { getAllBlogs, deleteBlog } from "../services/blogService";
import BlogTable from "../components/blog/BlogTable";
import { useNavigate } from "react-router-dom";

const BlogListPage = () => {
  const [blogs, setBlogs] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const res = await getAllBlogs();
    setBlogs(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    await deleteBlog(id);
    load();
  };

  return (
    <BlogTable
      blogs={blogs}
      onEdit={(b) => navigate(`/blogs/edit/${b.id}`)}
      onView={(id) => navigate(`/blogs/${id}`)}
      onDelete={handleDelete}
    />
  );
};

export default BlogListPage;