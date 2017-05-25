module.exports = {
    "parser": "babel-eslint",
    "extends": "airbnb",
    "plugins": [
        "jsx-a11y",
        "import"
    ],
    "globals": {
        "fetch": false,
    },
    "rules": {
        "no-console": ["error", { allow: ["warn", "error"] }],
    }
};