import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Hàm lấy bài đăng theo userId
export const getPostsByUserId = async (userId: number) => {
  const response = await api.get(`/posts/user/${userId}`);
  return response.data;
};
export const getUserById = async (userId: number) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export default api;