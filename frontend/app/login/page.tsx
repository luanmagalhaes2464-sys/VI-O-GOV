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
  <section className="vico-acesso-hero">
   <div className="vico-acesso-brand"><span className="vico-acesso-v">V</span><div><strong>VIÇO GOV</strong><small>INTELIGÊNCIA MUNICIPAL</small></div></div>
   <div className="vico-acesso-hero-copy"><span>PLATAFORMA DE GESTÃO PÚBLICA</span>
    <h1>Informação para decisões mais eficientes.</h1>
    <p>Indicadores públicos, recursos humanos, educação e finanças em uma única plataforma.</p>
   </div>
   <div className="vico-acesso-hero-footer">VIÇO GOV · 2026</div>
  </section>
  <section className="vico-acesso-area">
   <div className="vico-acesso-box">
    <div className="vico-acesso-emblema"><img alt="Brasão de Viçosa" src="/brasao-prefeitura-vicosa.svg"/></div>
    <div className="vico-acesso-kicker">ACESSO À PLATAFORMA</div>
    <h2>Entrar no Viço Gov</h2>
    <p className="vico-acesso-sub">Informe as credenciais da sua conta.</p>
    <form onSubmit={entrar} className="vico-acesso-form">
     <label>E-mail institucional<input type="email" required autoComplete="username"
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
      {!status.cadastrado?<><strong>Primeiro acesso</strong><span>É necessário configurar o administrador inicial.</span>
       <a href="/configurar-acesso">Configurar acesso inicial</a></>:
       !status.ativo?<><strong>Ativação pendente</strong><span>O administrador foi cadastrado. Ative o controle de acesso no Render antes de usar o login.</span></>:null}
     </div>}
   </div>
   <footer className="vico-acesso-footer">VIÇO GOV · GESTÃO E INTELIGÊNCIA MUNICIPAL</footer>
  </section>
 </main>;
}
