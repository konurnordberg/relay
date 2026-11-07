const KEY='relay.drafts.v1';
const id=p=>p?.id||'__preview__';
export function readDraft(profile){
 const data=JSON.parse(localStorage.getItem(KEY)||'{}'),entry=data[id(profile)];
 return entry&&typeof entry.text==='string'&&entry.text.length<=20000?entry.text:'';
}
export function writeDraft(profile,text){
 if(text.length>20000)throw new Error('Draft is too long to save automatically. Copy or export your message.');
 const data=JSON.parse(localStorage.getItem(KEY)||'{}');
 data[id(profile)]={text,at:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(data));
}
export function removeDraft(profile){const data=JSON.parse(localStorage.getItem(KEY)||'{}');delete data[id(profile)];localStorage.setItem(KEY,JSON.stringify(data));}
