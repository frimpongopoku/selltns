// Plumbing for paid plans (SuperAdmin billing tools, the vendor Upgrade
// page, upgrade-request emails) is fully built and live — this flag just
// controls whether vendors can see/reach it. Off because none of the tier
// differences are actually enforced yet, so paying today would buy nothing.
// Flip to true once there's a real reason to upgrade.
export const BILLING_ENABLED = false;
