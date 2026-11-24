import axios from "axios";

const API = axios.create({
  baseURL: "/api",
});

// Add a helper to get token from localStorage
const getToken = () => localStorage.getItem("token");

// Get accounts for logged-in user
export const getAccounts = async () => {
  const res = await API.get("/accounts", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
};

// Add account
export const addAccount = async (account) => {
  const res = await API.post("/accounts", account, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
};

// Update account
export const updateAccount = async (id, account) => {
  const res = await API.put(`/accounts/${id}`, account, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
};

// Delete account
export const deleteAccount = async (id) => {
  const res = await API.delete(`/accounts/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
};
