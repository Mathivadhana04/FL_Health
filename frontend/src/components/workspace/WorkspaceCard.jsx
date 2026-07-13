import { Card, CardContent, Typography, Button, Stack } from "@mui/material";

export default function WorkspaceCard({ workspace, onEdit, onDelete }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{workspace.name}</Typography>
        <Typography variant="body2">{workspace.description}</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => onEdit(workspace)}>
            Edit
          </Button>
          <Button color="error" variant="contained" onClick={() => onDelete(workspace.id)}>
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}