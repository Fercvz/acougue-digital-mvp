# Açougue Digital — MVP

Protótipo funcional, sem backend, para demonstrar quatro experiências conectadas:

- Tablet do cliente (`#/tablet`)
- Fila do açougueiro (`#/butcher`)
- Painel público de senhas (`#/board`)
- Gestão de preços e disponibilidade (`#/manager`)

Os dados são persistidos no `localStorage` do navegador. Abra `index.html` diretamente ou sirva a pasta com um servidor HTTP local.

As fotografias dos produtos ficam na pasta `assets` e são carregadas localmente, sem depender de links externos.

## Regras representadas

- Preço estimado por peso e variação final de até 100 g.
- Senha automática diária no formato `A023`.
- Sem cancelamento após o envio.
- Açougueiro pode aceitar, marcar pendência, concluir e entregar.
- Pedido pronto retorna após 30 minutos sem retirada.
- Tablet pode ser suspenso pelo gerente.
- Sessão do cliente expira após 120 segundos de inatividade.
- Receitas adicionam apenas itens do açougue e oferecem QR Code demonstrativo.

## Observação

SMS, código de barras, balança, caixa e banco de dados são representados visualmente. As integrações reais estão fora deste MVP.
