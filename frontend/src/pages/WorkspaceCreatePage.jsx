import { Container, Typography } from "@mui/material";
import WorkspaceForm from "../components/workspace/WorkspaceForm";
import { createWorkspace } from "../services/workspaceService";
import { useNavigate } from "react-router-dom";

export default function WorkspaceCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    await createWorkspace(data);
    navigate("/workspaces");
  };

  return (
    <Container>
      <Typography variant="h4">Create Workspace</Typography>
      <WorkspaceForm onSubmit={handleSubmit} />
    </Container>
  );
}