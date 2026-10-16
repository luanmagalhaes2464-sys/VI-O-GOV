import type {Metadata} from 'next';
import Shell from '../components/shell';
import './globals.css';
import './rh.css';
import './rh/rh-auditoria.css';
import 'leaflet/dist/leaflet.css';
export const metadata:Metadata={title:'VIÇO GOV | Inteligência Municipal',description:'Plataforma demonstrativa de inteligência municipal e dados públicos de Viçosa/MG, desenvolvida pela VIÇO Engenharia.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><Shell>{children}</Shell></body></html>}
