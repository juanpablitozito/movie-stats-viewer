from flask import Flask, render_template, request, redirect, session, url_for
from datetime import timedelta  
import os

app = Flask(__name__)
app.secret_key = "chave_secreta"
app.permanent_session_lifetime = timedelta(days=30)
app.config["TEMPLATES_AUTO_RELOAD"] = True

usuario = "admin"
senha = "123"

# Adicionando outro usuário
usuarios = [
    {"usuario": "admin", "senha": "123"},
    {"usuario": "daniel", "senha": "1574"},
    {"usuario": "juan", "senha": "1574"}
]

@app.route('/', methods=['GET', 'POST'])
def login():
    mensagem = ""

    if request.method == 'POST':
        user = request.form['usuario']
        password = request.form['senha']

        # Verifica se o usuário existe na lista
        usuario_valido = None
        for u in usuarios:
            if u['usuario'] == user and u['senha'] == password:
                usuario_valido = u['usuario']
                break

        if usuario_valido:
            session['logged_in'] = True
            session['usuario'] = usuario_valido
            session.permanent = True
            return redirect(url_for('index'))
        else:
            mensagem = "Usuário ou senha incorretos. Tente novamente."

    return render_template('login.html', mensagem=mensagem)

@app.route('/index')
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html', usuario=session.get('usuario'))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)