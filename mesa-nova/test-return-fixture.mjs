// Generic return-effect fixture for lifecycle/protection tests. Evasão's actual
// target restriction is tested separately in test-evasao-reposicao.mjs.
export function unrestrictedReturn(spell){
 delete spell.effects[0].min_attack;
 return spell;
}
