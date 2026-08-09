// Both resolved at build time in next.config.ts's `env` block — that's
// what makes this constant work identically in Server Components,
// "use client" components, and fully-client pages (admin/login, register)
// with no prop-drilling. Version comes from package.json (bump it
// manually to mark a release); build number is the total git commit
// count, a real ever-increasing integer rather than an opaque hash.
const version = process.env.NEXT_PUBLIC_APP_VERSION;
const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER;

export const BUILD_LABEL = version
  ? `v${version}${buildNumber ? ` · build ${buildNumber}` : ""}`
  : "dev build";
