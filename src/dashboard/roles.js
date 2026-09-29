// Who can open the host dashboard. 'host' is the account owner; 'admin' and
// 'staff' are users the owner added on the Add User page.
export const DASHBOARD_ROLES = ['host', 'admin', 'staff']

// Owner and admins see every dashboard page; staff only get Go Live, Chat,
// Tickets/Flyer and Scan Tickets.
export const FULL_ACCESS_ROLES = ['host', 'admin']

export const isDashboardUser = (user) => DASHBOARD_ROLES.includes(user?.role)
export const hasFullAccess = (user) => FULL_ACCESS_ROLES.includes(user?.role)
