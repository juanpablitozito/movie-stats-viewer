// === VARIÁVEIS GLOBAIS ===
const baseUrl = "/api/tmdb";
const imgBase = "https://image.tmdb.org/t/p/w500";

let indice = 0;
let total = 0;
let carrosselInterval;
let filmeAtual = null;
let modalTrigger = null;

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
        const resposta = await fetchJSON(`${baseUrl}/movie/now_playing?language=pt-BR&page=1`);
        const dados = resposta;
        const filmes = dados.results.slice(0, 5);

        const slidesContainer = document.getElementById("slides");
        if (!slidesContainer) {
            console.error("Elemento 'slides' não encontrado");
            return;
        }

        if (!filmes.length) throw new Error("Nenhum destaque disponível");
        slidesContainer.replaceChildren(filmes.map(filme => {
            const slide = document.createElement("div");
            slide.className = "slide";
            slide.setAttribute("role", "group");
            slide.setAttribute("aria-label", filme.title);
            if (filme.backdrop_path) slide.style.backgroundImage = `url("https://image.tmdb.org/t/p/w1280${filme.backdrop_path}")`;
            slide.innerHTML = `
                <div class="hero-copy">
                    <p class="eyebrow">EM CARTAZ · EM DESTAQUE</p>
                    <h2>${escapeHTML(filme.title)}</h2>
                    <div class="hero-meta"><span>★ ${formatRating(filme)}</span><span>${escapeHTML(filme.release_date?.slice(0, 4) || "Ano não informado")}</span></div>
                    <p class="hero-overview">${escapeHTML(filme.overview || "Uma nova história para descobrir. Confira os detalhes deste filme.")}</p>
                    <button class="hero-detail" type="button">Conhecer o filme ↗</button>
                </div>`;
            slide.querySelector("button").addEventListener("click", () => showMovie(filme.id));
            return slide;
        }).reduce((container, slide) => { container.appendChild(slide); return container; }, document.createDocumentFragment()));

        total = filmes.length;
        indice = 0;
        atualizarSlide();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) configurarIntervaloMobile();
    } catch (error) {
        document.getElementById("slides").innerHTML = '<div class="hero-error"><p class="eyebrow">MOVIE STATS VIEWER</p><h2>Sua próxima história começa aqui.</h2><p>Não foi possível carregar os destaques. Tente novamente em instantes.</p><button class="hero-detail" type="button">Tentar novamente</button></div>';
        document.querySelector(".hero-error button").addEventListener("click", carregarCarrossel);
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
        slides.style.transition = "transform 0.6s ease-in-out";
        slides.querySelectorAll(".slide").forEach((slide, index) => {
            slide.inert = index !== indice;
            slide.setAttribute("aria-hidden", String(index !== indice));
        });
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

    let searchVersion = 0;
    let searchTimer;
    document.getElementById("closeSearch").addEventListener("click", () => {
        ++searchVersion;
        clearTimeout(searchTimer);
        hideOverlay();
    });
    function searchMovies(query) {
        const version = ++searchVersion;
        if (!query.trim()) {
            hideOverlay();
            return;
        }

        fetchJSON(`${baseUrl}/search/movie?language=pt-BR&query=${encodeURIComponent(query)}`)

            .then(data => {
                if (version !== searchVersion) return;
                resultsContainer.innerHTML = "";

                if (data.results && data.results.length > 0) {
                    data.results.forEach(movie => {
                        const card = createMovieCard(movie);
                        card.addEventListener("click", hideOverlay);

                        resultsContainer.appendChild(card);
                    });

                    showOverlay();
                } else {
                    resultsContainer.innerHTML = `<p style="color: white;">Nenhum resultado encontrado.</p>`;
                    showOverlay();
                }
            })
            .catch(err => {
                if (version !== searchVersion) return;
                resultsContainer.textContent = "Não foi possível buscar. Tente novamente.";
                showOverlay();
            });
    }

    searchInput.addEventListener("input", (e) => {
        ++searchVersion;
        clearTimeout(searchTimer);
        if (!e.target.value.trim()) { hideOverlay(); return; }
        searchTimer = setTimeout(() => searchMovies(e.target.value), 300);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(searchTimer);
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
            url = `${baseUrl}/movie/now_playing?language=pt-BR&page=1`;
            break;
        case "topRated":
            url = `${baseUrl}/movie/top_rated?language=pt-BR&page=1`;
            break;
        case "popular":
            url = `${baseUrl}/movie/popular?language=pt-BR&page=1`;
            break;
        case "acao":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=28&page=1`;
            break;
        case "comedia":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=35&page=1`;
            break;
        case "terror":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=27&page=1`;
            break;
        case "suspense":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=53&page=1`;
            break;
        case "romance":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=10749&page=1`;
            break;
        case "anime":
            url = `${baseUrl}/discover/movie?language=pt-BR&with_genres=16&with_original_language=ja&page=1`;
            break;
        default:
            console.error("Tipo de filme não reconhecido:", type);
            return;
    }

    fetchJSON(url)

        .then(data => {
            row.innerHTML = "";

            if (data.results && data.results.length > 0) {
                data.results.forEach(filme => {
                    const card = createMovieCard(filme);

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
    const url = `${baseUrl}/movie/${movieId}/videos?language=pt-BR`;

    try {
        const resposta = await fetchJSON(url);
        const dados = resposta;

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

    modalTrigger = document.activeElement;
    modalTitle.textContent = details.title;
    modalOverview.textContent = details.overview || "Sem sinopse disponível.";
    modalRating.textContent = `★ ${formatRating(details)}`;
    const release = details.release_date;
    modalRelease.textContent = release && /^\d{4}-\d{2}-\d{2}$/.test(release)
        ? `Lançamento: ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(release))}`
        : "Data de lançamento não informada";

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const modalBgImage = document.getElementById("modalBgImage");
    const backdrop = details.backdrop_path || details.poster_path;

    if (modalBgImage) {
        modalBgImage.style.backgroundImage = backdrop
            ? `url(https://image.tmdb.org/t/p/w1280${backdrop})`
            : "none";
    }

    filmeAtual = details.id;
    closeModalBtn.focus();
    document.getElementById("modalTrailer").textContent = "Buscando trailer…";

    const trailerKey = await buscarTrailer(details.id);
    if (filmeAtual !== details.id || modal.classList.contains("hidden")) return;
    const modalTrailer = document.getElementById("modalTrailer");

    if (modalTrailer) {
        if (trailerKey && /^[a-zA-Z0-9_-]+$/.test(trailerKey)) {
            modalTrailer.innerHTML = `
                <a href="https://www.youtube.com/embed/${trailerKey}" title="Trailer de ${escapeHTML(details.title)}" target="_blank" rel="noopener noreferrer">
                    <span class="btn-trailer">Assistir ao trailer</span>

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


}

// === FECHAR MODAL ===
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (modal) {
            modal.classList.add("hidden");
            document.body.style.overflow = "auto";
            filmeAtual = null;
            modalTrigger?.focus();
        }
    });
}

if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModalBtn.click();
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

function escapeHTML(value) {
    const element = document.createElement("span");
    element.textContent = value || "";
    return element.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(35000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Não foi possível concluir a consulta.");
    return data;
}

function abrirChat() {
    document.getElementById("chatOverlay").style.display = "flex";
    document.getElementById("chatInput").focus();
}

function fecharChat() {
    document.getElementById("chatOverlay").style.display = "none";
    document.getElementById("openChat").focus();
}

let sending = false;
async function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message || sending) return;
    const messages = document.getElementById("chatMessages");
    const append = (text) => {
        const p = document.createElement("p");
        p.textContent = text;
        messages.appendChild(p);
        messages.scrollTop = messages.scrollHeight;
        return p;
    };
    append("Você: " + message);
    input.value = "";
    const pending = append("Viewy está respondendo…");
    const button = document.querySelector("#chatInputArea button");
    sending = true;
    button.disabled = true;
    try {
        const data = await fetchJSON("/chat", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: message })
        });
        pending.textContent = "Viewy: " + data.resposta;
    } catch (error) {
        pending.textContent = error.message;
        input.value = message;
    } finally {
        sending = false;
        button.disabled = false;
        messages.scrollTop = messages.scrollHeight;
    }
}

function configurarChat() {
    document.getElementById("openChat").addEventListener("click", abrirChat);
    document.getElementById("chatInput").addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) sendMessage();
    });
    document.addEventListener("keydown", event => {
        const chatVisible = document.getElementById("chatOverlay").style.display !== "none";
        const dialog = chatVisible ? document.getElementById("chatBox") :
            (!modal.classList.contains("hidden") ? modal : null);
        if (event.key === "Tab" && dialog) {
            const controls = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key !== "Escape") return;
        if (document.getElementById("chatOverlay").style.display !== "none") fecharChat();
        else if (!modal.classList.contains("hidden")) closeModalBtn.click();
        document.getElementById("searchResultsOverlay").classList.add("hidden");
    });
    document.querySelectorAll(".movie-section > button, .carrossel > button").forEach(button => {
        button.setAttribute("aria-label", button.textContent.trim() === "‹" ? "Ver filmes anteriores" : "Ver próximos filmes");
    });
    const observer = new MutationObserver(() => {
        document.querySelectorAll(".card-movie:not([tabindex])").forEach(card => {
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute("aria-label", card.querySelector("img")?.alt || "Ver detalhes do filme");
            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card.click(); }
            });
        });
    });
    observer.observe(document.querySelector("main"), { childList: true, subtree: true });
    observer.observe(document.getElementById("searchResults"), { childList: true, subtree: true });
}


function formatRating(movie) {
    return movie.vote_count === 0 || !Number.isFinite(movie.vote_average)
        ? "Sem nota" : `${movie.vote_average.toFixed(1).replace(".", ",")}/10`;
}

function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "card-movie";
    const image = document.createElement("img");
    image.src = movie.poster_path ? imgBase + movie.poster_path : "/static/img/poster-placeholder.svg";
    image.alt = movie.title || "Filme sem título";
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.src = "/static/img/poster-placeholder.svg";
    }, { once: true });
    const title = document.createElement("h3");
    title.textContent = movie.title;
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const year = document.createElement("span");
    year.textContent = movie.release_date?.slice(0, 4) || "Sem data";
    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = "★ " + formatRating(movie);
    meta.append(year, rating);
    card.append(image, title, meta);
    card.addEventListener("click", () => showMovie(movie.id));
    return card;
}

let movieRequest = 0;
async function showMovie(id) {
    const request = ++movieRequest;
    try {
        const details = await fetchJSON(`${baseUrl}/movie/${id}`);
        if (request !== movieRequest) return;
        openModal(details);
    } catch (error) {
        if (request !== movieRequest) return;
        const container = document.getElementById("robotNotifications");
        container.textContent = "Não foi possível carregar os detalhes. Tente novamente.";
        clearTimeout(container.errorTimer);
        container.errorTimer = setTimeout(() => { container.textContent = ""; }, 6000);
    }
}

// O carrossel pausa enquanto a pessoa interage com seus controles.
const carousel = document.querySelector(".carrossel");
const pauseCarousel = () => clearInterval(carrosselInterval);
const resumeCarousel = () => {
    if (total > 1 && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !carousel.contains(document.activeElement) && !carousel.matches(":hover")) configurarIntervaloMobile();
};
carousel.addEventListener("mouseenter", pauseCarousel);
carousel.addEventListener("mouseleave", resumeCarousel);
carousel.addEventListener("focusin", pauseCarousel);
carousel.addEventListener("focusout", () => setTimeout(resumeCarousel, 0));
document.addEventListener("visibilitychange", () => document.hidden ? pauseCarousel() : resumeCarousel());
document.getElementById("closeSearch").addEventListener("click", () => {
    document.getElementById("searchResultsOverlay").classList.add("hidden");
    document.getElementById("query").focus();
});
