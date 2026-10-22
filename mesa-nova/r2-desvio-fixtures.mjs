// Fixture uses the actual approved catalogue, without invented metadata.
import {card,cast} from './r1-fixtures.mjs';
export function prepareDesvio(room,p,side,lane,extra={}){const c=card('R2-FV18',p,extra);cast(room,p,c,{mode:'lane',targetSide:side.id,lane});return c;}
