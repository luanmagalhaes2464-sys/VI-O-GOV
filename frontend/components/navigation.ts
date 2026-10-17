import {LayoutDashboard,Users,GraduationCap,ArrowLeftRight} from 'lucide-react';
export const menu=[
 {section:'VIÇO GOV',items:[{slug:'',name:'Visão Geral',icon:LayoutDashboard},{slug:'rh',name:'Recursos Humanos',icon:Users},{slug:'receita-despesa',name:'Receita e Despesa',icon:ArrowLeftRight}]},
 {section:'SECRETARIAS',items:[{slug:'educacao',name:'Secretaria de Educação',icon:GraduationCap}]}
];
export const allPages=menu.flatMap(group=>group.items);
