'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/api';
type Feature={type:string,geometry:{type:string,coordinates:number[]},properties:{nome:string,tipo:string,endereco?:string}};
export default function MunicipalMap(){
 const el=useRef<HTMLDivElement>(null);
 const [loaded,setLoaded]=useState(false);
 const [notice,setNotice]=useState('Camadas oficiais ainda não foram importadas.');
 useEffect(()=>{let disposed=false;let map:import('leaflet').Map|undefined;
    (async()=>{if(!el.current)return;const L=await import('leaflet');if(disposed||!el.current)return;
      map=L.map(el.current,{zoomControl:true}).setView([-20.754,-42.880],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);
      setLoaded(true);
      const data=await api<{features:Feature[]}>('/api/v1/mapa/equipamentos');
      if(disposed||!map)return;
      if(data.data?.features?.length){data.data.features.forEach(f=>{if(f.geometry.type==='Point'){
       const [lng,lat]=f.geometry.coordinates;
       L.circleMarker([lat,lng],{radius:7,color:'#9d3440',fillColor:'#9d3440',fillOpacity:0.83}).addTo(map!).bindPopup(`<b>${escapeHtml(f.properties.nome||'Equipamento')}</b><br/>${escapeHtml(f.properties.tipo||'')}`);
      }});setNotice(`${data.data.features.length} equipamentos georreferenciados carregados.`)}
    })();return()=>{disposed=true;if(map){map.remove();map=undefined}};
 },[]);
 return <><div ref={el} className="map-canvas" role="region" aria-label="Mapa de Viçosa - OpenStreetMap"/><div className="map-caption"><span className="status-dot"/>{loaded?'Mapa base carregado':'Carregando mapa…'} • {notice}</div></>
}
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
