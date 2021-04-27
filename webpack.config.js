const path = require("path");

module.exports = {
    entry: {
        mgba: "./src/js/index.js",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        library: "VBAInterface",
        libraryTarget: "window"
    },
    mode: "production",
    resolve: {
        alias: {
            path: require.resolve("path-browserify"),
        }
    },
    target: 'electron-renderer',//hack for fs
};
