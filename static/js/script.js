// === VARIÁVEIS GLOBAIS ===
const baseUrl = "https://api.themoviedb.org/3";
const apiKey = "667f29be2c2b3a1826a0467ad42f291b"; // Chave da API TMDB
const imgBase = "https://image.tmdb.org/t/p/w500";

// Variáveis de controle do carrossel principal
let indice = 0;      // Índice do slide atual
let total = 0;       // Total de slides no carrossel
let carrosselInterval; // Intervalo para transição automática

// === FUNÇÃO DE DETECÇÃO MOBILE ===
/**
 * Detecta se o usuário está em um dispositivo móvel
 * @returns {boolean} True se for dispositivo móvel
 */
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || 
           (navigator.userAgent.indexOf('IEMobile') !== -1) ||
           (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

// === CONFIGURAÇÃO SWIPE PARA MOBILE ===
/**
 * Configura gestos de swipe para navegação no carrossel em dispositivos móveis
 */
function configurarSwipe() {
    const carrossel = document.querySelector('.carrossel');
    
    // Verifica se o carrossel existe e se é dispositivo móvel
    if (!carrossel || !isMobileDevice()) return;

    let touchStartX = 0; // Posição X inicial do toque
    let touchEndX = 0;   // Posição X final do toque

    // Evento quando o toque inicia
    carrossel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    // Evento quando o toque termina
    carrossel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    /**
     * Processa o gesto de swipe e navega no carrossel
     */
    function handleSwipe() {
        // Swipe para esquerda - avança slide
        if (touchEndX < touchStartX - 50) {
            avancarSlide();
        }
        // Swipe para direita - volta slide
        if (touchEndX > touchStartX + 50) {
            voltarSlide();
        }
    }
}

// === CARROSSEL PRINCIPAL ===

/**
 * Carrega os filmes em cartaz e inicializa o carrossel principal
 */
async function carregarCarrossel() {
    try {
        // Busca filmes em cartaz na API
        const resposta = await fetch(`${baseUrl}/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1`);
        const dados = await resposta.json();
        const filmes = dados.results.slice(0, 5); // Pega os 5 primeiros filmes

        const slidesContainer = document.getElementById('slides');
        
        // Verifica se o container existe
        if (!slidesContainer) {
            console.error("Elemento 'slides' não encontrado");
            return;
        }

        // Gera o HTML para cada slide do carrossel
        slidesContainer.innerHTML = filmes.map(filme => {
            const backdropUrl = filme.backdrop_path 
                ? `https://image.tmdb.org/t/p/w1280${filme.backdrop_path}`
                : 'https://via.placeholder.com/1280x500/333/666?text=Imagem+Indisponível';
            
            return `
            <div class="slide" style="min-width:100%; height: 500px; 
                 background-image: url('${backdropUrl}');
                 background-size: cover; background-position: center;">
            </div>
            `;
        }).join('');

        // Inicializa variáveis de controle
        total = filmes.length;
        indice = 0;
        atualizarSlide();

        // Configura transição automática
        configurarIntervaloMobile();

    } catch (error) {
        console.error("Erro ao carregar carrossel principal:", error);
    }
}

/**
 * Configura o intervalo automático do carrossel com suporte mobile
 */
function configurarIntervaloMobile() {
    // Limpa intervalo existente
    if (carrosselInterval) clearInterval(carrosselInterval);
    
    // Define intervalo baseado no dispositivo
    const intervalo = isMobileDevice() ? 5000 : 8000;
    carrosselInterval = setInterval(avancarSlide, intervalo);
}

/**
 * Atualiza a posição visual do carrossel
 */
function atualizarSlide() {
    const slides = document.getElementById("slides");
    if (slides) {
        // Move o carrossel para mostrar o slide atual
        slides.style.transform = `translateX(-${indice * 100}%)`;
        slides.style.transition = "transform 0.8s ease-in-out";
    }
}

/**
 * Avança para o próximo slide do carrossel
 */
function avancarSlide() {
    if (total === 0) return; // Evita erro se não houver slides
    indice = (indice + 1) % total; // Volta ao primeiro slide após o último
    atualizarSlide();
}

/**
 * Volta para o slide anterior do carrossel
 */
function voltarSlide() {
    if (total === 0) return; // Evita erro se não houver slides
    indice = (indice - 1 + total) % total; // Vai para o último slide se estiver no primeiro
    atualizarSlide();
}

// === CONTROLE DE FILMES NAS SEÇÕES ===

/**
 * Avança a rolagem horizontal em uma seção de filmes
 * @param {string} type - ID da seção de filmes
 */
function avancarFilmes(type) {
    const movieRow = document.getElementById(type);
    if (!movieRow) {
        console.warn(`Elemento com ID '${type}' não encontrado`);
        return;
    }
    
    // Define quantidade de rolagem baseada no dispositivo
    const scrollAmount = isMobileDevice() ? 200 : 400;
    movieRow.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
}

/**
 * Volta a rolagem horizontal em uma seção de filmes
 * @param {string} type - ID da seção de filmes
 */
function voltarFilmes(type) {
    const movieRow = document.getElementById(type);
    if (!movieRow) {
        console.warn(`Elemento com ID '${type}' não encontrado`);
        return;
    }
    
    // Define quantidade de rolagem baseada no dispositivo
    const scrollAmount = isMobileDevice() ? 200 : 400;
    movieRow.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
    });
}

// === SISTEMA DE BUSCA ===

/**
 * Configura toda a funcionalidade de busca de filmes
 */
function configurarBusca() {
    const searchInput = document.getElementById('query');
    const overlay = document.getElementById('searchResultsOverlay');
    const resultsContainer = document.getElementById('searchResults');

    // Verifica se todos os elementos necessários existem
    if (!searchInput || !overlay || !resultsContainer) {
        console.warn("Elementos de busca não encontrados");
        return;
    }

    /**
     * Exibe o overlay de resultados de busca
     */
    function showOverlay() {
        overlay.classList.remove('hidden');
    }

    /**
     * Oculta o overlay de resultados de busca
     */
    function hideOverlay() {
        overlay.classList.add('hidden');
    }

    /**
     * Busca filmes na API baseado no termo de pesquisa
     * @param {string} query - Termo de busca
     */
    function searchMovies(query) {
        // Esconde resultados se a busca estiver vazia
        if (!query.trim()) {
            hideOverlay();
            return;
        }

        // Faz a requisição para a API de busca
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                resultsContainer.innerHTML = ''; // Limpa resultados anteriores
                
                if (data.results && data.results.length > 0) {
                    // Cria um card para cada filme encontrado
                    data.results.forEach(movie => {
                        const poster = movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : 'https://via.placeholder.com/150x225?text=Sem+Imagem';

                        const card = document.createElement('div');
                        card.classList.add('card-movie');
                        card.innerHTML = `
                            <img src="${poster}" alt="${movie.title}" />
                            <p>${movie.title}</p>
                        `;
                        
                        // Abre modal com detalhes ao clicar no card
                        card.addEventListener('click', () => {
                            hideOverlay();
                            fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&language=pt-BR`)
                                .then(response => response.json())
                                .then(details => {
                                    openModal(details);
                                })
                                .catch(error => {
                                    console.error('Erro ao buscar detalhes do filme da busca:', error);
                                });
                        });

                        resultsContainer.appendChild(card);
                    });
                    showOverlay();
                } else {
                    // Mensagem quando não há resultados
                    resultsContainer.innerHTML = '<p style="color: white;">Nenhum resultado encontrado.</p>';
                    showOverlay();
                }
            })
            .catch(err => {
                console.error('Erro na busca:', err);
            });
    }

    // Event listeners para a barra de busca
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        searchMovies(query);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchMovies(searchInput.value);
        }
    });

    // Fecha overlay ao clicar fora dos resultados
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideOverlay();
        }
    });
}

// === CARREGAMENTO DE FILMES POR CATEGORIA ===

/**
 * Carrega filmes de uma categoria específica da API
 * @param {string} type - Tipo/categoria de filmes a carregar
 */
function fetchMovies(type) {
    const row = document.getElementById(type);
    if (!row) {
        console.warn(`Container com ID '${type}' não encontrado`);
        return;
    }

    // Exibe loading enquanto carrega
    row.innerHTML = '<div class="loading">Carregando...</div>';

    let url = '';

    // Define a URL da API baseada no tipo de categoria
    switch(type) {
        case 'launches':
            url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case 'topRated':
            url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case 'popular':
            url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`;
            break;
        case 'acao':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=28&page=1`;
            break;
        case 'comedia':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=35&page=1`;
            break;
        case 'terror':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=27&page=1`;
            break;
        case 'suspense':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=53&page=1`;
            break;
        case 'romance':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=10749&page=1`;
            break;
        case 'anime':
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=16&with_original_language=ja&page=1`;
            break;
        default:
            console.error('Tipo de filme não reconhecido:', type);
            return;
    }

    // Busca os filmes da categoria
    fetch(url)
        .then(response => response.json())
        .then(data => {
            row.innerHTML = ''; // Limpa o loading

            if (data.results && data.results.length > 0) {
                // Cria cards para cada filme
                data.results.forEach(filme => {
                    const card = document.createElement('div');
                    card.classList.add('card-movie');

                    const posterUrl = filme.poster_path 
                        ? imgBase + filme.poster_path 
                        : 'https://via.placeholder.com/150x225?text=Sem+Imagem';
                    
                    card.innerHTML = `
                        <img src="${posterUrl}" alt="${filme.title}" loading="lazy"/>
                    `;

                    // Abre modal com detalhes ao clicar
                    card.addEventListener('click', () => {
                        fetch(`https://api.themoviedb.org/3/movie/${filme.id}?api_key=${apiKey}&language=pt-BR`)
                            .then(response => response.json())
                            .then(details => {
                                openModal(details);
                            })
                            .catch(error => {
                                console.error('Erro ao buscar detalhes do filme:', error);
                            });
                    });

                    row.appendChild(card);
                });
            } else {
                row.innerHTML = '<p class="no-movies">Nenhum filme encontrado.</p>';
            }
        })
        .catch(error => {
            console.error('Erro ao buscar filmes:', error);
            row.innerHTML = '<p class="error-message">Erro ao carregar filmes.</p>';
        });
}

// === SISTEMA DE MODAL ===

// Elementos do modal
const modal = document.getElementById('movieModal');
const modalTitle = document.getElementById('modalTitle');
const modalOverview = document.getElementById('modalOverview');
const modalRating = document.getElementById('modalRating');
const modalRelease = document.getElementById('modalRelease');
const closeModalBtn = document.getElementById('closeModal');

/**
 * Abre o modal com os detalhes do filme
 * @param {Object} details - Detalhes do filme da API
 */
async function openModal(details) {
    // Verifica se todos os elementos do modal existem
    if (!modal || !modalTitle || !modalOverview || !modalRating || !modalRelease) {
        console.error("Elementos do modal não encontrados");
        return;
    }

    // Preenche os dados do filme no modal
    modalTitle.textContent = details.title;
    modalOverview.textContent = details.overview || 'Sem sinopse disponível.';
    modalRating.innerHTML = `
        <span style="display: inline-flex; align-items: center;">
            <img src="{{ url_for('static', filename='img/estrela.png') }}" style="height: 30px; vertical-align: middle; margin-right: 6px;">
            ${details.vote_average?.toFixed(1) || 'N/A'}/10
        </span>
    `;
    modalRelease.textContent = `${details.release_date || 'Desconhecido'}`;
    
    // Exibe o modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Impede scroll da página

    // Configura imagem de fundo do modal
    const modalBgImage = document.getElementById('modalBgImage');
    const backdrop = details.backdrop_path || details.poster_path;

    if (backdrop) {
        modalBgImage.style.backgroundImage = `url(https://image.tmdb.org/t/p/w1280${backdrop})`;
    } else {
        modalBgImage.style.backgroundImage = 'none';
    }

    // Busca e exibe o trailer
    const trailerKey = await buscarTrailer(details.id);
    const modalTrailer = document.getElementById('modalTrailer');

    if (modalTrailer) {
        if (trailerKey) {
            modalTrailer.innerHTML = `
                <a href="https://www.youtube.com/embed/${trailerKey}"  
                 title="Trailer de ${details.title}"> 
                 <button class="btn-trailer">  </button>
                </a> 
            `;
        } else {
            modalTrailer.innerHTML = `<p style="text-align:center; color: rgba(255, 11, 11, 0.94); font-weight: bold; font-size: 30px;"> Trailer não disponível. </p>`;
        }
    }
}

/**
 * Busca o trailer de um filme na API
 * @param {number} movieId - ID do filme
 * @returns {string|null} Chave do vídeo do YouTube ou null se não encontrado
 */
async function buscarTrailer(movieId) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=pt-BR`;

    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();

        // Procura por trailers do YouTube
        const trailer = dados.results.find(video =>
            video.site === "YouTube" && video.type === "Trailer"
        );

        return trailer ? trailer.key : null;

    } catch (erro) {
        console.error("Erro ao buscar trailer:", erro);
        return null;
    }
}

// Configura fechamento do modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto'; // Restaura scroll
        }
    });
}

if (modal) {
    // Fecha modal ao clicar fora do conteúdo
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
}

// === CARREGAMENTO INICIAL ===

/**
 * Carrega todas as categorias de filmes ao inicializar
 */
function carregarTodosOsFilmes() {
    const categorias = [
        'launches', 'topRated', 'popular', 'acao', 
        'comedia', 'terror', 'suspense', 'romance', 'anime'
    ];
    
    categorias.forEach(categoria => {
        fetchMovies(categoria);
    });
}

// === CONFIGURAÇÃO DE EVENTOS ===

/**
 * Configura os event listeners para os botões de navegação das seções
 */
function configurarEventosBotoes() {
    document.addEventListener('click', function(e) {
        const classList = e.target.classList;
        
        // Navegação para a seção de lançamentos
        if (classList.contains('prev-launches') || e.target.closest('.prev-launches')) {
            voltarFilmes('launches');
        }
        if (classList.contains('next-launches') || e.target.closest('.next-launches')) {
            avancarFilmes('launches');
        }
        
        // Navegação para a seção de populares
        if (classList.contains('prev-popular') || e.target.closest('.prev-popular')) {
            voltarFilmes('popular');
        }
        if (classList.contains('next-popular') || e.target.closest('.next-popular')) {
            avancarFilmes('popular');
        }
        
        // Navegação para a seção de melhores avaliados
        if (classList.contains('prev-topRated') || e.target.closest('.prev-topRated')) {
            voltarFilmes('topRated');
        }
        if (classList.contains('next-topRated') || e.target.closest('.next-topRated')) {
            avancarFilmes('topRated');
        }
        
        // Adicione outros botões conforme necessário para outras seções
    });
}

// === EFEITO DE SCROLL NA NAVBAR ===

/**
 * Adiciona efeito de fundo na navbar ao fazer scroll
 */
function configurarEfeitoScrollNavbar() {
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (!nav) return;
        
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// === SMOOTH SCROLL PARA ÂNCORAS ===

/**
 * Configura smooth scroll para links de âncora (#)
 */
function configurarSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// === ALERTA DE BOAS-VINDAS ===

/**
 * Exibe um alerta de boas-vindas usando SweetAlert
 */
function mostrarAlerta() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Bem-vindo! ${nome}`,
            icon: 'success',
            customClass: {
                popup: 'meu-popup',
                title: 'meu-titulo',
                confirmButton: 'meu-botao'
            }
        });
    }
}

let nome = window.usuario;
function exibirAlerta() {
    alert('Bem-vindo, ' + nome + '!');

}
// === INICIALIZAÇÃO PRINCIPAL ===

/**
 * Função principal que inicializa toda a aplicação
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicação...');
    
    // Carrega o carrossel principal e todas as seções de filmes
    carregarCarrossel();
    carregarTodosOsFilmes();
    
    // Configura funcionalidades adicionais
    configurarSwipe();                 // Swipe para mobile
    configurarEventosBotoes();         // Botões de navegação
    configurarBusca();                 // Sistema de busca
    configurarEfeitoScrollNavbar();    // Efeito de scroll na navbar
    configurarSmoothScroll();          // Smooth scroll para âncoras
    
    // Exibe alerta de boas-vindas após um delay
    // setTimeout(mostrarAlerta, 1000);
});

// Configura botões de navegação do carrossel principal (se existirem)
document.addEventListener('DOMContentLoaded', function() {
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    
    if (prevBtn) prevBtn.addEventListener('click', voltarSlide);
    if (nextBtn) nextBtn.addEventListener('click', avancarSlide);
});