# Relatórios e totais — 28/10/2026

Rota `/relatorios` acessível aos três perfis, pelo rodapé compartilhado e pelo acesso na lista de jornadas; RH/ADM também têm acesso no painel. Sem login encaminha a /login. Usa APIs existentes, sem escrita no banco.

Filtros: início/fim opcionais no formato DD/MM/AAAA, prestador (inclui inativos) e dez status. Aplicar converte datas e consulta o servidor; limpar remove os filtros e consulta. Resultados identificam os filtros aplicados, mesmo se o formulário tiver alterações ainda não enviadas.

`carregarRelatorio` consulta em paralelo GET /relatorios/jornadas e GET /relatorios/totais com filtros idênticos. Lista usa 50 itens por página e botões anterior/próxima; totais não recebem paginação. Falha de uma rota impede mostrar um conjunto parcial. Hook ignora respostas ultrapassadas e a chave filtros/página impede exibir resultado de consulta anterior.

Mostra quantidade, jornadas sem cálculo, duração líquida e valor total, no geral e por status; cada jornada permite abrir detalhes. IDs/valores/contagens agregadas são strings, sem soma local ou conversão para number. null aparece como ainda não calculado. Duração pode ultrapassar 24h.

Período refere-se à data da jornada, não à data do pagamento. Soma geral pode incluir rejeitadas/canceladas e não representa automaticamente valor a pagar. AUTORIZADO significa pagamento liberado ainda não quitado; PAGO significa quitação registrada. Lixeira é excluída. Lista e totais são consultas independentes no instante de leitura, não um snapshot congelado. Não há exportação CSV/PDF nesta entrega.

## Arquivos

- src/app/relatorios.tsx: rota.
- src/components/relatorios-screen.tsx: formulário, resumo/lista e paginação.
- src/services/relatorios.ts e src/utils/relatorios.ts: contratos e consultas.
- src/hooks/use-api-resource.ts: reinicia flags quando a consulta muda.
- scripts/test-relatorios.cjs: filtros, precisão, paginação, falhas e contrato do loader.

Homologar conforme [roteiro integrado](../../Documentos/ROTEIRO_HOMOLOGACAO.md). Consulte [API](../../back/docs/relatorios.md) e [visão geral](../../Documentos/VISAO_GERAL_ATUAL.md).
