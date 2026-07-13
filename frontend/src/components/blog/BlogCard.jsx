import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";

const BlogCard = ({ blog, onClick }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{blog.title}</Typography>
        <Typography variant="body2">{blog.status}</Typography>
        <Button onClick={() => onClick(blog.id)}>Open</Button>
      </CardContent>
    </Card>
  );
};

export default BlogCard;