from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from datetime import timedelta
from dotenv import load_dotenv
import os
import requests

load_dotenv()
TMDB_BEARER_TOKEN = os.getenv("TMDB_BEARER_TOKEN")


app = Flask(__name__, template_folder=".")
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(32))
app.permanent_session_lifetime = timedelta(days=30)
app.config.update(TEMPLATES_AUTO_RELOAD=True, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", MAX_CONTENT_LENGTH=16 * 1024)

# =========================
# CONFIG
# =========================
TMDB_BEARER_TOKEN = os.getenv("TMDB_BEARER_TOKEN")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Você pode trocar depois por outro modelo
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

usuarios = [
    {"usuario": "admin", "senha": "123"},
    {"usuario": "daniel", "senha": "1574"},
    {"usuario": "juan", "senha": "1574"}
]

# =========================
# AUTH
# =========================
@app.route("/", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    mensagem = ""

    if request.method == "POST":
        user = request.form.get("usuario", "").strip()
        password = request.form.get("senha", "")

        usuario_valido = None
        for u in usuarios:
            if u["usuario"] == user and u["senha"] == password:
                usuario_valido = u["usuario"]
                break

        if usuario_valido:
            session.clear()
            session["logged_in"] = True
            session["usuario"] = usuario_valido
            session.permanent = True
            return redirect(url_for("index"))
        else:
            mensagem = "Usuário ou senha incorretos. Tente novamente."

    return render_template("login.html", mensagem=mensagem)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/index")
def index():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("index.html", usuario=session.get("usuario"))


@app.route("/chat", methods=["POST"])
def chat_api():
    if not session.get("logged_in"):
        return jsonify({"erro": "Não autenticado"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("mensagem"), str):
        return jsonify({"erro": "Envie uma mensagem de texto."}), 400
    mensagem = data["mensagem"].strip()
    if len(mensagem) > 2000:
        return jsonify({"erro": "A mensagem deve ter no máximo 2000 caracteres."}), 400

    if not mensagem:
        return jsonify({"erro": "Mensagem vazia"}), 400

    try:
        resposta = gerar_resposta(mensagem)
        return jsonify({"resposta": resposta})

    except Exception as e:
        app.logger.exception("Falha na integração externa")
        return jsonify({"erro": "Não foi possível consultar o serviço. Tente novamente em instantes."}), 502
# =========================
# FUNÇÕES
# =========================
def buscar_filme_tmdb(filme_id: int) -> dict:
    return consultar_tmdb(f"movie/{filme_id}", {"language": "pt-BR"})


def buscar_filme_por_nome(nome_filme: str) -> dict:
    """
    Busca filme por nome na TMDb e retorna o primeiro resultado.
    """
    if not TMDB_BEARER_TOKEN:
        raise ValueError("TMDB_BEARER_TOKEN não foi configurado.")

    url = "https://api.themoviedb.org/3/search/movie"
    headers = {
        "Authorization": f"Bearer {TMDB_BEARER_TOKEN}",
        "Accept": "application/json"
    }
    params = {
        "query": nome_filme,
        "language": "pt-BR",
        "page": 1
    }

    response = requests.get(url, headers=headers, params=params, timeout=20)

    if response.status_code != 200:
        raise ValueError(
            f"Erro ao buscar filme na TMDb. Status: {response.status_code} | Resposta: {response.text}"
        )

    data = response.json()
    results = data.get("results", [])
    if not results:
        raise ValueError(f"Nenhum filme encontrado com o nome: {nome_filme}")

    # Retorna o primeiro resultado
    return results[0]


def gerar_resumo_ia(titulo: str, sinopse: str, nota, generos: str) -> str:
    """
    Gera um resumo curto usando OpenRouter.
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY não foi configurada.")

    prompt = f"""
Você é um assistente de filmes do projeto State Viewer.

Com base nos dados abaixo, escreva em português do Brasil:
1. um resumo curto do filme
2. o que o público costuma achar dele
3. tudo em no máximo 5 linhas
4. sem inventar fatos fora do que foi enviado
5. linguagem natural e envolvente

Título: {titulo}
Sinopse: {sinopse}
Nota média: {nota}
Gêneros: {generos}
"""



    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    # Esses headers extras ajudam, mas são opcionais
    app_url = os.getenv("APP_URL")
    app_name = os.getenv("APP_NAME", "State Viewer")
    if app_url:
        headers["HTTP-Referer"] = app_url
    if app_name:
        headers["X-Title"] = app_name

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Você é um assistente útil, direto e especializado em filmes."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 220
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code != 200:
        raise ValueError(
            f"Erro ao gerar resumo com OpenRouter. Status: {response.status_code} | Resposta: {response.text}"
        )

    data = response.json()

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise ValueError(f"Resposta inesperada da OpenRouter: {data}")


# =========================
# API
# =========================
@app.route("/resumo-filme/<int:filme_id>")
def resumo_filme(filme_id):
    if not session.get("logged_in"):
        return jsonify({"erro": "Não autenticado"}), 401

    try:
        filme = buscar_filme_tmdb(filme_id)

        titulo = filme.get("title", "Título não encontrado")
        sinopse = filme.get("overview") or "Sem sinopse disponível."
        nota = filme.get("vote_average", "Sem nota")
        generos_lista = filme.get("genres", [])
        generos = ", ".join([g.get("name", "") for g in generos_lista if g.get("name")]) or "Não informado"

        resumo = gerar_resumo_ia(titulo, sinopse, nota, generos)

        return jsonify({
            "titulo": titulo,
            "sinopse": sinopse,
            "nota": nota,
            "generos": generos,
            "poster_path": filme.get("poster_path"),
            "backdrop_path": filme.get("backdrop_path"),
            "resumo_ia": resumo
        })

    except Exception as e:
        app.logger.exception("Falha na integração externa")
        return jsonify({"erro": "Não foi possível consultar o serviço. Tente novamente em instantes."}), 502

def gerar_resposta(mensagem: str) -> str:
    if not OPENROUTER_API_KEY:
        return "Erro: API não configurada."

    import re

    # Detecta se o usuário pediu resumo de filme
    match = re.search(r"(resumo|sinopse|sobre)\s+(.+)", mensagem, re.IGNORECASE)

    if match:
        nome_filme = match.group(2).strip()

        try:
            filme = buscar_filme_por_nome(nome_filme)

            titulo = filme.get("title", "Título não encontrado")
            sinopse = filme.get("overview") or "Sem sinopse disponível."
            nota = filme.get("vote_average", "Sem nota")

            resumo = gerar_resumo_ia(titulo, sinopse, nota, "Não informado")

            return f"🎬 {titulo}\n\n{resumo}"

        except Exception:
            return f"Não encontrei o filme '{nome_filme}'."

    # resposta normal
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Você é um assistente de filmes. Responda curto e direto."
            },
            {
                "role": "user",
                "content": mensagem
            }
        ],
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code != 200:
        return "Erro ao gerar resposta."

    data = response.json()

    return data["choices"][0]["message"]["content"]
# =========================
# MAIN
# =========================

def consultar_tmdb(caminho, params):
    if not TMDB_BEARER_TOKEN:
        raise ValueError("Configure TMDB_BEARER_TOKEN no arquivo .env.")
    response = requests.get(
        f"https://api.themoviedb.org/3/{caminho}",
        headers={"Authorization": f"Bearer {TMDB_BEARER_TOKEN}", "Accept": "application/json"},
        params=params, timeout=20,
    )
    response.raise_for_status()
    return response.json()


@app.route("/api/tmdb/<path:caminho>")
def tmdb_proxy(caminho):
    import re
    if not session.get("logged_in"):
        return jsonify({"erro": "Não autenticado"}), 401
    if not re.fullmatch(r"movie/(now_playing|popular|top_rated|[0-9]+(?:/videos)?)|search/movie|discover/movie", caminho):
        return jsonify({"erro": "Consulta inválida"}), 404
    params = {key: value for key, value in request.args.items()
              if key in {"query", "page", "with_genres", "with_original_language"}}
    params.update(language="pt-BR", include_adult="false")
    try:
        return jsonify(consultar_tmdb(caminho, params))
    except (requests.RequestException, ValueError):
        app.logger.exception("Falha ao consultar TMDB")
        return jsonify({"erro": "Não foi possível carregar os filmes. Tente novamente."}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
