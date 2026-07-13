import axios from "axios";

const API = "http://localhost:8080/api/blogs";

export const createBlog = (data) => axios.post(API, data);
export const updateBlog = (id, data) => axios.put(`${API}/${id}`, data);
export const getBlogById = (id) => axios.get(`${API}/${id}`);
export const getAllBlogs = () => axios.get(API);
export const getBlogsByWorkspace = (workspaceId) =>
  axios.get(`${API}/workspace/${workspaceId}`);
export const deleteBlog = (id) => axios.delete(`${API}/${id}`);