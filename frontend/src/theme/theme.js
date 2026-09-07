export const theme = {
  storageKey: "innervoice-theme",

  apply: (mode) => {
    const root = document.documentElement;

    root.classList.toggle("dark", mode === "dark");
    root.dataset.theme = mode;

    localStorage.setItem("innervoice-theme", mode);
  },

  getInitialTheme: () => {
    const saved = localStorage.getItem("innervoice-theme");

    if (saved === "dark" || saved === "light") {
      return saved;
    }

    return window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  },
};