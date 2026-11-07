let token = localStorage.getItem('clubeToken') || '';
let mode = 'login';
const $ = id => document.getElementById(id);
const headers = () => ({'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})});
async function api(url, options={}) {
  const response = await fetch(url,{...options,headers:{...headers(),...(options.headers||{})}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.erro || 'Ocorreu um erro.');
  return data;
}
function showAuth(message='') { $('auth').classList.remove('hidden'); $('home').classList.add('hidden'); $('logout').classList.add('hidden'); $('authMessage').textContent=message; }
function setMode(next) {
  mode=next; $('tabLogin').classList.toggle('active',mode==='login'); $('tabRegister').classList.toggle('active',mode==='register');
  $('nameLabel').classList.toggle('hidden',mode==='login'); $('name').required=mode==='register';
  $('authSubmit').textContent=mode==='login'?'Entrar':'Criar conta';
}
$('tabLogin').onclick=()=>setMode('login'); $('tabRegister').onclick=()=>setMode('register');
$('authForm').onsubmit=async e=>{
  e.preventDefault(); $('authMessage').textContent='Aguarde...';
  try {
    const data=await api(`/api/auth/${mode==='login'?'login':'register'}`,{method:'POST',body:JSON.stringify({name:$('name').value,email:$('email').value,password:$('password').value})});
    token=data.token; localStorage.setItem('clubeToken',token); await loadApp();
  } catch(err){$('authMessage').textContent=err.message;}
};
$('logout').onclick=()=>{token='';localStorage.removeItem('clubeToken');showAuth();};
async function loadApp(){
  try{
    const me=await api('/api/me'); $('auth').classList.add('hidden'); $('home').classList.remove('hidden'); $('logout').classList.remove('hidden');
    $('welcomeName').textContent=`Olá, ${me.name}`; $('vipStatus').textContent=me.isVip?'VIP ativo':'Visitante'; $('vipStatus').classList.toggle('vip',me.isVip);
    $('subscribe').classList.toggle('hidden',me.isVip); $('admin').classList.toggle('hidden',me.role!=='admin');
    await loadCatalog(me.isVip);
    if(me.role==='admin') await loadUsers();
  }catch{token='';localStorage.removeItem('clubeToken');showAuth();}
}
async function loadCatalog(isVip){
  const items=await api('/api/conteudos'); const root=$('catalog'); root.innerHTML='';
  if(!items.length){root.innerHTML='<div class="empty">O catálogo ainda está vazio. Novos conteúdos aparecerão aqui.</div>';return;}
  for(const item of items){
    const card=document.createElement('article');card.className='item';
    const img=document.createElement('img');img.alt='Capa';img.src=item.coverUrl||'';img.onerror=()=>img.style.display='none';
    const inside=document.createElement('div');inside.className='inside';
    const title=document.createElement('h3');title.textContent=item.title;
    const desc=document.createElement('p');desc.textContent=item.description||'';
    const btn=document.createElement('button');btn.textContent=isVip?'Assistir':'Assinar para assistir';
    btn.onclick=()=>isVip?openContent(item._id):$('subscribe').scrollIntoView({behavior:'smooth'});
    inside.append(title,desc,btn);card.append(img,inside);root.append(card);
  }
}
async function openContent(id){
  try{
    const item=await api(`/api/conteudos/${id}`);
    const wrap=document.createElement('div');wrap.className='panel';
    const title=document.createElement('h2');title.textContent=item.title;
    const frame=document.createElement('iframe');frame.className='videoFrame';frame.src=item.videoUrl;frame.allowFullscreen=true;frame.allow='autoplay; encrypted-media; picture-in-picture';
    const close=document.createElement('button');close.className='ghost';close.textContent='Fechar vídeo';close.onclick=()=>wrap.remove();
    wrap.append(title,frame,close);$('catalog').prepend(wrap);wrap.scrollIntoView({behavior:'smooth'});
  }catch(e){alert(e.message);}
}
$('payButton').onclick=async()=>{
  $('payButton').disabled=true;$('payButton').textContent='Gerando Pix...';
  try{
    const data=await api('/api/criar-pix',{method:'POST',body:JSON.stringify({})});
    $('pixArea').classList.remove('hidden');$('pixCode').value=data.copiaECola;
    if(data.qrCodeBase64){$('qrImage').src=`data:image/png;base64,${data.qrCodeBase64}`;$('qrImage').classList.remove('hidden');}
    else $('qrImage').classList.add('hidden');
  }catch(e){alert(e.message);}
  finally{$('payButton').disabled=false;$('payButton').textContent='Assinar com Pix';}
};
$('copyPix').onclick=async()=>{try{await navigator.clipboard.writeText($('pixCode').value);$('copyPix').textContent='Código copiado!';}catch{ $('pixCode').select();document.execCommand('copy');$('copyPix').textContent='Código copiado!';}};
$('checkVip').onclick=async()=>{await loadApp();};
$('contentForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    await api('/api/admin/conteudos',{method:'POST',body:JSON.stringify({title:$('contentTitle').value,description:$('contentDescription').value,coverUrl:$('contentCover').value,videoUrl:$('contentVideo').value})});
    $('adminMessage').textContent='Conteúdo adicionado.';e.target.reset();await loadCatalog(true);
  }catch(err){$('adminMessage').textContent=err.message;}
};
async function loadUsers(){
  try{const users=await api('/api/admin/usuarios');$('users').innerHTML=users.map(u=>`<p>${escapeHtml(u.name)} — ${escapeHtml(u.email)} — ${u.role==='admin'?'Administrador':(u.isVip?'VIP':'Visitante')}</p>`).join('')||'Nenhum usuário.';}catch{}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
if(token) loadApp(); else showAuth();
