'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,Search,X} from 'lucide-react';

type Props={
 label:string;
 placeholder:string;
 value:string;
 options:Array<string|{value:string;label:string}>;
 onChange:(value:string)=>void;
};

const normalizar=(valor:string)=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

export default function FiltroPesquisavel({label,placeholder,value,options,onChange}:Props){
 const id=useId();
 const ref=useRef<HTMLDivElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const [aberto,setAberto]=useState(false);
 const [pesquisa,setPesquisa]=useState('');
 const [ativo,setAtivo]=useState(0);
 const itens=useMemo(()=>options.map(x=>typeof x==='string'?{value:x,label:x}:x),[options]);
 const selecionado=itens.find(x=>x.value===value)?.label||value;
 const resultados=useMemo(()=>{
  const busca=normalizar(pesquisa);
  const correspondentes=busca?itens.filter(x=>normalizar(x.label).includes(busca)):itens;
  return correspondentes.slice(0,70);
 },[pesquisa,itens]);
 const contagem=useMemo(()=>{
  const busca=normalizar(pesquisa);
  return busca?itens.filter(x=>normalizar(x.label).includes(busca)).length:itens.length;
 },[pesquisa,itens]);

 useEffect(()=>{
  function onOutside(event:PointerEvent){
   if(ref.current&&!ref.current.contains(event.target as Node)){
    setAberto(false);
    setPesquisa('');
    setAtivo(0);
   }
  }
  document.addEventListener('pointerdown',onOutside);
  return ()=>document.removeEventListener('pointerdown',onOutside);
 },[]);

 function abrir(){
  setPesquisa('');
  setAtivo(0);
  setAberto(true);
 }
 function escolher(proximo:string){
  onChange(proximo);
  setPesquisa('');
  setAberto(false);
  setAtivo(0);
  inputRef.current?.blur();
 }
 function tecla(event:React.KeyboardEvent<HTMLInputElement>){
  if(event.key==='ArrowDown'){
   event.preventDefault();
   if(!aberto){abrir();return;}
   setAtivo(i=>Math.min(i+1,resultados.length));
  }else if(event.key==='ArrowUp'){
   event.preventDefault();
   setAtivo(i=>Math.max(0,i-1));
  }else if(event.key==='Enter'){
   if(aberto){
    event.preventDefault();
    if(ativo===0&&!pesquisa.trim()){escolher('');return;}
    const escolhido=resultados[ativo===0?0:ativo-1];
    if(escolhido!==undefined)escolher(escolhido.value);
   }
  }else if(event.key==='Escape'){
   event.preventDefault();
   setAberto(false);
   setPesquisa('');
   setAtivo(0);
   inputRef.current?.blur();
  }else if(event.key==='Tab'){
   setAberto(false);
   setPesquisa('');
  }
 }
 return <div className="rh28-field">
  <label htmlFor={id}>{label}</label>
  <div className="rh28-combobox" ref={ref}>
   <div className={'rh28-combobox-control'+(aberto?' rh28-combobox-open':'')}>
    <Search size={14} className="rh28-combobox-search-icon"/>
    <input id={id} ref={inputRef} autoComplete="off" spellCheck={false}
      role="combobox" aria-autocomplete="list" aria-expanded={aberto}
      aria-controls={id+'-options'}
      aria-activedescendant={aberto?(id+'-choice-'+ativo):undefined}
      value={aberto?pesquisa:selecionado}
      placeholder={aberto?'Digite para pesquisar…':placeholder}
      onFocus={()=>{if(!aberto)abrir();}}
      onChange={e=>{setPesquisa(e.target.value);setAberto(true);setAtivo(0)}}
      onKeyDown={tecla}/>
    {value&&!aberto&&<button type="button" className="rh28-clear" aria-label={'Limpar '+label}
      title="Limpar filtro" onClick={()=>escolher('')}><X size={14}/></button>}
    <button type="button" className="rh28-arrow" tabIndex={-1}
      aria-label={'Abrir opções de '+label}
      onMouseDown={e=>e.preventDefault()}
      onClick={()=>{if(aberto){setAberto(false);setPesquisa('');inputRef.current?.blur()}else inputRef.current?.focus()}}>
      <ChevronDown size={16}/>
    </button>
   </div>
   {aberto&&<div className="rh28-options" id={id+'-options'} role="listbox" aria-label={'Opções de '+label}>
    <button type="button" id={id+'-choice-0'} role="option" aria-selected={!value}
      className={'rh28-option'+(ativo===0?' rh28-focused':'')}
      onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setAtivo(0)}
      onClick={()=>escolher('')}>
      <span>{placeholder}</span>{!value&&<Check size={14}/>}
    </button>
    {resultados.map((opcao,i)=><button type="button" key={opcao.value}
      id={id+'-choice-'+(i+1)} role="option" aria-selected={opcao.value===value}
      className={'rh28-option'+(ativo===i+1?' rh28-focused':'')}
      onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setAtivo(i+1)}
      onClick={()=>escolher(opcao.value)}>
      <span>{opcao.label}</span>{value===opcao.value&&<Check size={14}/>}
    </button>)}
    {contagem===0&&<div className="rh28-empty">Nenhum resultado para “{pesquisa}”.</div>}
    {contagem>resultados.length&&<div className="rh28-more">
      Exibindo {resultados.length} de {contagem} opções. Continue digitando para refinar.
    </div>}
   </div>}
  </div>
 </div>;
}
