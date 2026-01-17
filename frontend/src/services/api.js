import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getAccounts = async () => {
  const res = await API.get("/accounts");
  return res.data;
};

export const addAccount = async (account) => {
  const res = await API.post("/accounts", account);
  return res.data;
};

