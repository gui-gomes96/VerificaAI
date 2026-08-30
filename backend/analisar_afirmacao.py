import re


def analisar_afirmacao(texto):

    texto_original = texto.strip()

    texto_lower = texto_original.lower()

    palavras = re.findall(
        r"\b[\wÀ-ÿ]+\b",
        texto_lower
    )

    quantidade_palavras = len(palavras)

    termos_importantes = []

    termos = [
        "brasil",
        "goiás",
        "educação",
        "saúde",
        "política",
        "economia",
        "escola",
        "escolas",
        "universidade",
        "governo",
        "presidente",
        "prefeitura",
        "cidade",
        "melhor",
        "pior",
        "maior",
        "menor",
        "primeiro",
        "primeira",
        "segundo",
        "segunda",
        "ranking",
        "dados",
        "pesquisa",
        "estudo",
        "pesquisa",
        "ideb",
        "enem",
        "fuvest"
    ]

    for termo in termos:

        if termo in texto_lower:
            termos_importantes.append(termo)

    palavras_comparativas = [
        "melhor",
        "pior",
        "maior",
        "menor",
        "mais",
        "menos",
        "primeiro",
        "primeira",
        "segundo",
        "segunda",
        "terceiro",
        "terceira",
        "último",
        "última"
    ]

    possui_comparacao = any(
        palavra in texto_lower
        for palavra in palavras_comparativas
    )

    palavras_ranking = [
        "ranking",
        "melhor",
        "pior",
        "primeiro",
        "primeira",
        "segundo",
        "segunda",
        "terceiro",
        "terceira",
        "liderança",
        "líder"
    ]

    possui_ranking = any(
        palavra in texto_lower
        for palavra in palavras_ranking
    )

    palavras_fato = [
        "é",
        "foi",
        "tem",
        "possui",
        "alcançou",
        "registrou",
        "aumentou",
        "diminuiu",
        "aconteceu",
        "acontece",
        "será",
        "foi considerado"
    ]

    possui_afirmacao_factual = any(
        palavra in texto_lower
        for palavra in palavras_fato
    )

    numeros = re.findall(
        r"\b\d+(?:[.,]\d+)?%?\b",
        texto_original
    )

    if possui_afirmacao_factual:
        tipo = "Afirmação factual"

    elif texto_original.endswith("?"):
        tipo = "Pergunta"

    else:
        tipo = "Informação geral"

    return {
        "texto": texto_original,
        "palavras": quantidade_palavras,
        "termos_importantes": termos_importantes,
        "possui_comparacao": possui_comparacao,
        "possui_ranking": possui_ranking,
        "possui_afirmacao_factual": possui_afirmacao_factual,
        "numeros": numeros,
        "tipo": tipo
    }