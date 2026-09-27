# Servidor da apresentação

Esta entrega é uma demonstração funcional para apresentar a ideia a um mercado. As áreas de cliente, açougue, painel e gestão ficam juntas por decisão de apresentação. **Não há autenticação ou autorização por função. Não publicar este servidor aberto na internet nem operar com dados reais de clientes antes de implementar esses controles.** O QR público usa um token aleatório e não mostra nome ou telefone. A rota interna `/api/state` inclui pedidos e dados operacionais, mas omite telefone, tokens de acompanhamento e chaves de confirmação. O navegador da demonstração tem acesso a todas as áreas.

## Executar

Node.js 22 ou superior. `npm install`, seguido de `npm run dev`. A tela abre em `http://localhost:3000`; a API usa a porta 3001. Ambos escutam na rede local. Para outro tablet ou celular, use o IP do computador, por exemplo `http://192.168.1.50:3000`, com os equipamentos na mesma rede. Configure essa mesma URL em **Gestão > Loja > endereço público** para os QR codes. Um QR apontando para localhost abre apenas no computador que o gerou.

`npm run build` verifica TypeScript e gera o frontend. `npm start` serve API, fotos e `dist` na porta 3001. Nesse modo, o endereço configurado deve terminar em `:3001` (ou no domínio/reverse proxy usado). O computador servidor precisa continuar ligado. Queda da internet externa não impede necessariamente a rede local; a interface sinaliza perda da conexão com a API. WhatsApp depende de internet externa.

## Armazenamento

Sem `DATABASE_URL`, o servidor salva todos os dados em `server/data/state.json`, com escrita em arquivo temporário e substituição após gravar. Isso é **armazenamento local durável para demonstração**, centralizado no computador servidor, acessível pelos vários dispositivos via API. Não utiliza localStorage como banco.

Com `DATABASE_URL`, usa PostgreSQL e cria a tabela `acougue_demo_state`. Uma linha JSONB contém o estado da loja da apresentação; cada alteração usa transação e bloqueio da linha. Erros no PostgreSQL interrompem a inicialização, sem migração silenciosa para JSON. O modo PostgreSQL foi implementado, mas exige uma instância real para teste de integração. O banco atual representa uma loja: separação de múltiplas lojas, esquema relacional, permissões, backups, auditoria e migrações fazem parte da preparação para operação comercial.

O arquivo `.env` é opcional; copie `.env.example` para configurar. `PUBLIC_BASE_URL` inicializa uma instalação nova. Após a primeira execução, use a Gestão para alterar o endereço persistido.

## Pedidos, estimativas e retirada

- Preço, peso médio e nome são copiados do catálogo para cada item no momento do envio. Alterar o catálogo depois não altera um pedido existente.
- Peso: `quantidade em kg × preço/kg`. Unidades: `unidades × peso médio cadastrado × preço/kg`. Espessura é uma instrução de preparo; o peso médio cadastrado é uma aproximação geral, sem modelo individual por espessura nesta versão.
- Itens recusados são preservados com motivo e retirados da estimativa. Se todos forem recusados, o pedido é cancelado. O total de pedidos retirados deve considerar apenas pedidos `delivered` e seu `estimatedTotal` já corrigido.
- Fluxo: `waiting → preparing → ready → delivered`. Recusas acontecem antes de marcar pronto. Restauração de um item de um pedido cancelado o coloca em espera novamente.
- `Idempotency-Key` evita duplicação de pedidos em tentativas simultâneas ou repetidas. Reutilizar a mesma chave com outro conteúdo retorna 409.
- `returnAfterMinutes` começa nulo. Nenhum pedido volta automaticamente. Se a loja ativar minutos, o servidor devolve pedidos prontos vencidos para espera, verificando uma vez por minuto. O procedimento físico com os produtos continua sendo da loja.

## Receitas

`RecipeVariant.ingredients[].amount` e `gramsPerServing` são quantidades **por pessoa/porção**. `baseServings` define apenas o número inicial exibido. `meatComponents`, quando presente, é a composição COMPLETA de carnes, incluindo a principal; sem ele, usa a carne escolhida e `gramsPerServing`. A escolha da alternativa troca o componente principal na interface.

O pedido guarda uma cópia das receitas, porções, ingredientes calculados e instruções, protegendo a lista do cliente de edições posteriores. Cada adição tem `selectionId` e os itens recebem `recipeSelectionId`, separando inclusive duas versões do mesmo prato. `/api/track/:token` reúne carnes aceitas e ingredientes, somando nomes/unidades iguais. Ingredientes de um grupo de receita inteiramente recusado deixam de compor a lista; se alguma carne do grupo for aceita, permanecem as porções originalmente escolhidas. Editar manualmente o peso da carne não recalcula os demais ingredientes: a lista continua vinculada às porções da receita. As receitas iniciais são exemplos para demonstração, a serem revisados pelo mercado antes do uso operacional.

## Fotos

`public/fotos/` contém as subpastas `produtos/bovina`, `produtos/frango`, `produtos/suina`, `produtos/embutidos`, `produtos/miudos`, `receitas`, `marca` e `promocoes`. Arquivos locais `.jpg`, `.jpeg`, `.png` e `.webp` nesses diretórios aparecem na biblioteca. Uploads (`POST /api/media`, campos `photo` e `folder`) aceitam até 8 MB, validam assinatura de imagem, bloqueiam diretórios arbitrários e usam nomes UUID. SVG e HTML não são aceitos. As fotos persistem no disco, separadas dos dados do catálogo. Associar uma foto a um produto/receita é outra ação da Gestão. Para produção, acrescentar decodificação/reencodificação de imagens, limites de dimensão, armazenamento privado de originais e política de retenção.

## WhatsApp oficial

O adaptador chama `POST https://graph.facebook.com/<versão>/<phone-number-id>/messages` com template oficial da Meta. **Não há simulação de envio bem-sucedido.** Sem configuração completa, a API devolve `notification.status: disabled`, e o cliente acompanha pelo QR/painel. Nenhuma mensagem real foi enviada durante o desenvolvimento ou os testes.

Para ativar são necessários uma conta e número configurados na plataforma oficial, token de acesso válido, identificação do número, idioma, versão da Graph API vigente e dois templates aprovados. Também é necessário consentimento do cliente no fechamento do pedido. Variáveis:

- `WHATSAPP_ENABLED=true` (chave explícita; padrão false)
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_VERSION` (configurável, exemplo v23.0)
- `WHATSAPP_TEMPLATE_RECEIVED`, `WHATSAPP_TEMPLATE_READY`, `WHATSAPP_TEMPLATE_LANGUAGE`

Cada template deve ter **dois parâmetros de corpo**, nesta ordem: `{{1}}` número do pedido; `{{2}}` URL de acompanhamento. O template inicial pode dizer que a lista e a receita estão nesse link. O aviso de pronto usa a mesma estrutura. Os segredos ficam apenas no servidor; não devem ser colocados em variáveis `VITE_*` ou no Git. Revise templates, políticas e requisitos atuais com a Meta na configuração da conta.

`sent` significa que a API aceitou a mensagem e retornou uma identificação, não confirma entrega ou leitura. Um erro gera `failed`, preservando o pedido. Não há webhook de entrega, fila durável de notificações ou reenvio automático nesta demonstração. Antes de operação real, implementar esses mecanismos e validar mensagens com uma conta de teste oficial. Se o processo cair entre salvar um pedido e disparar o aviso, pode ficar pendente.

## API e verificações

Estado: `GET /api/state`. Atualizações: SSE `GET /api/events` ou consulta periódica. Pedido: `POST /api/orders`; atualização `PATCH /api/orders/:id`; item `PATCH /api/orders/:id/items/:itemId`. Público: `GET /api/track/:token` e `GET /api/qr?text=...` (resposta `{qrDataUrl}`). Gestão: `PATCH /api/store`, `POST/PATCH /api/products[/id]`, `POST/PATCH /api/recipes[/id]`. Upload: `POST /api/media`.

`npm test` exercita estimativas por peso/unidade, recusa parcial e total, envio idempotente simultâneo, persistência, QR PNG, acompanhamento sem nome/telefone, composição da lista, política de retorno opcional, bloqueio de produtos indisponíveis e upload válido/inválido/excessivo. Os testes forçam WhatsApp desabilitado e não usam credenciais externas.
