import re
import os
import json
import pickle
import requests
import llama_cpp
from math import sqrt, pow
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from utils import analyze_text
from flask import Flask, request, jsonify, send_from_directory
import logging


class StatusFilter(logging.Filter):
    def filter(self, record):  
        return "status" not in record.getMessage()

log = logging.getLogger('werkzeug')
log.addFilter(StatusFilter())
load_dotenv() 
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
FLICKR_API_KEY = os.getenv("FLICKR_API_KEY")
UNSPLASH_API_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

llm = llama_cpp.Llama(model_path="models/all-MiniLM-L6-v2-Q8_0.gguf", embedding=True)
categories = ["backgrounds", "fashion", "nature", "science", "education", "feelings", "health", "people", "religion", "places", "animals", "industry", "computer", "food", "sports", "transportation", "travel", "buildings", "business", "music"]
STATUS = "Standby"

app = Flask(__name__, static_folder="frontend")


#app.config["UPLOAD_PATH"] = "media"
HOST = "0.0.0.0"
PORT = 8000


@app.route("/status/")
def status():
  return STATUS
  
  
@app.route("/credentials/get/<service>", methods=["GET"])
def get_api_key(service):
    api_keys = {
        "PEXELS_API_KEY": PEXELS_API_KEY,
        "PIXABAY_API_KEY": PIXABAY_API_KEY,
        "FLICKR_API_KEY": FLICKR_API_KEY,
        "UNSPLASH_API_KEY": UNSPLASH_API_KEY,
    }
    key = api_keys.get(service.upper() + "_API_KEY")
    if key:
        return jsonify({"exists": True})
    return jsonify({"exists": False})
    
@app.route("/credentials/set", methods=["POST"])
def set_api_key():
    data = request.json
    service = data.get("service")
    new_key = data.get("key")
    
    if not service or not new_key:
        return jsonify({"error": "Service and key are required"}), 400
    
    env_file = ".env"
    with open(env_file, "r") as file:
        lines = file.readlines()
    
    found = False
    with open(env_file, "w") as file:
        for line in lines:
            if line.startswith(service.upper() + "_API_KEY="):
                file.write(f"{service.upper()}_API_KEY={new_key}\n")
                found = True
            else:
                file.write(line)
        if not found:
            file.write(f"{service.upper()}_API_KEY={new_key}\n")
    
    load_dotenv()
    return jsonify({"success": True})

def scrape_bing_images(query):
    
    search_url = f"https://www.bing.com/images/search?q={query.replace(' ', '+')}&form=HDRSC2"
    

  
    headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"}
    response = requests.get(search_url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    media_urls = []

    # Extract image URLs from the search results
    image_elements = soup.find_all('a', {'class': 'iusc'})
    for element in image_elements:
      m = re.search(r'murl":"(https://.*?)"', str(element))
      if m:
        media_urls.append(m.group(1))

    return media_urls

@app.route('/bing/photo/search/<term>', methods=['GET'])
def scrape_images(term):
    image_urls = scrape_bing_images(term)
    return jsonify(image_urls)
  

@app.route("/unsplash/photo/search/<term>", methods=["GET"])
def search_unsplash_photos(term):
    url = f"https://api.unsplash.com/search/photos?page=1&per_page=15&query={term}&client_id={UNSPLASH_API_KEY}"
    response = requests.get(url)
    data = response.json()
    urls = (photo["urls"]["full"] for photo in data["results"])
    return jsonify(list(urls))
  
  
@app.route("/flickr/photo/search/<term>", methods=["GET"])
def search_flickr_photos(term):
    term = term.replace(" ", ",")
    url = f"https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key={FLICKR_API_KEY}&text={term}&per_page=15&format=json&nojsoncallback=1"
    response = requests.get(url)
    data = response.json()
    urls = (
        f"https://live.staticflickr.com/{photo['server']}/{photo['id']}_{photo['secret']}_b.jpg"
        for photo in data["photos"]["photo"]
    )
    return jsonify(list(urls))
    
@app.route("/pixabay/photo/search/<term>", methods=["GET"])
def search_pixabay_photos(term):
    url = f"https://pixabay.com/api/?key={PIXABAY_API_KEY}&q={term}"
    response = requests.get(url)
    data = response.json()
    urls = (photo["largeImageURL"] for photo in data["hits"])
    return jsonify(list(urls))  
    
@app.route("/pexels/photo/search/<term>", methods=["GET"])
def search_pexels_photos(term):
    url = "https://api.pexels.com/v1/search?query=" + term
    headers = {"Authorization": PEXELS_API_KEY}
    response = requests.get(url, headers=headers)
    data = response.json()
    urls = (photo["src"]["original"] for photo in data["photos"])
    return jsonify(list(urls))


def remove_urls(text, replacement_text=''):
    url_pattern = re.compile(r'https?://\S+|www\.\S+')

    while True:
        match = url_pattern.search(text)
        if not match:
            break
        text = text[:match.start()] + replacement_text + text[match.end():]

    return text
    
@app.route("/",methods=['GET', 'POST'])
def home():
  global STATUS
  STATUS = "Ready"
  return send_from_directory(app.static_folder, "index.html")


  
@app.route('/media-upload', methods=['POST'])
def upload_file():
  files = request.files.getlist('files')
  print(files)
  for uploaded_file in files:
    print(f"Saving file: {uploaded_file.filename}")
    if uploaded_file.filename != '':
        uploaded_file.save(os.path.join('../media',uploaded_file.filename))
    with open("../media/list.json", "r+") as f:
      try:
        data = json.load(f)  
      except json.JSONDecodeError:
        data = {}  
      data[uploaded_file.filename] = uploaded_file.filename  
      f.seek(0)  
      json.dump(data, f)
  return jsonify('Uploaded')


@app.route("/<path:path>")
def serve_page(path):
    return send_from_directory(app.static_folder, path)


@app.route("/media/<path>")
def serve_media(path):
    return send_from_directory("../media", path)

url = 'https://threadreaderapp.com/thread/1868467535198187523.html?utm_campaign=topunroll'

@app.route("/scrape", methods=['POST'])
def scrape():
  global STATUS
  STATUS = "Getting url"
  data = request.get_json()
  url = data["url"]


  headers = {'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9'}
  page_source = requests.get(url, headers=headers)
  soup = BeautifulSoup(page_source.content, "html.parser")
  print(soup)
  threadinfodiv = soup.find('div',{'class':'thread-info'}).find('span').next_sibling.text
  tweetscount = [int(s) for s in threadinfodiv.split() if s.isdigit()][0]
  print(tweetscount)
  STATUS = "Getting tweets"
  
  tweet_dict = dict()
  for x in range(1,tweetscount,1):
    STATUS = "Scraping.."
    tweet_detail = dict()
    tweetno = 'tweet_'+str(x)
    print(tweetno)
    tweetdiv = soup.find(id=tweetno)
    text = remove_urls(tweetdiv.text)
    print(text)
    tweet_detail['text'] = text
    tweet_detail['img'] = None
    img = tweetdiv.find("span",{'class':'entity-image'})
    if img is not None:
      imgsrc = img.find('a').find('img')['data-src']
      print(imgsrc)
      tweet_detail['img'] = imgsrc
      
    tweet_detail['vid'] = None
    vid = tweetdiv.find("span",{'class':'entity-video'})
    if vid is not None:
      link_mp4 = vid.select_one('source[type="video/mp4"]')["src"]
      print(link_mp4)
      tweet_detail['vid'] = link_mp4
    
    if (tweet_detail['img'] is None and tweet_detail['vid'] is None):
      STATUS = f"No media.Analyzing {tweetno}.. Wait"
      q = analyze_text(text)
      tweet_detail['keyword'] = q
      '''
      pexels_api_key = os.getenv('PEXELS_API_KEY')
      headers = {'Authorization': pexels_api_key}
      r = requests.get(f'https://api.pexels.com/v1/search?query={q}', headers=headers)
      photo_data = r.json()
      print(photo_data)
      photo_id = photo_data['photos'][0]['id']
      tweet_detail['img'] = f'https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg'
      '''
    tweet_dict[x] = tweet_detail
  
  STATUS = "Loading resources.."
  tweet_json = json.dumps(tweet_dict)
  print(tweet_json)
  STATUS = "Loaded"
  return(tweet_json)


if __name__ == "__main__":
    # Run Flask App
    app.run(debug=True, host=HOST, port=PORT)
