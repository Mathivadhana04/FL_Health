// services/seoService.js
import axios from "axios";

const API = "http://localhost:8080/api/seo";

export const analyzeSeo = async (payload) => {
  const res = await axios.post(`${API}/analyze`, payload);
  return res.data;
};