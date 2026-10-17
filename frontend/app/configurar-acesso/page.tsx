'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,ShieldCheck} from 'lucide-react';
import '../acesso.css';
type Status={ativo:boolean;configurado:boolean;cadastrado:boolean;cadastroDisponivel:boolean};
export default function ConfigurarAcesso(){
 const router=useRouter();
 const [status,setStatus]=useState<Status|null>(null);
 const [nome,setNome]=useState('');
 const [email,setEmail]=useState('');
 const [senha,setSenha]=useState('');
 const [chave,setChave]=useState('');
 const [erro,setErro]=useState('');
 const [ok,setOk]=useState(false);
 const [enviando,setEnviando]=useState(false);
 useEffect(()=>{fetch('/api/auth/status',{cache:'no-store'}).then(r=>r.json()).then(setStatus).catch(()=>undefined)},[]);
 async function registrar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setErro('');setEnviando(true);
  try{
   const response=await fetch('/api/auth/configurar',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({nome,email,senha,chave})});
   const d=await response.json();if(!response.ok)throw Error(d.erro||'Falha na configuração');
   setOk(true);setChave('');setSenha('');
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível configurar')}
  finally{setEnviando(false)}
 }
 return <main className="vico-acesso vico-acesso-setup">
  <section className="vico-acesso-hero">
   <div className="vico-acesso-brand"><span className="vico-acesso-v">V</span><div><strong>VIÇO GOV</strong><small>INTELIGÊNCIA MUNICIPAL</small></div></div>
   <div className="vico-acesso-hero-copy"><span>ADMINISTRAÇÃO DO SISTEMA</span><h1>Segurança e controle de acesso.</h1>
    <p>Cadastro inicial protegido para administração da plataforma.</p></div>
   <div className="vico-acesso-hero-footer">VIÇO GOV · 2026</div>
  </section>
  <section className="vico-acesso-area"><div className="vico-acesso-box">
   <div className="vico-acesso-emblema"><ShieldCheck size={34}/></div>
   <div className="vico-acesso-kicker">CONFIGURAÇÃO INICIAL</div><h2>Criar administrador</h2>
   {ok?<div className="vico-acesso-success">
    <strong>Administrador cadastrado.</strong>
    <p>Agora configure <code>VICO_AUTH_ENABLED=true</code> no Render e aguarde a publicação. Depois entre com o e-mail e a senha cadastrados.</p>
    <button type="button" onClick={()=>router.push('/login')}>Ir para o login <ArrowRight size={16}/></button>
   </div>:status?.cadastrado?<div className="vico-acesso-config">
     <strong>Administrador já cadastrado.</strong><span>Esta etapa só pode ser executada uma vez.</span>
     <a href="/login">Ir para o login</a>
    </div>:<>
    <p className="vico-acesso-sub">Utilize a chave de configuração do Render para cadastrar a primeira conta.</p>
    <form className="vico-acesso-form" onSubmit={registrar}>
     <label>Nome<input required minLength={2} maxLength={120} autoComplete="name" value={nome} onChange={e=>setNome(e.target.value)}/></label>
     <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label>Senha de acesso<input required type="password" autoComplete="new-password" minLength={12} value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 12 caracteres, letras e números"/></label>
     <label>Chave inicial do Render<input required type="password" autoComplete="off" value={chave} onChange={e=>setChave(e.target.value)}/></label>
     {erro&&<p role="alert" className="vico-acesso-error">{erro}</p>}
     <button type="submit" className="vico-acesso-submit" disabled={enviando}>{enviando?'Registrando...':'Cadastrar administrador'}<ArrowRight size={17}/></button>
    </form>
    </>}
   </div><footer className="vico-acesso-footer">VIÇO GOV · CONTROLE DE ACESSO</footer>
  </section>
 </main>;
}
