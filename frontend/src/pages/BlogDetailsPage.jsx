import React, { useEffect, useState } from "react";
import { getBlogById } from "../services/blogService";
import { useParams } from "react-router-dom";
import { Card, CardContent, Typography } from "@mui/material";

const BlogDetailsPage = () => {
  const [blog, setBlog] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    getBlogById(id).then(res => setBlog(res.data));
  }, [id]);

  if (!blog) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h4">{blog.title}</Typography>
        <div dangerouslySetInnerHTML={{ __html: blog.content }} />
      </CardContent>
    </Card>
  );
};

export default BlogDetailsPage;