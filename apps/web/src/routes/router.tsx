import { createBrowserRouter, Navigate } from "react-router-dom";
import { RoleGuard } from "@/routes/RoleGuard";
import { LandingPage } from "@/routes/LandingPage";
import { TableLanding } from "@/routes/customer/TableLanding";
import { CustomerMenu } from "@/routes/customer/CustomerMenu";
import { CustomerCart } from "@/routes/customer/CustomerCart";
import { CustomerOrders } from "@/routes/customer/CustomerOrders";
import { StaffLogin } from "@/routes/staff/StaffLogin";
import { StaffTables } from "@/routes/staff/StaffTables";
import { StaffTableDetail } from "@/routes/staff/StaffTableDetail";
import { KitchenBoard } from "@/routes/kitchen/KitchenBoard";
import { AdminMenu } from "@/routes/admin/AdminMenu";
import { AdminTables } from "@/routes/admin/AdminTables";
import { AdminStaff } from "@/routes/admin/AdminStaff";
import { AdminReports } from "@/routes/admin/AdminReports";
import { NotFoundPage } from "@/routes/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },

  // Customer (anonymous auto-auth happens inside TableLanding)
  { path: "/t/:tableId", element: <TableLanding /> },
  { path: "/t/:tableId/menu", element: <CustomerMenu /> },
  { path: "/t/:tableId/cart", element: <CustomerCart /> },
  { path: "/t/:tableId/orders", element: <CustomerOrders /> },

  // Staff
  { path: "/staff/login", element: <StaffLogin /> },
  {
    path: "/staff",
    element: (
      <RoleGuard allow={["staff", "admin"]}>
        <Navigate to="/staff/tables" replace />
      </RoleGuard>
    ),
  },
  {
    path: "/staff/tables",
    element: (
      <RoleGuard allow={["staff", "admin"]}>
        <StaffTables />
      </RoleGuard>
    ),
  },
  {
    path: "/staff/tables/:tableId",
    element: (
      <RoleGuard allow={["staff", "admin"]}>
        <StaffTableDetail />
      </RoleGuard>
    ),
  },

  // Kitchen
  {
    path: "/kitchen",
    element: (
      <RoleGuard allow={["kitchen", "admin"]}>
        <KitchenBoard />
      </RoleGuard>
    ),
  },

  // Admin
  {
    path: "/admin",
    element: (
      <RoleGuard allow={["admin"]}>
        <Navigate to="/admin/menu" replace />
      </RoleGuard>
    ),
  },
  {
    path: "/admin/menu",
    element: (
      <RoleGuard allow={["admin"]}>
        <AdminMenu />
      </RoleGuard>
    ),
  },
  {
    path: "/admin/tables",
    element: (
      <RoleGuard allow={["admin"]}>
        <AdminTables />
      </RoleGuard>
    ),
  },
  {
    path: "/admin/staff",
    element: (
      <RoleGuard allow={["admin"]}>
        <AdminStaff />
      </RoleGuard>
    ),
  },
  {
    path: "/admin/reports",
    element: (
      <RoleGuard allow={["admin"]}>
        <AdminReports />
      </RoleGuard>
    ),
  },

  { path: "*", element: <NotFoundPage /> },
]);
