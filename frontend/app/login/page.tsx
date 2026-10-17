'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Eye,EyeOff,LockKeyhole,ArrowRight} from 'lucide-react';
import '../acesso.css';

type Status={ativo:boolean;configurado:boolean;cadastrado:boolean;cadastroDisponivel:boolean};
export default function Login(){
 const router=useRouter();
 const [email,setEmail]=useState('');
 const [senha,setSenha]=useState('');
 const [mostrar,setMostrar]=useState(false);
 const [erro,setErro]=useState('');
 const [enviando,setEnviando]=useState(false);
 const [status,setStatus]=useState<Status|null>(null);
 useEffect(()=>{fetch('/api/auth/status',{cache:'no-store'}).then(r=>r.json()).then(setStatus).catch(()=>undefined)},[]);
 async function entrar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setErro('');setEnviando(true);
  try{
   const response=await fetch('/api/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({email,senha})});
   const data=await response.json();
   if(!response.ok)throw Error(data.erro||'Acesso indisponível');
   const target=new URLSearchParams(window.location.search).get('proximo')||'/';
   router.replace(target.startsWith('/')&&!target.startsWith('//')?target:'/');
   router.refresh();
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível entrar')}
  finally{setEnviando(false)}
 }
 return <main className="vico-acesso">
  <header className="vico-acesso-cabecalho">
   <div className="vico-acesso-identidade">
    <span className="vico-acesso-v" aria-hidden="true">V</span>
    <div><strong>VIÇO GOV</strong><small>Inteligência Municipal</small></div>
   </div>
   <span className="vico-acesso-cabecalho-label">Plataforma de gestão pública</span>
  </header>
  <section className="vico-acesso-area">
   <div className="vico-acesso-box">
    <div className="vico-acesso-intro">
     <div className="vico-acesso-emblema"><img alt="Brasão de Viçosa" src="/brasao-prefeitura-vicosa.svg"/></div>
     <div><span className="vico-acesso-kicker">Acesso à plataforma</span>
      <h1>Entrar no Viço Gov</h1>
      <p className="vico-acesso-sub">Entre com seu e-mail e senha.</p>
     </div>
    </div>
    <form onSubmit={entrar} className="vico-acesso-form">
     <label>E-mail<input type="email" required autoComplete="username"
      value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu.email@exemplo.com"/></label>
     <label>Senha<div className="vico-acesso-password">
      <input type={mostrar?'text':'password'} required autoComplete="current-password"
       value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Digite sua senha"/>
      <button type="button" onClick={()=>setMostrar(v=>!v)} aria-label={mostrar?'Ocultar senha':'Mostrar senha'}>{mostrar?<EyeOff size={18}/>:<Eye size={18}/>}</button>
     </div></label>
     {erro&&<p className="vico-acesso-error" role="alert">{erro}</p>}
     <button className="vico-acesso-submit" type="submit" disabled={enviando||!email||!senha}>
      <LockKeyhole size={17}/>{enviando?'Validando...':'Entrar'}<ArrowRight size={17}/>
     </button>
    </form>
    {status&&(!status.cadastrado||!status.ativo)&&
     <div className="vico-acesso-config">
      {!status.cadastrado?<><strong>Primeiro acesso</strong>
       <a href="/configurar-acesso">Configurar administrador <ArrowRight size={14}/></a></>:
       !status.ativo?<><strong>Ativação pendente</strong><span>Ative o controle de acesso no Render após configurar sua conta.</span></>:null}
     </div>}
   </div>
   <footer className="vico-acesso-footer">VIÇO GOV · Gestão e Inteligência Municipal</footer>
  </section>
 </main>;
}
