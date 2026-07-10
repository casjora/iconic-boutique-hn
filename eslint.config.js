import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 1. Archivos a ignorar
  {
    ignores: [
      "dist/**", 
      "server.js", 
      "src/dist/**"
    ]
  },

  // 2. Configuración base
  { 
    files: ["**/*.{js,mjs,cjs,jsx}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: {
        ...globals.browser,
        ...globals.node,
      }
    } 
  },
  
  // 3. Configuración recomendada de React
  pluginReact.configs.flat.recommended,

  // 4. Reglas personalizadas y versión de React
  {
    // Aquí es donde le indicamos al plugin la versión exacta de tu proyecto
    settings: {
      react: {
        version: "19.2.7" 
      }
    },
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off", // React 19 ya no requiere React en el scope de JSX
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
  }
]);