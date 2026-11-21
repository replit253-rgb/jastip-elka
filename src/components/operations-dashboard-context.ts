import { createContext, useContext } from "react";

export type StaffUser = {
  id: string;
  email: string;
  role: "owner" | "admin";
};

export const DashboardContext = createContext<{ user: StaffUser } | null>(null);

export function useStaff() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("Halaman ini harus berada di dalam dashboard ELKANA.");
  return context.user;
}
