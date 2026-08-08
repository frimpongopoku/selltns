// NEXT_PUBLIC_BUILD_COMMIT is resolved at build time in next.config.ts's
// `env` block — that's what makes this constant work identically in
// Server Components, "use client" components, and fully-client pages
// (admin/login, register) with no prop-drilling.
const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT;

export const BUILD_LABEL = commit ? `build ${commit}` : "dev build";
