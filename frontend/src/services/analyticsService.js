// services/analyticsService.js
import axios from "axios";

const API = "http://localhost:8080/api/analytics";

export const getDashboardMetrics = async () => {
  const res = await axios.get(`${API}/dashboard`);
  return res.data;
};