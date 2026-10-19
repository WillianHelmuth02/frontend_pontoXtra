import { Redirect } from 'expo-router';

/**
 * Entrada da aplicação na rota raiz (/).
 * Encaminha para o login que está organizado em sua própria pasta de rota.
 * Quando a sessão estiver implementada, este é um ponto possível para decidir
 * entre mostrar o login ou encaminhar o usuário já autenticado à área principal.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
