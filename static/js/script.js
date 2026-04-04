// === VARIÁVEIS GLOBAIS ===
const baseUrl = "https://api.themoviedb.org/3";
const apiKey = "667f29be2c2b3a1826a0467ad42f291b";
const imgBase = "https://image.tmdb.org/t/p/w500";

let indice = 0;
let total = 0;
let carrosselInterval;
let filmeAtual = null;

// === ELEMENTOS DO MODAL ===
const modal = document.getElementById("movieModal");
const modalTitle = document.getElementById("modalTitle");
const modalOverview = document.getElementById("modalOverview");
const modalRating = document.getElementById("modalRating");
const modalRelease = document.getElementById("modalRelease");
const closeModalBtn = document.getElementById("closeModal");

// === FUNÇÃO DE DETECÇÃO MOBILE ===
function isMobileDevice() {
    return (
        typeof window.orientation !== "undefined" ||
        navigator.userAgent.indexOf("IEMobile") !== -1 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
}

// === CHAT AI ===
function abrirChat() {
    const overlay = document.getElementById("chatOverlay");
    if (overlay) {
        overlay.style.display = "flex";
    }
}

function fecharChat() {
    const overlay = document.getElementById("chatOverlay");
    if (overlay) {
        overlay.style.display = "none";
    }
}

function adicionarMensagemChat(texto, classe = "resposta") {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    const msg = document.createElement("div");
    msg.className = classe;
    msg.innerHTML = texto;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function limparChat() {
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
        chatMessages.innerHTML = "";
    }
}

async function carregarResumoIA(filmeId) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    limparChat();
    adicionarMensagemChat("🤖 Gerando resumo do filme...");

    try {
        const response = await fetch(`/resumo-filme/${filmeId}`);
        const data = await response.json();

        limparChat();

        if (!response.ok) {
console.error("Erro backend:", data);
adicionarMensagemChat(`❌ ${data.erro || "Erro desconhecido"}`);
            return;
        }

        filmeAtual = {
            id: filmeId,
            titulo: data.titulo
        };

        adicionarMensagemChat(`
            <strong>${data.titulo}</strong><br><br>
            ${data.resumo_ia || "Resumo não disponível."}
        `);
    } catch (error) {
        console.error("Erro ao carregar resumo da IA:", error);
        limparChat();
        adicionarMensagemChat("Erro ao carregar resumo da IA.");
    }
}

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");

    if (!input || !chatMessages) return;

    const mensagem = input.value.trim();
    if (!mensagem) return;

    adicionarMensagemChat(mensagem, "chat");
    input.value = "";

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensagem,
                filme_id: filmeAtual?.id || null,
                titulo: filmeAtual?.titulo || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            adicionarMensagemChat(data.erro || "Erro ao responder.");
            return;
        }

        adicionarMensagemChat(data.resposta || "Sem resposta.");
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        adicionarMensagemChat("Erro ao enviar mensagem.");
    }
}

function configurarChat() {
    const openChatBtn = document.getElementById("openChat");
    const chatInput = document.getElementById("chatInput");

    if (openChatBtn) {
        openChatBtn.addEventListener("click", abrirChat);
    }

    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// === CONFIGURAÇÃO SWIPE PARA MOBILE ===
function configurarSwipe() {
    const carrossel = document.querySelector(".carrossel");
    if (!carrossel || !isMobileDevice()) return;

    let touchStartX = 0;
    let touchEndX = 0;

    carrossel.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    carrossel.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) avancarSlide();
        if (touchEndX > touchStartX + 50) voltarSlide();
    }
}

// === CARROSSEL PRINCIPAL ===
async function carregarCarrossel() {
    try {
        const resposta = await fetch(`${baseUrl}/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1`);
        const dados = await resposta.json();
        const filmes = dados.results.slice(0, 5);

        const slidesContainer = document.getElementById("slides");
        if (!slidesContainer) {
            console.error("Elemento 'slides' não encontrado");
            return;
        }

        slidesContainer.innerHTML = filmes.map(filme => {
            const backdropUrl = filme.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${filme.backdrop_path}`
                : "https://via.placeholder.com/1280x500/333/666?text=Imagem+Indisponível";

            return `
                <div class="slide" style="
                    min-width: 100%;
                    height: 500px;
                    background-image: url('${backdropUrl}');
                    background-size: cover;
                    background-position: center;
                "></div>
            `;
        }).join("");

        total = filmes.length;
        indice = 0;
        atualizarSlide();
        configurarIntervaloMobile();
    } catch (error) {
        console.error("Erro ao carregar carrossel principal:", error);
    }
}

function configurarIntervaloMobile() {
    if (carrosselInterval) clearInterval(carrosselInterval);
    const intervalo = isMobileDevice() ? 5000 : 8000;
    carrosselInterval = setInterval(avancarSlide, intervalo);
}

function atualizarSlide() {
    const slides = document.getElementById("slides");
    if (slides) {
        slides.style.transform = `translateX(-${indice * 100}%)`;
        slides.style.transition = "transform 0.8s ease-in-out";
    }
}

function avancarSlide() {
    if (total === 0) return;
    indice = (indice + 1) % total;
    atualizarSlide();
}

function voltarSlide() {
    if (total === 0) return;
    indice = (indice - 1 + total) % total;
    atualizarSlide();
}

// === CONTROLE DE FILMES NAS SEÇÕES ===
function avancarFilmes(type) {
    const movieRow = document.getElementById(type);
    if (!movieRow) return;

    const scrollAmount = isMobileDevice() ? 200 : 400;
    movieRow.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
    });
}

function voltarFilmes(type) {
    const movieRow = document.getElementById(type);
    if (!movieRow) return;

    const scrollAmount = isMobileDevice() ? 200 : 400;
    movieRow.scrollBy({
        left: -scrollAmount,
        behavior: "smooth"
    });
}

// === SISTEMA DE BUSCA ===
function configurarBusca() {
    const searchInput = document.getElementById("query");
    const overlay = document.getElementById("searchResultsOverlay");
    const resultsContainer = document.getElementById("searchResults");

    if (!searchInput || !overlay || !resultsContainer) {
        console.warn("Elementos de busca não encontrados");
        return;
    }

    function showOverlay() {
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
    }

    function searchMovies(query) {
        if (!query.trim()) {
            hideOverlay();
            return;
        }

        fetch(`${baseUrl}/search/movie?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                resultsContainer.innerHTML = "";

                if (data.results && data.results.length > 0) {
                    data.results.forEach(movie => {
                        const poster = movie.poster_path
                            ? `${imgBase}${movie.poster_path}`
                            : "https://via.placeholder.com/150x225?text=Sem+Imagem";

                        const card = document.createElement("div");
                        card.classList.add("card-movie");
                        card.innerHTML = `
                            <img src="${poster}" alt="${movie.title}" />
                            <p>${movie.title}</p>
                        `;

                        card.addEventListener("click", () => {
                            hideOverlay();
                            fetch(`${baseUrl}/movie/${movie.id}?api_key=${apiKey}&language=pt-BR`)
                                .then(response => response.json())
                                .then(details => openModal(details))
                                .catch(error => console.error("Erro ao buscar detalhes do filme da busca:", error));
                        });

                        resultsContainer.appendChild(card);
                    });

                    showOverlay();
                } else {
                    resultsContainer.innerHTML = `<p style="color: white;">Nenhum resultado encontrado.</p>`;
                    showOverlay();
                }
            })
            .catch(err => {
                console.error("Erro na busca:", err);
            });
    }

    searchInput.addEventListener("input", (e) => {
        searchMovies(e.target.value);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchMovies(searchInput.value);
        }
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            hideOverlay();
        }
    });
}

// === CARREGAMENTO DE FILMES POR CATEGORIA ===
function fetchMovies(type) {
    const row = document.getElementById(type);
    if (!row) {
        console.warn(`Container com ID '${type}' não encontrado`);
        return;
    }

    row.innerHTML = '<div class="loading">Carregando...</div>';

    let url = "";

    switch (type) {
        case "launches":
            url = `${baseUrl}/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case "topRated":
            url = `${baseUrl}/movie/top_rated?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case "popular":
            url = `${baseUrl}/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case "acao":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=28&page=1`;
            break;
        case "comedia":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=35&page=1`;
            break;
        case "terror":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=27&page=1`;
            break;
        case "suspense":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=53&page=1`;
            break;
        case "romance":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=10749&page=1`;
            break;
        case "anime":
            url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=16&with_original_language=ja&page=1`;
            break;
        default:
            console.error("Tipo de filme não reconhecido:", type);
            return;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            row.innerHTML = "";

            if (data.results && data.results.length > 0) {
                data.results.forEach(filme => {
                    const card = document.createElement("div");
                    card.classList.add("card-movie");

                    const posterUrl = filme.poster_path
                        ? imgBase + filme.poster_path
                        : "https://via.placeholder.com/150x225?text=Sem+Imagem";

                    card.innerHTML = `<img src="${posterUrl}" alt="${filme.title}" loading="lazy"/>`;

                    card.addEventListener("click", () => {
                        fetch(`${baseUrl}/movie/${filme.id}?api_key=${apiKey}&language=pt-BR`)
                            .then(response => response.json())
                            .then(details => openModal(details))
                            .catch(error => console.error("Erro ao buscar detalhes do filme:", error));
                    });

                    row.appendChild(card);
                });
            } else {
                row.innerHTML = '<p class="no-movies">Nenhum filme encontrado.</p>';
            }
        })
        .catch(error => {
            console.error("Erro ao buscar filmes:", error);
            row.innerHTML = '<p class="error-message">Erro ao carregar filmes.</p>';
        });
}

function carregarTodosOsFilmes() {
    const categorias = [
        "launches", "topRated", "popular", "acao",
        "comedia", "terror", "suspense", "romance", "anime"
    ];

    categorias.forEach(categoria => fetchMovies(categoria));
}

// === NOTIFICAÇÕES ===
function mostrarNotificacoes(details) {
    const container = document.getElementById("robotNotifications");
    if (!container) return;

    container.innerHTML = "";
    const nota = details.vote_average;
    let mensagens = [];

    if (nota >= 7) {
        mensagens = [
            "🤖 O público tá curtindo bastante esse filme!",
            "🔥 Destaque pra atuação e história.",
            "⭐ Avaliação alta — vale a pena assistir!"
        ];
    } else if (nota >= 5) {
        mensagens = [
            "🤖 Opiniões divididas sobre esse filme...",
            "😐 Alguns gostaram, outros nem tanto.",
            "🎬 Talvez dependa do seu gosto."
        ];
    } else {
        mensagens = [
            "🤖 Esse aqui não agradou muito...",
            "💬 Muitas críticas negativas.",
            "⚠️ Talvez não seja uma boa escolha."
        ];
    }

    mensagens.forEach((msg, index) => {
        setTimeout(() => {
            const div = document.createElement("div");
            div.classList.add("robot-msg");
            div.innerHTML = `<strong>Robô:</strong> ${msg}`;
            container.appendChild(div);

            setTimeout(() => {
                div.remove();
            }, 5000);
        }, index * 1500);
    });
}

// === TRAILER ===
async function buscarTrailer(movieId) {
    const url = `${baseUrl}/movie/${movieId}/videos?api_key=${apiKey}&language=pt-BR`;

    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();

        const trailer = dados.results.find(video =>
            video.site === "YouTube" && video.type === "Trailer"
        );

        return trailer ? trailer.key : null;
    } catch (erro) {
        console.error("Erro ao buscar trailer:", erro);
        return null;
    }
}

// === MODAL ===
async function openModal(details) {
    if (!modal || !modalTitle || !modalOverview || !modalRating || !modalRelease) {
        console.error("Elementos do modal não encontrados");
        return;
    }

    modalTitle.textContent = details.title;
    modalOverview.textContent = details.overview || "Sem sinopse disponível.";
    modalRating.innerHTML = `
        <span style="display: inline-flex; align-items: center;">
            <img src="/static/img/logo_stat.ico" style="height: 30px; vertical-align: middle; margin-right: 6px;">
            ${details.vote_average?.toFixed(1) || "N/A"}/10
        </span>
    `;
    modalRelease.textContent = details.release_date || "Desconhecido";

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const modalBgImage = document.getElementById("modalBgImage");
    const backdrop = details.backdrop_path || details.poster_path;

    if (modalBgImage) {
        modalBgImage.style.backgroundImage = backdrop
            ? `url(https://image.tmdb.org/t/p/w1280${backdrop})`
            : "none";
    }

    mostrarNotificacoes(details);

    const trailerKey = await buscarTrailer(details.id);
    const modalTrailer = document.getElementById("modalTrailer");

    if (modalTrailer) {
        if (trailerKey) {
            modalTrailer.innerHTML = `
                <a href="https://www.youtube.com/embed/${trailerKey}" title="Trailer de ${details.title}" target="_blank">
                    <button class="btn-trailer"></button>
                </a>
            `;
        } else {
            modalTrailer.innerHTML = `
                <p style="text-align:center; color: rgba(255, 11, 11, 0.94); font-weight: bold; font-size: 30px;">
                    Trailer não disponível.
                </p>
            `;
        }
    }

    abrirChat();
    await carregarResumoIA(details.id);
}

// === FECHAR MODAL ===
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (modal) {
            modal.classList.add("hidden");
            document.body.style.overflow = "auto";
        }
    });
}

if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
            document.body.style.overflow = "auto";
        }
    });
}

// === BOTÕES DAS SEÇÕES ===
function configurarEventosBotoes() {
    document.addEventListener("click", function (e) {
        const classList = e.target.classList;

        if (classList.contains("prev-launches") || e.target.closest(".prev-launches")) {
            voltarFilmes("launches");
        }
        if (classList.contains("next-launches") || e.target.closest(".next-launches")) {
            avancarFilmes("launches");
        }

        if (classList.contains("prev-popular") || e.target.closest(".prev-popular")) {
            voltarFilmes("popular");
        }
        if (classList.contains("next-popular") || e.target.closest(".next-popular")) {
            avancarFilmes("popular");
        }

        if (classList.contains("prev-topRated") || e.target.closest(".prev-topRated")) {
            voltarFilmes("topRated");
        }
        if (classList.contains("next-topRated") || e.target.closest(".next-topRated")) {
            avancarFilmes("topRated");
        }

        if (classList.contains("prev-acao") || e.target.closest(".prev-acao")) {
            voltarFilmes("acao");
        }
        if (classList.contains("next-acao") || e.target.closest(".next-acao")) {
            avancarFilmes("acao");
        }

        if (classList.contains("prev-comedia") || e.target.closest(".prev-comedia")) {
            voltarFilmes("comedia");
        }
        if (classList.contains("next-comedia") || e.target.closest(".next-comedia")) {
            avancarFilmes("comedia");
        }

        if (classList.contains("prev-terror") || e.target.closest(".prev-terror")) {
            voltarFilmes("terror");
        }
        if (classList.contains("next-terror") || e.target.closest(".next-terror")) {
            avancarFilmes("terror");
        }

        if (classList.contains("prev-suspense") || e.target.closest(".prev-suspense")) {
            voltarFilmes("suspense");
        }
        if (classList.contains("next-suspense") || e.target.closest(".next-suspense")) {
            avancarFilmes("suspense");
        }

        if (classList.contains("prev-romance") || e.target.closest(".prev-romance")) {
            voltarFilmes("romance");
        }
        if (classList.contains("next-romance") || e.target.closest(".next-romance")) {
            avancarFilmes("romance");
        }

        if (classList.contains("prev-anime") || e.target.closest(".prev-anime")) {
            voltarFilmes("anime");
        }
        if (classList.contains("next-anime") || e.target.closest(".next-anime")) {
            avancarFilmes("anime");
        }
    });
}

// === EFEITO NAVBAR ===
function configurarEfeitoScrollNavbar() {
    window.addEventListener("scroll", () => {
        const nav = document.querySelector("nav");
        if (!nav) return;

        if (window.scrollY > 50) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }
    });
}

// === SMOOTH SCROLL ===
function configurarSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
}

// === ALERTA ===
let nome = window.usuario;

function mostrarAlerta() {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            title: `Bem-vindo! ${nome || ""}`,
            icon: "success",
            customClass: {
                popup: "meu-popup",
                title: "meu-titulo",
                confirmButton: "meu-botao"
            }
        });
    }
}

// === INICIALIZAÇÃO PRINCIPAL ===
document.addEventListener("DOMContentLoaded", function () {
    console.log("Inicializando aplicação...");

    carregarCarrossel();
    carregarTodosOsFilmes();

    configurarSwipe();
    configurarEventosBotoes();
    configurarBusca();
    configurarEfeitoScrollNavbar();
    configurarSmoothScroll();
    configurarChat();
});