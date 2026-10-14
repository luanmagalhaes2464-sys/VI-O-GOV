import {LayoutDashboard,Map,Wallet,Landmark,Lightbulb,Bot,Database,Building2,BriefcaseBusiness,Handshake,Tractor,Drama,TrendingUp,GraduationCap,Coins,Construction,HeartPulse,MapPinned,Leaf} from 'lucide-react';
export const menu=[
 {section:'VISÃO DO MUNICÍPIO',items:[{slug:'',name:'Visão do prefeito',icon:LayoutDashboard},{slug:'mapa',name:'Mapa do município',icon:Map}]},
 {section:'SECRETARIAS MUNICIPAIS',items:[
 {slug:'secretarias/governo',name:'Governo',icon:Building2},
 {slug:'secretarias/administracao',name:'Administração',icon:BriefcaseBusiness},
 {slug:'secretarias/assistencia-social',name:'Assistência Social',icon:Handshake},
 {slug:'secretarias/agropecuaria',name:'Agropecuária',icon:Tractor},
 {slug:'secretarias/cultura-turismo-juventude',name:'Cultura, Turismo e Juventude',icon:Drama},
 {slug:'secretarias/desenvolvimento-economico',name:'Desenvolvimento Econômico',icon:TrendingUp},
 {slug:'secretarias/educacao-esportes',name:'Educação e Esportes',icon:GraduationCap},
 {slug:'secretarias/gestao-financeira',name:'Gestão Financeira',icon:Coins},
 {slug:'secretarias/servicos-integrados',name:'Serviços Integrados',icon:Construction},
 {slug:'secretarias/saude',name:'Saúde',icon:HeartPulse},
 {slug:'secretarias/planejamento-mobilidade-territorio',name:'Planejamento e Mobilidade',icon:MapPinned},
 {slug:'secretarias/meio-ambiente',name:'Meio Ambiente',icon:Leaf}
 ]},
 {section:'CONSULTAS TRANSVERSAIS',items:[{slug:'financas',name:'Finanças consolidadas',icon:Wallet},{slug:'recursos',name:'Emendas e convênios',icon:Landmark},{slug:'cosip',name:'CIP / COSIP',icon:Lightbulb}]},
 {section:'FERRAMENTAS',items:[{slug:'agente',name:'Assistente VIÇO IA',icon:Bot},{slug:'fontes',name:'Fontes oficiais',icon:Database}]}
];
export const allPages=menu.flatMap(section=>section.items);
