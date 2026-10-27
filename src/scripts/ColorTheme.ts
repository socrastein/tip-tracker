// Make sure this matches with :root variable in css
const rootColorVariable = "--themeColor";

// Make sure this matches the entry in localStorage
const storedColorThemeKey = "tipTracker(themeColor)";

// Run this in your main JS file so color theme is loaded with the page
export function setThemeColorFromLocalStorage() {
  const color = localStorage.getItem(storedColorThemeKey);
  if (color) {
    changeThemeColor(color);
  }
}

function changeThemeColor(newColor: string) {
  document.documentElement.style.setProperty(rootColorVariable, newColor);
}
