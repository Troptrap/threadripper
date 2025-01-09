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

      pexels_api_key = os.getenv('PEXELS_API_KEY')
      headers = {'Authorization': pexels_api_key}
      r = requests.get(f'https://api.pexels.com/v1/search?query={q}', headers=headers)
      photo_data = r.json()
      print(photo_data)
      photo_id = photo_data['photos'][0]['id']
      tweet_detail['img'] = f'https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg'
    tweet_dict[x] = tweet_detail
  
  STATUS = "Loading resources.."
  tweet_json = json.dumps(tweet_dict)
  print(tweet_json)
  STATUS = "Loaded"
  return(tweet_json)


if __name__ == "__main__":
    # Run Flask App
    app.run(debug=True, host=HOST, port=PORT)
