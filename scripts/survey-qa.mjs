// QA helper (S7 contract): answers built only from the questionnaire the server offered.
// variant n → option n of each question (mod size); 'reorderN' → same values, keys reversed;
// 'invalid' → a value outside every offered scale. No free-form answers.
export function answersFrom(survey,variant=0){
 if(variant==='invalid')return {diversao:8};
 if(!survey)return {diversao:3};// participant without an offered survey (bot, foreign, simulation, unfinished)
 const reorder=String(variant).startsWith('reorder'),n=reorder?Number(String(variant).slice(7)||0):Number(variant);
 const entries=survey.questions.map(q=>[q.id,q.options[n%q.options.length].value]);
 return Object.fromEntries(reorder?entries.reverse():entries);}
