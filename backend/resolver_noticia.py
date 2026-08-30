import re
import requests

try:
    from googlenewsdecoder import gnewsdecoder
except ImportError:
    gnewsdecoder = None


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}


def eh_google_news(url):
    if not url:
        return False

    url = url.lower()

    return (
        "news.google.com" in url
        or "google.com/rss/articles" in url
    )


def validar_url(url):
    if not url:
        return False

    return bool(
        re.match(
            r"^https?://",
            url.strip(),
            re.IGNORECASE
        )
    )


def limpar_url(url):
    if not url:
        return ""

    url = url.strip()

    # Remove espaços ou quebras de linha acidentais
    url = re.sub(r"\s+", "", url)

    return url


def testar_url(url):
    """
    Verifica se a URL realmente aponta para uma página acessível.
    Não considera Google News como página original.
    """

    if not validar_url(url):
        return False

    if eh_google_news(url):
        return False

    try:
        resposta = requests.get(
            url,
            headers=HEADERS,
            timeout=15,
            allow_redirects=True
        )

        if resposta.status_code >= 400:
            return False

        final = resposta.url

        if eh_google_news(final):
            return False

        return True

    except requests.RequestException:
        return False


def decodificar_google_news(url):
    """
    Tenta transformar uma URL do Google News
    diretamente na URL original.
    """

    if not eh_google_news(url):
        return url

    if gnewsdecoder is None:
        print(
            "⚠️ googlenewsdecoder não está instalado."
        )
        return None

    print("\n🔓 Decodificando Google News...")

    try:
        resultado = gnewsdecoder(
            url,
            interval=1
        )

        if not resultado:
            print("❌ Decoder não retornou resultado.")
            return None

        if resultado.get("status"):

            url_original = resultado.get(
                "decoded_url",
                ""
            )

            if validar_url(url_original):

                print(
                    "\n✅ URL original encontrada:"
                )

                print(url_original)

                return url_original

        mensagem = resultado.get(
            "message",
            "Motivo desconhecido"
        )

        print(
            f"⚠️ Decoder não conseguiu resolver: "
            f"{mensagem}"
        )

    except Exception as erro:

        print(
            f"⚠️ Erro no decoder: {erro}"
        )

    return None


def encontrar_noticia_por_busca(titulo, fonte):
    """
    Fallback.

    Só é usado quando o link do Google News
    não pôde ser decodificado.

    Diferente da versão anterior, não pega
    simplesmente o primeiro resultado.
    """

    from urllib.parse import quote

    consultas = [
        f'site:{fonte} "{titulo}"',
        f'"{titulo}" "{fonte}"',
        f'"{titulo}"'
    ]

    for consulta_texto in consultas:

        print(
            f"\n🔎 Consulta alternativa: "
            f"{consulta_texto}"
        )

        url_busca = (
            "https://www.google.com/search?"
            f"q={quote(consulta_texto)}"
            "&hl=pt-BR"
            "&gl=BR"
        )

        try:

            resposta = requests.get(
                url_busca,
                headers=HEADERS,
                timeout=15
            )

            if resposta.status_code != 200:
                continue

            # Procura URLs diretamente no HTML.
            urls = re.findall(
                r'https?://[^\s"<>]+',
                resposta.text
            )

            candidatos = []

            for url in urls:

                url = url.replace(
                    "&amp;",
                    "&"
                )

                if not validar_url(url):
                    continue

                if eh_google_news(url):
                    continue

                if "google.com" in url.lower():
                    continue

                if "gstatic.com" in url.lower():
                    continue

                if url not in candidatos:
                    candidatos.append(url)

            # Testa os candidatos antes de devolver.
            for candidato in candidatos:

                if testar_url(candidato):

                    print(
                        "\n✅ Possível página encontrada:"
                    )

                    print(candidato)

                    return candidato

        except requests.RequestException as erro:

            print(
                f"⚠️ Erro na busca: {erro}"
            )

    return None


def encontrar_noticia(
    titulo=None,
    fonte=None,
    url=None
):
    """
    Função principal.

    Prioridade:

    1. URL direta
    2. Decoder Google News
    3. Busca pelo título/fonte
    """

    print("\n================================")
    print("      RESOLVENDO NOTÍCIA")
    print("================================")

    # -------------------------------------------------
    # 1. URL já é uma página normal
    # -------------------------------------------------

    if url:

        url = limpar_url(url)

        print("\n🔗 URL recebida:")
        print(url)

        if not eh_google_news(url):

            print(
                "\n✅ URL já é uma página original."
            )

            return url

        # -------------------------------------------------
        # 2. URL é Google News
        # -------------------------------------------------

        print(
            "\n⚠️ Link do Google News detectado."
        )

        url_decodificada = (
            decodificar_google_news(url)
        )

        if url_decodificada:

            return url_decodificada

    # -------------------------------------------------
    # 3. Fallback por título e fonte
    # -------------------------------------------------

    if titulo:

        print(
            "\n🔎 Não foi possível decodificar "
            "diretamente."
        )

        print(
            "🔎 Tentando encontrar pela "
            "fonte e título..."
        )

        url_encontrada = (
            encontrar_noticia_por_busca(
                titulo,
                fonte or ""
            )
        )

        if url_encontrada:

            return url_encontrada

    print(
        "\n❌ Não foi possível encontrar "
        "a página original."
    )

    return None


if __name__ == "__main__":

    print("================================")
    print("   VERIFICA.AI - RESOLVER")
    print("================================")

    url = input(
        "\nCole o link do Google News "
        "ou da notícia:\n> "
    ).strip()

    resultado = encontrar_noticia(
        url=url
    )

    print("\n================================")

    if resultado:

        print("✅ RESULTADO")
        print("================================")
        print(resultado)

    else:

        print("❌ NÃO FOI POSSÍVEL RESOLVER")
        print("================================")