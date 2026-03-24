import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/admin",
});

const getToken = () => localStorage.getItem("token");

export const getUsers = async () => {
  const res = await API.get('/users', { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};

export const createUser = async ({ name, email, password, role = 'user' }) => {
  const res = await API.post('/users', { name, email, password, role }, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};

export const deleteUser = async (id, password) => {
  const res = await API.delete(`/users/${id}`, { 
    headers: { Authorization: `Bearer ${getToken()}` },
    data: { password }
  });
  return res.data;
};

export const getUserAccounts = async (userId) => {
  const res = await API.get(`/users/${userId}/accounts`, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};

export const createAccountForUser = async (userId, account) => {
  const res = await API.post(`/users/${userId}/accounts`, account, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};
export const updateUser = async (id, data) => {
  const res = await API.put(`/users/${id}`, data, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};

export const impersonateUser = async (id) => {
  const res = await API.post(`/users/${id}/impersonate`, {}, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.data;
};
