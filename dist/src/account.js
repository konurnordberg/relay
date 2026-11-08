// Sites handles authentication through top-level navigation, never client credentials.
function authURL(path,returnTo='/'){
 let safe='/';
 try{const url=new URL(returnTo,'https://relay.local');if(returnTo.startsWith('/')&&!returnTo.startsWith('//')&&url.origin==='https://relay.local'&&!['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname))safe=url.pathname+url.search+url.hash;}catch{}
 return path+'?return_to='+encodeURIComponent(safe);
}
export const signInURL=returnTo=>authURL('/signin-with-chatgpt',returnTo);
export const signOutURL=returnTo=>authURL('/signout-with-chatgpt',returnTo);
export const creatorReturnTo=doc=>'/?view=creator'+(doc?'&draft='+encodeURIComponent(doc.id)+'&publish=1':'');
export async function loadAccount(){
 const response=await fetch('/api/session',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Account status is unavailable. You can keep using Relay without signing in.');
 const data=await response.json();return data.signedIn===true;
}
