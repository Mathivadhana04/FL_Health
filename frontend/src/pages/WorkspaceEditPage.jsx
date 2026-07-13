import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Typography } from "@mui/material";
import WorkspaceForm from "../components/workspace/WorkspaceForm";
import { getWorkspaces, updateWorkspace } from "../services/workspaceService";

export default function WorkspaceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    getWorkspaces().then((data) => {
      const found = data.find((w) => w.id === parseInt(id));
      setWorkspace(found);
    });
  }, [id]);

  const handleSubmit = async (data) => {
    await updateWorkspace(id, data);
    navigate("/workspaces");
  };

  if (!workspace) return null;

  return (
    <Container>
      <Typography variant="h4">Edit Workspace</Typography>
      <WorkspaceForm initialData={workspace} onSubmit={handleSubmit} />
    </Container>
  );
}