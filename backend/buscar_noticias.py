# -*- coding: utf-8 -*-
import feedparser
from urllib.parse import quote
import re

def buscar_noticias(termo, limite=10):
    """
    Busca notícias no Google News RSS com filtro estrito de relevância 
    para garantir que os links retornados estejam diretamente conectados ao termo pesquisado.
    """
    if not termo or not termo.strip():
        return []

    termo_codificado = quote(termo.strip())

    url = (
        "https://news.google.com/rss/search?"
        f"q={termo_codificado}"
        "&hl=pt-BR"
        "&gl=BR"
        "&ceid=BR:pt-419"
    )

    feed = feedparser.parse(url)
    noticias = []

    # Extrai palavras-chave significativas da busca (palavras com 4 letras ou mais)
    palavras_chave_termo = set(re.findall(r'\b\w{4,}\b', termo.lower()))

    for item in feed.entries:
        titulo = item.get("title", "Sem título")
        link = item.get("link", "")
        data = item.get("published", "Data desconhecida")
        
        fonte = item.get("source", {})
        if hasattr(fonte, "get"):
            nome_fonte = fonte.get("title", "Fonte não identificada")
        else:
            nome_fonte = "Fonte não identificada"

        # FILTRO DE RELEVÂNCIA ESTRICTA:
        # Verifica se o título da notícia realmente possui alguma relação com os termos buscados
        titulo_lower = titulo.lower()
        compativel = any(palavra in titulo_lower for palavra in palavras_chave_termo)

        # Se houver compatibilidade real OU se a busca tiver poucos termos, aceitamos
        if compativel or len(palavras_chave_termo) <= 1:
            noticias.append({
                "titulo": titulo,
                "fonte": nome_fonte,
                "link": link,
                "data": data
            })

        # Interrompe se atingir o limite desejado
        if len(noticias) >= limite:
            break

    return noticias