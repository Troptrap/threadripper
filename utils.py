import llama_cpp
from math import sqrt, pow
import pickle
import requests
import math

llm = llama_cpp.Llama(model_path="models/all-MiniLM-L6-v2-Q8_0.gguf", embedding=True)

# Step 1: Normalize the embeddings
def normalize_vector(v):
    norm = sum(x ** 2 for x in v) ** 0.5
    return [x / norm for x in v]



# Step 4: Compute cosine similarities in batch
def cosine_similarity_batch(query, embeddings):
    # Compute all cosine similarities at once using dot product
    return [sum(q * e for q, e in zip(query, emb)) for emb in embeddings]



def reduce_embeddings():
  with open("synset_embeddings.pkl", "rb") as f:
    labels_embeddings = pickle.load(f)
    normalized_saved_embeddings = [normalize_vector(embedding) for embedding in labels_embeddings]
    with open("normalized_embeddings.pkl", "wb") as f:
      pickle.dump(normalized_saved_embeddings, f)
  print("Normalized embeddings saved successfully.")

#reduce_embeddings()


def highest_similarity(query, embeddings):
    max_similarity = float('-inf')  # Start with a very low value
    max_index = -1  # Index of the embedding with the highest similarity

    for i, emb in enumerate(embeddings):
        similarity = sum(q * e for q, e in zip(query, emb))  # Compute dot product
        if similarity > max_similarity:  # Update max if the current similarity is higher
            max_similarity = similarity
            max_index = i

    return max_index

def analyze_text(txt):
  query = llm.create_embedding(txt)["data"][0]["embedding"]
  normalized_query = normalize_vector(query)
  # Load normalized embeddings from the pickle file
  with open("normalized_embeddings.pkl", "rb") as f:
      saved_embeddings_matrix = pickle.load(f)
  idx = highest_similarity(normalized_query, saved_embeddings_matrix)
  with open("keywords.pkl", "rb") as f:
    kws = pickle.load(f)
    kw =str(kws[idx]).replace('_', ' ')
    return kw
  


# Example usage
def example_usage():
  query = llm.create_embedding("Holy father and mother of sacred child")["data"][0]["embedding"]
  normalized_query = normalize_vector(query)
  # Load normalized embeddings from the pickle file
  with open("normalized_embeddings.pkl", "rb") as f:
      saved_embeddings_matrix = pickle.load(f)
  
  print("Normalized embeddings loaded successfully.")
  
  idx = highest_similarity(normalized_query, saved_embeddings_matrix)
  with open("keywords.pkl", "rb") as f:
    kws = pickle.load(f)
  print("Most Similar:", kws[idx])

