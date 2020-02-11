module.exports = {
    "extends": "google",
    "parser": "@typescript-eslint/parser",
    // "env":{
    //     browser:true,
    //     "es6":true
    // },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module"
    },

    "rules": {
        "no-var": 0,
        "max-len": [0, {
            "ignoreComments": true,
        }],
        "prefer-const": 0,
        "operator-linebreak": 0,
        "valid-jsdoc": 0,
        "require-jsdoc": 0,
        "prefer-rest-params": 0,
        "prefer-spread": 0,
        "guard-for-in": 0,
        "no-unused-vars": 0,
        "comma-dangle": ["error", "never"],
        "no-multi-str": 0,
        "indent": ["error", 4],
        "no-invalid-this": 0
        // "padding-line-between-statements": [
        //     "error",
        //     { "blankLine": "never", "prev": "var", "next": ["var"] }
        // ]
    }
};
