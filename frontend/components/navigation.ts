import {LayoutDashboard,Users,GraduationCap} from 'lucide-react';
export const menu=[
 {section:'VIÇO GOV',items:[{slug:'',name:'Visão Geral',icon:LayoutDashboard},{slug:'rh',name:'Recursos Humanos',icon:Users}]},
 {section:'SECRETARIAS',items:[{slug:'educacao',name:'Secretaria de Educação',icon:GraduationCap}]}
];
export const allPages=menu.flatMap(group=>group.items);
