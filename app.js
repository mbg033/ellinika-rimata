import {book,verbs,groups,people,person} from './data.js';
const modes={type:['Определить спряжение','По словарной или личной форме'],forms:['Проспрягать','Заполнить все шесть форм'],ending:['Вставить окончание','Дополнить основу'],sentence:['Дополнить предложение','Выбрать форму из вариантов'],errors:['Повторить ошибки','Ответить заново на пропущенные задания'],due:['Повторить по расписанию','Карточки, у которых подошёл срок']};
const tabs={train:'Тренировка',cards:'Карточки',rules:'Правила',progress:'Прогресс',add:'Мои материалы'};
const key='rimata-v1', app=document.querySelector('#app'),nav=document.querySelector('#nav');
let state={custom:[],learned:[],history:[],reviews:{},book};
try{Object.assign(state,JSON.parse(localStorage.getItem(key)||'{}'))}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{alert('Браузер не смог сохранить изменения. Они доступны до закрытия страницы.')}}
const all=()=>{
 const customIds=new Set(state.custom.map(v=>v.id));
 return [...verbs.filter(v=>!customIds.has(v.id)),...state.custom];
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gr=s=>'<span lang="el" class="greek">'+esc(s)+'</span>';
const norm=s=>s.trim().normalize('NFC').toLocaleLowerCase('el').replace(/σ$/,'ς');
const plain=s=>norm(s).normalize('NFD').replace(/\p{M}/gu,'');
const day=86400000;
const fmt=t=>new Intl.DateTimeFormat('ru',{dateStyle:'short',timeStyle:'short'}).format(t);
let page='train',mode='',question=null,topic='',level='',only=false,last='',result=null;
const button=(label,action,active=false)=>'<button type="button" data-action="'+esc(action)+'" class="'+(active?'active':'')+'">'+esc(label)+'</button>';
const opts=(items,value)=>items.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===value?'selected':'')+'>'+esc(n)+'</option>').join('');
const filter=v=>(!topic||v.topic===topic)&&(!level||v.level===level)&&(!only||state.learned.includes(v.id));
const pending=()=>Object.values(Object.fromEntries(state.history.map(h=>[h.key,h]))).filter(h=>!h.ok);
const due=v=>state.reviews[v.id]?.at<=Date.now();
const random=xs=>xs[Math.floor(Math.random()*xs.length)];
function filters(){return '<div class="row toolbar"><label>Тема <select id="topic">'+opts([['','Все'],...[...new Set(all().map(v=>v.topic))].map(x=>[x,x])],topic)+'</select></label><label>Сложность <select id="level">'+opts([['','Любая'],['A1','A1'],['A1+','A1+']],level)+'</select></label><label><input type="checkbox" id="only" '+(only?'checked':'')+'> Только изученные</label></div>'}
function build(v,m,i){
 if(v.partial){
  if(m!=='forms'||!v.sentence)return null;
  return {id:v.id,m,i,prompt:v.sentence,instruction:'Впиши форму со значением «'+v.ru+'».',
   answers:[v.forms[v.index]],note:v.formNote,source:v.exampleSource};
 }
 const forms=v.forms, g=groups[v.g][0], who=people[i], what=person[i], base={id:v.id,m,i};
 if(m==='type')return {...base,prompt:forms[i][0],instruction:'Определи группу. Дана '+(i===0?'словарная форма (εγώ).':'форма '+who+'.'),answers:[[g]],choices:Object.values(groups).map(x=>x[0]),note:g+'. '+groups[v.g][1]};
 if(m==='forms')return {...base,prompt:v.id,instruction:'Напиши шесть форм настоящего времени. Укажи ударение.',answers:forms,labels:people,note:g+'. Сверь лицо, число и ударение в каждой строке.'};
 if(m==='ending'&&v.stem&&forms[i].every(s=>s.startsWith(v.stem)&&s.length>v.stem.length))return {...base,prompt:who+' · '+v.stem+'___',instruction:'Впиши только окончание с ударением, если оно падает на окончание.',answers:[forms[i].map(s=>s.slice(v.stem.length))],note:what+' ('+who+') → '+forms[i].join(' / ')+'.'};
 if(m==='sentence'&&v.sentence&&i===v.index&&!v.partial){
  const answers=forms[i],choices=[answers[0],...forms.filter((_,j)=>i!==j).map(a=>a[0]).filter(s=>s&&!answers.includes(s)).slice(0,3)];
  return {...base,prompt:v.sentence,instruction:'Выбери форму глагола '+v.id+'.',answers:[answers],choices:choices.sort((a,b)=>a.localeCompare(b,'el')),note:'Здесь требуется '+what+' ('+who+').',source:v.exampleSource};
 }
 return null;
}
function next(){
 result=null;
 const vs=all().filter(filter);
 let pool=mode==='errors'?pending().flatMap(h=>{const v=vs.find(v=>v.id===h.id);return v?[build(v,h.m,h.i)]:[]}):vs.filter(v=>mode!=='due'||due(v)).flatMap(v=>{
  const m=mode==='due'?'forms':mode;
  return (m==='forms'?[0]:people.map((_,i)=>i)).map(i=>build(v,m,i));
 });
 pool=pool.filter(Boolean);
 const alternatives=pool.filter(q=>qid(q)!==last);
 question=random(alternatives.length?alternatives:pool)||null;
 if(question)last=qid(question);
}
const qid=q=>JSON.stringify([q.id,q.m,q.i]);
function train(){
 const hero='<section class="hero"><div class="eyebrow">Практика новогреческого</div><h1>Спряжение<br>греческих глаголов</h1><p>Распознавай группы, подбирай окончания и возвращайся к формам, которые ещё путаешь.</p></section>';
 const menu='<div class="grid">'+Object.entries(modes).map(([k,[title,desc]])=>'<button type="button" class="mode '+(k===mode?'active':'')+'" data-action="mode:'+k+'"><strong>'+title+'</strong>'+desc+'</button>').join('')+'</div>';
 if(!mode)return hero+menu+filters();
 if(!question)return menu+filters()+'<section class="panel">Для этого режима и фильтров пока нет заданий.</section>';
 const q=question,v=all().find(v=>v.id===q.id);
 const inputs=q.choices?q.choices.map(c=>'<label><input name="a0" type="radio" value="'+esc(c)+'" required '+(result?'disabled':'')+' '+(result?.values[0]===c?'checked':'')+'> '+(q.m==='type'?esc(c):gr(c))+'</label>').join(''):q.answers.map((_,i)=>'<label>'+gr(q.labels?.[i]??'')+'<input lang="el" name="a'+i+'" aria-label="'+esc(q.labels?.[i]??'Ответ')+'" value="'+esc(result?.values[i])+'" autocomplete="off" spellcheck="false" required '+(result?'disabled':'')+'></label>').join('');
 return menu+filters()+'<section class="panel"><div class="pill">'+esc(modes[mode][0])+'</div><p>'+esc(q.instruction)+'</p><div class="prompt" lang="el">'+esc(q.prompt)+'</div><form id="answer" class="stack"><div class="formgrid">'+inputs+'</div>'+(result?'<div role="status" class="feedback '+(result.ok?'':'bad')+'"><strong>'+(result.ok?'Верно!':'Есть ошибки')+'</strong><div>'+esc(q.note)+'</div>'+q.answers.map((answers,i)=>'<div>'+esc(q.labels?.[i]??'')+' '+(q.m==='type'?esc(answers.join(' / ')):gr(answers.join(' / ')))+(result.correct[i]?' ✓':answers.some(a=>plain(a)===plain(result.values[i]))?' · Проверь ударение.':' · Проверь форму для этого лица.')+'</div>').join('')+'</div>'+button('Следующее задание','next',true)+button(state.learned.includes(v.id)?'Убрать из изученных':'Отметить изученным','learn:'+v.id):'<button class="primary">Проверить</button>')+'</form><small>'+esc(q.source||v.source)+(!q.source&&v.formNote?'<br>'+esc(v.formNote):'')+'</small></section>';
}
function cards(){return '<h1>Карточки глаголов</h1>'+filters()+'<div class="grid">'+all().filter(filter).map(v=>'<details><summary><strong lang="el">'+esc(v.id)+'</strong> · '+esc(v.ru)+'</summary><p class="pill">'+esc(groups[v.g][0])+'</p><div class="muted">'+esc(v.topic)+' · '+esc(v.level)+'</div><table><tbody>'+v.forms.map((f,i)=>f.length?'<tr><th scope="row" lang="el">'+esc(people[i])+'</th><td>'+gr(f.join(' / '))+'</td></tr>':'').join('')+'</tbody></table>'+(v.sentence?'<p>'+gr(v.sentence.replace('___',v.forms[v.index][0]))+'<br><small>'+esc(v.exampleSource)+'</small></p>':'')+'<p><small>'+esc(v.source)+(v.formNote?'<br>'+esc(v.formNote):'')+'</small></p>'+button(state.learned.includes(v.id)?'✓ Изучен':'Отметить изученным','learn:'+v.id,state.learned.includes(v.id))+'</details>').join('')+'</div>'}
function rules(){return '<h1>Как различать группы</h1><p>В современном греческом продуктивного инфинитива нет. Словарная форма глагола — обычно 1-е лицо единственного числа настоящего времени. Группа Γ1 здесь обозначает модель медиопассивных форм по учебнику, а не третье спряжение.</p><p class="muted">Справочник охватывает модели из текущего набора и только настоящее время. Параллельные варианты через косую черту принимаются при проверке. Перемещение ударения учи по таблицам.</p><div class="grid">'+Object.values(groups).map(([name,note,ends])=>'<section class="panel"><h2>'+esc(name)+'</h2><p>'+esc(note)+'</p>'+(ends?'<table><tbody>'+ends.split(' ').map((e,i)=>'<tr><th scope="row" lang="el">'+esc(people[i])+'</th><td>'+gr('−'+e)+'</td></tr>').join('')+'</tbody></table>':'')+'</section>').join('')+'</div>'}
function progress(){return '<h1>Мой прогресс</h1><div class="grid">'+[[state.learned.length,'Изучено'],[pending().length,'Ошибок к повтору'],[all().filter(due).length,'Карточек на сегодня']].map(([n,s])=>'<div class="panel"><strong class="prompt">'+n+'</strong><div>'+s+'</div></div>').join('')+'</div><div class="row">'+button('Мои изученные','learned')+button('Повторить ошибки','mode:errors')+button('Повторить по расписанию','mode:due')+'</div><p class="muted">После правильных ответов интервалы растут от 1 до 30 дней. Ошибка возвращает карточку в очередь сразу. Данные сохраняются в этом браузере.</p><section class="panel"><h2>История попыток</h2>'+(state.history.length?'<table><thead><tr><th>Время</th><th>Глагол и задание</th><th>Ответ</th></tr></thead><tbody>'+state.history.slice().reverse().map(h=>'<tr><td>'+fmt(h.time)+'</td><td>'+gr(h.id)+'<br>'+esc(modes[h.m][0])+'</td><td>'+(h.ok?'✓':'✗')+' '+esc(h.values.join(' · '))+'</td></tr>').join('')+'</tbody></table>':'<p>Попыток пока нет.</p>')+'</section><section class="panel"><h2>Следующие повторения</h2>'+all().filter(v=>state.reviews[v.id]).sort((a,b)=>state.reviews[a.id].at-state.reviews[b.id].at).map(v=>'<div>'+gr(v.id)+' · '+fmt(state.reviews[v.id].at)+'</div>').join('')+'</section>'}
function field(name,label,value='',required=true){return '<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>'}
let editing='';
function add(){
 const v=state.custom.find(v=>v.id===editing);
 return '<h1>Мои материалы</h1><section class="panel"><h2>Учебник для новых записей</h2><form id="book" class="row">'+field('book','Название',state.book)+'<button>Сохранить</button></form><p class="muted">У существующих карточек остаётся их собственная ссылка на источник.</p></section><p>Встроенный словарь основан на '+esc(book)+'. Для своих карточек перепиши формы с ударениями. Варианты одной формы разделяй знаком /.</p><section class="panel"><h2>'+(v?'Редактировать карточку':'Добавить глагол')+'</h2><form id="add" class="stack"><div class="formgrid">'+field('id','Словарная форма',v?.id)+field('ru','Перевод',v?.ru)+field('topic','Тема',v?.topic)+'<label>Группа<select name="g">'+opts(Object.entries(groups).map(([g,x])=>[g,x[0]]),v?.g)+'</select></label><label>Сложность<select name="level">'+opts([['A1','A1'],['A1+','A1+']],v?.level)+'</select></label>'+field('source','Источник и страница',v?.source??state.book)+people.map((p,i)=>field('f'+i,gr(p),v?.forms[i].join(' / '))).join('')+field('stem','Основа для задания на окончание (необязательно)',v?.stem,false)+field('sentence','Предложение с одним пропуском ___ (необязательно)',v?.sentence,false)+'<label>Лицо и число в пропуске<select name="index">'+opts(people.map((p,i)=>[String(i),p]),String(v?.index??0))+'</select></label>'+field('exampleSource','Страница примера (если отличается)',v?.exampleSource,false)+'</div><p id="form-message" role="status"></p><button class="primary">Сохранить карточку</button> '+(v?button('Отменить','edit:'):'')+'</form></section><h2>Добавленные карточки</h2><div class="row">'+(state.custom.map(v=>button(v.id+' · редактировать','edit:'+v.id)).join('')||'Пока пусто.')+'</div>';
}
function render(){nav.innerHTML=Object.entries(tabs).map(([p,n])=>button(n,'tab:'+p,page===p)).join('');app.innerHTML=({train,cards,rules,progress,add}[page])()}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const [action,arg]=b.dataset.action.split(':');
 if(action==='tab')page=arg;
 if(action==='mode'){page='train';mode=arg;last='';next()}
 if(action==='next')next();
 if(action==='learn'){const opened=b.closest('details');const was=state.learned.includes(arg);state.learned=was?state.learned.filter(x=>x!==arg):[...state.learned,arg];save();if(opened&&(!only||!was)){b.textContent=was?'Отметить изученным':'✓ Изучен';b.classList.toggle('active',!was);return}}
 if(action==='learned'){page='cards';only=true;topic='';level=''}
 if(action==='edit')editing=arg;
 render();
});
app.addEventListener('change',e=>{
 if(e.target.id==='topic')topic=e.target.value;
 else if(e.target.id==='level')level=e.target.value;
 else if(e.target.id==='only')only=e.target.checked;
 else return;
 if(mode)next();render();
});
app.addEventListener('submit',e=>{
 e.preventDefault();
 const fd=new FormData(e.target),get=k=>String(fd.get(k)??'').trim().normalize('NFC');
 if(e.target.id==='book'){state.book=get('book')||book;save();render();return}
 if(e.target.id==='add'){
  const id=get('id'),forms=people.map((_,i)=>get('f'+i).split('/').map(s=>s.trim()).filter(Boolean));
  const stem=get('stem'),sentence=get('sentence'),source=get('source');
  const msg=document.querySelector('#form-message');
  const greek=/^[\p{Script=Greek}]+$/u;
  if(!greek.test(id)||forms.some(f=>!f.length||f.some(s=>!greek.test(s)))||!forms[0].includes(id)){msg.textContent='Введи греческие формы и включи словарную форму в варианты для εγώ.';return}
  if(all().some(v=>v.id===id&&id!==editing)){msg.textContent='Такая словарная форма уже есть.';return}
  if(sentence&&(sentence.split('___').length!==2||/____/.test(sentence))){msg.textContent='Отметь один пропуск тремя подчёркиваниями.';return}
  if(stem&&(!greek.test(stem)||!forms.some(f=>f.every(s=>s.startsWith(stem)&&s.length>stem.length)))){msg.textContent='Основа должна совпадать с началом всех вариантов хотя бы одной формы.';return}
  if(!get('ru')||!get('topic')||!source){msg.textContent='Заполни перевод, тему и источник.';return}
  const card={id,ru:get('ru'),g:get('g'),topic:get('topic'),level:get('level'),source,forms,stem,sentence,index:Number(get('index')),exampleSource:get('exampleSource')||source};
  if(editing&&editing!==id){state.learned=state.learned.map(x=>x===editing?id:x);delete state.reviews[editing]}
  state.custom=[...state.custom.filter(v=>v.id!==editing),card];editing='';question=null;result=null;mode='';save();render();return;
 }
 if(e.target.id!=='answer'||!question||result)return;
 const values=question.answers.map((_,i)=>get('a'+i));
 if(values.some(v=>!v))return;
 const correct=question.answers.map((answers,i)=>answers.some(a=>norm(a)===norm(values[i])));
 const ok=correct.every(Boolean),time=Date.now(),id=question.id;
 result={values,correct,ok};
 state.history.push({key:qid(question),id,m:question.m,i:question.i,values,ok,time});
 const prior=state.reviews[id],intervals=[1,3,7,14,30];
 if(!ok)state.reviews[id]={step:0,at:time};
 else if(!prior||prior.at<=time){const step=Math.min((prior?.step??0)+1,intervals.length);state.reviews[id]={step,at:time+intervals[step-1]*day}}
 save();render();app.querySelector('.feedback')?.scrollIntoView({block:'nearest'});
});
render();
