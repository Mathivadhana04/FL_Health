import axios from "axios";

const api = axios.create({
  baseURL: "/api/workspaces"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getWorkspaces = async () => {
  const res = await api.get("");
  return res.data;
};

export const createWorkspace = async (data) => {
  const res = await api.post("", data);
  return res.data;
};

export const updateWorkspace = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

export const deleteWorkspace = async (id) => {
  await api.delete(`/${id}`);
};