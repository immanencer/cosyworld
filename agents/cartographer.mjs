// this bot gets the rooms connection,
// reads the name and upates the description if necessary
// it then adds a "door" to the room leading to a logical other room

import ollama from 'ollama';
import { getRoom, updateRoom } from './roomManager.js';
import { getDoor, createDoor } from './doorManager.js'; 