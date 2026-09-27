# Validação da apresentação popular

Data: 27/09/2026. Base original: commit `4e37ab4f97a93fb27366fe00027689c0b17ad6f3`.

## Verificações automáticas

- `npm run build`: TypeScript sem erros; bundle Vite gerado.
- `npm test`: **12 testes passaram**, sem falhas.
- Casos cobertos: pedido por peso ou quantidade de bifes; rejeição de quantidade para outros preparos e de bifes fracionados sem gravar pedido nem consumir senha; geração de QR; recusas parciais/totais; proteção contra duplicação concorrente; política opcional de retorno; cópia de receitas; porções independentes por versão; validação de fotos; persistência após reabertura; produto indisponível; bloqueio de origem externa; alteração de preparo sem invalidar receitas existentes.
- Os testes forçam WhatsApp desativado e usam armazenamento temporário separado.

## Verificações no navegador

- Tela inicial sem solicitação de dados; layout popular com vermelho/amarelo e fotos verificadas.
- Configuração de contrafilé por 4 bifes: peso médio 720 g, estimativa R$ 35,93; espessura grossa e observação de duas embalagens.
- Pedido efetivamente enviado no fluxo visual: 500 g de contrafilé (R$ 24,95) + receita de estrogonofe de frango para quatro porções (600 g, R$ 13,14). Total R$ 38,09, sem nome nem telefone.
- Confirmação A001 com QR real; endereço do QR aberto pelo IP local em outra aba.
- Lista de compras apresentou 200 g de creme de leite, 1 cebola, 120 g de molho, 240 g de arroz e 100 g de batata palha, além das carnes.
- Recusa somente do contrafilé reduziu total para R$ 13,14 e deixou o frango em preparo.
- Marcar pronto refletiu no painel com apenas A001 e aviso de item recusado; acompanhamento refletiu a recusa, o total e o estado pronto.
- Confirmar retirada removeu o pedido da fila ativa e mostrou venda estimada de R$ 13,14.
- Abas de fotos e receitas acessíveis na Gestão. Biblioteca com oito imagens e pastas por finalidade/categoria.
- Acompanhamento conferido em viewport de celular (390 px); catálogo em tablet vertical (820 px), sem transbordamento horizontal.
- Servidor interrompido intencionalmente: mensagem de desconexão apareceu e botões de novo pedido ficaram desabilitados. Servidor reiniciado após verificação.

O pedido A001 é dado de teste local da validação; não corresponde a venda real.

## Ajustes do catálogo e carrinho — 27/09/2026

- Destaque com três promoções válidas do catálogo; contrafilé, frango e lombo na demonstração. Descontos calculados a partir dos preços cadastrados, arredondados para baixo.
- Textos solicitados removidos; cartões exibem nome e preços, sem a descrição. Selo amarelo com percentual; preço anterior riscado ampliado.
- Card inteiro abre configuração. Abertura pelo nome e pela oferta verificadas no navegador; preço/desconto associados ao botão para leitores de tela.
- Ícones de frango, porquinho e salsicha; menu com letras maiores e título centralizado.
- Carrinho com oito itens: catálogo rolou até o fim e lista do carrinho rolou independentemente. Botão Continuar manteve a mesma posição (base em 696 px, viewport de 720 px de altura).
- Quantidade mudou automaticamente o preparo de tiras para bifes; somente bife permaneceu disponível. Por peso manteve os preparos, inclusive bifes. Frango sem preparo de bife não ofereceu quantidade.
- Verificados 1280 × 720, 1024 × 768, 700 × 900 e 390 × 844. Corrigida compressão de cartões na faixa de tablet estreito; preços sem corte. Carrinho de celular manteve Continuar visível com oito itens.
- Ofertas adicionais de contrafilé e lombo são dados de demonstração, editáveis pela Gestão. Nenhum pedido foi enviado durante esta rodada de ajustes visuais.

## Simplificação da compra, receitas e kits — 27/09/2026

- Cabeçalho de promoções com ícone de selo percentual; fotos do destaque sem selo. Catálogo com selo “% DESCONTO”, sem percentual numérico, apenas nos produtos em promoção.
- Preços com símbolo R$ e centavos menores, incluindo carrinho, configuração, receitas e confirmação. Valor anterior continua riscado.
- Categorias ocupam toda a linha, inclusive a 390 px; nenhum cartão de preço cortado. “Fresquinho, todo dia” removido.
- Botões de preparo e peso com dimensões uniformes; seleção apenas por fundo e borda. Verificados 133,7 × 45 px antes/depois da troca bife/moído, sem alteração de posição. A janela mantém altura e rodapé; apenas seu conteúdo rola.
- Confirmação inicial contém somente opção “Receber no WhatsApp quando estiver pronto”, total e botão de confirmar. Nenhum campo de nome. Telefone aparece somente ao ativar a opção; indisponibilidade real do WhatsApp continua informada nesse momento.
- “O que cozinhar?” contém apenas pratos, com nome e foto em cada cartão. Churrascos aparecem exclusivamente na aba própria.
- Receita com foto grande, modo de preparo aberto, porções próximas ao título, cortes selecionáveis e lista de ingredientes separada. Em telas pequenas, a seleção fica logo depois da foto.
- Três kits editáveis na Gestão: Churrasco do dia a dia; Churrasco de fim de semana; Quero impressionar. Quantidades de todos os componentes acompanham o número de pessoas. Molhos e acompanhamentos entram na lista de compras e não no total das carnes.
- Teste de integração verificou cada kit para quatro pessoas: estimativas R$ 52,02, R$ 66,62 e R$ 113,80, com ingredientes proporcionais no acompanhamento; oito pessoas duplicam todas as carnes. Confirmação sem nome/telefone também validada.
- No navegador: fim de semana para sete pessoas = 1,75 kg de contrafilé, 700 g de linguiça, 700 g de coxa/sobrecoxa; R$ 116,59. Lista: 420 g de vinagrete, 175 g de molho de alho, sete pães de alho e 280 g de farofa.
- Conferidos desktop 1280 × 720, tablet 1024 × 768 e celular 390 × 844. Testes não enviaram WhatsApp; nenhum novo pedido foi confirmado no servidor da demonstração.
- Composições e porções são exemplos iniciais para o mercado revisar. Fotos de churrasco existentes continuam ilustrativas; podem ser substituídas por fotos próprias de cada kit.

## Catálogo ampliado e fotos por versão — 27/09/2026

- Catálogo com 42 produtos: 16 bovinos, cinco de frango, nove suínos (incluindo carré), seis linguiças e seis miúdos. Categoria Miúdos após Embutidos, também disponível no cadastro e na pasta de fotos. Coxa e sobrecoxa combinadas foram preservadas, além das opções separadas.
- Todos os produtos têm fotos próprias do respectivo tipo de corte. A linguiça genérica foi substituída no catálogo pela toscana, preservando o identificador usado em receitas e pedidos. Preços adicionados são exemplos editáveis; preços, promoções, disponibilidade e pedidos anteriores foram preservados.
- Fotografias de estrogonofe e hambúrguer diferentes para carne e frango. Cadastro na Gestão permite foto por versão, com fallback para a foto principal. O pedido guarda a foto da versão escolhida, sem mudar quando a receita é editada depois.
- Fotos específicas nos três cards de churrasco: carnes na grelha, churrasco com amigos e duas fotos de picanha/carré suíno no kit Quero impressionar. Segunda foto também editável na Gestão.
- Kit Quero impressionar atualizado para picanha, carré suíno e linguiça toscana: para quatro pessoas, 1,2 kg + 600 g + 400 g, total estimado de R$ 115,98. Para seis pessoas, 1,8 kg + 900 g + 600 g, total estimado de R$ 173,97. Molhos e acompanhamentos permanecem na lista de compras.
- Receita sem o bloco repetido de carnes a preparar. As opções mostram miniaturas dos cortes; quantidade de carne fica junto de Total estimado e do botão Adicionar ao pedido. Kits mantêm a composição de carnes visível.
- Botões de voltar grandes e destacados em receitas/churrascos. Configuração do produto mostra Observações, sem “Do seu jeito” e sem “opcional”. Slogans solicitados removidos da confirmação, da TV e da fila do açougueiro.
- Navegador: Moela disponível apenas por peso; label Observações conferido. Estrogonofe alternou para a foto de frango e estimativa de 600 g/R$ 13,14. Kit para seis pessoas adicionou três itens ao carrinho com R$ 173,97; checkout aberto sem confirmar pedido. Descrição do kit salva pela Gestão, preservando as duas fotos e a composição.
- Layout conferido em 1280 × 720, 1024 × 768 e 390 × 844; seis categorias cabem na largura, sem transbordamento horizontal. Painel TV conferido com senha existente, sem nome/telefone e sem os textos removidos.
- **14 testes de integração passaram**, incluindo cadastro/pedido de miúdos, foto por versão com persistência no pedido, cálculo dos kits e fluxos anteriores. `npm run build` passou com TypeScript e Vite.
- As 50 URLs de fotos atualmente usadas por produtos e receitas retornaram imagens válidas. A biblioteca mantém 55 arquivos com origem e condição de uso documentadas, incluindo fotos antigas preservadas para o histórico. Candidatas não utilizadas ficam em `.tmp`, fora do aplicativo.
- Nenhum novo pedido foi confirmado no servidor de demonstração nesta rodada; nenhum WhatsApp foi enviado. Backup anterior à ampliação do catálogo preservado em `.tmp/catalog-before-2026-09-27.json`.

## Limites da verificação

- Não foi usado um celular físico para escanear o QR; o conteúdo gerado pelo servidor e o endereço local foram verificados.
- WhatsApp não possui conta/credenciais configuradas; nenhum envio real foi feito. A UI informa isso quando a opção é escolhida.
- PostgreSQL possui adaptador, mas não foi conectado a uma instância nesta entrega. A demonstração testada usa armazenamento JSON local no servidor.
- Acesso unificado sem login atende à apresentação. Autenticação e isolamento entre lojas ainda são trabalho da versão operacional.
- Fotos são referências da demonstração. Parte tem direitos reservados: publicação comercial depende de autorização dos titulares ou substituição por fotos próprias. Fontes e licenças individuais estão em `docs/fotos-creditos.md` e `/fotos/creditos.html`.
- Conteúdo e porções das receitas são exemplos a revisar pelo mercado.
