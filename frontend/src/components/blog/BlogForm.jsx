import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { TextField, Button, MenuItem } from "@mui/material";

const BlogForm = ({ form, setForm, onSubmit }) => {

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <TextField
        fullWidth
        label="Title"
        name="title"
        value={form.title}
        onChange={handleChange}
        margin="normal"
      />

      <ReactQuill
        value={form.content}
        onChange={(value) => setForm({ ...form, content: value })}
      />

      <TextField
        select
        label="Status"
        name="status"
        value={form.status}
        onChange={handleChange}
        margin="normal"
        fullWidth
      >
        <MenuItem value="DRAFT">DRAFT</MenuItem>
        <MenuItem value="PUBLISHED">PUBLISHED</MenuItem>
      </TextField>

      <Button variant="contained" onClick={onSubmit}>
        Save
      </Button>
    </div>
  );
};

export default BlogForm;