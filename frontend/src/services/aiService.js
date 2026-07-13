import axios from "axios";

const API_URL = "/api/ai/blog";

export const generateBlog = (data) => {
  return axios.post(`${API_URL}/generate`, data);
};