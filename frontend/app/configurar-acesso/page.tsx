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
  <header className="vico-acesso-cabecalho">
   <div className="vico-acesso-identidade">
    <span className="vico-acesso-v" aria-hidden="true">V</span>
    <div><strong>VIÇO GOV</strong><small>Inteligência Municipal</small></div>
   </div>
   <span className="vico-acesso-cabecalho-label">Administração do sistema</span>
  </header>
  <section className="vico-acesso-area">
   <div className="vico-acesso-box">
    <div className="vico-acesso-intro">
     <div className="vico-acesso-emblema"><ShieldCheck size={30}/></div>
     <div><span className="vico-acesso-kicker">Configuração inicial</span>
      <h1>Criar administrador</h1>
      <p className="vico-acesso-sub">Configure o primeiro acesso ao sistema.</p>
     </div>
    </div>
    {ok?<div className="vico-acesso-success">
     <strong>Administrador cadastrado.</strong>
     <p>Ative <code>VICO_AUTH_ENABLED=true</code> no Render e aguarde a publicação. Depois, entre com as credenciais cadastradas.</p>
     <button type="button" onClick={()=>router.push('/login')}>Ir para o login <ArrowRight size={16}/></button>
    </div>:status?.cadastrado?<div className="vico-acesso-config">
      <strong>Administrador já cadastrado.</strong><span>O cadastro inicial só pode ser realizado uma vez.</span>
      <a href="/login">Ir para o login</a>
     </div>:<>
     <form className="vico-acesso-form" onSubmit={registrar}>
      <label>Nome<input required minLength={2} maxLength={120} autoComplete="name" value={nome} onChange={e=>setNome(e.target.value)}/></label>
      <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Senha de acesso<input required type="password" autoComplete="new-password" minLength={12}
       value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo de 12 caracteres, letras e números"/></label>
      <label>Chave de configuração do Render<input required type="password" autoComplete="off"
       value={chave} onChange={e=>setChave(e.target.value)}/></label>
      {erro&&<p role="alert" className="vico-acesso-error">{erro}</p>}
      <button type="submit" className="vico-acesso-submit" disabled={enviando}>
       {enviando?'Registrando...':'Cadastrar administrador'}<ArrowRight size={17}/>
      </button>
     </form>
     </>}
    <div className="vico-acesso-voltar"><a href="/login">Voltar ao login</a></div>
   </div>
   <footer className="vico-acesso-footer">VIÇO GOV · Gestão e Inteligência Municipal</footer>
  </section>
 </main>;
}
