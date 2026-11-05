// Offline test-only account adapter; never load production persistence or pg.
export async function resolve(specifier,context,nextResolve){
 if(specifier.endsWith('/accounts.mjs'))return {url:'offline:accounts',shortCircuit:true};
 return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){if(url==='offline:accounts')return {format:'module',source:'export function beginMatch() {}',shortCircuit:true};return nextLoad(url,context);}
