import React from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, Button } from "@mui/material";

const BlogTable = ({ blogs, onEdit, onDelete, onView }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Title</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {blogs.map((b) => (
          <TableRow key={b.id}>
            <TableCell>{b.title}</TableCell>
            <TableCell>{b.status}</TableCell>
            <TableCell>
              <Button onClick={() => onView(b.id)}>View</Button>
              <Button onClick={() => onEdit(b)}>Edit</Button>
              <Button color="error" onClick={() => onDelete(b.id)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BlogTable;