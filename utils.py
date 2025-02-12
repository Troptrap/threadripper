import os
import re
import math
import pydub
import pickle
import requests
import llama_cpp
from math import sqrt, pow
'''
def generate_ass_subtitles(timestamps, subtitle_filename,words_per_sub):
    """Generate an .ass subtitle file with split sentences (max 5 words per chunk)"""
    ass_template = """[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def format_ass_time(ms):
        """Convert milliseconds to ASS timestamp format: H:MM:SS.CC"""
        hours = ms // 3600000
        minutes = (ms % 3600000) // 60000
        seconds = (ms % 60000) // 1000
        centiseconds = (ms % 1000) // 10
        return f"{hours}:{minutes:02}:{seconds:02}.{centiseconds:02}"

    with open(subtitle_filename, "w", encoding="utf-8") as f:
        f.write(ass_template)  # Write template once

        for _, sentence, start_time, end_time in timestamps:
            words = re.findall(r'\([^()]+\)|"[^"]+"|\'[^\']+\'|[A-Za-z0-9]+(?:[-\'][A-Za-z0-9]+)*|[^\w\s]'
, sentence)  # Keeps words + punctuation together and it handles some edge cases
            chunks = []
            current_chunk = []

            for word in words:
                if len(current_chunk) < words_per_sub or word in ",.?!":
                    current_chunk.append(word)
                else:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = [word]

            if current_chunk:
                chunks.append(" ".join(current_chunk))

            num_chunks = len(chunks)
            chunk_duration = (end_time - start_time) / num_chunks

            for i, chunk_text in enumerate(chunks):
                chunk_start = start_time + i * chunk_duration
                chunk_end = min(chunk_start + chunk_duration, end_time)  # Ensure end_time is correct

                start_ass = format_ass_time(int(chunk_start))
                end_ass = format_ass_time(int(chunk_end))

                f.write(f"Dialogue: 0,{start_ass},{end_ass},Default,Sub,0,0,0,0,{chunk_text}\n")

'''




def generate_ass_subtitles(timestamps, subtitle_filename, words_per_sub):
    """
    Generate an .ass subtitle file with split sentences (max words_per_sub tokens per chunk)
    and, for each chunk, create dialogue lines that highlight one word at a time.
    The entire chunk is shown on every dialogue line, but only one word is displayed in the secondary color.
    Each word is timed using the karaoke tag.
    """
    
    ass_template = """[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def format_ass_time(ms):
        """Convert milliseconds to ASS timestamp format: H:MM:SS.CC"""
        hours = ms // 3600000
        minutes = (ms % 3600000) // 60000
        seconds = (ms % 60000) // 1000
        centiseconds = (ms % 1000) // 10
        return f"{hours}:{minutes:02}:{seconds:02}.{centiseconds:02}"

    with open(subtitle_filename, "w", encoding="utf-8") as f:
        f.write(ass_template)  # Write header/template once

        for _, sentence, start_time, end_time in timestamps:
            # Tokenize the sentence into words and punctuation.
             #   r'\([^()]+\)|"[^"]+"|\'[^\']+\'|[A-Za-z0-9]+(?:[-\'][A-Za-z0-9]+)*|[^\w\s]'
            tokens = re.findall(
              r'\([^()]+\)|"[^"]+"|\'[^\']+\'|[A-Za-z0-9]+(?:[-\'][A-Za-z0-9]+)*(?:[,.?!]+)?',
                sentence
            )
            
            # Split tokens into chunks of at most words_per_sub tokens.
            chunks = []
            current_chunk = []
            for token in tokens:
                if len(current_chunk) < words_per_sub or token in ",.?!":
                    current_chunk.append(token)
                else:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = [token]
            if current_chunk:
                chunks.append(" ".join(current_chunk))
            
            num_chunks = len(chunks)
            if num_chunks == 0:
                continue
            # Divide the total sentence duration among the chunks.
            total_duration = end_time - start_time
            chunk_duration = total_duration / num_chunks
            
            for i, chunk_text in enumerate(chunks):
                # Compute timing for this chunk.
                chunk_start = start_time + i * chunk_duration
                chunk_end = min(chunk_start + chunk_duration, end_time)
                
                # Split the chunk text into individual words (using whitespace splitting).
                words_in_chunk = chunk_text.split()
                if not words_in_chunk:
                    continue
                n_words = len(words_in_chunk)
                word_duration = (chunk_end - chunk_start) / n_words
                word_duration_cs = int(word_duration / 10)
                
                # For each word in the chunk, output a dialogue line that highlights that word.
                for j in range(n_words):
                    highlighted_line = ""
                    for k, word in enumerate(words_in_chunk):
                        # For the highlighted word, add the secondary colour override.
                        if k == j:
                            highlighted_line +=                     f"{{\\1c&FFFF00FF}}{word}{{\\r}} "
                        else:
                            highlighted_line += f"{word} "
                    highlighted_line = highlighted_line.strip()
                    
                    # Compute start and end time for this dialogue line.
                    line_start = chunk_start + j * word_duration
                    line_end = chunk_start + (j + 1) * word_duration
                    start_ass = format_ass_time(int(line_start))
                    end_ass = format_ass_time(int(line_end))
                    
                    f.write(f"Dialogue: 0,{start_ass},{end_ass},Default,Sub,0,0,0,0,{highlighted_line}\n")



def concat_audio(paths, filename):
    """Concatenate audio files and generate subtitles"""
    combined_audio = pydub.AudioSegment.empty()
    timestamps = []
    start_time = 11

    if len(paths) < 1:
        return "No audio files to concatenate"

    for path, sentence in paths:
        audio_file = pydub.AudioSegment.from_file(path)
        combined_audio += audio_file
        end_time = len(combined_audio)
        timestamps.append((path, sentence, start_time, end_time))
        start_time = end_time
    print(timestamps)
    output_filepath = os.path.abspath(f"./media/{filename}")
    subtitle_filepath = os.path.abspath(f"./media/{filename}.ass")

    combined_audio.export(output_filepath, format="mp3")
    generate_ass_subtitles(timestamps, subtitle_filepath, 8)

    return output_filepath, subtitle_filepath


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
    kw =str(kws[idx]).replace('_', ' ').split(',')
    return kw
    
'''  
def concat_audio(paths, filename):
    combined_audio = pydub.AudioSegment.empty()  # Create an empty AudioSegment to hold the combined audio
    if len(paths) < 2:
        return "List contains only one song"
    for path in paths:
        audio_file = pydub.AudioSegment.from_file(path)  # Load each audio file into an AudioSegment
        combined_audio += audio_file  # Concatenate the audio files sequentially
    filepath = os.path.abspath("./media/"+filename)
    combined_audio.export(
        filepath , format="mp3"
    )  # Export the combined audio to MP3

    return filepath  # Return the path to the output file
'''



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

