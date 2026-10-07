import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {sheetId,division,createCharacters} from './personagens.mjs';
import {createStore} from './relatorios-core.mjs';
test('divisão cobre todos os níveis e rejeita valores fora da regra',()=>{const expected=[7,7,7,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2,2,1];expected.forEach((d,i)=>assert.equal(division(i+1),d+'ª Divisão'));for(const level of [0,21,1.5,NaN,'1'])assert.throws(()=>division(level));});
test('importação aceita apenas links de planilhas Google',()=>{assert.equal(sheetId('https://docs.google.com/spreadsheets/d/example_ID/edit?usp=sharing'),'example_ID');for(const url of ['http://docs.google.com/spreadsheets/d/example/edit','https://127.0.0.1/test','https://docs.google.com.evil.test/spreadsheets/d/example/edit','https://user:password@docs.google.com/spreadsheets/d/example/edit','https://docs.google.com/document/d/example/edit'])assert.throws(()=>sheetId(url));});
test('servidor guarda cartas da missão e não confia nos campos enviados pelo navegador',async t=>{
 const folder=mkdtempSync(join(tmpdir(),'legion-cards-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const data=join(folder,'data');mkdirSync(data);
 const card={id:'card-1',sheetId:'source-1',sourceUrl:'https://docs.google.com/spreadsheets/d/source-1/edit',name:'Herói',player:'Jogador',level:1,division:'7ª Divisão',class:'Transmutador',virtue:'Druida',portrait:null};writeFileSync(join(data,'personagens.json'),JSON.stringify([card]));
 const characters=createCharacters({folder,root:join(folder,'public'),python:'unused',extractor:'unused'});
 assert.throws(()=>characters.snapshots(['card-1','card-1']));assert.throws(()=>characters.snapshots(['inventado']));
 const store=createStore({file:join(data,'reports.json'),masters:[{id:'master',name:'Mestre'}],zones:new Set(['1720']),characters,send:async()=>({id:'message',channel_id:'channel'})});
 const r=await store.submit({submissionKey:randomUUID(),hex:'1720',title:'Teste de cartas',date:'2026-10-02',masterId:'master',narrative:'Relato fictício para verificar a preservação da carta.',authorCharacterId:'card-1',authorDiscordId:'1080332488070672484',participantIds:['card-1'],participantCards:[{...card,level:20}]});assert.equal(r.participantCards[0].level,1);
 const leakedCopy=characters.snapshots(['card-1']);leakedCopy[0].level=20;assert.equal(characters.list()[0].level,1);
 writeFileSync(join(data,'personagens.json'),JSON.stringify([{...card,level:20,division:'1ª Divisão'}]));
 store.decide({id:r.id,version:1,action:'approve',userId:'master',messageId:'message'});assert.equal(store.list()[0].participantCards[0].level,1);
 const updated=createCharacters({folder,root:join(folder,'public'),python:'unused',extractor:'unused'});assert.equal(updated.list()[0].level,20);assert.equal(store.list()[0].participantCards[0].division,'7ª Divisão');
});

