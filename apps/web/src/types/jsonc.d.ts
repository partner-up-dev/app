declare module "*.jsonc" {
  const value: import("@/locales/schema").MessageSchema;
  export default value;
}
