import {LayoutDashboard,Users,ShieldAlert} from 'lucide-react';
export const menu=[
 {section:'VIÇO GOV',items:[
  {slug:'',name:'Visão Geral',icon:LayoutDashboard},
  {slug:'rh',name:'Recursos Humanos',icon:Users},
  {slug:'rh/inteligencia',name:'Alertas e Inteligência',icon:ShieldAlert}
 ]}
];
export const allPages=menu.flatMap(group=>group.items);
