import type {Metadata} from 'next';
import Shell from '../components/shell';
import './globals.css';
import './rh.css';
import './rh/rh-auditoria.css';
import 'leaflet/dist/leaflet.css';
import './dark-theme.css';
export const metadata:Metadata={title:'VIÇO GOV | Inteligência Municipal',description:'Plataforma de inteligência municipal e dados públicos de Viçosa/MG, desenvolvida pela VIÇO Engenharia.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head>
 <link rel="preconnect" href="https://fonts.googleapis.com"/>
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
 <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap"/>
 </head><body><Shell>{children}</Shell></body></html>}
