import {randomBytes,scrypt as cryptoScrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {knowledgePool} from './ia-conhecimento';

const scrypt=promisify(cryptoScrypt);
export async function gerarSenhaHash(senha:string):Promise<string>{
 const salt=randomBytes(16).toString('hex');
 const hash=await scrypt(senha,salt,64) as Buffer;
 return 'scrypt:'+salt+':'+hash.toString('hex');
}
export async function conferirSenha(senha:string,armazenado:string):Promise<boolean>{
 const [algoritmo,salt,hex]=armazenado.split(':');
 if(algoritmo!=='scrypt'||!salt||!hex||!/^([0-9a-f]{128})$/.test(hex))return false;
 const expected=Buffer.from(hex,'hex');
 const actual=await scrypt(senha,salt,expected.length) as Buffer;
 return timingSafeEqual(actual,expected);
}
export const dbAuth=knowledgePool;
export function senhaSegura(senha:string):boolean{
 return senha.length>=12&&senha.length<=128&&/[A-Za-z]/.test(senha)&&/[0-9]/.test(senha);
}
export function emailValido(email:string):boolean{
 return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
