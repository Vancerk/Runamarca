# Avisos ao autor da Torre de Comando

O bot tenta enviar DM ao ID do autor gravado no relatório. Pedidos de revisão incluem o motivo e um link privado, válido para a versão atual; encerramentos definitivos não liberam edição.

Se o Discord recusar explicitamente a DM (50007 ou 50278), o bot pode enviar uma menção genérica ao canal configurado em `LEGION_NOTIFICATION_CHANNEL_ID`. Sem essa variável, não envia nada em canal. Erros de rede, entregas incertas, token inválido e erros do servidor não acionam o canal, para evitar mensagens duplicadas ou desnecessárias.

O canal precisa permitir ao bot visualizar e enviar mensagens; o autor precisa poder acessar o canal. Permitir a menção não garante notificação no dispositivo se o usuário a tiver silenciado. A mensagem é visível a quem tem acesso ao canal. Não publica título, motivo, narrativa, anexos nem o segredo de edição.

O link público `#notice=<id>` exige login com o Discord do autor para recuperar motivo e acesso à revisão. O servidor compara a identidade autenticada com o ID de autor gravado no envio. Não aceita IDs declarados pelo navegador. Após reenvio, a versão anterior não pode ser editada novamente; encerramento permanece bloqueado.

A entrega confirmada no canal é registrada com ID, versão e canal. Reenviar o aviso da mesma versão não repete um ping já registrado; uma nova versão pode gerar outro aviso. Uma falha de persistência após uma entrega continua exigindo conferência antes de novas tentativas.

Configure a variável somente após criar o canal. Não use `LEGION_ARCHIVE_CHANNEL_ID`: aquela variável é para cópias de relatórios aprovados, uma função diferente.

Validação: testes automatizados de DM prioritária, falha explícita, erro incerto, conteúdo privado, deduplicação e acesso reservado. A interface foi verificada com Chrome em cenários locais simulados de visitante e autor identificado. O envio alternativo em um canal real depende da criação e configuração desse canal.
