# Gestão da loja

A área **Gestão** reúne os cadastros para a apresentação. As mudanças são salvas pela API e passam a aparecer nas telas conectadas.

## Produtos

- Cadastre nome, categoria, preço por kg, descrição e preparos disponíveis.
- O peso médio por unidade serve somente para estimar pedidos como "quatro bifes". A cobrança continua dependendo da pesagem do açougue.
- Use **Pausar** quando faltar um produto. Ele deixa de estar disponível para novos pedidos.
- Para um destaque de oferta, informe o texto do selo e o preço anterior. O preço por kg principal é o preço atual.

## Receitas

O mercado cadastra os pratos. Cada prato pode ter versões próprias, como carne bovina e frango, com ingredientes e instruções diferentes.

1. Informe nome, apresentação, foto do prato pronto e número de pessoas da receita base.
2. Em cada versão, escolha a carne recomendada, quantidade e preparo.
3. Selecione alternativas compatíveis com o preparo. Elas aparecem como outras escolhas para o cliente.
4. Cadastre os demais ingredientes com suas quantidades para o número de pessoas indicado e escreva um passo de preparo por linha.
5. Para churrasco com mais de uma carne, preencha a composição completa, incluindo o corte principal.

Ao mudar o número de pessoas no cadastro, as quantidades são ajustadas proporcionalmente. Internamente elas são armazenadas por pessoa, permitindo o cálculo conforme a escolha do cliente.

## Fotos

Envie JPG, PNG ou WebP pela aba **Fotos**. Escolha a pasta antes do envio:

```text
public/fotos/
├── produtos/
│   ├── bovina/
│   ├── frango/
│   ├── suina/
│   └── embutidos/
├── receitas/
├── marca/
└── promocoes/
```

As imagens enviadas ficam nessa estrutura. A API também reconhece imagens compatíveis copiadas diretamente para essas pastas. Depois, selecione a imagem no cadastro do produto, receita ou loja. Use uma foto do corte para o produto e uma foto do prato pronto para a receita.

## Loja

- Personalize nome, frase e logo.
- Pause novos pedidos quando o atendimento digital precisar parar.
- Configure um endereço acessível pelo celular para o QR code. Um endereço na rede local só funciona com o celular conectado à mesma rede.
- A volta automática de pedidos prontos para a fila é opcional e fica desativada inicialmente. Cada mercado define sua regra.
- O painel informa se a integração oficial WhatsApp está configurada. Sem conta e configuração da Meta, os avisos automáticos não são enviados. Não se cadastram tokens ou senhas nessa tela.
