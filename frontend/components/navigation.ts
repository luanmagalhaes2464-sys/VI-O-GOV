import {LayoutDashboard, Map, ChartNoAxesCombined, Wallet, Landmark, Lightbulb, Users, GraduationCap, HeartPulse, HardHat, Bot, Database, Settings, FileChartColumn} from 'lucide-react';
export const menu=[
  {section:'ESTRATÉGIA',items:[{slug:'',name:'Visão executiva',icon:LayoutDashboard},{slug:'mapa',name:'Mapa territorial',icon:Map},{slug:'populacao',name:'População e território',icon:ChartNoAxesCombined}]},
  {section:'GESTÃO FINANCEIRA',items:[{slug:'financas',name:'Finanças públicas',icon:Wallet},{slug:'recursos',name:'Recursos e emendas',icon:Landmark},{slug:'cosip',name:'Iluminação / COSIP',icon:Lightbulb}]},
  {section:'SERVIÇOS',items:[{slug:'servidores',name:'Servidores',icon:Users},{slug:'educacao',name:'Educação',icon:GraduationCap},{slug:'saude',name:'Saúde',icon:HeartPulse},{slug:'obras',name:'Obras e infraestrutura',icon:HardHat}]},
  {section:'INTELIGÊNCIA E CONTROLE',items:[{slug:'agente',name:'VIÇO IA',icon:Bot},{slug:'fontes',name:'Catálogo de fontes',icon:Database},{slug:'admin',name:'Administração',icon:Settings}]}
];
export const allPages=menu.flatMap(section=>section.items);
