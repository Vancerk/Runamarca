// Liga o Escudo do Mestre aos serviços existentes: sessão Discord, banco e origem pública.
import {identify, accountsConfigured, accountDatabase, publicOrigin} from '../accounts.mjs';
import {createEscudo, readMasterIds} from './backend/handler.mjs';

let masters = null, loadedAt = 0;
// Relê a lista de mestres a cada minuto (mudanças no mestres.json ou em ESCUDO_MESTRES valem sem reinício longo).
function masterIds() {
  if (!masters || Date.now() - loadedAt > 60000) { masters = readMasterIds(); loadedAt = Date.now(); }
  return masters;
}

export const handleEscudo = createEscudo({
  identify,
  configured: accountsConfigured,
  database: {query: (sql, params) => accountDatabase().query(sql, params)},
  origin: publicOrigin,
  masterIds
});
