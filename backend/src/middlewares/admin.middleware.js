import express from "express";

export default function adminMiddleware(req, res, next) {
  const role = req.userRole || (req.user && req.user.role);

  if (!role || (role !== "admin" && role !== "superadmin")) {
    return res.status(403).json({ message: "Admin or SuperAdmin access required" });
  }

  next();
}
