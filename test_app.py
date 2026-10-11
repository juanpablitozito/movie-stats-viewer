import unittest
from unittest.mock import patch

from app import app


class ApplicationTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True, SECRET_KEY="test-secret")
        self.client = app.test_client()

    def login(self):
        return self.client.post("/login", data={"usuario": "admin", "senha": "123"})

    def test_login_and_templates(self):
        self.assertEqual(self.client.get("/index").status_code, 302)
        response = self.client.post("/login", data={"usuario": "admin", "senha": "errada"})
        self.assertIn("Usuário ou senha incorretos".encode(), response.data)
        self.assertEqual(self.login().status_code, 302)
        self.assertEqual(self.client.get("/index").status_code, 200)
        with self.client.get("/static/css/login.css") as stylesheet:
            self.assertEqual(stylesheet.status_code, 200)
        self.client.get("/logout")
        self.assertEqual(self.client.get("/index").status_code, 302)

    def test_chat_validation(self):
        self.assertEqual(self.client.post("/chat", json={"mensagem": "oi"}).status_code, 401)
        self.login()
        for payload in [None, [], {}, {"mensagem": 3}, {"mensagem": " "}, {"mensagem": "a" * 2001}]:
            self.assertEqual(self.client.post("/chat", json=payload).status_code, 400)
        with patch("app.gerar_resposta", return_value="Olá!"):
            self.assertEqual(self.client.post("/chat", json={"mensagem": "oi"}).json, {"resposta": "Olá!"})

    def test_proxy_limits_and_failure(self):
        self.assertEqual(self.client.get("/api/tmdb/movie/popular").status_code, 401)
        self.login()
        self.assertEqual(self.client.get("/api/tmdb/account").status_code, 404)
        with patch("app.consultar_tmdb", return_value={"results": []}) as lookup:
            response = self.client.get("/api/tmdb/search/movie?query=Alien&api_key=ignored&include_adult=true")
            self.assertEqual(response.status_code, 200)
            lookup.assert_called_once_with("search/movie", {"query": "Alien", "language": "pt-BR", "include_adult": "false"})
        with patch("app.consultar_tmdb", side_effect=ValueError("private credential")), self.assertLogs(app.logger, level="ERROR"):
            response = self.client.get("/api/tmdb/movie/popular")
            self.assertEqual(response.status_code, 502)
            self.assertNotIn(b"private credential", response.data)


if __name__ == "__main__":
    unittest.main()
