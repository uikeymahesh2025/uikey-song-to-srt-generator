/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#0b0d11",
          900: "#10141b",
          850: "#161b24",
          800: "#1f2633",
          700: "#2d3748",
          600: "#4a5568",
        },
        brand: {
          emerald: "#10b981",
          cyan: "#06b6d4",
          amber: "#f59e0b",
        }
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
