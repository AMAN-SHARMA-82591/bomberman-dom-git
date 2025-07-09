import { render } from "./render.js";
import { subscribe } from "./state.js";

const routes = new Map(); // Map to store routes and their render functions
let rootEl = null; //DOM element where the content will be rendered
const unsubscribes = []; // Array to hold unsubscribe functions for state changes

//initRouter function to set up the router
export function initRouter(rootElementId) {

  rootEl = document.getElementById(rootElementId); //find the root element by ID

  window.onhashchange = handleRouteChange; // Handle initial load and hash changes
  window.onload = () => {
    handleRouteChange();
  };
}

//addRoute function to register a new route
export function addRoute(path, renderFn) {
  routes.set(path, renderFn);
}

//handleRouteChange function to render the content based on the current route
function handleRouteChange() {
  const path = location.hash.replace('#', '') || '/';
  const renderFn = routes.get(path); //get the function for the path

  if (renderFn && rootEl) {
    // Clear previous content and unsubscribe from previous state changes
    unsubscribes.forEach(unsub => unsub()); // Unsubscribe from previous state changes
    unsubscribes.length = 0; // Clear the array of unsubscribe functions

    render(renderFn(), rootEl); // Render the virtual node to the root element

    // subscribe to re-render on state changes
    const unsub = subscribe(() => {
      render(renderFn(), rootEl);
    });
    unsubscribes.push(unsub);
  } else {
    // default to first route if no match found
    const firstRoute = routes.keys().next().value;
    if (firstRoute) {
      window.location.hash = firstRoute; // Set the hash to the first route
      unsubscribes.forEach(unsub => unsub()); // Unsubscribe from previous state changes
      unsubscribes.length = 0; // Clear the array of unsubscribe functions
      render(routes.get(firstRoute)(), rootEl);
    }
  }
  
}