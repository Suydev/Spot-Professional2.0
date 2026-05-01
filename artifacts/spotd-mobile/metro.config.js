const { getDefaultConfig } = require("expo/metro-config");
  const path = require("path");

  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, "../..");

  const config = getDefaultConfig(projectRoot);

  // Include all packages from workspace root in the watch list
  config.watchFolders = [workspaceRoot];

  // Tell Metro to look in both project and workspace root node_modules
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ];

  // Note: do NOT set disableHierarchicalLookup — pnpm virtual store
  // symlink resolution requires normal hierarchical traversal to work.

  module.exports = config;
  