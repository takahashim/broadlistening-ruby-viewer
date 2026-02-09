import ChartManager from "./chart_manager";

window.addEventListener("DOMContentLoaded", () => {
  const managerElements = document.querySelectorAll("[data-broadlistening-view-manager]");
  managerElements.forEach((element) => {
    if (element.dataset.initialized === "true") return;
    const dataSourceId = element.dataset.dataSource;
    const dataElement = document.getElementById(dataSourceId);
    if (dataElement) {
      try {
        const data = JSON.parse(dataElement.textContent);
        new ChartManager(element, data);
        element.dataset.initialized = "true";
      } catch (error) {
        console.error("Failed to initialize chart manager:", error);
      }
    }
  });
});
