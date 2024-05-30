import { fetchLocations } from "../js/fetchLocations.js";
import { drawLocations } from "../js/drawLocations.js";

const locations = await fetchLocations();
drawLocations(locations);