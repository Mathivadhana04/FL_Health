import { TextField, Button, Stack } from "@mui/material";
import { useState } from "react";

export default function WorkspaceForm({ initialData = {}, onSubmit }) {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");

  return (
    <Stack spacing={2}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button
        variant="contained"
        onClick={() => onSubmit({ name, description })}
      >
        Save
      </Button>
    </Stack>
  );
}