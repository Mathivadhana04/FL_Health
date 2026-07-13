import { Table, TableHead, TableRow, TableCell, TableBody, Button } from "@mui/material";

export default function WorkspaceTable({ workspaces, onEdit, onDelete }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {workspaces.map((ws) => (
          <TableRow key={ws.id}>
            <TableCell>{ws.name}</TableCell>
            <TableCell>{ws.description}</TableCell>
            <TableCell>
              <Button onClick={() => onEdit(ws)}>Edit</Button>
              <Button color="error" onClick={() => onDelete(ws.id)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}