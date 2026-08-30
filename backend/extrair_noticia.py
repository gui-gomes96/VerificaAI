
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote, urlparse
import re
import html as html_lib
import time


# ============================================================
# CONFIGURAÇÕES
# ============================================================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
}

TIMEOUT = 20


# ============================================================
# LIMPEZA
# ============================================================

def limpar_texto(texto):
    if not texto:
        return ""

    texto = html_lib.unescape(texto)
    texto = re.sub(r"\s+", " ", texto)

    return texto.strip()


# ============================================================
# IDENTIFICAR GOOGLE NEWS
# ============================================================

def eh_google_news(url):
    if not url:
        return False

    try:
        dominio = urlparse(url).netloc.lower()

        return (
            "news.google.com" in dominio
            or "google.com" in dominio and "/news" in url
        )

    except Exception:
        return False


# ============================================================
# DECODIFICAR GOOGLE NEWS
# ============================================================

def decodificar_google_news(url):
    print("\n🔓 Tentando decodificar Google News...")

    try:
        from googlenewsdecoder import new_decoderv1
    except ImportError:
        print("❌ Pacote googlenewsdecoder não instalado.")
        print("Execute:")
        print("pip install -U googlenewsdecoder")
        return None

    try:
        resultado = new_decoderv1(
            url,
            interval=2
        )

        if not resultado:
            print("❌ Decoder não retornou resultado.")
            return None

        if resultado.get("status"):
            url_original = resultado.get("decoded_url")

            if url_original:
                print("\n✅ URL original encontrada:")
                print(url_original)

                return url_original

        print("\n⚠️ Decoder não conseguiu encontrar a URL original.")

        mensagem = resultado.get("message")

        if mensagem:
            print(f"Motivo: {mensagem}")

    except Exception as erro:
        print(f"\n⚠️ Erro no decoder: {erro}")

    return None


# ============================================================
# ACESSAR PÁGINA
# ============================================================

def baixar_pagina(url):
    print("\n🌐 Acessando página:")
    print(url)

    try:
        resposta = requests.get(
            url,
            headers=HEADERS,
            timeout=TIMEOUT,
            allow_redirects=True
        )

        print(f"\nStatus: {resposta.status_code}")
        print(f"URL final: {resposta.url}")

        if resposta.status_code != 200:
            print("❌ Página retornou status diferente de 200.")
            return None

        if not resposta.text:
            print("❌ Página vazia.")
            return None

        return resposta

    except requests.RequestException as erro:
        print(f"\n❌ Erro ao acessar página: {erro}")
        return None


# ============================================================
# TRAFILATURA
# ============================================================

def extrair_trafilatura(html):
    print("\n📄 Tentativa 1: Trafilatura...")

    try:
        import trafilatura

        texto = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
            favor_recall=True
        )

        if texto and len(texto.strip()) >= 200:
            print("✅ Trafilatura conseguiu extrair o conteúdo.")
            return texto.strip()

        print("⚠️ Trafilatura não encontrou conteúdo suficiente.")

    except Exception as erro:
        print(f"⚠️ Trafilatura falhou: {erro}")

    return None


# ============================================================
# BEAUTIFULSOUP
# ============================================================

def extrair_beautifulsoup(html):
    print("\n📄 Tentativa 2: BeautifulSoup...")

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    for elemento in soup([
        "script",
        "style",
        "nav",
        "header",
        "footer",
        "aside",
        "form",
        "noscript",
        "iframe",
        "svg"
    ]):
        elemento.decompose()

    paragrafos = []

    for p in soup.find_all("p"):

        texto = limpar_texto(
            p.get_text(
                " ",
                strip=True
            )
        )

        if len(texto) < 40:
            continue

        if texto in paragrafos:
            continue

        paragrafos.append(texto)

    conteudo = "\n\n".join(paragrafos)

    if len(conteudo) >= 200:
        print("✅ BeautifulSoup conseguiu extrair o conteúdo.")
        return conteudo

    print("⚠️ BeautifulSoup não encontrou conteúdo suficiente.")

    return None


# ============================================================
# EXTRAIR TÍTULO
# ============================================================

def extrair_titulo(soup):

    # 1 - H1
    h1 = soup.find("h1")

    if h1:
        titulo = limpar_texto(
            h1.get_text(
                " ",
                strip=True
            )
        )

        if titulo:
            return titulo

    # 2 - Open Graph
    meta = soup.find(
        "meta",
        property="og:title"
    )

    if meta:
        titulo = limpar_texto(
            meta.get("content", "")
        )

        if titulo:
            return titulo

    # 3 - Twitter
    meta = soup.find(
        "meta",
        attrs={
            "name": "twitter:title"
        }
    )

    if meta:
        titulo = limpar_texto(
            meta.get("content", "")
        )

        if titulo:
            return titulo

    # 4 - Title
    if soup.title:
        return limpar_texto(
            soup.title.get_text(
                " ",
                strip=True
            )
        )

    return "Título não identificado"


# ============================================================
# EXTRAIR NOTÍCIA DA URL
# ============================================================

def extrair_pagina(url):

    resposta = baixar_pagina(url)

    if not resposta:
        return None

    html = resposta.text

    # --------------------------------------------------------
    # Tentativa 1
    # --------------------------------------------------------

    conteudo = extrair_trafilatura(html)

    metodo = "Trafilatura"

    # --------------------------------------------------------
    # Tentativa 2
    # --------------------------------------------------------

    if not conteudo:

        conteudo = extrair_beautifulsoup(html)

        metodo = "BeautifulSoup"

    if not conteudo:

        print("\n❌ Não foi possível extrair o conteúdo.")
        return None

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    titulo = extrair_titulo(soup)

    return {
        "titulo": titulo,
        "url": resposta.url,
        "conteudo": conteudo,
        "metodo": metodo
    }


# ============================================================
# BUSCA DE SEGURANÇA
# ============================================================

def buscar_url_por_titulo(titulo, fonte):

    print("\n🔎 Último recurso: procurando página original...")

    consultas = []

    titulo_limpo = re.sub(
        r"\s*[-|–—]\s*[^-–—]+$",
        "",
        titulo
    ).strip()

    # --------------------------------------------------------
    # Domínios conhecidos
    # --------------------------------------------------------

    dominios = {
        "CNN Brasil": "cnnbrasil.com.br",
        "G1": "g1.globo.com",
        "Estadão": "estadao.com.br",
        "Folha": "folha.uol.com.br",
        "UOL": "uol.com.br",
        "O Globo": "oglobo.globo.com",
        "Veja": "veja.abril.com.br",
        "Terra": "terra.com.br",
        "Brasil de Fato": "brasildefato.com.br",
        "Senado Federal": "senado.leg.br",
        "Ministério da Educação": "gov.br",
        "www.gov.br": "gov.br",
        "Curta Mais - Goiânia": "curtamais.com.br"
    }

    dominio = None

    for nome, valor in dominios.items():

        if nome.lower() in fonte.lower():
            dominio = valor
            break

    if dominio:

        consultas.append(
            f'site:{dominio} "{titulo_limpo}"'
        )

        consultas.append(
            f'site:{dominio} {titulo_limpo}'
        )

    consultas.append(
        f'"{titulo_limpo}" "{fonte}"'
    )

    # --------------------------------------------------------
    # Pesquisar
    # --------------------------------------------------------

    for consulta in consultas:

        print(f"\n🔎 Consulta: {consulta}")

        try:

            url = (
                "https://www.google.com/search?q="
                + quote(consulta)
                + "&hl=pt-BR"
            )

            resposta = requests.get(
                url,
                headers=HEADERS,
                timeout=TIMEOUT
            )

            if resposta.status_code != 200:
                continue

            soup = BeautifulSoup(
                resposta.text,
                "html.parser"
            )

            candidatos = []

            for a in soup.find_all(
                "a",
                href=True
            ):

                href = a.get("href", "")

                if not href.startswith("http"):
                    continue

                dominio_resultado = urlparse(
                    href
                ).netloc.lower()

                if any(
                    bloqueado in dominio_resultado
                    for bloqueado in [
                        "google.com",
                        "gstatic.com",
                        "googleusercontent.com"
                    ]
                ):
                    continue

                # Se conhecemos o domínio da fonte,
                # rejeitamos outros sites.
                if dominio and dominio not in dominio_resultado:
                    continue

                texto = limpar_texto(
                    a.get_text(
                        " ",
                        strip=True
                    )
                )

                if not texto:
                    continue

                candidatos.append(
                    (
                        texto,
                        href
                    )
                )

            # ------------------------------------------------
            # Procurar candidato realmente compatível
            # ------------------------------------------------

            palavras = [
                palavra.lower()
                for palavra in re.findall(
                    r"[A-Za-zÀ-ÿ0-9]{4,}",
                    titulo_limpo
                )
            ]

            for texto, href in candidatos:

                texto_lower = texto.lower()

                coincidencias = sum(
                    1
                    for palavra in palavras
                    if palavra in texto_lower
                )

                if coincidencias >= 3:

                    print("\n✅ Página candidata encontrada:")
                    print(href)

                    return href

            time.sleep(1)

        except requests.RequestException as erro:

            print(
                f"⚠️ Erro durante pesquisa: {erro}"
            )

    return None


# ============================================================
# FUNÇÃO PRINCIPAL
# ============================================================

def extrair_noticia(
    titulo=None,
    fonte=None,
    url=None
):

    print("\n================================")
    print("       EXTRAINDO NOTÍCIA")
    print("================================")

    # ========================================================
    # CASO 1 — USUÁRIO JÁ POSSUI A URL
    # ========================================================

    if url:

        url = url.strip()

        print("\n🔗 URL recebida:")
        print(url)

        # ----------------------------------------------------
        # Google News
        # ----------------------------------------------------

        if eh_google_news(url):

            print(
                "\n⚠️ Link do Google News detectado."
            )

            url_original = decodificar_google_news(
                url
            )

            if url_original:

                noticia = extrair_pagina(
                    url_original
                )

                if noticia:
                    return noticia

            print(
                "\n⚠️ Não foi possível usar "
                "diretamente o link do Google News."
            )

        # ----------------------------------------------------
        # URL normal
        # ----------------------------------------------------

        else:

            noticia = extrair_pagina(
                url
            )

            if noticia:
                return noticia

    # ========================================================
    # CASO 2 — PESQUISAR PELO TÍTULO
    # ========================================================

    if not titulo or not fonte:

        print(
            "\n❌ Não foi possível extrair."
        )

        print(
            "Informe uma URL ou "
            "Título + Fonte."
        )

        return None

    pagina = buscar_url_por_titulo(
        titulo,
        fonte
    )

    if not pagina:

        print(
            "\n❌ Página original não encontrada."
        )

        return None

    # ========================================================
    # EXTRAIR
    # ========================================================

    noticia = extrair_pagina(
        pagina
    )

    return noticia


# ============================================================
# PROGRAMA
# ============================================================

if __name__ == "__main__":

    print("================================")
    print("      VERIFICA.AI - EXTRAÇÃO")
    print("================================")

    url = input(
        "\nCole o link da notícia:\n> "
    ).strip()

    if not url:

        print(
            "\n❌ Nenhum link informado."
        )

        raise SystemExit

    noticia = extrair_noticia(
        url=url
    )

    if noticia:

        print("\n================================")
        print("       NOTÍCIA EXTRAÍDA")
        print("================================")

        print(
            f"\n📰 {noticia['titulo']}"
        )

        print(
            f"\n🔗 {noticia['url']}"
        )

        print(
            f"\n🛠️ Método: {noticia['metodo']}"
        )

        print("\n📄 CONTEÚDO:\n")

        print(
            noticia["conteudo"]
        )

        print("\n================================")

    else:

        print("\n================================")
        print("       EXTRAÇÃO FALHOU")
        print("================================")