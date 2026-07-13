import { useEffect, useState } from "react";
import { getWorkspaces, deleteWorkspace } from "../services/workspaceService";
import WorkspaceCard from "../components/workspace/WorkspaceCard";
import { useNavigate } from "react-router-dom";
import { Container, Typography } from "@mui/material";

export default function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const data = await getWorkspaces();
    setWorkspaces(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    await deleteWorkspace(id);
    load();
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Workspaces
      </Typography>

      <button onClick={() => navigate("/workspaces/create")}>
        Create Workspace
      </button>

      {workspaces.map((ws) => (
        <WorkspaceCard
          key={ws.id}
          workspace={ws}
          onEdit={(w) => navigate(`/workspaces/edit/${w.id}`)}
          onDelete={handleDelete}
        />
      ))}
    </Container>
  );
}