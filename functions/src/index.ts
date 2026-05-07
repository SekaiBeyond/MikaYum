import { initializeApp } from "firebase-admin/app";

initializeApp();

export { placeOrder, updateOrderStatus } from "./orders";
export { openTableSession, markTablePaid } from "./tables";
export { setStaffRole, inviteStaff, setStaffActive } from "./admin";
export { endOfDayReport } from "./reports";
