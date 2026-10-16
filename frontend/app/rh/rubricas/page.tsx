import DetalhamentoRubricas from '../../../components/rh-rubricas-detail';
import './rubricas.css';
export default function PaginaRubricas({searchParams}:{searchParams:Record<string,string|string[]|undefined>}){
 const parametro=(v:string|string[]|undefined)=>typeof v==='string'?v:'';
 const mes=parametro(searchParams?.mes)||'2026-07';
 const categoria=parametro(searchParams?.categoria)||'Demais rubricas';
 return <DetalhamentoRubricas mes={mes} categoria={categoria}/>;
}
