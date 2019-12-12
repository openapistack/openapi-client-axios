const presets = [
    ["@babel/preset-env", {
        "corejs": "3",
        "useBuiltIns": "usage",
        "modules": false,
    }],
];

const plugins = [
];

module.exports = { presets, plugins };
