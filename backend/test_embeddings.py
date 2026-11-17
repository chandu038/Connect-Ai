
from app.rag.embeddings import generate_embeddings


def main():
    texts = [
        "The college offers undergraduate engineering courses.",
        "Students can apply for scholarships based on eligibility.",
    ]

    vectors = generate_embeddings(texts)

    print("Texts:", len(texts))
    print("Embeddings:", len(vectors))

    for index, vector in enumerate(vectors, start=1):
        print(
            f"Embedding {index} dimensions:",
            len(vector),
        )


if __name__ == "__main__":
    main()
