/** @type {import('postcss').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        "chrome >= 54",
        "and_chr >= 54",
        "edge >= 79",
        "firefox >= 78",
        "safari >= 9",
        "ios_saf >= 9-9.3",
        "> 0.5%",
        "not dead",
      ],
    },
  },
};

export default config;
