module.exports = [
  {
    name: '@aragon/api',
    path: "packages/aragon-api/dist/index.js",
    limit: "45 KB"
  },
  {
    name: '@aragon/rpc-messenger',
    path: "packages/aragon-rpc-messenger/dist/index.js",
    limit: "40 KB"
  },
  {
    name: '@aragon/wrapper',
    path: "packages/aragon-wrapper/dist/index.js",
    limit: "540 KB"
  },
  {
    name: '@aragon/api-react',
    path: "packages/aragon-api-react/dist/index.js",
    limit: "5 KB",
    webpack: false,
  }
]
