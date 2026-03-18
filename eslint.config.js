const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");
const importPlugin = require("eslint-plugin-import");

module.exports = [
    {
        ignores: ["node_modules", "dist", "coverage", ".env"],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        plugins: {
            import: importPlugin,
        },

        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script", // CommonJS
        },

        rules: {
            "@typescript-eslint/explicit-member-accessibility": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-parameter-properties": "off",
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-types": "off",

            // 🔹 Required for Sequelize model loader
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-require-imports": "off",

            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" }
            ],

            "no-unused-vars": "off",

            "import/no-unresolved": "off",
            "import/no-cycle": "off",
            "import/no-extraneous-dependencies": "off",
            "import/order": "off",
            "import/prefer-default-export": "off",
            "import/extensions": "off",

            "arrow-body-style": "off",
            "linebreak-style": "off",
            "no-debugger": "off",
            "class-methods-use-this": "off",
            "comma-dangle": "off",
            "max-len": "off",
            "no-console": "off",
            "no-param-reassign": "off",
            "no-plusplus": "off",
            "no-return-assign": "off",
            "object-curly-newline": "off",

            "lines-between-class-members": [
                "error",
                "always",
                { exceptAfterSingleLine: true }
            ],

            "consistent-return": "off",
            "no-useless-constructor": "off",
            "camelcase": "off",
            "operator-linebreak": "off",
            "indent": "off",

            "no-shadow": "off",
            "@typescript-eslint/no-shadow": [
                "error",
                { ignoreTypeValueShadow: true }
            ],
        },
    },

    prettier,
];
