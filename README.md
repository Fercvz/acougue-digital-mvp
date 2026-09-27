# Açougue Digital — apresentação popular

React + TypeScript, servidor Node.js e identidade vermelha/amarela. As quatro áreas ficam juntas para apresentar a ideia ao mercado. Não contém pagamento nem integração com balança/caixa.

## Demonstração online

Abra **https://fercvz.github.io/acougue-digital-mvp/**.

O GitHub Pages hospeda a apresentação estática: Cliente, Açougueiro, TV e Gestão funcionam com dados salvos no navegador (IndexedDB). Pedidos e alterações persistem ao recarregar e aparecem em outras abas do mesmo navegador. Não são compartilhados com outros aparelhos ou pessoas. O modo online não coleta telefone nem envia WhatsApp; o acompanhamento/QR só encontra pedidos no navegador onde foram criados.

A versão com servidor continua disponível pelos comandos abaixo e compartilha pedidos entre dispositivos. As regras e o catálogo inicial ficam em `shared/`, usados pelas duas versões.

O workflow `.github/workflows/pages.yml` testa, compila e publica cada alteração da branch `main`. A fonte em **Settings → Pages** deve ser **GitHub Actions**. Publica somente `dist-pages/`, com o caminho `/acougue-digital-mvp/`; não usa o `index.html` de desenvolvimento na raiz do repositório.

Para testar o mesmo build localmente:

```powershell
npm run build:pages
npm run preview:pages
```

Abra **http://127.0.0.1:4173/acougue-digital-mvp/**. A pasta `dist-pages/` é separada da compilação com servidor (`dist/`).

## Iniciar

Requer Node.js 22 ou 24 e npm. Execute `Iniciar Acougue Digital.cmd`, ou:

```powershell
npm install --cache .npm-cache
npm run dev
```

Abra **http://localhost:3000**. A barra superior alterna entre Cliente, Açougueiro, Painel TV e Gestão. A API roda na porta 3001.

Para a versão compilada: `npm run build` e `npm start`. Nesse modo, abra a porta **3001** e ajuste a URL do QR code na Gestão.

## Funcionalidades

- Explorar carnes/receitas antes de informar dados; WhatsApp opcional ao finalizar, sem solicitar nome.
- Catálogo com 42 produtos e fotos, organizado em bovina, frango, suína, embutidos e miúdos.
- Pedido por peso; quantidade de unidades apenas para bifes, com peso médio estimado. Preparo, espessura, observações e edição do carrinho.
- Receitas com fotos por versão, cortes alternativos, porções e ingredientes. Churrasco com três kits: dia a dia, fim de semana e Quero impressionar, com picanha, carré suíno e linguiça toscana.
- Pedidos persistidos no servidor e compartilhados entre dispositivos; proteção contra confirmação duplicada.
- Recusa por item, motivo visível, estimativa recalculada e cancelamento quando todos os itens forem recusados.
- Iniciar preparo, marcar pronto e confirmar retirada. Venda estimada dos retirados exclui itens recusados.
- TV com números, sem nomes ou telefones.
- QR real com acompanhamento, receitas e lista de compras.
- Gestão de produtos, receitas, identidade da loja, disponibilidade e fotos em pastas.
- Retorno de pedidos não retirados desativado por padrão e configurável pela loja.
- Bloqueio de novos envios quando a comunicação com o servidor cai.
- Encerramento da sessão por inatividade com aviso prévio.

Preços, receitas e marca **Bom Corte** são exemplos de apresentação. As receitas devem ser revisadas pelo mercado antes da operação.

## QR no celular

Conecte computador e celular à mesma rede Wi-Fi. Em **Gestão → Loja**, defina `http://IP-LOCAL-DO-COMPUTADOR:3000`. Abra esse endereço no celular para conferir a rede, faça um pedido e escaneie o QR.

`localhost` no QR aponta para o próprio celular. O IP pode mudar entre redes. Acesso pelo 4G exige hospedagem pública com HTTPS e controles de acesso. Não alteramos o firewall automaticamente.

## WhatsApp

A integração oficial está em `server/whatsapp.ts`. Sem conta, número, credenciais e modelos aprovados na Meta, **não envia mensagens**; a interface informa a pendência.

Consulte `.env.example` e [o guia do servidor](docs/backend.md). Credenciais ficam no servidor. O envio inicial e o aviso de pronto usam modelos distintos com link para o acompanhamento/lista. Não houve envio real nem validação de conta Meta nesta entrega. Aceitação pela API não comprova entrega ao celular.

## Fotos e receitas

Use **Gestão → Fotos** para enviar imagens e depois associe-as ao produto/receita:

```text
public/fotos/
  marca/
  produtos/bovina/
  produtos/frango/
  produtos/suina/
  produtos/embutidos/
  produtos/miudos/
  receitas/
  promocoes/
```

Uploads aceitam JPEG, PNG e WebP até 8 MB, com nomes únicos. As fotos de referência têm [créditos e condições de uso](docs/fotos-creditos.md), também disponíveis na galeria `/fotos/creditos.html`. Parte das imagens tem direitos reservados e precisa de autorização ou substituição por fotos próprias antes do uso comercial. Todos os 42 produtos iniciais têm foto; novos cadastros sem imagem mostram “Foto a cadastrar”.

Em **Gestão → Receitas**, cadastre versões, carnes, ingredientes, instruções e imagem. Cada versão pode ter uma foto própria; kits de churrasco também podem exibir uma segunda foto. O editor mostra as quantidades para o número de porções informado. O pedido guarda uma cópia da receita e a foto da versão escolhida para preservar pedidos antigos.

## Dados e limites

Sem `DATABASE_URL`, a demonstração salva dados em `server/data/state.json` (não versionado). Há adaptador PostgreSQL, ainda não validado com uma instância real; o modelo atual usa uma linha JSONB para o estado de uma loja.

As telas estão deliberadamente juntas e sem login para a apresentação solicitada. **Use em ambiente de demonstração com dados de teste.** Antes de operação pública, implementar autenticação, separação efetiva de lojas, permissões, retenção de dados, backup e acompanhamento de entrega por webhook.

Esta versão representa uma loja. O estilo gourmet ainda não foi iniciado. Os arquivos originais `app.js`, `styles.css` e `assets/` foram preservados como referência; a nova aplicação carrega `src/` e `public/fotos/`.

## Verificação

```powershell
npm run typecheck
npm test
npm run build
```

Os testes usam dados temporários e WhatsApp desativado. Veja [VALIDACAO.md](VALIDACAO.md).
