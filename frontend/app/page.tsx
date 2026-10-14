'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Users,Wallet,ArrowUpRight,ExternalLink,ShieldCheck,FileUp} from 'lucide-react';
import {lerSessao,PainelRH,numero,moeda,FONTE_RH,BRUTO_OFICIAL_JAN_2026} from '../lib/rh-import';

export default function Home(){
 const [data,setData]=useState<PainelRH|null>(null);
 useEffect(()=>setData(lerSessao()),[]);
 const referencia=data?.referencia??'2026-01';
 return <div className="rh-home">
  <div className="rh-kicker">VIÇO GOV / VISÃO GERAL</div>
  <h1>Recursos Humanos de Viçosa</h1>
  <p className="rh-subtitle">Dois números essenciais para acompanhar o quadro de pessoal da Prefeitura Municipal de Viçosa/MG.</p>
  <section className="rh-home-figures">
   <article className="rh-home-figure rh-home-figure-people">
    <span className="rh-home-tag"><Users size={19}/> QUANTIDADE DE FUNCIONÁRIOS</span>
    <strong>{data?numero(data.pessoas):'—'}</strong>
    <h2>{data?'Nomes distintos na folha · '+referencia:'Total de pessoas a confirmar'}</h2>
    <p>{data?'Estimativa por nomes distintos. A folha possui '+numero(data.matriculas)+' matrículas/vínculos; pessoas com nomes iguais podem afetar a contagem.':'O portal mostra dez registros por página. Preciso da exportação completa para calcular a quantidade sem inventar um número.'}</p>
    <Link href="/rh"><FileUp size={15}/>{data?'Explorar a distribuição de RH':'Carregar CSV da folha'} <ArrowUpRight size={15}/></Link>
   </article>
   <article className="rh-home-figure rh-home-figure-payroll">
    <span className="rh-home-tag"><Wallet size={19}/> VALOR BRUTO DA FOLHA</span>
    <strong>{moeda(data?.bruto??BRUTO_OFICIAL_JAN_2026)}</strong>
    <h2>{data?'Folha importada · '+referencia:'Folha de pagamento · janeiro de 2026'}</h2>
    <p>{data?'Valor calculado sobre a exportação CSV oficial selecionada nesta sessão.':'Valor bruto exibido pelo Portal da Transparência, na aba Folha de Pagamento. Não inclui automaticamente as abas de agentes políticos e estagiários.'}</p>
    <a href={FONTE_RH} target="_blank" rel="noopener noreferrer">Conferir valor oficial <ExternalLink size={15}/></a>
   </article>
  </section>
  <div className="rh-overview-next">
   <div><h2>Análises de RH</h2><p>Depois de importar a folha oficial, consulte distribuição salarial, vínculos, secretarias e cargos.</p></div>
   <Link href="/rh">Abrir dashboard de RH <ArrowUpRight size={16}/></Link>
  </div>
  <div className="rh-home-note"><ShieldCheck size={18}/><span>O CSV é processado no próprio navegador. O site não envia nomes, matrículas ou remunerações individuais ao GitHub ou ao Render. Apenas estatísticas agregadas ficam nesta sessão do navegador.</span></div>
 </div>;
}
