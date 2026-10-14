import {LayoutDashboard,Users} from 'lucide-react';
export const menu=[
 {section:'VIÇO GOV',items:[{slug:'',name:'Visão Geral',icon:LayoutDashboard},{slug:'rh',name:'Recursos Humanos',icon:Users}]}
];
export const allPages=menu.flatMap(group=>group.items);
