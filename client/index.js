import { initRouter, addRoute, setState} from "../framework/index.js";
import { Main } from "./main.js";
import { Lobby } from "./lobby.js";
import { Game } from "./game.js";
import './handlers.js';

initRouter('app'); // sets up router and assigns root DOM node

addRoute('/', Main);
addRoute('/lobby', Lobby);
addRoute('/game', Game);