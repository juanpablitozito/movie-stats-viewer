from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from datetime import timedelta
from dotenv import load_dotenv
import os
import requests

load_dotenv()
TMDB_BEARER_TOKEN = os.getenv("TMDB_BEARER_TOKEN")
print("TOKEN:", TMDB_BEARER_TOKEN)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "chave_secreta")
app.permanent_session_lifetime = timedelta(days=30)
app.config["TEMPLATES_AUTO_RELOAD"] = True

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
def login():
    mensagem = ""

    if request.method == "POST":
        user = request.form.get("usuario", "").strip()
        password = request.form.get("senha", "").strip()

        usuario_valido = None
        for u in usuarios:
            if u["usuario"] == user and u["senha"] == password:
                usuario_valido = u["usuario"]
                break

        if usuario_valido:
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

    data = request.get_json()
    mensagem = data.get("mensagem", "").strip()

    if not mensagem:
        return jsonify({"erro": "Mensagem vazia"}), 400

    try:
        resposta = gerar_resposta(mensagem)
        return jsonify({"resposta": resposta})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
# =========================
# FUNÇÕES
# =========================
def buscar_filme_tmdb(filme_id: int) -> dict:
    api_key = "SUA_API_KEY_AQUI"

    url = f"https://api.themoviedb.org/3/movie/{filme_id}"
    params = {
        "api_key": api_key,
        "language": "pt-BR"
    }

    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise ValueError(
            f"Erro ao buscar filme na TMDb. Status: {response.status_code} | Resposta: {response.text}"
        )

    return response.json()


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
        return jsonify({"erro": str(e)}), 500

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
        "model": "mistralai/mistral-7b-instruct",
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

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        return "Erro ao gerar resposta."

    data = response.json()

    return data["choices"][0]["message"]["content"]
# =========================
# MAIN
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)