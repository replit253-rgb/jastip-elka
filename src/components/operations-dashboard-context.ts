import { createContext } from "react";

export type StaffUser = {
  id: string;
  email: string;
  role: "owner" | "admin";
};

export const DashboardContext = createContext<{ user: StaffUser } | null>(null);
