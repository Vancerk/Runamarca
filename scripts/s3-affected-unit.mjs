// S3: executa em sequência os testes unitários afetados pelo relógio de combate, para o log do wrapper de QA.
const tests=['test-combat-clock','test-push-presentation','test-platinum-manifestations','test-damage-fx','test-match-effect-cleanup','test-opening-return','test-s3-mulligan-profile','test-patron-reveal-ui'];
let failed=0;
for(const name of tests){try{await import(new URL('../mesa-nova/'+name+'.mjs',import.meta.url));console.log('PASS '+name);}catch(error){failed++;console.log('FAIL '+name+': '+(error?.stack||error));}}
console.log((tests.length-failed)+'/'+tests.length+' arquivos de teste aprovados');
process.exitCode=failed?1:0;
