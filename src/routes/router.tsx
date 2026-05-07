import { lazy, type ReactNode } from "react";
import { createBrowserRouter, Navigate, type RouteObject, } from "react-router-dom";
import { RoleGuard } from "@/routes/RoleGuard";
import { LandingPage } from "@/routes/LandingPage";
import { TableLanding } from "@/routes/customer/TableLanding";
import { CustomerMenu } from "@/routes/customer/CustomerMenu";
import { CustomerCart } from "@/routes/customer/CustomerCart";
import { CustomerOrders } from "@/routes/customer/CustomerOrders";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { LazyRoute } from "@/routes/routeHelpers";
import { RouteError } from "@/components/RouteError";

const errorElement = <RouteError/>;

// Lazy chunks: staff / kitchen / admin never load on /t/:tableId, the QR-scan hot path.
const StaffLogin = lazy(() =>
    import("@/routes/staff/StaffLogin").then((m) => ({ default: m.StaffLogin })),
);
const StaffTables = lazy(() =>
    import("@/routes/staff/StaffTables").then((m) => ({ default: m.StaffTables })),
);
const StaffTableDetail = lazy(() =>
    import("@/routes/staff/StaffTableDetail").then((m) => ({
        default: m.StaffTableDetail,
    })),
);
const KitchenBoard = lazy(() =>
    import("@/routes/kitchen/KitchenBoard").then((m) => ({
        default: m.KitchenBoard,
    })),
);
const AdminMenu = lazy(() =>
    import("@/routes/admin/AdminMenu").then((m) => ({ default: m.AdminMenu })),
);
const AdminCategories = lazy(() =>
    import("@/routes/admin/AdminCategories").then((m) => ({
        default: m.AdminCategories,
    })),
);
const AdminTables = lazy(() =>
    import("@/routes/admin/AdminTables").then((m) => ({ default: m.AdminTables })),
);
const AdminTablesPrint = lazy(() =>
    import("@/routes/admin/AdminTablesPrint").then((m) => ({
        default: m.AdminTablesPrint,
    })),
);
const AdminStaff = lazy(() =>
    import("@/routes/admin/AdminStaff").then((m) => ({ default: m.AdminStaff })),
);
const AdminReports = lazy(() =>
    import("@/routes/admin/AdminReports").then((m) => ({
        default: m.AdminReports,
    })),
);

const lazyEl = (node: ReactNode) => <LazyRoute>{node}</LazyRoute>;

const routes: RouteObject[] = [
    { path: "/", element: <LandingPage/> },

    // Customer (anonymous auto-auth happens inside TableLanding)
    { path: "/t/:tableId", element: <TableLanding/> },
    { path: "/t/:tableId/menu", element: <CustomerMenu/> },
    { path: "/t/:tableId/cart", element: <CustomerCart/> },
    { path: "/t/:tableId/orders", element: <CustomerOrders/> },

    // Staff
    { path: "/staff/login", element: lazyEl(<StaffLogin/>) },
    {
        path: "/staff",
        element: lazyEl(
            <RoleGuard allow={["staff", "admin"]}>
                <Navigate to="/staff/tables" replace/>
            </RoleGuard>,
        ),
    },
    {
        path: "/staff/tables",
        element: lazyEl(
            <RoleGuard allow={["staff", "admin"]}>
                <StaffTables/>
            </RoleGuard>,
        ),
    },
    {
        path: "/staff/tables/:tableId",
        element: lazyEl(
            <RoleGuard allow={["staff", "admin"]}>
                <StaffTableDetail/>
            </RoleGuard>,
        ),
    },

    // Kitchen
    {
        path: "/kitchen",
        element: lazyEl(
            <RoleGuard allow={["kitchen", "admin"]}>
                <KitchenBoard/>
            </RoleGuard>,
        ),
    },

    // Admin
    {
        path: "/admin",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <Navigate to="/admin/menu" replace/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/menu",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminMenu/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/categories",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminCategories/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/tables",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminTables/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/tables/print",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminTablesPrint/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/staff",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminStaff/>
            </RoleGuard>,
        ),
    },
    {
        path: "/admin/reports",
        element: lazyEl(
            <RoleGuard allow={["admin"]}>
                <AdminReports/>
            </RoleGuard>,
        ),
    },

    { path: "*", element: <NotFoundPage/> },
];

// Attach a single error boundary to every route — catches render errors,
// loader rejections, and lazy-chunk fetch failures.
export const router = createBrowserRouter(
    routes.map((r) => ({ ...r, errorElement })),
);
