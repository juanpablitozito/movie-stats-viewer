# Movie Stats Viewer

Catálogo de filmes em português com busca, trailers e assistente Viewy.

## Executar localmente

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env # apenas se você ainda não tem .env
.venv\Scripts\python app.py
```

Preencha o `.env` com o token de leitura da TMDB, a chave do OpenRouter e uma chave de sessão aleatória. Abra http://localhost:5000. O catálogo precisa da TMDB; o chat também precisa do OpenRouter.

As contas de demonstração originais foram preservadas em `app.py`; substitua esse cadastro por autenticação persistente com senhas protegidas antes de publicar. O servidor de desenvolvimento é destinado ao uso local. `app.txt` é o arquivo original de referência; o ponto de entrada atualizado é `app.py`.

## Melhorias

- Login e caminhos dos arquivos estáticos corrigidos.
- Token TMDB utilizado no servidor, sem credenciais no JavaScript.
- Busca com atraso de 300 ms e descarte de respostas antigas.
- Chat funcional com envio por Enter, estado de carregamento e tratamento de erros.
- Detalhes dos filmes sem abrir o chat automaticamente, trailer protegido contra respostas antigas e fechamento por Escape.
- Cards acessíveis pelo teclado e respeito à preferência por movimento reduzido.
- Limites de mensagem, timeouts nas integrações e erros externos sem detalhes sensíveis.

## Design e responsividade

Login centralizado com fundo estrelado, logo da claquete e formulário adaptado ao celular, botão de mostrar senha e aviso de Caps Lock. Catálogo com destaque interativo, títulos, ano e nota nos cards, busca em grade, pôster alternativo e modal responsivo. Carrossel pausa durante interação e respeita movimento reduzido.

Layout e fluxos verificados no navegador em 360, 390, 768 e 1366 pixels, com respostas simuladas para TMDB e chat. As integrações reais dependem das credenciais do .env.


A logo com acabamento suave aparece no login e no cabeçalho. O favicon usa uma versão simplificada em 16, 32 e 48 pixels. O arquivo `.env` é local e não deve ser versionado.
