// The portable Windows Node runtime can fail while tsx reads os.userInfo().
// Supplying the Unix-style numeric identity lets tsx choose a stable temp name
// without changing application behavior.
if (process.platform === "win32" && typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
